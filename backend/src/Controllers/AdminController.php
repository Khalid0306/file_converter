<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Core\Response;
use App\Models\Conversion;
use App\Models\User;

class AdminController
{
    public function users(Request $request): void
    {
        Response::json(['users' => User::all()]);
    }

    public function updateUser(Request $request): void
    {
        $userId = (int) $request->param('id');
        $name = trim((string) $request->input('name', ''));
        $email = trim((string) $request->input('email', ''));
        $role = (string) $request->input('role', 'user');

        if ($name === '' || $email === '') {
            Response::error('Name and email are required', 422);
            return;
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            Response::error('Invalid email format', 422);
            return;
        }

        $existing = User::findByEmail($email);
        if ($existing && (int) $existing['id'] !== $userId) {
            Response::error('Email already registered', 409);
            return;
        }

        $updated = User::update($userId, ['name' => $name, 'email' => $email, 'role' => $role]);
        if (!$updated) {
            Response::error('User not found', 404);
            return;
        }

        Response::json(['user' => $updated]);
    }

    public function deleteUser(Request $request): void
    {
        $userId = (int) $request->param('id');

        if (User::delete($userId)) {
            Response::json(['ok' => true]);
            return;
        }

        Response::error('User not found', 404);
    }

    public function conversions(Request $request): void
    {
        $filters = [
            'format' => trim((string) $request->query('format', '')),
            'search' => trim((string) $request->query('search', '')),
            'sort' => (string) $request->query('sort', 'created_at'),
            'order' => (string) $request->query('order', 'desc'),
        ];

        Response::json(['conversions' => Conversion::listAll($filters)]);
    }

    public function stats(Request $request): void
    {
        Response::json(Conversion::stats());
    }
}