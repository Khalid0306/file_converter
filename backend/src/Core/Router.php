<?php

declare(strict_types=1);

namespace App\Core;

class Router
{
    private array $routes = [];

    public function get(string $pattern, array $handler, array $middleware = []): void
    {
        $this->add('GET', $pattern, $handler, $middleware);
    }

    public function post(string $pattern, array $handler, array $middleware = []): void
    {
        $this->add('POST', $pattern, $handler, $middleware);
    }

    public function put(string $pattern, array $handler, array $middleware = []): void
    {
        $this->add('PUT', $pattern, $handler, $middleware);
    }

    public function delete(string $pattern, array $handler, array $middleware = []): void
    {
        $this->add('DELETE', $pattern, $handler, $middleware);
    }

    private function add(string $method, string $pattern, array $handler, array $middleware): void
    {
        $this->routes[] = [
            'method'     => $method,
            'regex'      => $this->compile($pattern),
            'handler'    => $handler,
            'middleware' => $middleware,
        ];
    }

    private function compile(string $pattern): string
    {
        // Transforme /api/conversions/{id} en regex nommée
        $escaped = preg_replace('#\{([a-zA-Z_][a-zA-Z0-9_]*)\}#', '(?P<$1>[^/]+)', $pattern);
        return '#^' . $escaped . '$#';
    }

    public function dispatch(Request $request): void
    {
        $method = $request->method();
        $path   = $request->path();
        $allowedMethods = [];

        foreach ($this->routes as $route) {
            if (!preg_match($route['regex'], $path, $matches)) {
                continue;
            }

            if ($route['method'] !== $method) {
                $allowedMethods[] = $route['method'];
                continue;
            }

            // Garde uniquement les groupes nommés (les paramètres de route)
            $params = array_filter(
                $matches,
                fn($key) => is_string($key),
                ARRAY_FILTER_USE_KEY
            );
            $request->setParams($params);

            foreach ($route['middleware'] as $middlewareClass) {
                (new $middlewareClass())->handle($request);
            }

            [$controllerClass, $methodName] = $route['handler'];
            (new $controllerClass())->$methodName($request);
            return;
        }

        if (!empty($allowedMethods)) {
            Response::error('Method not allowed', 405);
            return;
        }

        Response::error('Not found', 404);
    }
}