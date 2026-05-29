# STRØNG·LOG

Личный трекер силовых тренировок и состава тела (биоимпеданс). Один пользователь,
синхронизация между устройствами через собственный бэкенд.

Полное ТЗ и контекст — в [`HANDOFF.md`](./HANDOFF.md).

## Статус

Реализованы шаги **1–4** плана (HANDOFF §9):

1. ✅ Vite-проект, React-компонент вынесен в `src/` (`App.jsx` + `data.js`), подключены `recharts`, `lucide-react`, шрифты.
2. ✅ Доступ к данным вынесен в модуль `src/api.js` (fetch + Bearer-токен), `store`/`window.storage` убран.
3. ✅ Экран ввода токена (gate) + хранение токена в `localStorage`, кнопка выхода.
4. ✅ Бэкенд PHP `/api/*` — PDO + MySQL, prepared statements, проверка токена в middleware.

Ещё не сделано (шаги 5–10): сид истории в БД, серверная нормализация названий и `/import`,
деплой-сборка на домен, `/export` `/import`, нативный `confirm` вместо инлайн-подтверждения.

## Структура

```
index.html              точка входа Vite
src/
  main.jsx              bootstrap React
  App.jsx               UI: гейт + 4 вкладки (Обзор/Тренировки/Тело/Прогресс)
  data.js               TEMPLATES, CANON, normSession, метрики, хелперы, тема, CSS
  api.js                доступ к данным: fetch+токен; "local" -> localStorage
api/                    PHP-бэкенд (выкладывается в /api на домене)
  index.php            роутер + эндпоинты sessions/bio
  config.php           конфиг (config.local.php -> env)
  config.local.example.php
  lib/{Db,Auth,Response}.php
  .htaccess
db/schema.sql           схема MySQL
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

## Сборка

```bash
npm run build      # -> dist/  (статика в корень домена; api/ кладётся рядом)
```

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

## Безопасность

- Токен и доступы к БД — только в `api/config.local.php` (в `.gitignore`) или в переменных
  окружения (`STRONGLOG_TOKEN`, `DB_*`). В репозиторий не коммитятся.
- На проде включить HTTPS (бесплатный SSL Beget).
