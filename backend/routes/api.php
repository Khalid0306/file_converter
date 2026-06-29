<?php

use App\Controllers\AuthController;
use App\Controllers\ConversionController;
use App\Controllers\AdminController;
use App\Middleware\AuthMiddleware;
use App\Middleware\AdminMiddleware;

/** @var \App\Core\Router $router */

// ── Public ──
$router->post('/api/auth/register', [AuthController::class, 'register']);
$router->post('/api/auth/login',    [AuthController::class, 'login']);

// ── Authentifié (user) ──
$router->delete('/api/auth/logout', [AuthController::class, 'logout'], [AuthMiddleware::class]);

$router->post('/api/conversions',                [ConversionController::class, 'store'],    [AuthMiddleware::class]);
$router->get('/api/conversions',                 [ConversionController::class, 'index'],    [AuthMiddleware::class]);
$router->get('/api/conversions/{id}/download',   [ConversionController::class, 'download'], [AuthMiddleware::class]);
$router->delete('/api/conversions/{id}',         [ConversionController::class, 'destroy'],  [AuthMiddleware::class]);

// ── Admin uniquement ──
$router->get('/api/admin/users',         [AdminController::class, 'users'],       [AuthMiddleware::class, AdminMiddleware::class]);
$router->put('/api/admin/users/{id}',    [AdminController::class, 'updateUser'],  [AuthMiddleware::class, AdminMiddleware::class]);
$router->delete('/api/admin/users/{id}', [AdminController::class, 'deleteUser'],  [AuthMiddleware::class, AdminMiddleware::class]);
$router->get('/api/admin/conversions',   [AdminController::class, 'conversions'], [AuthMiddleware::class, AdminMiddleware::class]);
$router->get('/api/admin/stats',         [AdminController::class, 'stats'],       [AuthMiddleware::class, AdminMiddleware::class]);

// ── Partage public ──
$router->post('/api/conversions/{id}/share',     [ConversionController::class, 'share'],   [AuthMiddleware::class]);
$router->delete('/api/conversions/{id}/share',   [ConversionController::class, 'unshare'], [AuthMiddleware::class]);
$router->get('/api/share/{token}',               [ConversionController::class, 'publicDownload']); // public, sans middleware