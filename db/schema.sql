-- STRØNG·LOG — схема БД (MySQL 5.x/8.x).
-- JSON хранится как TEXT (совместимость с MySQL 5.x на shared-хостинге).
-- Применить: mysql -u USER -p DBNAME < db/schema.sql  (или через phpMyAdmin).

CREATE TABLE IF NOT EXISTS sessions (
  id          VARCHAR(40) PRIMARY KEY,
  date        DATE NOT NULL,
  template_id VARCHAR(40) NOT NULL,          -- встроенные id короткие, кастомные = uid() (~12 симв.)
  data        TEXT NOT NULL,                 -- JSON: exercises[]
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sessions_date (date),
  INDEX idx_sessions_tpl (template_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- пользовательские программы тренировок (встроенные 4 живут в коде, здесь — кастомные)
CREATE TABLE IF NOT EXISTS templates (
  id         VARCHAR(40) PRIMARY KEY,
  name       VARCHAR(120) NOT NULL,
  sub        VARCHAR(160),
  data       TEXT NOT NULL,                  -- JSON: ex[] ({n, s:[[w,r,hint?]]})
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS bio_entries (
  id         VARCHAR(40) PRIMARY KEY,
  date       DATE NOT NULL UNIQUE,           -- один замер в день (upsert по дате)
  weight     DECIMAL(5,1),
  fat        DECIMAL(4,1),
  muscle     DECIMAL(5,1),
  water      DECIMAL(4,1),                    -- литры (ранее в UI отображались %)
  visceral   DECIMAL(4,1),
  bone       DECIMAL(4,1),                    -- безжировая масса, кг (ранее «кости»)
  protein    DECIMAL(5,1),
  minerals   DECIMAL(5,1),
  bmi        DECIMAL(4,1),
  segments   TEXT,                            -- JSON: посегментный анализ (мышцы/жир, кг и %)
  note       TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- опционально: справочник единых названий упражнений (шаг 6 спеки)
CREATE TABLE IF NOT EXISTS exercise_aliases (
  alias  VARCHAR(120) PRIMARY KEY,
  canon  VARCHAR(120) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
