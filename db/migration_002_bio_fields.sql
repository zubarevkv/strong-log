-- STRØNG·LOG — миграция 002: новые метрики состава тела + посегментный анализ.
-- Применить к уже существующей базе:
--   mysql -u USER -p DBNAME < db/migration_002_bio_fields.sql
--
-- Подписи «Вода, %» → «Вода, л» и «Кости» → «Безжировая масса» меняются только
-- в интерфейсе; колонки water/bone остаются. Старые значения сохраняются как есть.

ALTER TABLE bio_entries
  ADD COLUMN protein  DECIMAL(5,1) NULL AFTER bone,
  ADD COLUMN minerals DECIMAL(5,1) NULL AFTER protein,
  ADD COLUMN bmi      DECIMAL(4,1) NULL AFTER minerals,
  ADD COLUMN segments TEXT         NULL AFTER bmi;
