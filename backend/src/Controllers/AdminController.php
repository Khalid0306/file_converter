<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Core\Response;

class AdminController
{
    public function users(Request $request): void
    {
        Response::json(['message' => 'liste des users — à implémenter'], 501);
    }

    public function updateUser(Request $request): void
    {
        Response::json(['message' => 'update user — id=' . $request->param('id')], 501);
    }

    public function deleteUser(Request $request): void
    {
        Response::json(['message' => 'delete user — id=' . $request->param('id')], 501);
    }

    public function conversions(Request $request): void
    {
        Response::json(['message' => 'toutes les conversions — à implémenter'], 501);
    }

    public function stats(Request $request): void
    {
        Response::json(['message' => 'statistiques — à implémenter'], 501);
    }
}