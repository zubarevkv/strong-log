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
 * Авторизация: заголовок Authorization: Bearer <TOKEN>.
 */

require __DIR__ . '/lib/Response.php';
require __DIR__ . '/lib/Db.php';
require __DIR__ . '/lib/Auth.php';

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

if ($resource !== 'sessions' && $resource !== 'bio') {
    Response::error('Not found', 404);
}

// БД нужна только для известных маршрутов
$pdo = Db::pdo($cfg);

if ($resource === 'sessions') {
    handleSessions($pdo, $method, $id);
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
 * BIO
 * ========================================================== */
function handleBio(PDO $pdo, string $method, ?string $id): void
{
    $metrics = ['weight', 'fat', 'muscle', 'water', 'visceral', 'bone'];

    if ($method === 'GET') {
        $rows = $pdo->query('SELECT * FROM bio_entries ORDER BY date DESC')->fetchAll();
        $out = array_map(function ($r) use ($metrics) {
            $o = ['id' => $r['id'], 'date' => $r['date'], 'note' => $r['note'] ?? ''];
            foreach ($metrics as $m) {
                $o[$m] = $r[$m] === null ? null : (float) $r[$m];
            }
            return $o;
        }, $rows);
        Response::json($out);
    }

    if ($method === 'POST') {
        $b = readJson();
        $bid = trim((string) ($b['id'] ?? ''));
        $date = (string) ($b['date'] ?? '');
        if ($bid === '' || !validDate($date)) {
            Response::error('Некорректный замер', 422);
        }
        $vals = [':id' => $bid, ':date' => $date, ':note' => (string) ($b['note'] ?? '')];
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
    if (!$r) return [];
    $o = ['id' => $r['id'], 'date' => $r['date'], 'note' => $r['note'] ?? ''];
    foreach ($metrics as $m) {
        $o[$m] = $r[$m] === null ? null : (float) $r[$m];
    }
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
