-- migration_003: пользовательские программы тренировок + расширение template_id.
-- Идемпотентно (CREATE TABLE IF NOT EXISTS, повторный MODIFY безопасен).
-- Накат: php api/migrate.php

CREATE TABLE IF NOT EXISTS templates (
  id         VARCHAR(40) PRIMARY KEY,
  name       VARCHAR(120) NOT NULL,
  sub        VARCHAR(160),
  data       TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- кастомные программы используют uid() (~12 симв.) как template_id у сессий;
-- старое VARCHAR(8) усекало бы их — расширяем.
ALTER TABLE sessions MODIFY template_id VARCHAR(40) NOT NULL;
