<?php
declare(strict_types=1);

/**
 * Идемпотентный накат SQL-миграций (db/migration_*.sql).
 * Запуск ТОЛЬКО из CLI (по SSH в деплое):  php api/migrate.php
 *
 * Учёт применённого — таблица schema_migrations. Повторный запуск безопасен:
 * уже применённые файлы пропускаются, а «объект уже существует» (колонка/таблица
 * заведена ранее вручную) не роняет процесс.
 *
 * Начальная схема db/schema.sql накатывается один раз вручную — здесь только
 * инкрементальные migration_*.sql.
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit("forbidden\n");
}

$cfg = require __DIR__ . '/config.php';

if (empty($cfg['db_name']) || empty($cfg['db_user'])) {
    fwrite(STDERR, "БД не настроена (api/config.local.php)\n");
    exit(1);
}

$dsn = sprintf(
    'mysql:host=%s;dbname=%s;charset=%s',
    $cfg['db_host'],
    $cfg['db_name'],
    $cfg['db_charset']
);

try {
    $pdo = new PDO($dsn, $cfg['db_user'], $cfg['db_pass'], [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]);
} catch (PDOException $e) {
    fwrite(STDERR, 'Нет подключения к БД: ' . $e->getMessage() . "\n");
    exit(1);
}

$pdo->exec(
    'CREATE TABLE IF NOT EXISTS schema_migrations (
        name VARCHAR(255) NOT NULL PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
);

$applied = array_flip($pdo->query('SELECT name FROM schema_migrations')->fetchAll(PDO::FETCH_COLUMN));

$files = glob(__DIR__ . '/../db/migration_*.sql') ?: [];
sort($files);

if (!$files) {
    echo "Миграции не найдены (db/migration_*.sql).\n";
    exit(0);
}

// SQLSTATE «объект уже существует»: дубль колонки / таблица существует
$ignorable = ['42S21', '42S01'];

$ran = 0;
foreach ($files as $file) {
    $name = basename($file);
    if (isset($applied[$name])) {
        echo "= пропуск (уже применена): $name\n";
        continue;
    }
    foreach (splitSql((string) file_get_contents($file)) as $stmt) {
        try {
            $pdo->exec($stmt);
        } catch (PDOException $e) {
            if (in_array((string) $e->getCode(), $ignorable, true)) {
                echo '  ~ уже применено, пропускаю: ' . trim(substr($stmt, 0, 60)) . "…\n";
                continue;
            }
            fwrite(STDERR, "ОШИБКА в $name: " . $e->getMessage() . "\n");
            exit(1);
        }
    }
    $pdo->prepare('INSERT INTO schema_migrations (name) VALUES (:n)')->execute([':n' => $name]);
    echo "+ применена: $name\n";
    $ran++;
}

echo $ran ? "Готово: применено $ran.\n" : "Новых миграций нет.\n";

/** Грубое разбиение на стейтменты: убираем строчные комментарии «--», делим по «;». */
function splitSql(string $sql): array
{
    $clean = [];
    foreach (preg_split('/\r?\n/', $sql) as $line) {
        if (substr(ltrim($line), 0, 2) === '--') {
            continue;
        }
        $clean[] = $line;
    }
    $parts = array_map('trim', explode(';', implode("\n", $clean)));
    return array_values(array_filter($parts, fn ($s) => $s !== ''));
}
