<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Core\Response;
use App\Core\Jwt;
use App\Models\User;

class AuthController
{
    private const TOKEN_TTL = 86400; // 24h, sans refresh

    public function register(Request $request): void
    {
        $name     = trim((string) $request->input('name', ''));
        $email    = trim((string) $request->input('email', ''));
        $password = (string) $request->input('password', '');

        if ($name === '' || $email === '' || $password === '') {
            Response::error('Name, email and password are required', 422);
            return;
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            Response::error('Invalid email format', 422);
            return;
        }

        if (strlen($password) < 8) {
            Response::error('Password must be at least 8 characters', 422);
            return;
        }

        if (User::emailExists($email)) {
            Response::error('Email already registered', 409);
            return;
        }

        $passwordHash = password_hash($password, PASSWORD_BCRYPT);
        $user = User::create($name, $email, $passwordHash);

        $token = Jwt::encode(['sub' => $user['id'], 'role' => $user['role']], self::TOKEN_TTL);

        Response::json(['user' => $user, 'token' => $token], 201);
    }

    public function login(Request $request): void
    {
        $email    = trim((string) $request->input('email', ''));
        $password = (string) $request->input('password', '');

        if ($email === '' || $password === '') {
            Response::error('Email and password are required', 422);
            return;
        }

        $user = User::findByEmail($email);

        if (!$user || !password_verify($password, $user['password_hash'])) {
            Response::error('Invalid credentials', 401);
            return;
        }

        $token = Jwt::encode(['sub' => $user['id'], 'role' => $user['role']], self::TOKEN_TTL);
        unset($user['password_hash']);

        Response::json(['user' => $user, 'token' => $token]);
    }

    public function logout(Request $request): void
    {
        // JWT stateless : rien à invalider côté serveur.
        // Le frontend doit simplement supprimer le token stocké (localStorage/cookie).
        Response::json(['message' => 'Logged out']);
    }
}