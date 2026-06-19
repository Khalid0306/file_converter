<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Core\Response;

class ConversionController
{
    public function store(Request $request): void
    {
        Response::json(['message' => 'upload + conversion — à implémenter'], 501);
    }

    public function index(Request $request): void
    {
        Response::json(['message' => 'historique — à implémenter'], 501);
    }

    public function download(Request $request): void
    {
        Response::json(['message' => 'téléchargement — id=' . $request->param('id')], 501);
    }

    public function destroy(Request $request): void
    {
        Response::json(['message' => 'suppression — id=' . $request->param('id')], 501);
    }
}