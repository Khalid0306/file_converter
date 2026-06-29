<?php

declare(strict_types=1);

namespace App\Models;

use App\Core\Database;

class Conversion
{
    public static function listAll(array $filters = []): array
    {
        $sql = 'SELECT c.id, c.user_id, u.name AS user_name, u.email AS user_email,
                       c.file_name, c.from_format, c.to_format, c.file_size, c.status, c.created_at
                FROM conversions c
                LEFT JOIN users u ON u.id = c.user_id
                WHERE 1 = 1';
        $params = [];

        if (!empty($filters['format'])) {
            $sql .= ' AND (c.from_format = :format OR c.to_format = :format)';
            $params['format'] = $filters['format'];
        }

        if (!empty($filters['search'])) {
            $sql .= ' AND c.file_name ILIKE :search';
            $params['search'] = '%' . $filters['search'] . '%';
        }

        $sortColumn = in_array($filters['sort'] ?? '', ['created_at', 'file_name', 'file_size'], true)
            ? $filters['sort']
            : 'created_at';
        $sortDir = (($filters['order'] ?? 'desc') === 'asc') ? 'ASC' : 'DESC';

        $sql .= " ORDER BY c.{$sortColumn} {$sortDir}";

        $stmt = Database::connection()->prepare($sql);
        $stmt->execute($params);

        return $stmt->fetchAll();
    }

    public static function stats(): array
    {
        $db = Database::connection();

        $totalUsers = (int) $db->query('SELECT COUNT(*) FROM users')->fetchColumn();
        $totalConversions = (int) $db->query('SELECT COUNT(*) FROM conversions')->fetchColumn();
        $storageUsed = (int) $db->query('SELECT COALESCE(SUM(file_size), 0) FROM conversions')->fetchColumn();
        $completed = (int) $db->query("SELECT COUNT(*) FROM conversions WHERE status = 'completed'")->fetchColumn();
        $failed = (int) $db->query("SELECT COUNT(*) FROM conversions WHERE status = 'failed'")->fetchColumn();

        $formatsStmt = $db->query(
            'SELECT format, COUNT(*) AS count FROM (
                SELECT from_format AS format FROM conversions
                UNION ALL
                SELECT to_format AS format FROM conversions
            ) formats
            GROUP BY format
            ORDER BY count DESC, format ASC'
        );

        $recentStmt = $db->query(
            "SELECT
                'conversion' AS type,
                file_name AS message,
                created_at AS timestamp
             FROM conversions
             ORDER BY created_at DESC
             LIMIT 5"
        );

        $formats = array_map(static fn(array $row) => [
            'format' => $row['format'],
            'count' => (int) $row['count'],
        ], $formatsStmt->fetchAll());

        $recentActivity = array_map(static fn(array $row) => [
            'message' => 'Conversion réalisée: ' . $row['message'],
            'timestamp' => $row['timestamp'],
        ], $recentStmt->fetchAll());

        return [
            'total_users' => $totalUsers,
            'total_conversions' => $totalConversions,
            'storage_used' => $storageUsed,
            'success_rate' => $totalConversions > 0 ? (int) round(($completed / $totalConversions) * 100) : 0,
            'failed_conversions' => $failed,
            'formats' => $formats,
            'health' => [
                'db' => 'ok',
                'api' => 'ok',
                'storage' => 'ok',
            ],
            'recent_activity' => $recentActivity,
        ];
    }

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

    public static function deleteById(int $id): bool
    {
        $stmt = Database::connection()->prepare('DELETE FROM conversions WHERE id = :id');
        $stmt->execute(['id' => $id]);
        return $stmt->rowCount() > 0;
    }

    // ── Partage public ──────────────────────────────────────────────────

    /**
     * Logique pure (pas de DB) : un lien est valide s'il existe ET n'est pas expiré.
     * Séparée du reste pour rester testable unitairement sans dépendre de PostgreSQL.
     */
    public static function isShareValid(?string $token, ?string $expiresAt): bool
    {
        if ($token === null || $expiresAt === null) {
            return false;
        }

        return strtotime($expiresAt) > time();
    }

    public static function createShareLink(int $id, int $userId, int $ttlSeconds): ?array
    {
        $conversion = self::findByIdForUser($id, $userId);

        if (!$conversion || $conversion['status'] !== 'completed' || empty($conversion['path_out'])) {
            return null;
        }

        $token     = bin2hex(random_bytes(24));
        $expiresAt = (new \DateTime())->modify("+{$ttlSeconds} seconds")->format('Y-m-d H:i:s');

        $stmt = Database::connection()->prepare(
            'UPDATE conversions
             SET share_token = :token, share_expires_at = :expires
             WHERE id = :id AND user_id = :user_id
             RETURNING id, share_token, share_expires_at'
        );
        $stmt->execute([
            'token'   => $token,
            'expires' => $expiresAt,
            'id'      => $id,
            'user_id' => $userId,
        ]);

        return $stmt->fetch() ?: null;
    }

    public static function revokeShareLink(int $id, int $userId): bool
    {
        $stmt = Database::connection()->prepare(
            'UPDATE conversions
             SET share_token = NULL, share_expires_at = NULL
             WHERE id = :id AND user_id = :user_id'
        );
        $stmt->execute(['id' => $id, 'user_id' => $userId]);
        return $stmt->rowCount() > 0;
    }

    public static function findByShareToken(string $token): ?array
    {
        $stmt = Database::connection()->prepare(
            'SELECT * FROM conversions WHERE share_token = :token'
        );
        $stmt->execute(['token' => $token]);
        $row = $stmt->fetch();
        return $row ?: null;
    }
}