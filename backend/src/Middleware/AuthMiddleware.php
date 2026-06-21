<?php

declare(strict_types=1);

namespace App\Middleware;

use App\Core\Request;
use App\Core\Response;
use App\Core\Jwt;

class AuthMiddleware
{
    public function handle(Request $request): void
    {
        $token = $request->bearerToken();

        if (!$token) {
            Response::error('Missing authentication token', 401);
            exit;
        }

        try {
            $payload = Jwt::decode($token);
        } catch (\RuntimeException $e) {
            Response::error('Invalid or expired token', 401);
            exit;
        }

        $request->setContext('user', [
            'id'   => (int) $payload['sub'],
            'role' => $payload['role'],
        ]);
    }
}