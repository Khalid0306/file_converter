<?php

declare(strict_types=1);

namespace App\Core;

use PDO;
use PDOException;

class Database
{
    private static ?PDO $instance = null;

    public static function connection(): PDO
    {
        if (self::$instance === null) {
            $host = getenv('DB_HOST') ?: 'db';
            $name = getenv('DB_NAME') ?: '';
            $user = getenv('DB_USER') ?: '';
            $pass = getenv('DB_PASS') ?: '';
            $port = getenv('DB_PORT') ?: '5432';

            try {
                self::$instance = new PDO(
                    "pgsql:host={$host};port={$port};dbname={$name}",
                    $user,
                    $pass,
                    [
                        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                        PDO::ATTR_DEFAULT_FETCH_MODE  => PDO::FETCH_ASSOC,
                    ]
                );
            } catch (PDOException $e) {
                throw new \RuntimeException('Database connection failed: ' . $e->getMessage());
            }
        }

        return self::$instance;
    }
}