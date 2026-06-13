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
 *   GET    /templates         -> [Template]
 *   POST   /templates         <- Template   (upsert по id)
 *   DELETE /templates/{id}
 *   GET    /settings          -> Settings (объект; {} если нет)
 *   POST   /settings          <- Settings (upsert единственной строки)
 * Авторизация: заголовок Authorization: Bearer <TOKEN>.
 */

require __DIR__ . '/lib/Response.php';
require __DIR__ . '/lib/Db.php';
require __DIR__ . '/lib/Auth.php';
require __DIR__ . '/lib/Exercises.php';

$cfg = require __DIR__ . '/config.php';

// единый перехват фатальных ошибок -> JSON
set_exception_handler(function (Throwable $e) {
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

if ($resource !== 'sessions' && $resource !== 'bio' && $resource !== 'templates' && $resource !== 'settings') {
    Response::error('Not found', 404);
}

// БД нужна только для известных маршрутов
$pdo = Db::pdo($cfg);

if ($resource === 'sessions') {
    handleSessions($pdo, $method, $id);
} elseif ($resource === 'templates') {
    handleTemplates($pdo, $method, $id);
} elseif ($resource === 'settings') {
    handleSettings($pdo, $method);
} else {
    handleBio($pdo, $method, $id);
}

/* ============================================================
 * SESSIONS
 * ========================================================== */
function handleSessions(PDO $pdo, string $method, ?string $id): void
{
    if ($method === 'GET') {
        $rows = $pdo->query('SELECT id, date, template_id, data FROM sessions ORDER BY date DESC, id DESC')->fetchAll();
        $out = array_map(function ($r) {
            return [
                'id'         => $r['id'],
                'date'       => $r['date'],
                'templateId' => $r['template_id'],
                'exercises'  => json_decode($r['data'], true) ?: [],
            ];
        }, $rows);
        Response::json($out);
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
        // exercises должен быть списком объектов-упражнений, а не объектом/скаляром:
        // иначе normExercises молча отбросит всё и сохранит пустую сессию с кодом 200
        foreach ($exercises as $e) {
            if (!is_array($e)) {
                Response::error('Некорректный формат упражнений', 422);
            }
        }
        // канонизация названий + склейка подходов — единый источник правды на сервере
        // (синонимы не плодят дубли, какой бы клиент/импорт ни прислал данные)
        $exercises = Exercises::normExercises($exercises);
        $stmt = $pdo->prepare(
            'INSERT INTO sessions (id, date, template_id, data)
             VALUES (:id, :date, :tpl, :data)
             ON DUPLICATE KEY UPDATE date = VALUES(date), template_id = VALUES(template_id), data = VALUES(data)'
        );
        $stmt->execute([
            ':id'   => $sid,
            ':date' => $date,
            ':tpl'  => $tpl,
            ':data' => json_encode($exercises, JSON_UNESCAPED_UNICODE),
        ]);
        Response::json([
            'id' => $sid, 'date' => $date, 'templateId' => $tpl, 'exercises' => $exercises,
        ]);
    }

    if ($method === 'DELETE') {
        if (!$id) Response::error('Нужен id', 400);
        $stmt = $pdo->prepare('DELETE FROM sessions WHERE id = :id');
        $stmt->execute([':id' => $id]);
        Response::noContent();
    }

    Response::error('Method not allowed', 405);
}

/* ============================================================
 * TEMPLATES (пользовательские программы)
 * ========================================================== */
function handleTemplates(PDO $pdo, string $method, ?string $id): void
{
    if ($method === 'GET') {
        $rows = $pdo->query('SELECT id, name, sub, data FROM templates ORDER BY updated_at DESC, id DESC')->fetchAll();
        $out = array_map(function ($r) {
            return [
                'id'   => $r['id'],
                'name' => $r['name'],
                'sub'  => $r['sub'] ?? '',
                'ex'   => json_decode($r['data'], true) ?: [],
            ];
        }, $rows);
        Response::json($out);
    }

    if ($method === 'POST') {
        $b = readJson();
        $tid  = trim((string) ($b['id'] ?? ''));
        $name = trim((string) ($b['name'] ?? ''));
        $sub  = (string) ($b['sub'] ?? '');
        $ex   = $b['ex'] ?? null;

        if ($tid === '' || $name === '' || !is_array($ex)) {
            Response::error('Некорректная программа', 422);
        }
        // длины колонок (см. db/schema.sql) — не даём MySQL упасть с 500 в strict-режиме
        if (mb_strlen($tid) > 40 || mb_strlen($name) > 120 || mb_strlen($sub) > 160) {
            Response::error('Слишком длинное поле программы', 422);
        }
        $stmt = $pdo->prepare(
            'INSERT INTO templates (id, name, sub, data)
             VALUES (:id, :name, :sub, :data)
             ON DUPLICATE KEY UPDATE name = VALUES(name), sub = VALUES(sub), data = VALUES(data)'
        );
        $stmt->execute([
            ':id'   => $tid,
            ':name' => $name,
            ':sub'  => $sub,
            ':data' => json_encode($ex, JSON_UNESCAPED_UNICODE),
        ]);
        Response::json(['id' => $tid, 'name' => $name, 'sub' => $sub, 'ex' => $ex]);
    }

    if ($method === 'DELETE') {
        if (!$id) Response::error('Нужен id', 400);
        $stmt = $pdo->prepare('DELETE FROM templates WHERE id = :id');
        $stmt->execute([':id' => $id]);
        Response::noContent();
    }

    Response::error('Method not allowed', 405);
}

/* ============================================================
 * SETTINGS (одна строка id='default'; JSON-объект настроек)
 * ========================================================== */
function handleSettings(PDO $pdo, string $method): void
{
    if ($method === 'GET') {
        $stmt = $pdo->prepare("SELECT data FROM settings WHERE id = 'default'");
        $stmt->execute();
        $r = $stmt->fetch();
        Response::json($r ? (json_decode($r['data'], true) ?: (object) []) : (object) []);
    }

    if ($method === 'POST') {
        $b = readJson(); // произвольный объект настроек; клиент мержит с дефолтами
        $stmt = $pdo->prepare(
            "INSERT INTO settings (id, data) VALUES ('default', :data)
             ON DUPLICATE KEY UPDATE data = VALUES(data)"
        );
        $stmt->execute([':data' => json_encode($b, JSON_UNESCAPED_UNICODE)]);
        Response::json($b);
    }

    Response::error('Method not allowed', 405);
}

/* ============================================================
 * BIO
 * ========================================================== */
function handleBio(PDO $pdo, string $method, ?string $id): void
{
    $metrics = ['weight', 'fat', 'muscle', 'water', 'visceral', 'bone', 'protein', 'minerals', 'bmi'];

    if ($method === 'GET') {
        $rows = $pdo->query('SELECT * FROM bio_entries ORDER BY date DESC')->fetchAll();
        $out = array_map(fn ($r) => bioRow($r, $metrics), $rows);
        Response::json($out);
    }

    if ($method === 'POST') {
        $b = readJson();
        $bid = trim((string) ($b['id'] ?? ''));
        $date = (string) ($b['date'] ?? '');
        if ($bid === '' || !validDate($date)) {
            Response::error('Некорректный замер', 422);
        }
        // учитываем только реально существующие колонки: если migration_002
        // ещё не накатана, новые метрики/segments просто пропускаются, а не
        // роняют весь запрос.
        $existing = bioColumns($pdo);
        $vals = [
            ':id' => $bid,
            ':date' => $date,
            ':note' => (string) ($b['note'] ?? ''),
        ];
        $fixed = ['id', 'date', 'note'];
        if (in_array('segments', $existing, true)) {
            $vals[':segments'] = (isset($b['segments']) && is_array($b['segments']) && $b['segments'])
                ? json_encode($b['segments'], JSON_UNESCAPED_UNICODE) : null;
            $fixed[] = 'segments';
        }
        $activeMetrics = array_values(array_filter($metrics, fn ($m) => in_array($m, $existing, true)));
        foreach ($activeMetrics as $m) {
            $vals[':' . $m] = (isset($b[$m]) && $b[$m] !== null && $b[$m] !== '') ? (float) $b[$m] : null;
        }
        // динамический список колонок: фикс. + доступные метрики
        $cols = array_merge($fixed, $activeMetrics);
        $colList = implode(', ', $cols);
        $phList = implode(', ', array_map(fn ($c) => ':' . $c, $cols));
        $updList = implode(', ', array_map(
            fn ($c) => "$c = VALUES($c)",
            array_filter($cols, fn ($c) => $c !== 'id' && $c !== 'date')
        ));
        // upsert по уникальной дате (один замер в день) либо по id
        $stmt = $pdo->prepare(
            "INSERT INTO bio_entries ($colList) VALUES ($phList)
             ON DUPLICATE KEY UPDATE $updList"
        );
        $stmt->execute($vals);
        Response::json(bioById($pdo, $date, $metrics));
    }

    if ($method === 'DELETE') {
        if (!$id) Response::error('Нужен id', 400);
        $stmt = $pdo->prepare('DELETE FROM bio_entries WHERE id = :id');
        $stmt->execute([':id' => $id]);
        Response::noContent();
    }

    Response::error('Method not allowed', 405);
}

function bioById(PDO $pdo, string $date, array $metrics): array
{
    $stmt = $pdo->prepare('SELECT * FROM bio_entries WHERE date = :date');
    $stmt->execute([':date' => $date]);
    $r = $stmt->fetch();
    return $r ? bioRow($r, $metrics) : [];
}

// имена колонок таблицы bio_entries (кэшируется на время запроса)
function bioColumns(PDO $pdo): array
{
    static $cols = null;
    if ($cols === null) {
        $cols = $pdo->query('SHOW COLUMNS FROM bio_entries')->fetchAll(PDO::FETCH_COLUMN);
    }
    return $cols;
}

function bioRow(array $r, array $metrics): array
{
    $o = ['id' => $r['id'], 'date' => $r['date'], 'note' => $r['note'] ?? ''];
    foreach ($metrics as $m) {
        $o[$m] = (!array_key_exists($m, $r) || $r[$m] === null) ? null : (float) $r[$m];
    }
    $o['segments'] = (!empty($r['segments'])) ? json_decode($r['segments'], true) : null;
    return $o;
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
    return (bool) preg_match('/^\d{4}-\d{2}-\d{2}$/', $d);
}
