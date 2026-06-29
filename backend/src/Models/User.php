<?php

declare(strict_types=1);

namespace App\Models;

use App\Core\Database;

class User
{
    public static function all(): array
    {
        $stmt = Database::connection()->query(
            'SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC, id DESC'
        );

        return $stmt->fetchAll();
    }

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

    public static function update(int $id, array $data): ?array
    {
        $stmt = Database::connection()->prepare(
            'UPDATE users
             SET name = :name,
                 email = :email,
                 role = :role
             WHERE id = :id
             RETURNING id, name, email, role, created_at'
        );
        $stmt->execute([
            'id' => $id,
            'name' => trim((string) ($data['name'] ?? '')),
            'email' => trim((string) ($data['email'] ?? '')),
            'role' => in_array(($data['role'] ?? 'user'), ['admin', 'user'], true) ? $data['role'] : 'user',
        ]);

        $user = $stmt->fetch();
        return $user ?: null;
    }

    public static function delete(int $id): bool
    {
        $stmt = Database::connection()->prepare('DELETE FROM users WHERE id = :id');
        $stmt->execute(['id' => $id]);
        return $stmt->rowCount() > 0;
    }
}