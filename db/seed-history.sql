-- STRØNG·LOG — историческая выгрузка тренировок (10 шт., 21.03–17.05.2026).
-- Источник: db/seed-history.json. Названия канонизированы (api/lib/Canon.php).
-- Импорт через phpMyAdmin: выбрать БД -> вкладка "Импорт" -> этот файл -> Вперёд.
-- Требует уже созданных таблиц (db/schema.sql). Повторный импорт безопасен (upsert).

SET NAMES utf8mb4;
START TRANSACTION;

INSERT INTO sessions (id, date, template_id, data) VALUES
  ('S01_N2T_old', '2026-03-21', 'h2t2', '[{"n":"Жим гантелей 15°","sets":[{"weight":16,"reps":12},{"weight":18,"reps":12},{"weight":20,"reps":11}]},{"n":"Брусья","sets":[{"weight":"","reps":12},{"weight":"","reps":6},{"weight":9,"reps":5},{"weight":9,"reps":11}]},{"n":"Тяга горизонтального блока к поясу","sets":[{"weight":39,"reps":12},{"weight":39,"reps":12},{"weight":39,"reps":12}]},{"n":"Махи гантелей в стороны","sets":[{"weight":6,"reps":15},{"weight":6,"reps":12},{"weight":4,"reps":28}]},{"n":"Молотковые подъёмы гантелей","sets":[{"weight":12,"reps":8},{"weight":10,"reps":6},{"weight":10,"reps":6},{"weight":6,"reps":8},{"weight":6,"reps":10}]},{"n":"Гиперэкстензия классическая","sets":[{"weight":0,"reps":20},{"weight":5,"reps":20},{"weight":5,"reps":20}]}]')
  ON DUPLICATE KEY UPDATE date=VALUES(date), template_id=VALUES(template_id), data=VALUES(data);

INSERT INTO sessions (id, date, template_id, data) VALUES
  ('S02_N1T1_2025-03-27', '2026-03-27', 'h1t1', '[{"n":"Жим штанги лёжа","sets":[{"weight":50,"reps":8},{"weight":60,"reps":6},{"weight":65,"reps":4},{"weight":70,"reps":4},{"weight":70,"reps":4}]},{"n":"Разведения гантелей лёжа","sets":[{"weight":14,"reps":8},{"weight":12,"reps":12},{"weight":12,"reps":6}]},{"n":"Жим гантелей 15°","sets":[{"weight":12,"reps":6}]},{"n":"Подтягивания","sets":[{"weight":7,"reps":6},{"weight":21,"reps":12},{"weight":21,"reps":8}]},{"n":"Махи гантелей в стороны","sets":[{"weight":7,"reps":15},{"weight":7,"reps":15},{"weight":6,"reps":5},{"weight":3,"reps":"до отказа"}]},{"n":"Подъём штанги на бицепс","sets":[{"weight":20,"reps":13},{"weight":20,"reps":6},{"weight":10,"reps":7}]},{"n":"Подъём ног в висе","sets":[{"weight":"","reps":12},{"weight":"","reps":12},{"weight":"","reps":12}]}]')
  ON DUPLICATE KEY UPDATE date=VALUES(date), template_id=VALUES(template_id), data=VALUES(data);

INSERT INTO sessions (id, date, template_id, data) VALUES
  ('S03_N1T2_light', '2026-03-29', 'h1t2', '[{"n":"Жим гантелей 15°","sets":[{"weight":18,"reps":12},{"weight":18,"reps":12},{"weight":18,"reps":10}]},{"n":"Подъём на носки в тренажёре сидя","sets":[{"weight":20,"reps":12},{"weight":20,"reps":12}]},{"n":"Жим гантелей сидя","sets":[{"weight":12,"reps":12},{"weight":12,"reps":12}]},{"n":"Подъём ног в висе","sets":[{"weight":"","reps":12},{"weight":"","reps":12}]}]')
  ON DUPLICATE KEY UPDATE date=VALUES(date), template_id=VALUES(template_id), data=VALUES(data);

INSERT INTO sessions (id, date, template_id, data) VALUES
  ('S04_N2T1', '2026-04-03', 'h2t1', '[{"n":"Жим гантелей 15°","sets":[{"weight":18,"reps":10},{"weight":20,"reps":9},{"weight":20,"reps":9}]},{"n":"Сведения в тренажёре","sets":[{"weight":9,"reps":12},{"weight":9,"reps":10},{"weight":6,"reps":12}]},{"n":"Подтягивания","sets":[{"weight":14,"reps":10},{"weight":14,"reps":10},{"weight":14,"reps":8}]},{"n":"Протяжка штанги к подбородку","sets":[{"weight":20,"reps":12},{"weight":20,"reps":12},{"weight":20,"reps":12}]},{"n":"Молотковые подъёмы гантелей","sets":[{"weight":10,"reps":10}]}]')
  ON DUPLICATE KEY UPDATE date=VALUES(date), template_id=VALUES(template_id), data=VALUES(data);

INSERT INTO sessions (id, date, template_id, data) VALUES
  ('S05_N1T1', '2026-04-10', 'h1t1', '[{"n":"Жим штанги лёжа","sets":[{"weight":50,"reps":8},{"weight":60,"reps":5},{"weight":65,"reps":3},{"weight":"67.5","reps":5},{"weight":"67.5","reps":3}]},{"n":"Разведения гантелей лёжа","sets":[{"weight":12,"reps":10},{"weight":12,"reps":10},{"weight":12,"reps":10}]},{"n":"Подтягивания","sets":[{"weight":14,"reps":9},{"weight":14,"reps":7},{"weight":14,"reps":6}]},{"n":"Махи гантелей в стороны","sets":[{"weight":9,"reps":12},{"weight":9,"reps":12},{"weight":9,"reps":10}]},{"n":"Подъём штанги на бицепс","sets":[{"weight":20,"reps":11},{"weight":20,"reps":9},{"weight":15,"reps":12}]}]')
  ON DUPLICATE KEY UPDATE date=VALUES(date), template_id=VALUES(template_id), data=VALUES(data);

INSERT INTO sessions (id, date, template_id, data) VALUES
  ('S06_N1T2', '2026-04-12', 'h1t2', '[{"n":"Жим гантелей 15°","sets":[{"weight":22,"reps":10},{"weight":22,"reps":10},{"weight":22,"reps":8}]},{"n":"Тяга вертикального блока к груди","sets":[{"weight":45,"reps":12},{"weight":45,"reps":12},{"weight":45,"reps":8}]},{"n":"Брусья","sets":[{"weight":"","reps":12},{"weight":"","reps":8},{"weight":9,"reps":9}]},{"n":"Жим гантелей сидя","sets":[{"weight":16,"reps":10},{"weight":16,"reps":10},{"weight":16,"reps":8}]},{"n":"Трицепс в канате","sets":[{"weight":11.3,"reps":12},{"weight":13.5,"reps":8},{"weight":11.3,"reps":10}]}]')
  ON DUPLICATE KEY UPDATE date=VALUES(date), template_id=VALUES(template_id), data=VALUES(data);

INSERT INTO sessions (id, date, template_id, data) VALUES
  ('S07_N2T1', '2026-05-08', 'h2t1', '[{"n":"Жим гантелей 15°","sets":[{"weight":22,"reps":10},{"weight":22,"reps":10},{"weight":24,"reps":8}]},{"n":"Сведения в тренажёре","sets":[{"weight":15,"reps":10},{"weight":15,"reps":10},{"weight":15,"reps":10}]},{"n":"Подтягивания","sets":[{"weight":"","reps":7},{"weight":"","reps":4},{"weight":"","reps":2},{"weight":14,"reps":8}]},{"n":"Протяжка штанги к подбородку","sets":[{"weight":25,"reps":10},{"weight":25,"reps":10},{"weight":20,"reps":10}]}]')
  ON DUPLICATE KEY UPDATE date=VALUES(date), template_id=VALUES(template_id), data=VALUES(data);

INSERT INTO sessions (id, date, template_id, data) VALUES
  ('S08_N2T2', '2026-05-10', 'h2t2', '[{"n":"Жим в тренажёре сидя на грудь","sets":[{"weight":20,"reps":12},{"weight":20,"reps":10},{"weight":25,"reps":10},{"weight":27.5,"reps":10}]},{"n":"Тяга горизонтального блока к поясу","sets":[{"weight":45,"reps":10},{"weight":45,"reps":10},{"weight":45,"reps":10}]},{"n":"Брусья","sets":[{"weight":"","reps":8},{"weight":7,"reps":7},{"weight":14,"reps":10}]},{"n":"Жим гантелей сидя","sets":[{"weight":16,"reps":10},{"weight":18,"reps":7},{"weight":16,"reps":7}]},{"n":"Трицепс в канате","sets":[{"weight":15,"reps":8},{"weight":12.5,"reps":10}]}]')
  ON DUPLICATE KEY UPDATE date=VALUES(date), template_id=VALUES(template_id), data=VALUES(data);

INSERT INTO sessions (id, date, template_id, data) VALUES
  ('S09_N2T2', '2026-05-15', 'h2t2', '[{"n":"Жим в тренажёре сидя на грудь","sets":[{"weight":30,"reps":10},{"weight":30,"reps":10},{"weight":30,"reps":10}]},{"n":"Тяга горизонтального блока к поясу","sets":[{"weight":45,"reps":10},{"weight":45,"reps":10},{"weight":45,"reps":10}]},{"n":"Брусья","sets":[{"weight":"","reps":10},{"weight":"","reps":10},{"weight":"","reps":8.5}]},{"n":"Жим гантелей сидя","sets":[{"weight":16,"reps":10},{"weight":16,"reps":10},{"weight":18,"reps":8}]},{"n":"Подъём штанги на бицепс","sets":[{"weight":25,"reps":10},{"weight":25,"reps":10},{"weight":25,"reps":7}]}]')
  ON DUPLICATE KEY UPDATE date=VALUES(date), template_id=VALUES(template_id), data=VALUES(data);

INSERT INTO sessions (id, date, template_id, data) VALUES
  ('S10_N1T1', '2026-05-17', 'h1t1', '[{"n":"Жим штанги лёжа","sets":[{"weight":60,"reps":8},{"weight":70,"reps":5},{"weight":70,"reps":4},{"weight":70,"reps":2}]},{"n":"Разведения гантелей лёжа","sets":[{"weight":14,"reps":10},{"weight":14,"reps":10},{"weight":14,"reps":10}]},{"n":"Подтягивания","sets":[{"weight":"","reps":7},{"weight":"","reps":6},{"weight":14,"reps":8}]},{"n":"Махи гантелей в стороны","sets":[{"weight":9,"reps":12},{"weight":9,"reps":12},{"weight":9,"reps":12}]},{"n":"Подъём штанги на бицепс","sets":[{"weight":20,"reps":10},{"weight":20,"reps":10},{"weight":20,"reps":10}]},{"n":"Подъём ног в висе","sets":[{"weight":"","reps":12},{"weight":"","reps":12},{"weight":"","reps":12}]}]')
  ON DUPLICATE KEY UPDATE date=VALUES(date), template_id=VALUES(template_id), data=VALUES(data);

COMMIT;
