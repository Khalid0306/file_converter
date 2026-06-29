<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Core\Response;
use App\Core\Storage;
use App\Services\Converter;
use App\Exceptions\ConversionException;
use App\Models\Conversion;

class ConversionController
{
    private const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 Mo

    private const ALLOWED_MIME_TYPES = [
        'csv'  => ['text/csv', 'text/plain', 'application/csv', 'application/vnd.ms-excel'],
        'json' => ['application/json', 'text/plain'],
        'xml'  => ['application/xml', 'text/xml', 'text/plain'],
    ];

    public function store(Request $request): void
    {
        $user     = $request->context('user');
        $file     = $request->file('file');
        $toFormat = strtolower((string) $request->input('to_format', ''));

        if (!$file || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            Response::error('No valid file uploaded (champ attendu : "file")', 422);
            return;
        }

        if ($file['size'] > self::MAX_FILE_SIZE) {
            Response::error('File exceeds the 10 MB limit', 422);
            return;
        }

        $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

        if (!in_array($extension, Converter::SUPPORTED_FORMATS, true)) {
            Response::error("Unsupported file extension: .{$extension}", 422);
            return;
        }

        if (!in_array($toFormat, Converter::SUPPORTED_FORMATS, true)) {
            Response::error('Invalid or missing target format (to_format)', 422);
            return;
        }

        if ($extension === $toFormat) {
            Response::error('Source and target formats must be different', 422);
            return;
        }

        // Vérifie le MIME réel du contenu, pas seulement l'extension déclarée par le client
        $finfo        = new \finfo(FILEINFO_MIME_TYPE);
        $realMime     = $finfo->file($file['tmp_name']);
        $allowedMimes = self::ALLOWED_MIME_TYPES[$extension] ?? [];

        if (!in_array($realMime, $allowedMimes, true)) {
            Response::error("File content does not match a valid {$extension} file (detected: {$realMime})", 422);
            return;
        }

        $uuid       = bin2hex(random_bytes(16));
        $inputPath  = Storage::incomingPath("{$uuid}.{$extension}");
        $outputPath = Storage::convertedPath("{$uuid}.{$toFormat}");

        if (!move_uploaded_file($file['tmp_name'], $inputPath)) {
            Response::error('Failed to store the uploaded file', 500);
            return;
        }

        try {
            (new Converter())->convert($inputPath, $extension, $toFormat, $outputPath);
        } catch (ConversionException $e) {
            unlink($inputPath);
            Response::error('Conversion failed: ' . $e->getMessage(), 422);
            return;
        }

        $conversion = Conversion::create([
            'user_id'     => $user['id'],
            'file_name'   => pathinfo($file['name'], PATHINFO_FILENAME) . ".{$toFormat}",
            'from_format' => $extension,
            'to_format'   => $toFormat,
            'file_size'   => filesize($outputPath),
            'status'      => 'completed',
            'path_in'     => $inputPath,
            'path_out'    => $outputPath,
        ]);

        Response::json(['conversion' => $conversion], 201);
    }

    public function index(Request $request): void
    {
        $user = $request->context('user');

        $filters = [
            'from_format' => $request->query('from_format'),
            'to_format'   => $request->query('to_format'),
            'sort'        => $request->query('sort', 'created_at'),
            'order'       => $request->query('order', 'desc'),
        ];

        $conversions = Conversion::listForUser($user['id'], $filters);

        Response::json(['conversions' => $conversions]);
    }

    public function download(Request $request): void
    {
        $user = $request->context('user');
        $id   = (int) $request->param('id');

        $conversion = Conversion::findByIdForUser($id, $user['id']);

        if (!$conversion) {
            Response::error('Conversion not found', 404);
            return;
        }

        if (empty($conversion['path_out']) || !file_exists($conversion['path_out'])) {
            Response::error('Converted file is missing on disk', 410);
            return;
        }

        header('Content-Type: application/octet-stream');
        header('Content-Disposition: attachment; filename="' . $conversion['file_name'] . '"');
        header('Content-Length: ' . filesize($conversion['path_out']));
        readfile($conversion['path_out']);
        exit;
    }

    public function destroy(Request $request): void
    {
        $user = $request->context('user');
        $id   = (int) $request->param('id');

        $conversion = Conversion::findByIdForUser($id, $user['id']);

        if (!$conversion) {
            Response::error('Conversion not found', 404);
            return;
        }

        Conversion::delete($id, $user['id']);

        foreach ([$conversion['path_in'], $conversion['path_out']] as $path) {
            if ($path && file_exists($path)) {
                unlink($path);
            }
        }

        Response::json(['message' => 'Conversion deleted']);
    }

    // ── Partage public ──────────────────────────────────────────────────

    private const SHARE_TTL = 86400; // 24h

    public function share(Request $request): void
    {
        $user = $request->context('user');
        $id   = (int) $request->param('id');

        $result = Conversion::createShareLink($id, $user['id'], self::SHARE_TTL);

        if (!$result) {
            Response::error('Conversion not found or not ready to share', 404);
            return;
        }

        Response::json([
            'share_token' => $result['share_token'],
            'share_url'   => '/api/share/' . $result['share_token'],
            'expires_at'  => $result['share_expires_at'],
        ], 201);
    }

    public function unshare(Request $request): void
    {
        $user = $request->context('user');
        $id   = (int) $request->param('id');

        if (!Conversion::revokeShareLink($id, $user['id'])) {
            Response::error('Conversion not found', 404);
            return;
        }

        Response::json(['message' => 'Share link revoked']);
    }

    // Route publique — pas de middleware Auth. N'importe qui avec le token peut télécharger.
    public function publicDownload(Request $request): void
    {
        $token      = (string) $request->param('token');
        $conversion = Conversion::findByShareToken($token);

        if (!$conversion || !Conversion::isShareValid($conversion['share_token'], $conversion['share_expires_at'])) {
            Response::error('Link not found or expired', 404);
            return;
        }

        if (empty($conversion['path_out']) || !file_exists($conversion['path_out'])) {
            Response::error('File is missing on disk', 410);
            return;
        }

        header('Content-Type: application/octet-stream');
        header('Content-Disposition: attachment; filename="' . $conversion['file_name'] . '"');
        header('Content-Length: ' . filesize($conversion['path_out']));
        readfile($conversion['path_out']);
        exit;
    }
}