<?php

declare(strict_types=1);

namespace App\Core;

class Request
{
    private array $params  = [];
    private array $context = [];

    private function __construct(
        private string $method,
        private string $path,
        private array $query,
        private array $body,
        private array $headers
    ) {}

    public static function fromGlobals(): self
    {
        $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
        $uri    = $_SERVER['REQUEST_URI'] ?? '/';
        $path   = rtrim(strtok($uri, '?') ?: '/', '/');
        $path   = $path === '' ? '/' : $path;

        $rawBody = file_get_contents('php://input') ?: '';
        $decoded = json_decode($rawBody, true);
        $body    = is_array($decoded) ? $decoded : [];

        $headers = [];
        foreach ($_SERVER as $key => $value) {
            if (str_starts_with($key, 'HTTP_')) {
                $headers[str_replace('_', '-', substr($key, 5))] = $value;
            }
        }
        if (isset($_SERVER['CONTENT_TYPE'])) {
            $headers['CONTENT-TYPE'] = $_SERVER['CONTENT_TYPE'];
        }

        return new self($method, $path, $_GET, $body, $headers);
    }

    public function method(): string { return $this->method; }
    public function path(): string { return $this->path; }

    public function setParams(array $params): void { $this->params = $params; }
    public function param(string $key, mixed $default = null): mixed
    {
        return $this->params[$key] ?? $default;
    }

    public function input(string $key, mixed $default = null): mixed
    {
        return $this->body[$key] ?? $default;
    }

    public function all(): array { return $this->body; }

    public function query(string $key, mixed $default = null): mixed
    {
        return $this->query[$key] ?? $default;
    }

    public function header(string $name): ?string
    {
        return $this->headers[strtoupper($name)] ?? null;
    }

    public function bearerToken(): ?string
    {
        $auth = $this->header('AUTHORIZATION');
        if ($auth && str_starts_with($auth, 'Bearer ')) {
            return substr($auth, 7);
        }
        return null;
    }

    // Utilisé par les middlewares pour transmettre des données au contrôleur
    public function setContext(string $key, mixed $value): void { $this->context[$key] = $value; }
    public function context(string $key, mixed $default = null): mixed { return $this->context[$key] ?? $default; }
}