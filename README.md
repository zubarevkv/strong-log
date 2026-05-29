# STRØNG·LOG

Личный трекер силовых тренировок и состава тела (биоимпеданс). Один пользователь,
синхронизация между устройствами через собственный бэкенд.

Полное ТЗ и контекст — в [`HANDOFF.md`](./HANDOFF.md).

## Статус

Реализованы шаги **1–10** плана (HANDOFF §9):

1. ✅ Vite-проект, React-компонент вынесен в `src/` (`App.jsx` + `data.js`), подключены `recharts`, `lucide-react`, шрифты.
2. ✅ Доступ к данным вынесен в модуль `src/api.js` (fetch + Bearer-токен), `store`/`window.storage` убран.
3. ✅ Экран ввода токена (gate) + хранение токена в `localStorage`, кнопка выхода.
4. ✅ Бэкенд PHP `/api/*` — PDO + MySQL, prepared statements, проверка токена в middleware.
5. ✅ Схема БД (`db/schema.sql`) + сид истории (`db/seed.php` ← `db/seed-history.json`, 10 тренировок).
6. ✅ Серверная нормализация названий (`api/lib/Canon.php`) — при сейве, импорте и сидинге.
7. ✅ Деплой-сборка: статика в корень домена (`public/.htaccess` → SPA-фоллбэк + HTTPS), API в `/api/`.
8. ✅ Эндпоинты `/export` `/import` + UI «Бэкап данных» (выгрузка/восстановление JSON).
9. ✅ Нативный `confirm` при удалении тренировок и замеров (инлайн-подтверждение убрано).
10. ✅ Из клиента убраны вшитая `SEED_HISTORY` и кнопка одноразового импорта.

## Структура

```
index.html              точка входа Vite
src/
  main.jsx              bootstrap React
  App.jsx               UI: гейт + 4 вкладки (Обзор/Тренировки/Тело/Прогресс)
  data.js               TEMPLATES, CANON, normSession, метрики, хелперы, тема, CSS
  api.js                доступ к данным: fetch+токен; "local" -> localStorage
public/.htaccess        корневой .htaccess фронта (SPA-фоллбэк + HTTPS); Vite копирует в dist/
api/                    PHP-бэкенд (выкладывается в /api на домене)
  index.php            роутер + эндпоинты sessions/bio/export/import
  config.php           конфиг (config.local.php -> env)
  config.local.example.php
  lib/{Db,Auth,Response,Canon}.php
  .htaccess
db/
  schema.sql           схема MySQL
  seed.php             сид истории в БД (CLI), идемпотентно
  seed-history.json    10 исторических тренировок (источник сида)
fitness-tracker.jsx     исходный прототип (референс, не в сборке)
```

## Разработка фронта

```bash
npm install

# Вариант A — без бэкенда (данные в localStorage этого браузера):
VITE_API_BASE=local npm run dev

# Вариант B — с локальным PHP-бэкендом:
#  1) в api/ создать config.local.php (см. config.local.example.php), поднять MySQL, накатить db/schema.sql
#  2) php -S localhost:8000 -t api    (роутинг через api/index.php)
#  3) npm run dev   (Vite проксирует /api -> localhost:8000)
```

Открыть показанный Vite URL, ввести токен (в режиме `local` — любой).

## Сборка и деплой

```bash
npm run build      # -> dist/  (index.html + assets/ + .htaccess из public/)
```

Раскладка на домене (Beget):

```
<webroot>/
  index.html, assets/, .htaccess   ← содержимое dist/
  api/                              ← папка api/ из репозитория
    config.local.php                ← создать из config.local.example.php (секреты, НЕ в git)
```

1. Накатить схему: `mysql -u USER -p DBNAME < db/schema.sql` (или через phpMyAdmin).
2. Засидить историю (один раз, идемпотентно): `php db/seed.php`.
3. Залить `dist/*` в корень домена, папку `api/` — рядом.
4. Включить бесплатный SSL Beget — корневой `.htaccess` принудительно редиректит на HTTPS.

## API (бэкенд-агностичный контракт)

Авторизация: заголовок `Authorization: Bearer <TOKEN>` (общий секрет в `config.local.php` / env).

| Метод  | Путь              | Назначение                |
|--------|-------------------|---------------------------|
| GET    | `/api/sessions`   | список тренировок         |
| POST   | `/api/sessions`   | upsert по `id`            |
| DELETE | `/api/sessions/{id}` | удалить тренировку     |
| GET    | `/api/bio`        | список замеров            |
| POST   | `/api/bio`        | upsert по `date`          |
| DELETE | `/api/bio/{id}`   | удалить замер             |
| GET    | `/api/export`     | `{ sessions, bio }` — бэкап |
| POST   | `/api/import`     | `{ sessions, bio }` — восстановление/миграция (upsert) |

Названия упражнений канонизируются на сервере (`api/lib/Canon.php`) при `POST /sessions`,
`POST /import` и при сидинге — словарь синонимов зеркалит `src/data.js` (HANDOFF §5).

## Безопасность

- Токен и доступы к БД — только в `api/config.local.php` (в `.gitignore`) или в переменных
  окружения (`STRONGLOG_TOKEN`, `DB_*`). В репозиторий не коммитятся.
- На проде включить HTTPS (бесплатный SSL Beget).
