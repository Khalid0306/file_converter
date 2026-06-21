<?php

declare(strict_types=1);

namespace App\Core;

class Jwt
{
    private const ALG = 'HS256';

    public static function encode(array $payload, int $ttlSeconds = 86400): string
    {
        $header = self::base64UrlEncode(json_encode(['typ' => 'JWT', 'alg' => self::ALG]));

        $payload['iat'] = time();
        $payload['exp'] = time() + $ttlSeconds;
        $payloadEncoded = self::base64UrlEncode(json_encode($payload));

        $signature = self::sign("{$header}.{$payloadEncoded}");

        return "{$header}.{$payloadEncoded}.{$signature}";
    }

    public static function decode(string $token): array
    {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            throw new \RuntimeException('Malformed token');
        }

        [$header, $payload, $signature] = $parts;

        $expected = self::sign("{$header}.{$payload}");
        if (!hash_equals($expected, $signature)) {
            throw new \RuntimeException('Invalid token signature');
        }

        $decoded = json_decode(self::base64UrlDecode($payload), true);
        if (!is_array($decoded)) {
            throw new \RuntimeException('Invalid token payload');
        }

        if (isset($decoded['exp']) && time() > $decoded['exp']) {
            throw new \RuntimeException('Token expired');
        }

        return $decoded;
    }

    private static function sign(string $data): string
    {
        $secret = getenv('JWT_SECRET') ?: '';
        if ($secret === '') {
            throw new \RuntimeException('JWT_SECRET is not configured');
        }
        return self::base64UrlEncode(hash_hmac('sha256', $data, $secret, true));
    }

    private static function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private static function base64UrlDecode(string $data): string
    {
        $pad = strlen($data) % 4;
        if ($pad) {
            $data .= str_repeat('=', 4 - $pad);
        }
        return base64_decode(strtr($data, '-_', '+/'));
    }
}