<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Core\Response;

class AuthController
{
    public function register(Request $request): void
    {
        Response::json(['message' => 'register — à implémenter'], 501);
    }

    public function login(Request $request): void
    {
        Response::json(['message' => 'login — à implémenter'], 501);
    }

    public function logout(Request $request): void
    {
        Response::json(['message' => 'logged out']);
    }
}