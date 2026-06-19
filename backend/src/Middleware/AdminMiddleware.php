<?php

declare(strict_types=1);

namespace App\Middleware;

use App\Core\Request;
use App\Core\Response;

class AdminMiddleware
{
    public function handle(Request $request): void
    {
        $user = $request->context('user');

        if (!$user || $user['role'] !== 'admin') {
            Response::error('Admin privileges required', 403);
            exit;
        }
    }
}