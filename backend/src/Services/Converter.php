<?php

declare(strict_types=1);

namespace App\Services;

use App\Exceptions\ConversionException;
use League\Csv\Reader;
use League\Csv\Writer;
use DOMDocument;

class Converter
{
    public const SUPPORTED_FORMATS = ['csv', 'json', 'xml'];

    public function convert(string $inputPath, string $fromFormat, string $toFormat, string $outputPath): void
    {
        $fromFormat = strtolower($fromFormat);
        $toFormat   = strtolower($toFormat);

        if (!in_array($fromFormat, self::SUPPORTED_FORMATS, true)) {
            throw new \InvalidArgumentException("Unsupported source format: {$fromFormat}");
        }

        if (!in_array($toFormat, self::SUPPORTED_FORMATS, true)) {
            throw new \InvalidArgumentException("Unsupported target format: {$toFormat}");
        }

        $rows = match ($fromFormat) {
            'csv'  => $this->parseCsv($inputPath),
            'json' => $this->parseJson($inputPath),
            'xml'  => $this->parseXml($inputPath),
        };

        match ($toFormat) {
            'csv'  => $this->writeCsv($rows, $outputPath),
            'json' => $this->writeJson($rows, $outputPath),
            'xml'  => $this->writeXml($rows, $outputPath),
        };
    }

    // ── CSV ──────────────────────────────────────────────────────────────

    private function parseCsv(string $path): array
    {
        try {
            $csv = Reader::createFromPath($path, 'r');
            $csv->setHeaderOffset(0);

            $rows = [];
            foreach ($csv->getRecords() as $record) {
                $rows[] = $record;
            }
        } catch (\League\Csv\Exception $e) {
            throw new ConversionException('Unable to parse CSV: ' . $e->getMessage());
        }

        if (empty($rows)) {
            throw new ConversionException('CSV file is empty or has no data rows');
        }

        return $rows;
    }

    private function writeCsv(array $rows, string $path): void
    {
        if (empty($rows)) {
            throw new ConversionException('No data to write to CSV');
        }

        $csv = Writer::createFromPath($path, 'w');
        $csv->insertOne(array_keys($rows[0]));

        foreach ($rows as $row) {
            $csv->insertOne(array_values($row));
        }
    }

    // ── JSON ─────────────────────────────────────────────────────────────

    private function parseJson(string $path): array
    {
        $content = file_get_contents($path);
        $decoded = json_decode($content ?: '', true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new ConversionException('Invalid JSON: ' . json_last_error_msg());
        }

        if (!is_array($decoded) || !array_is_list($decoded)) {
            throw new ConversionException('JSON must be an array of objects (a list of records)');
        }

        foreach ($decoded as $row) {
            if (!is_array($row)) {
                throw new ConversionException('Each JSON item must be an object representing one record');
            }
        }

        if (empty($decoded)) {
            throw new ConversionException('JSON file contains no records');
        }

        return $decoded;
    }

    private function writeJson(array $rows, string $path): void
    {
        if (empty($rows)) {
            throw new ConversionException('No data to write to JSON');
        }

        $json = json_encode($rows, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        file_put_contents($path, $json);
    }

    // ── XML ──────────────────────────────────────────────────────────────

    private function parseXml(string $path): array
    {
        $xmlString = file_get_contents($path);

        libxml_use_internal_errors(true);
        $xml = simplexml_load_string($xmlString ?: '');

        if ($xml === false) {
            $errors  = libxml_get_errors();
            libxml_clear_errors();
            $message = $errors[0]->message ?? 'Unknown XML error';
            throw new ConversionException('Invalid XML: ' . trim($message));
        }

        $rows = [];
        foreach ($xml->children() as $rowElement) {
            $row = [];
            foreach ($rowElement->children() as $field) {
                $row[$field->getName()] = (string) $field;
            }
            $rows[] = $row;
        }

        if (empty($rows)) {
            throw new ConversionException('XML file contains no rows');
        }

        return $rows;
    }

    private function writeXml(array $rows, string $path): void
    {
        if (empty($rows)) {
            throw new ConversionException('No data to write to XML');
        }

        $dom = new DOMDocument('1.0', 'UTF-8');
        $dom->formatOutput = true;

        $root = $dom->createElement('root');
        $dom->appendChild($root);

        foreach ($rows as $rowData) {
            $rowElement = $dom->createElement('row');

            foreach ($rowData as $field => $value) {
                $fieldElement = $dom->createElement($this->sanitizeXmlTag((string) $field));
                $fieldElement->appendChild($dom->createTextNode((string) $value));
                $rowElement->appendChild($fieldElement);
            }

            $root->appendChild($rowElement);
        }

        $dom->save($path);
    }

    private function sanitizeXmlTag(string $name): string
    {
        // Une balise XML doit commencer par une lettre ou _, et ne contenir que [a-zA-Z0-9_-]
        $sanitized = preg_replace('/[^a-zA-Z0-9_\-]/', '_', $name);

        if ($sanitized === '' || !preg_match('/^[a-zA-Z_]/', $sanitized)) {
            $sanitized = 'field_' . $sanitized;
        }

        return $sanitized;
    }
}