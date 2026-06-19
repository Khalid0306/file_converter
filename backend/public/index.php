<?php

declare(strict_types=1);

require __DIR__ . '/../vendor/autoload.php';

use App\Core\Router;
use App\Core\Request;
use App\Core\Response;

// CORS — autorise les appels AJAX du frontend
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

header('Content-Type: application/json; charset=utf-8');

$router = new Router();
require __DIR__ . '/../routes/api.php'; // déclare les routes sur $router

$request = Request::fromGlobals();

try {
    $router->dispatch($request);
} catch (\Throwable $e) {
    Response::error('Internal server error', 500, ['detail' => $e->getMessage()]);
}