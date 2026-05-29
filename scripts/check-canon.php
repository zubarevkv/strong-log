<?php
declare(strict_types=1);

/**
 * Проверка синхронности словаря канона названий упражнений в двух местах:
 *   - PHP:  api/lib/Canon.php  (Canon::MAP)  — серверный сейв/импорт/сидинг
 *   - JS:   src/data.js        (export const CANON) — клиентский сейв
 *
 * Карта дублируется намеренно (разные рантаймы), но обязана совпадать.
 * Скрипт падает с ненулевым кодом и списком расхождений.
 *
 * Запуск (CLI):  php scripts/check-canon.php
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit("check-canon.php запускается только из CLI\n");
}

require __DIR__ . '/../api/lib/Canon.php';
$php = Canon::MAP;

$jsFile = __DIR__ . '/../src/data.js';
$src = is_file($jsFile) ? (string) file_get_contents($jsFile) : '';
if ($src === '') {
    fwrite(STDERR, "Не удалось прочитать src/data.js\n");
    exit(1);
}

// вырезаем тело объекта: export const CANON = { ... };
if (!preg_match('/export\s+const\s+CANON\s*=\s*\{(.*?)\};/s', $src, $m)) {
    fwrite(STDERR, "В src/data.js не найден объект CANON\n");
    exit(1);
}
$body = $m[1];

// пары "ключ": "значение"
preg_match_all('/"([^"]+)"\s*:\s*"([^"]+)"/u', $body, $pairs, PREG_SET_ORDER);
$js = [];
foreach ($pairs as $p) {
    $js[$p[1]] = $p[2];
}

if (!$js) {
    fwrite(STDERR, "Не удалось распарсить пары CANON из src/data.js\n");
    exit(1);
}

$errors = [];
foreach ($php as $alias => $canon) {
    if (!array_key_exists($alias, $js)) {
        $errors[] = "только в PHP: «{$alias}» → «{$canon}»";
    } elseif ($js[$alias] !== $canon) {
        $errors[] = "канон расходится для «{$alias}»: PHP «{$canon}» ≠ JS «{$js[$alias]}»";
    }
}
foreach ($js as $alias => $canon) {
    if (!array_key_exists($alias, $php)) {
        $errors[] = "только в JS: «{$alias}» → «{$canon}»";
    }
}

if ($errors) {
    fwrite(STDERR, "Канон рассинхронизирован (api/lib/Canon.php ↔ src/data.js):\n");
    foreach ($errors as $e) {
        fwrite(STDERR, "  ✗ {$e}\n");
    }
    exit(1);
}

echo "✓ Канон синхронен: " . count($php) . " синонимов совпадают в PHP и JS.\n";
