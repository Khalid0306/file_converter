<?php

declare(strict_types=1);

namespace Tests\Services;

use App\Services\Converter;
use App\Exceptions\ConversionException;
use PHPUnit\Framework\TestCase;

class ConverterTest extends TestCase
{
    private Converter $converter;
    private array $tempFiles = [];

    protected function setUp(): void
    {
        $this->converter = new Converter();
    }

    protected function tearDown(): void
    {
        foreach ($this->tempFiles as $file) {
            if (file_exists($file)) {
                unlink($file);
            }
        }
    }

    private function tempFile(string $extension): string
    {
        $path = sys_get_temp_dir() . '/' . uniqid('test_', true) . '.' . $extension;
        $this->tempFiles[] = $path;
        return $path;
    }

    public function testCsvToJson(): void
    {
        $csvPath = $this->tempFile('csv');
        file_put_contents($csvPath, "name,age\nAlice,30\nBob,25\n");

        $jsonPath = $this->tempFile('json');
        $this->converter->convert($csvPath, 'csv', 'json', $jsonPath);

        $result = json_decode(file_get_contents($jsonPath), true);

        $this->assertCount(2, $result);
        $this->assertSame('Alice', $result[0]['name']);
        $this->assertSame('30', $result[0]['age']);
    }

    public function testJsonToCsv(): void
    {
        $jsonPath = $this->tempFile('json');
        file_put_contents($jsonPath, json_encode([
            ['name' => 'Alice', 'age' => '30'],
            ['name' => 'Bob', 'age' => '25'],
        ]));

        $csvPath = $this->tempFile('csv');
        $this->converter->convert($jsonPath, 'json', 'csv', $csvPath);

        $content = file_get_contents($csvPath);
        $this->assertStringContainsString('name,age', $content);
        $this->assertStringContainsString('Alice,30', $content);
    }

    public function testXmlToJson(): void
    {
        $xmlPath = $this->tempFile('xml');
        file_put_contents(
            $xmlPath,
            '<?xml version="1.0"?><root><row><name>Alice</name><age>30</age></row></root>'
        );

        $jsonPath = $this->tempFile('json');
        $this->converter->convert($xmlPath, 'xml', 'json', $jsonPath);

        $result = json_decode(file_get_contents($jsonPath), true);
        $this->assertSame('Alice', $result[0]['name']);
    }

    public function testJsonToXml(): void
    {
        $jsonPath = $this->tempFile('json');
        file_put_contents($jsonPath, json_encode([
            ['name' => 'Alice', 'age' => '30'],
        ]));

        $xmlPath = $this->tempFile('xml');
        $this->converter->convert($jsonPath, 'json', 'xml', $xmlPath);

        $xml = simplexml_load_file($xmlPath);
        $this->assertSame('Alice', (string) $xml->row[0]->name);
    }

    public function testInvalidFormatThrowsException(): void
    {
        $this->expectException(\InvalidArgumentException::class);

        $csvPath = $this->tempFile('csv');
        file_put_contents($csvPath, "name\nAlice\n");

        $outPath = $this->tempFile('yaml');
        $this->converter->convert($csvPath, 'csv', 'yaml', $outPath);
    }

    public function testEmptyFileThrowsException(): void
    {
        $this->expectException(ConversionException::class);

        $csvPath = $this->tempFile('csv');
        file_put_contents($csvPath, '');

        $jsonPath = $this->tempFile('json');
        $this->converter->convert($csvPath, 'csv', 'json', $jsonPath);
    }
}