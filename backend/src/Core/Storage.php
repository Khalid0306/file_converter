<?php

declare(strict_types=1);

namespace App\Core;

class Storage
{
    private const BASE_DIR = '/var/www/uploads';

    public static function incomingPath(string $filename): string
    {
        $dir = self::BASE_DIR . '/incoming';
        self::ensureDir($dir);
        return $dir . '/' . $filename;
    }

    public static function convertedPath(string $filename): string
    {
        $dir = self::BASE_DIR . '/converted';
        self::ensureDir($dir);
        return $dir . '/' . $filename;
    }

    private static function ensureDir(string $dir): void
    {
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
    }
}