<?php
declare(strict_types=1);

/** Middleware проверки Bearer-токена (общий секрет, один пользователь). */
final class Auth
{
    public static function require(array $cfg): void
    {
        $expected = $cfg['token'] ?? null;
        if (empty($expected)) {
            Response::error('Токен на сервере не настроен', 500);
        }
        $provided = self::bearer();
        if ($provided === null || !hash_equals((string) $expected, $provided)) {
            Response::error('Unauthorized', 401);
        }
    }

    private static function bearer(): ?string
    {
        $header = null;

        if (!empty($_SERVER['HTTP_AUTHORIZATION'])) {
            $header = $_SERVER['HTTP_AUTHORIZATION'];
        } elseif (!empty($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
            $header = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
        } elseif (function_exists('apache_request_headers')) {
            $headers = apache_request_headers();
            foreach ($headers as $k => $v) {
                if (strcasecmp($k, 'Authorization') === 0) { $header = $v; break; }
            }
        }

        if ($header === null) {
            return null;
        }
        if (preg_match('/Bearer\s+(.+)/i', $header, $m)) {
            return trim($m[1]);
        }
        return null;
    }
}
