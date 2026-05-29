<?php
declare(strict_types=1);

/**
 * Сид исторических тренировок в БД (HANDOFF §7, шаг 5).
 *
 * Источник — db/seed-history.json (10 тренировок 21.03–17.05.2026,
 * распарсенные из fitness-trains.xlsx). Названия канонизируются той же
 * логикой, что и API (api/lib/Canon.php), поэтому синонимы из истории
 * («Отжимания на брусьях», «Сведения в кроссовере» и т.п.) приводятся к канону.
 *
 * Идемпотентно: upsert по фиксированным id из JSON — повторный запуск
 * не плодит дублей. Конфиг и доступ к БД берутся из api/config.php.
 *
 * Запуск (CLI):  php db/seed.php
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit("seed.php запускается только из CLI\n");
}

require __DIR__ . '/../api/lib/Response.php';
require __DIR__ . '/../api/lib/Db.php';
require __DIR__ . '/../api/lib/Canon.php';

$cfg = require __DIR__ . '/../api/config.php';

$file = __DIR__ . '/seed-history.json';
$raw = is_file($file) ? file_get_contents($file) : false;
$sessions = $raw !== false ? json_decode($raw, true) : null;
if (!is_array($sessions)) {
    fwrite(STDERR, "Не удалось прочитать db/seed-history.json\n");
    exit(1);
}

$pdo = Db::pdo($cfg);
$stmt = $pdo->prepare(
    'INSERT INTO sessions (id, date, template_id, data)
     VALUES (:id, :date, :tpl, :data)
     ON DUPLICATE KEY UPDATE date = VALUES(date), template_id = VALUES(template_id), data = VALUES(data)'
);

$n = 0;
foreach ($sessions as $s) {
    if (!is_array($s)) continue;
    $id = (string) ($s['id'] ?? '');
    $date = (string) ($s['date'] ?? '');
    $tpl = (string) ($s['templateId'] ?? '');
    $ex = is_array($s['exercises'] ?? null) ? $s['exercises'] : [];
    if ($id === '' || $date === '' || $tpl === '') continue;

    $stmt->execute([
        ':id'   => $id,
        ':date' => $date,
        ':tpl'  => $tpl,
        ':data' => json_encode(Canon::exercises($ex), JSON_UNESCAPED_UNICODE),
    ]);
    $n++;
    echo "  ✓ {$id}  {$date}  {$tpl}\n";
}

echo "Засижено тренировок: {$n}\n";
