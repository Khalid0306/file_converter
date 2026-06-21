<?php

declare(strict_types=1);

namespace App\Models;

use App\Core\Database;

class Conversion
{
    public static function create(array $data): array
    {
        $stmt = Database::connection()->prepare(
            'INSERT INTO conversions
                (user_id, file_name, from_format, to_format, file_size, status, path_in, path_out)
             VALUES
                (:user_id, :file_name, :from_format, :to_format, :file_size, :status, :path_in, :path_out)
             RETURNING id, user_id, file_name, from_format, to_format, file_size, status, created_at'
        );

        $stmt->execute([
            'user_id'     => $data['user_id'],
            'file_name'   => $data['file_name'],
            'from_format' => $data['from_format'],
            'to_format'   => $data['to_format'],
            'file_size'   => $data['file_size'],
            'status'      => $data['status'],
            'path_in'     => $data['path_in'],
            'path_out'    => $data['path_out'],
        ]);

        return $stmt->fetch();
    }

    public static function findByIdForUser(int $id, int $userId): ?array
    {
        $stmt = Database::connection()->prepare(
            'SELECT * FROM conversions WHERE id = :id AND user_id = :user_id'
        );
        $stmt->execute(['id' => $id, 'user_id' => $userId]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public static function listForUser(int $userId, array $filters = []): array
    {
        $sql = 'SELECT id, file_name, from_format, to_format, file_size, status, created_at
                FROM conversions WHERE user_id = :user_id';
        $params = ['user_id' => $userId];

        if (!empty($filters['from_format'])) {
            $sql .= ' AND from_format = :from_format';
            $params['from_format'] = $filters['from_format'];
        }

        if (!empty($filters['to_format'])) {
            $sql .= ' AND to_format = :to_format';
            $params['to_format'] = $filters['to_format'];
        }

        // Whitelist obligatoire : impossible de binder un nom de colonne avec PDO,
        // donc on valide manuellement pour éviter toute injection SQL via "sort".
        $sortColumn = in_array($filters['sort'] ?? '', ['created_at', 'file_name', 'file_size'], true)
            ? $filters['sort']
            : 'created_at';

        $sortDir = (($filters['order'] ?? 'desc') === 'asc') ? 'ASC' : 'DESC';

        $sql .= " ORDER BY {$sortColumn} {$sortDir}";

        $stmt = Database::connection()->prepare($sql);
        $stmt->execute($params);

        return $stmt->fetchAll();
    }

    public static function delete(int $id, int $userId): bool
    {
        $stmt = Database::connection()->prepare(
            'DELETE FROM conversions WHERE id = :id AND user_id = :user_id'
        );
        $stmt->execute(['id' => $id, 'user_id' => $userId]);
        return $stmt->rowCount() > 0;
    }
}