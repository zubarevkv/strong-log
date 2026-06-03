-- migration_004: пользовательские настройки (одна строка id='default', JSON в data).
-- Фундамент фич #3 (шаг прогрессии) и #5 (таймер отдыха); в фазе B читается пушами.
-- Идемпотентно (CREATE TABLE IF NOT EXISTS). Накат: php api/migrate.php

CREATE TABLE IF NOT EXISTS settings (
  id         VARCHAR(40) PRIMARY KEY,
  data       TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
