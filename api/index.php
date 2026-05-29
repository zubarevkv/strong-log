<?php
declare(strict_types=1);

/**
 * STRØNG·LOG API — фронт-контроллер.
 * Маршруты (база /api):
 *   GET    /sessions          -> [Session]
 *   POST   /sessions          <- Session   (upsert по id)
 *   DELETE /sessions/{id}
 *   GET    /bio               -> [BioEntry]
 *   POST   /bio               <- BioEntry   (upsert по date)
 *   DELETE /bio/{id}
 *   GET    /export            -> { sessions:[...], bio:[...] }   (бэкап)
 *   POST   /import            <- { sessions:[...], bio:[...] }   (восстановление/миграция)
 * Авторизация: заголовок Authorization: Bearer <TOKEN>.
 */

require __DIR__ . '/lib/Response.php';
require __DIR__ . '/lib/Db.php';
require __DIR__ . '/lib/Auth.php';
require __DIR__ . '/lib/Canon.php';

$cfg = require __DIR__ . '/config.php';

// единый перехват фатальных ошибок -> JSON (детали в лог, наружу — generic)
set_exception_handler(function (Throwable $e) {
    error_log('[strong-log] ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
    Response::error('Внутренняя ошибка сервера', 500);
});

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// путь относительно базовой директории API
$base = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'])), '/');
$uri  = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/';
$path = $uri;
if ($base !== '' && strpos($uri, $base) === 0) {
    $path = substr($uri, strlen($base));
}
$path = '/' . trim($path, '/');
$parts = $path === '/' ? [] : explode('/', trim($path, '/'));

// CORS preflight (на одном домене не нужен, но не мешает)
if ($method === 'OPTIONS') {
    Response::noContent();
}

// --- middleware: токен ---
Auth::require($cfg);

$resource = $parts[0] ?? '';
$id       = $parts[1] ?? null;

$known = ['sessions', 'bio', 'export', 'import'];
if (!in_array($resource, $known, true)) {
    Response::error('Not found', 404);
}

// БД нужна только для известных маршрутов
$pdo = Db::pdo($cfg);

if ($resource === 'sessions') {
    handleSessions($pdo, $method, $id);
} elseif ($resource === 'bio') {
    handleBio($pdo, $method, $id);
} elseif ($resource === 'export') {
    handleExport($pdo, $method);
} else {
    handleImport($pdo, $method);
}

/* ============================================================
 * SESSIONS
 * ========================================================== */
function handleSessions(PDO $pdo, string $method, ?string $id): void
{
    if ($method === 'GET') {
        Response::json(allSessions($pdo));
    }

    if ($method === 'POST') {
        $b = readJson();
        $sid = trim((string) ($b['id'] ?? ''));
        $date = (string) ($b['date'] ?? '');
        $tpl = (string) ($b['templateId'] ?? '');
        $exercises = $b['exercises'] ?? null;

        if ($sid === '' || !validDate($date) || $tpl === '' || !is_array($exercises)) {
            Response::error('Некорректная сессия', 422);
        }
        // нормализуем названия на сервере (шаг 6): дубли синонимов не попадают в БД
        $exercises = Canon::exercises($exercises);
        upsertSession($pdo, $sid, $date, $tpl, $exercises);
        Response::json([
            'id' => $sid, 'date' => $date, 'templateId' => $tpl, 'exercises' => $exercises,
        ]);
    }

    if ($method === 'DELETE') {
        if (!$id) Response::error('Нужен id', 400);
        $stmt = $pdo->prepare('DELETE FROM sessions WHERE id = :id');
        $stmt->execute([':id' => $id]);
        if ($stmt->rowCount() === 0) Response::error('Not found', 404);
        Response::noContent();
    }

    Response::error('Method not allowed', 405);
}

/* ============================================================
 * BIO
 * ========================================================== */
function handleBio(PDO $pdo, string $method, ?string $id): void
{
    $metrics = ['weight', 'fat', 'muscle', 'water', 'visceral', 'bone'];

    if ($method === 'GET') {
        Response::json(allBio($pdo));
    }

    if ($method === 'POST') {
        $b = readJson();
        $bid = trim((string) ($b['id'] ?? ''));
        $date = (string) ($b['date'] ?? '');
        if ($bid === '' || !validDate($date)) {
            Response::error('Некорректный замер', 422);
        }
        if (!validBioMetrics($b)) {
            Response::error('Некорректное значение метрики', 422);
        }
        upsertBio($pdo, $b, $metrics);
        Response::json(bioById($pdo, $date, $metrics));
    }

    if ($method === 'DELETE') {
        if (!$id) Response::error('Нужен id', 400);
        $stmt = $pdo->prepare('DELETE FROM bio_entries WHERE id = :id');
        $stmt->execute([':id' => $id]);
        if ($stmt->rowCount() === 0) Response::error('Not found', 404);
        Response::noContent();
    }

    Response::error('Method not allowed', 405);
}

function bioById(PDO $pdo, string $date, array $metrics): array
{
    $stmt = $pdo->prepare('SELECT * FROM bio_entries WHERE date = :date');
    $stmt->execute([':date' => $date]);
    $r = $stmt->fetch();
    if (!$r) return [];
    $o = ['id' => $r['id'], 'date' => $r['date'], 'note' => $r['note'] ?? ''];
    foreach ($metrics as $m) {
        $o[$m] = $r[$m] === null ? null : (float) $r[$m];
    }
    return $o;
}

/* ============================================================
 * EXPORT / IMPORT (бэкап и миграция, HANDOFF §8)
 * ========================================================== */
function handleExport(PDO $pdo, string $method): void
{
    if ($method !== 'GET') Response::error('Method not allowed', 405);
    Response::json([
        'sessions' => allSessions($pdo),
        'bio'      => allBio($pdo),
    ]);
}

function handleImport(PDO $pdo, string $method): void
{
    if ($method !== 'POST') Response::error('Method not allowed', 405);

    $b = readJson();
    $sessions = $b['sessions'] ?? [];
    $bio = $b['bio'] ?? [];
    if (!is_array($sessions) || !is_array($bio)) {
        Response::error('Ожидался { sessions:[...], bio:[...] }', 422);
    }

    $metrics = ['weight', 'fat', 'muscle', 'water', 'visceral', 'bone'];
    $nS = 0; $nB = 0;

    $pdo->beginTransaction();
    try {
        foreach ($sessions as $s) {
            if (!is_array($s)) continue;
            $sid = trim((string) ($s['id'] ?? ''));
            $date = (string) ($s['date'] ?? '');
            $tpl = (string) ($s['templateId'] ?? '');
            $ex = $s['exercises'] ?? null;
            if ($sid === '' || !validDate($date) || $tpl === '' || !is_array($ex)) continue;
            // та же нормализация названий, что и при сейве (шаг 6)
            upsertSession($pdo, $sid, $date, $tpl, Canon::exercises($ex));
            $nS++;
        }
        foreach ($bio as $e) {
            if (!is_array($e)) continue;
            $bid = trim((string) ($e['id'] ?? ''));
            $date = (string) ($e['date'] ?? '');
            if ($bid === '' || !validDate($date) || !validBioMetrics($e)) continue;
            upsertBio($pdo, $e, $metrics);
            $nB++;
        }
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }

    Response::json(['imported' => ['sessions' => $nS, 'bio' => $nB]]);
}

/* ---------- query helpers (общие для GET и export) ---------- */
function allSessions(PDO $pdo): array
{
    $rows = $pdo->query('SELECT id, date, template_id, data FROM sessions ORDER BY date DESC, id DESC')->fetchAll();
    return array_map(function ($r) {
        return [
            'id'         => $r['id'],
            'date'       => $r['date'],
            'templateId' => $r['template_id'],
            'exercises'  => json_decode($r['data'], true) ?: [],
        ];
    }, $rows);
}

function allBio(PDO $pdo): array
{
    $metrics = ['weight', 'fat', 'muscle', 'water', 'visceral', 'bone'];
    $rows = $pdo->query('SELECT * FROM bio_entries ORDER BY date DESC')->fetchAll();
    return array_map(function ($r) use ($metrics) {
        $o = ['id' => $r['id'], 'date' => $r['date'], 'note' => $r['note'] ?? ''];
        foreach ($metrics as $m) {
            $o[$m] = $r[$m] === null ? null : (float) $r[$m];
        }
        return $o;
    }, $rows);
}

/* ---------- upsert helpers (общие для POST и import) ---------- */
function upsertSession(PDO $pdo, string $id, string $date, string $tpl, array $exercises): void
{
    $stmt = $pdo->prepare(
        'INSERT INTO sessions (id, date, template_id, data)
         VALUES (:id, :date, :tpl, :data)
         ON DUPLICATE KEY UPDATE date = VALUES(date), template_id = VALUES(template_id), data = VALUES(data)'
    );
    $stmt->execute([
        ':id'   => $id,
        ':date' => $date,
        ':tpl'  => $tpl,
        ':data' => json_encode($exercises, JSON_UNESCAPED_UNICODE),
    ]);
}

function upsertBio(PDO $pdo, array $b, array $metrics): void
{
    $vals = [
        ':id'   => trim((string) ($b['id'] ?? '')),
        ':date' => (string) ($b['date'] ?? ''),
        ':note' => (string) ($b['note'] ?? ''),
    ];
    foreach ($metrics as $m) {
        $vals[':' . $m] = (isset($b[$m]) && $b[$m] !== null && $b[$m] !== '') ? (float) $b[$m] : null;
    }
    // upsert по уникальной дате (один замер в день) либо по id
    $stmt = $pdo->prepare(
        'INSERT INTO bio_entries (id, date, weight, fat, muscle, water, visceral, bone, note)
         VALUES (:id, :date, :weight, :fat, :muscle, :water, :visceral, :bone, :note)
         ON DUPLICATE KEY UPDATE
           weight = VALUES(weight), fat = VALUES(fat), muscle = VALUES(muscle),
           water = VALUES(water), visceral = VALUES(visceral), bone = VALUES(bone),
           note = VALUES(note)'
    );
    $stmt->execute($vals);
}

/* ---------- helpers ---------- */
function readJson(): array
{
    $raw = file_get_contents('php://input');
    $data = json_decode($raw ?: '', true);
    if (!is_array($data)) {
        Response::error('Ожидался JSON', 400);
    }
    return $data;
}

function validDate(string $d): bool
{
    if (!preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $d, $m)) {
        return false;
    }
    return checkdate((int) $m[2], (int) $m[3], (int) $m[1]);
}

/**
 * Биометрики не должны быть отрицательными или превышать ёмкость колонок
 * (schema.sql: weight/muscle DECIMAL(5,1) -> 9999.9; остальные DECIMAL(4,1) -> 999.9),
 * иначе strict-режим MySQL отдаст 500. Пустое/null поле допустимо (пропуск метрики).
 */
function validBioMetrics(array $b): bool
{
    $max = ['weight' => 9999.9, 'muscle' => 9999.9, 'fat' => 999.9, 'water' => 999.9, 'visceral' => 999.9, 'bone' => 999.9];
    foreach ($max as $m => $limit) {
        if (!isset($b[$m]) || $b[$m] === null || $b[$m] === '') continue;
        if (!is_numeric($b[$m])) return false;
        $v = (float) $b[$m];
        if ($v < 0 || $v > $limit) return false;
    }
    return true;
}
