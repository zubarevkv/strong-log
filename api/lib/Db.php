<?php
declare(strict_types=1);

/** Подключение к MySQL через PDO (prepared statements включены). */
final class Db
{
    private static ?PDO $pdo = null;

    public static function pdo(array $cfg): PDO
    {
        if (self::$pdo !== null) {
            return self::$pdo;
        }
        if (empty($cfg['db_name']) || empty($cfg['db_user'])) {
            Response::error('БД не настроена (см. api/config.local.php)', 500);
        }
        $dsn = sprintf(
            'mysql:host=%s;dbname=%s;charset=%s',
            $cfg['db_host'],
            $cfg['db_name'],
            $cfg['db_charset']
        );
        try {
            self::$pdo = new PDO($dsn, $cfg['db_user'], $cfg['db_pass'], [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]);
        } catch (PDOException $e) {
            Response::error('Не удалось подключиться к БД', 500);
        }
        return self::$pdo;
    }
}
