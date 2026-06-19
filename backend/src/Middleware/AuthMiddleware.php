<?php

declare(strict_types=1);

namespace App\Middleware;

use App\Core\Request;
use App\Core\Response;

class AuthMiddleware
{
    public function handle(Request $request): void
    {
        $token = $request->bearerToken();

        if (!$token) {
            Response::error('Missing authentication token', 401);
            exit;
        }

        // TODO (prochaine étape) : remplacer par Jwt::verify($token)
        $request->setContext('user', ['id' => 1, 'role' => 'user']); // stub temporaire
    }
}