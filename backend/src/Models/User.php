<?php

declare(strict_types=1);

namespace App\Models;

use App\Core\Database;

class User
{
    public static function findByEmail(string $email): ?array
    {
        $stmt = Database::connection()->prepare(
            'SELECT id, name, email, password_hash, role FROM users WHERE email = :email'
        );
        $stmt->execute(['email' => $email]);
        $user = $stmt->fetch();
        return $user ?: null;
    }

    public static function findById(int $id): ?array
    {
        $stmt = Database::connection()->prepare(
            'SELECT id, name, email, role FROM users WHERE id = :id'
        );
        $stmt->execute(['id' => $id]);
        $user = $stmt->fetch();
        return $user ?: null;
    }

    public static function create(string $name, string $email, string $passwordHash): array
    {
        $stmt = Database::connection()->prepare(
            "INSERT INTO users (name, email, password_hash, role)
             VALUES (:name, :email, :password_hash, 'user')
             RETURNING id, name, email, role"
        );
        $stmt->execute([
            'name'          => $name,
            'email'         => $email,
            'password_hash' => $passwordHash,
        ]);
        return $stmt->fetch();
    }

    public static function emailExists(string $email): bool
    {
        $stmt = Database::connection()->prepare('SELECT 1 FROM users WHERE email = :email');
        $stmt->execute(['email' => $email]);
        return (bool) $stmt->fetchColumn();
    }
}