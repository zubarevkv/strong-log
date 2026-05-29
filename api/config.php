<?php
declare(strict_types=1);

/**
 * Конфиг бэкенда.
 * Приоритет: api/config.local.php (в .gitignore) -> переменные окружения.
 * Реальные секреты НЕ коммитим. См. config.local.example.php.
 */

$local = [];
$localFile = __DIR__ . '/config.local.php';
if (is_file($localFile)) {
    /** @var array $local */
    $local = require $localFile;
}

function cfg_val(array $local, string $key, string $env, ?string $default = null): ?string
{
    if (array_key_exists($key, $local) && $local[$key] !== null && $local[$key] !== '') {
        return (string) $local[$key];
    }
    $v = getenv($env);
    if ($v !== false && $v !== '') {
        return $v;
    }
    return $default;
}

return [
    // Секретный токен доступа (общий секрет для одного пользователя)
    'token'   => cfg_val($local, 'token', 'STRONGLOG_TOKEN'),

    // Доступ к БД (MySQL)
    'db_host' => cfg_val($local, 'db_host', 'DB_HOST', 'localhost'),
    'db_name' => cfg_val($local, 'db_name', 'DB_NAME'),
    'db_user' => cfg_val($local, 'db_user', 'DB_USER'),
    'db_pass' => cfg_val($local, 'db_pass', 'DB_PASS', ''),
    'db_charset' => cfg_val($local, 'db_charset', 'DB_CHARSET', 'utf8mb4'),
];
