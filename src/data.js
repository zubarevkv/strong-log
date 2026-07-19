/* ============================================================
 * data.js — программа, канон названий, метрики, хелперы, тема, CSS
 * Источник истины по фронту (перенесено из прототипа fitness-tracker.jsx).
 * SEED_HISTORY намеренно убран из клиента — история сидится в БД (db/seed.php).
 * ========================================================== */

/* ---------- theme colors (mirror CSS vars for recharts SVG) ---------- */
export const C = {
  bg: "#0c0e0a", card: "#15170f", line: "#262a1d",
  txt: "#e9ebe0", muted: "#8d9280", accent: "#c8f23f", accent2: "#86b81f",
  blue: "#6fd3ff", pink: "#ff8ab0", danger: "#ff6b5e",
};

/* ---------- program templates (targets prefill the log form) ----------
 * Встроенные программы (read-only). Кастомные хранятся в БД/LS той же формы,
 * но с builtin:false. allTemplates = [...BUILTIN_TEMPLATES, ...custom]. */
export const BUILTIN_TEMPLATES = [
  {
    id: "h1t1", name: "Н1 · Т1", sub: "Грудь / спина / руки", builtin: true,
    ex: [
      { n: "Жим штанги лёжа", s: [[20,15],[40,8],[55,5],[65,3],[72.5,1],[80,3],[70,8],[70,8]] },
      { n: "Подтягивания", s: [[0,7],[7,10],[7,10]] },
      { n: "Разведение гантелей лёжа", s: [[16,10],[16,10]] },
      { n: "Болгарский сплит-присед с гантелями", s: [[8,8],[8,8],[8,8]] },
      { n: "Махи гантелей в стороны", s: [[12,10],[12,10],[12,10]] },
      { n: "Обратная бабочка в тренажёре", s: [[10,12],[10,12]] },
      { n: "Подъём штанги на бицепс", s: [[25,12],[25,12]] },
      { n: "Мёртвый жук с сопротивлением", s: [[0,10],[0,10],[0,10]] },
    ],
  },
  {
    id: "h1t2", name: "Н1 · Т2", sub: "Ноги / плечи / трицепс", builtin: true,
    ex: [
      { n: "Пружинные прыжки на носках", s: [[0,15],[0,15],[0,15]] },
      { n: "Жим гантелей на скамье 15°", s: [[26,10],[26,10],[26,10]] },
      { n: "Тяга вертикального блока к груди", s: [[55,12],[55,12],[55,12]] },
      { n: "Брусья", s: [[-10,10],[-10,10],[-10,10]] },
      { n: "Ягодичный мост в тренажёре", s: [[40,10],[40,10],[40,10]] },
      { n: "Жим гантелей сидя", s: [[18,12],[18,12]] },
      { n: "Отведение руки в кроссовере на заднюю дельту", s: [[5,12],[5,12]] },
      { n: "Разгибание на трицепс на блоке (канат)", s: [[12.5,12],[12.5,12]] },
      { n: "Подъём коленей в висе с подкручиванием таза", s: [[0,10],[0,10],[0,10]] },
    ],
  },
  {
    id: "h2t1", name: "Н2 · Т1", sub: "Грудь / спина / руки", builtin: true,
    ex: [
      { n: "Жим штанги лёжа", s: [[20,15],[40,8],[55,5],[65,2],[70,8],[70,8],[70,8]] },
      { n: "Тяга горизонтального блока к поясу", s: [[55,12],[55,12],[55,12]] },
      { n: "Жим в тренажёре сидя на грудь", s: [[35,10],[35,10],[35,10]] },
      { n: "Жим ногами в тренажёре", s: [[100,10],[100,10],[100,10]] },
      { n: "Махи гантелей в стороны", s: [[12,10],[12,10],[12,10]] },
      { n: "Обратная бабочка в тренажёре", s: [[10,12],[10,12]] },
      { n: "Подъём гантелей хватом «молот»", s: [[10,12],[10,12]] },
      { n: "Подъём ног в висе", s: [[0,10],[0,10],[0,10]] },
    ],
  },
  {
    id: "h2t2", name: "Н2 · Т2", sub: "Ноги / плечи / руки", builtin: true,
    ex: [
      { n: "Прыжок после спрыгивания с платформы", s: [[0,4],[0,4],[0,4],[0,4]] },
      { n: "Жим гантелей на скамье 15°", s: [[26,10],[26,10],[26,10]] },
      { n: "Тяга горизонтального блока к поясу", s: [[55,12],[55,12],[55,12]] },
      { n: "Сведение рук в тренажёре", s: [[15,12],[15,12]] },
      { n: "Ягодичный мост в тренажёре", s: [[40,10],[40,10],[40,10]] },
      { n: "Жим гантелей сидя", s: [[18,12],[18,12]] },
      { n: "Отведение руки в кроссовере на заднюю дельту", s: [[5,12],[5,12]] },
      { n: "Разгибание на трицепс на блоке (канат)", s: [[12.5,12],[12.5,12]] },
      { n: "Мёртвый жук с сопротивлением", s: [[0,10],[0,10],[0,10]] },
    ],
  },
];

export const BIO_METRICS = [
  { k: "weight", label: "Вес", unit: "кг", color: C.accent },
  { k: "fat", label: "Жир", unit: "%", color: C.pink },
  { k: "muscle", label: "Мышцы", unit: "кг", color: C.blue },
  { k: "water", label: "Вода", unit: "л", color: "#7fe0c0" },
  { k: "visceral", label: "Висц. жир", unit: "", color: "#ffb347" },
  { k: "bone", label: "Безжировая масса", unit: "кг", color: "#b6a8ff" },
  { k: "protein", label: "Белок", unit: "кг", color: "#ff9e7a" },
  { k: "minerals", label: "Минералы", unit: "кг", color: "#9ad0c2" },
  { k: "bmi", label: "ИМТ", unit: "", color: "#d3c0ff" },
];

/* ---- сегментный анализ тела (п.12) ---- */
export const SEGMENTS = [
  { k: "larm", label: "Левая рука" },
  { k: "rarm", label: "Правая рука" },
  { k: "lleg", label: "Левая нога" },
  { k: "rleg", label: "Правая нога" },
  { k: "trunk", label: "Туловище" },
];
export const SEG_FIELDS = [
  { k: "muscleKg", label: "Мышцы", unit: "кг", color: C.blue },
  { k: "musclePct", label: "Мышцы", unit: "%", color: C.blue },
  { k: "fatKg", label: "Жир", unit: "кг", color: C.pink },
  { k: "fatPct", label: "Жир", unit: "%", color: C.pink },
];

/* ---- helpers ---- */
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
export const today = () => new Date().toISOString().slice(0, 10);
export const fmtDate = (d) => new Date(d).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
export const num = (v) => (v === "" || v == null ? null : Number(v));

/* ---- пользовательские настройки (общий фундамент фич #3, #5 и будущих пушей) ----
 * Хранятся на сервере (таблица settings, эндпоинт /settings). push-поля заведены заранее. */
export const SETTINGS_DEFAULTS = {
  restSeconds: 90,        // длительность таймера отдыха по умолчанию
  autoStartRest: true,    // авто-старт таймера по завершении подхода
  restNotify: false,      // локальное уведомление по окончании отдыха, если вкладка в фоне
  progressionStep: null,  // null = авто (stepKg по упражнению)
  homeExercise: null,     // упражнение для hero-графика на «Обзоре» (null = авто, самое частое)
  weeklyGoal: 2,          // цель тренировочных дней в неделю (для стрика на «Обзоре»)
  pushOptIn: false,       // фаза B
  pushHour: 18,           // фаза B
  pushThresholdDays: 3,   // фаза B
};
export const withSettings = (s) => ({ ...SETTINGS_DEFAULTS, ...(s || {}) });

/* ---- единые названия упражнений (синонимы -> канон) ----
 * Применяется на клиенте при сейве. Дублирование на бэкенде и в /import —
 * шаг 6 спеки (TODO). Спорные слияния помечены в HANDOFF.md §5. */
export const CANON = {
  // жимы
  "Жим лёжа": "Жим штанги лёжа",
  "Жим гантелей 15°": "Жим гантелей на скамье 15°",
  "Жим гантелей лёжа": "Жим гантелей на скамье 15°",
  "Жим гантелей под углом 30°": "Жим гантелей на скамье 15°",
  "Жим в тренажёре на грудь (1 рука)": "Жим в тренажёре сидя на грудь",
  // тяги
  "Тяга верт. блока к груди": "Тяга вертикального блока к груди",
  "Тяга гориз. блока к поясу": "Тяга горизонтального блока к поясу",
  "Протяжка к подбородку": "Тяга штанги к подбородку",
  "Протяжка штанги к подбородку": "Тяга штанги к подбородку",
  // подъёмы / бицепс
  "Бицепс штанга": "Подъём штанги на бицепс",
  "Молотковые": "Подъём гантелей хватом «молот»",
  "Молотковые подъёмы гантелей": "Подъём гантелей хватом «молот»",
  "Подъёмы на носки сидя": "Подъём на носки в тренажёре сидя",
  "Подъёмы на носки в тренажёре сидя": "Подъём на носки в тренажёре сидя",
  "Подъём ног в висе / dead bug": "Подъём ног в висе",
  "Подъём ног в висе или dead bug": "Подъём ног в висе",
  // сведения / разведения / махи
  "Разведения лёжа": "Разведение гантелей лёжа",
  "Разведения гантелей лёжа": "Разведение гантелей лёжа",
  "Махи в стороны": "Махи гантелей в стороны",
  "Бабочка / сведения": "Сведение рук в тренажёре",
  "Сведения в тренажёре": "Сведение рук в тренажёре",
  "Сведения в тренажёре бабочка": "Сведение рук в тренажёре",
  "Сведения в кроссовере": "Сведение рук в тренажёре",
  "Сведение рук в тренажёре «бабочка»": "Сведение рук в тренажёре",
  // трицепс
  "Трицепс канат": "Разгибание на трицепс на блоке (канат)",
  "Трицепс в канате": "Разгибание на трицепс на блоке (канат)",
  "Трицепс в блоке / канат": "Разгибание на трицепс на блоке (канат)",
  // приседы / прочее
  "Выпрыгивания с гантелью": "Выпрыгивания с гантелей",
  "Гоблет-присед": "Приседания с гантелью (гоблет)",
  "Пресс в тренажёре": "Скручивания в тренажёре",
  "Гиперэкстензия классическая": "Гиперэкстензия",
  // устоявшиеся синонимы
  "Отжимания на брусьях": "Брусья",
  "Подтягивания в гравитроне": "Подтягивания",
  // тренажёры новой программы (ё-нормализация)
  "Обратная бабочка в тренажере": "Обратная бабочка в тренажёре",
  "Ягодичный мост в тренажере": "Ягодичный мост в тренажёре",
};
export const canon = (n) => CANON[n] || n;

/* ---- расчёт объёма / нагрузки ----
 * Для упражнений с весом тела (подтягивания, брусья) рабочая нагрузка
 * считается от веса тела: помощь вводится как ПОЛОЖИТЕЛЬНОЕ число (уменьшает
 * нагрузку), утяжелитель — как ОТРИЦАТЕЛЬНОЕ (увеличивает).
 *   эфф.нагрузка = вес_тела − введённое_значение
 * Вес тела берётся из ближайшего замера состава тела. */
export const BW_EXERCISES = new Set(["Подтягивания", "Брусья"]);

// Парные гантельные упражнения: в форме вводится вес ОДНОЙ гантели, но в тоннаж/объём
// нагрузка идёт за ОБЕ (×2). Одногантельные (гоблет, выпрыгивания) сюда НЕ входят.
export const DUMBBELL_PAIR = new Set([
  "Жим гантелей на скамье 15°",
  "Жим гантелей сидя",
  "Разведение гантелей лёжа",
  "Махи гантелей в стороны",
  "Подъём гантелей хватом «молот»",
  "Болгарский сплит-присед с гантелями",
]);
export const loadUnits = (exName) => (DUMBBELL_PAIR.has(exName) ? 2 : 1);

export function bodyweightOn(bio, date) {
  const withW = (bio || []).filter((b) => b && b.weight != null);
  if (!withW.length) return null;
  const t = new Date(date).getTime();
  // предпочитаем ближайший замер НЕ ПОЗЖЕ тренировки (вес на тот момент);
  // более поздний берём только если прошлых замеров нет.
  let past = null, pastDiff = Infinity;
  let future = null, futureDiff = Infinity;
  for (const b of withW) {
    const diff = new Date(b.date).getTime() - t;
    if (diff <= 0) {
      if (-diff < pastDiff) { pastDiff = -diff; past = b; }
    } else if (diff < futureDiff) {
      futureDiff = diff; future = b;
    }
  }
  const best = past || future;
  return best ? Number(best.weight) : null;
}

// эффективная нагрузка одного подхода (кг); null — если объём посчитать нельзя
export function setLoad(set, exName, bw) {
  const w = num(set.weight) || 0;
  if (BW_EXERCISES.has(exName)) {
    if (bw == null) return null;
    return Math.max(0, bw - w);
  }
  return w;
}

export function exerciseVolume(ex, bw) {
  const units = loadUnits(ex.n);
  return ex.sets.reduce((v, s) => {
    const load = setLoad(s, ex.n, bw);
    return load == null ? v : v + load * units * (num(s.reps) || 0);
  }, 0);
}

export function exerciseTop(ex, bw) {
  return ex.sets.reduce((m, s) => {
    const load = setLoad(s, ex.n, bw);
    return load == null ? m : Math.max(m, load);
  }, 0);
}

export function sessionVolume(session, bio) {
  const bw = bodyweightOn(bio, session.date);
  return session.exercises.reduce((v, e) => v + exerciseVolume(e, bw), 0);
}

/* ---- оценка 1ПМ по Эпли (фича #1) ----
 * e1RM = вес × (1 + повт/30); при 1 повторе = вес. */
export const e1rm = (w, reps) => (reps <= 1 ? w : w * (1 + reps / 30));

// макс. e1RM по подходам + подход, давший его: { value, w, reps } (value 0 если нет валидных).
// Пропускаем нечисловые повторы («до отказа»), неположительную нагрузку и BW-упражнения
// («свой вес» — не весовая метрика).
export function exerciseE1rmBest(ex, bw) {
  const out = { value: 0, w: null, reps: null };
  if (BW_EXERCISES.has(ex.n)) return out;
  for (const s of ex.sets) {
    const load = setLoad(s, ex.n, bw);
    const r = num(s.reps);
    if (load == null || load <= 0 || r == null || !Number.isFinite(r) || r <= 0) continue;
    const v = e1rm(load, r);
    if (v > out.value) { out.value = v; out.w = load; out.reps = r; }
  }
  return out;
}
export const exerciseE1rm = (ex, bw) => exerciseE1rmBest(ex, bw).value;

/* ---- личные рекорды (фича #2) ----
 * Три типа PR на сессию (по каноническому имени, сравнение со всей прошлой историей):
 *   weight — макс. рабочий вес, e1rm — макс. оценка 1ПМ, volume — макс. объём упражнения за сессию.
 * Рекорд засчитываем только если ранее уже был best и текущее значение строго его
 * превышает (первое появление упражнения рекордом не считаем; равенство — не PR).
 * Весовые типы (weight/e1rm) не применяем к BW-упражнениям («свой вес»).
 * marker — зажигает ли тип кубок 🏆 в истории. Объём бьётся почти каждую сессию (добавил
 * подход/повтор → новый максимум), поэтому в исторический маркер не идёт — остаётся только
 * в моменте празднования при сейве (detectSessionPRs). */
export const PR_KINDS = [
  { kind: "weight", label: "вес", unit: "кг", calc: exerciseTop, skipBW: true, marker: true },
  { kind: "e1rm", label: "e1RM", unit: "кг", calc: exerciseE1rm, skipBW: true, marker: true },
  { kind: "volume", label: "объём", unit: "кг", calc: exerciseVolume, skipBW: false, marker: false },
];

// проход для исторического кубка: обновляем best[canon][kind] и собираем побитые рекорды-маркеры
function scanSessionPRs(e, bw, best) {
  const cn = canon(e.n);
  const b = best[cn] || (best[cn] = {});
  const prs = [];
  for (const { kind, calc, skipBW, label, unit, marker } of PR_KINDS) {
    if (!marker) continue; // объём в исторический маркер не идёт
    if (skipBW && BW_EXERCISES.has(cn)) continue;
    const val = calc(e, bw);
    if (!val || val <= 0) continue;
    if (b[kind] == null) { b[kind] = val; continue; } // первое появление — не PR
    if (val > b[kind]) { b[kind] = val; prs.push({ name: e.n, kind, label, unit, value: val }); }
  }
  return prs;
}

// Map<sessionId, PR[]> — PR[] непуст только для сессий, где что-то побито
export function prSessionMap(sessions, bio) {
  const out = new Map();
  const best = {};
  const sorted = [...(sessions || [])].sort(
    (a, b) => a.date.localeCompare(b.date) || (a.id || "").localeCompare(b.id || "")
  );
  for (const s of sorted) {
    const bw = bodyweightOn(bio, s.date);
    const prs = [];
    for (const e of s.exercises) prs.push(...scanSessionPRs(e, bw, best));
    if (prs.length) out.set(s.id, prs);
  }
  return out;
}

// PR именно этой сессии. `history` — состояние ДО сохранения: при первом сейве сессии в нём ещё
// нет, при редактировании в нём лежит её прошлая версия (тот же id). Сравниваем со ВСЕЙ этой
// историей как есть: для новой сессии это все прошлые рекорды, для ресейва — в т.ч. её собственная
// прошлая запись, поэтому неизменный/уменьшённый ресейв не бьёт рекорд и не зажигает празднование.
export function detectSessionPRs(history, session, bio) {
  const best = {};
  for (const s of history || []) {
    const bw = bodyweightOn(bio, s.date);
    for (const e of s.exercises) {
      const cn = canon(e.n);
      const b = best[cn] || (best[cn] = {});
      for (const { kind, calc, skipBW } of PR_KINDS) {
        if (skipBW && BW_EXERCISES.has(cn)) continue;
        const val = calc(e, bw);
        if (val > 0) b[kind] = Math.max(b[kind] || 0, val);
      }
    }
  }
  const bw = bodyweightOn(bio, session.date);
  const prs = [];
  for (const e of session.exercises) {
    const cn = canon(e.n);
    const b = best[cn];
    for (const { kind, calc, skipBW, label, unit } of PR_KINDS) {
      if (skipBW && BW_EXERCISES.has(cn)) continue;
      const val = calc(e, bw);
      if (!val || val <= 0) continue;
      if (!b || b[kind] == null) continue; // первого появления упражнения не празднуем
      if (val > b[kind]) prs.push({ name: e.n, kind, label, unit, value: val });
    }
  }
  return prs;
}

/* ---- таблица личных рекордов: макс. реальный рабочий вес в подходе по упражнению ----
 * Не 1ПМ, а фактический максимальный вес одного подхода + дата, когда впервые достигнут
 * (и повторы того подхода). Канонизация через canon; BW-упражнения («свой вес/помощь»,
 * учитывая алиасы вроде «Отжимания на брусьях» → «Брусья») пропускаем — там столбец «вес»
 * это помощь/утяжелитель, не сопоставим как PR. Вес тела для не-BW упражнений на нагрузку
 * не влияет, поэтому bio здесь не нужен. */
export function exercisePRList(sessions) {
  // canon -> { name, weight, reps, date, e1rm, e1rmDate, volume, volumeDate }
  const best = {};
  const sorted = [...(sessions || [])].sort(
    (a, b) => a.date.localeCompare(b.date) || (a.id || "").localeCompare(b.id || "")
  );
  for (const s of sorted) {
    for (const e of s.exercises) {
      const cn = canon(e.n);
      if (BW_EXERCISES.has(cn)) continue;
      const top = exerciseTop(e, null);
      if (!top || top <= 0) continue;
      // запись создаётся по первому появлению упражнения с рабочим весом
      const cur = best[cn] || (best[cn] = {
        name: e.n, weight: 0, reps: null, date: s.date,
        e1rm: 0, e1rmDate: null, volume: 0, volumeDate: null,
      });

      // макс. рабочий вес + первая дата достижения (строго больше → дата остаётся)
      if (top > cur.weight) {
        let reps = null; // макс. повторы среди подходов, давших этот вес
        for (const st of e.sets) {
          if (setLoad(st, e.n, null) !== top) continue;
          const r = num(st.reps);
          if (r != null && (reps == null || r > reps)) reps = r;
        }
        cur.name = e.n; cur.weight = top; cur.reps = reps; cur.date = s.date;
      }

      // макс. оценка 1ПМ (Эпли)
      const e1 = exerciseE1rmBest(e, null);
      if (e1.value > cur.e1rm) {
        cur.e1rm = e1.value; cur.e1rmDate = s.date;
      }

      // макс. объём упражнения за одну сессию
      const vol = exerciseVolume(e, null);
      if (vol > cur.volume) { cur.volume = vol; cur.volumeDate = s.date; }
    }
  }
  // сортировка по дате достижения веса-рекорда: свежие выше (тай-брейк по имени)
  return Object.values(best).sort(
    (a, b) => b.date.localeCompare(a.date) || a.name.localeCompare(b.name, "ru")
  );
}

/* ---- недельный стрик (фича) ----
 * Неделя = пн–вс. «Засчитана», если в ней ≥ goal тренировочных ДНЕЙ (уникальных дат).
 * streak — число подряд идущих засчитанных недель назад от текущей; текущая (незавершённая)
 * неделя не обрывает серию (грейс): входит в счёт, если цель уже набрана, иначе пропускается.
 * Возвращает { streak, thisWeekCount, goal, weeks:[{count, met}] } | null. */
const DAY_MS = 864e5;
// понедельник той недели, в которую попадает дата (YYYY-MM-DD), как локальная полночь
function weekStart(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const dow = (d.getDay() + 6) % 7; // пн=0 … вс=6
  d.setDate(d.getDate() - dow);
  d.setHours(0, 0, 0, 0);
  return d;
}
const weekKey = (d) => d.getTime();

export function weeklyStreak(sessions, goal = 2) {
  if (!sessions || !sessions.length) return null;
  const g = Math.max(1, goal || 1);
  // неделя -> множество уникальных дат тренировок
  const byWeek = new Map();
  for (const s of sessions) {
    if (!s || !s.date) continue;
    const k = weekKey(weekStart(s.date));
    if (!byWeek.has(k)) byWeek.set(k, new Set());
    byWeek.get(k).add(s.date);
  }
  const countOf = (k) => (byWeek.get(k) ? byWeek.get(k).size : 0);

  const cur = weekStart(today());
  const thisWeekCount = countOf(weekKey(cur));

  // стрик: идём от текущей недели назад по календарным неделям
  let streak = 0;
  let w = new Date(cur);
  let first = true;
  while (true) {
    const met = countOf(weekKey(w)) >= g;
    if (met) streak++;
    else if (!first) break;     // прошедшая неделя без цели обрывает серию
    // first && !met — грейс текущей недели: не считаем, но и не обрываем
    first = false;
    w = new Date(w.getTime() - 7 * DAY_MS);
  }

  // мини-полоска: последние 8 недель (старые → новые)
  const weeks = [];
  for (let i = 7; i >= 0; i--) {
    const wd = new Date(cur.getTime() - i * 7 * DAY_MS);
    const count = countOf(weekKey(wd));
    weeks.push({ count, met: count >= g });
  }
  return { streak, thisWeekCount, goal: g, weeks };
}

// шаг прибавки веса: базовые многосуставные «ноги» +5 кг, остальное +2.5 кг
const LEG_RE = /присед|носк|ног|выпад|гоблет|икр/i;
export function stepKg(name) { return LEG_RE.test(name || "") ? 5 : 2.5; }

// подходы из самой свежей сессии, где встречалось это (canon) упражнение
export function lastExerciseSets(sessions, name) {
  const cn = canon(name);
  const hits = (sessions || [])
    .filter((s) => s.exercises.some((e) => canon(e.n) === cn))
    .sort((a, b) => b.date.localeCompare(a.date) || (b.id || "").localeCompare(a.id || ""));
  if (!hits.length) return null;
  const e = hits[0].exercises.find((x) => canon(x.n) === cn);
  return e ? e.sets : null;
}

// форма как initForm, но веса/повторы предзаполнены из последней тренировки (если была)
export function suggestForm(tpl, sessions) {
  return tpl.ex.map((e) => {
    const n = canon(e.n);
    const hist = lastExerciseSets(sessions, n);
    if (hist && hist.length) {
      // подмешиваем целевой диапазон (hint) из шаблона по индексу подхода
      return {
        n,
        sets: hist.map((s, i) => ({
          weight: s.weight ?? "",
          reps: s.reps ?? "",
          hint: e.s[i]?.[2] || "",
          done: false,
        })),
      };
    }
    return {
      n,
      sets: e.s.map((arr) => ({
        weight: arr[0] ? arr[0] : "",
        reps: arr[1] != null ? arr[1] : "",
        hint: arr[2] || "",
        done: false,
      })),
    };
  });
}

/* ---- метрики экрана «Обзор» ---- */
// короткий месяц без точки: «март» → «март», «март.» → «март»
export const monthShort = (d) =>
  new Date(d).toLocaleDateString("ru-RU", { month: "short" }).replace(".", "");

// короткое имя ключевого жима для hero-метрики
export function shortLift(name) {
  return (name || "")
    .replace(/^Жим штанги лёжа$/i, "Жим лёжа")
    .replace(/\s*\([^)]*\)/g, "")
    .trim();
}

// схема подходов «N×повт» (или диапазон повторов) для списка «Последние»
export function setScheme(ex) {
  const sets = (ex && ex.sets) || [];
  if (!sets.length) return "—";
  const reps = sets.map((s) => num(s.reps)).filter((r) => r != null);
  if (!reps.length) return sets.length + " подх.";
  const min = Math.min(...reps), max = Math.max(...reps);
  return sets.length + "×" + (min === max ? min : min + "–" + max);
}

// «14200» → «14 200» (разряды по тысячам, обычным пробелом)
export function num1000(v) {
  return Math.round(v || 0).toLocaleString("ru-RU").replace(/[  ]/g, " ");
}

// hero: ключевой жим (предпочтительно «Жим штанги лёжа»), макс. рабочий вес.
// Возвращает { name, value, delta (за ~8 недель), series:[{date,label,v}] } или null.
// список упражнений из истории, по убыванию частоты (канонические имена) — для выбора в настройках
export function exerciseNames(sessions) {
  const freq = {};
  (sessions || []).forEach((s) => s.exercises.forEach((e) => { freq[e.n] = (freq[e.n] || 0) + 1; }));
  return Object.keys(freq).sort((a, b) => freq[b] - freq[a] || a.localeCompare(b));
}

// hero-график «Обзора». pick — явно выбранное упражнение (из настроек); если его нет в истории
// или не задано — авто: «Жим штанги лёжа», иначе самое частое.
export function heroLift(sessions, bio, pick) {
  if (!sessions || !sessions.length) return null;
  const freq = {};
  sessions.forEach((s) => s.exercises.forEach((e) => { freq[e.n] = (freq[e.n] || 0) + 1; }));
  const chosen = pick ? canon(pick) : null;
  const preferred = canon("Жим лёжа"); // «Жим штанги лёжа»
  const name = (chosen && freq[chosen]) ? chosen
    : freq[preferred] ? preferred
    : Object.keys(freq).sort((a, b) => freq[b] - freq[a])[0];
  if (!name) return null;
  const series = sessions
    .filter((s) => s.exercises.some((e) => e.n === name))
    .map((s) => {
      const e = s.exercises.find((x) => x.n === name);
      return { date: s.date, label: monthShort(s.date), v: exerciseTop(e, bodyweightOn(bio, s.date)) };
    })
    .filter((p) => p.v > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (!series.length) return null;
  const value = series[series.length - 1].v;
  const cutoff = new Date(series[series.length - 1].date).getTime() - 56 * 864e5;
  let base = series[0];
  for (const p of series) { if (new Date(p.date).getTime() <= cutoff) base = p; }
  return { name, value, delta: value - base.v, series };
}

// тоннаж за последние 7 дней и % к предыдущей неделе (7–14 дней назад)
export function weeklyTonnage(sessions, bio) {
  if (!sessions || !sessions.length) return null;
  const now = Date.now();
  let cur = 0, prev = 0, hasCur = false, hasPrev = false;
  for (const s of sessions) {
    const age = (now - new Date(s.date).getTime()) / 864e5;
    if (age < 0) continue;
    const vol = sessionVolume(s, bio);
    if (age <= 7) { cur += vol; hasCur = true; }
    else if (age <= 14) { prev += vol; hasPrev = true; }
  }
  if (!hasCur && !hasPrev) return null;
  const pct = hasPrev && prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null;
  return { cur, prev, pct };
}

// последнее значение жира + дельта к замеру ~30 дней назад
export function fatTrend(bio) {
  const withFat = (bio || [])
    .filter((b) => b.fat != null)
    .sort((a, b) => b.date.localeCompare(a.date));
  if (!withFat.length) return null;
  const latest = withFat[0];
  const cutoff = new Date(latest.date).getTime() - 30 * 864e5;
  let base = withFat.slice(1).find((b) => new Date(b.date).getTime() <= cutoff);
  if (!base && withFat.length > 1) base = withFat[withFat.length - 1];
  const delta = base ? +(latest.fat - base.fat).toFixed(1) : null;
  return { value: latest.fat, delta };
}

/* ---- дашборд рекомпозиции (фича #4) ---- */
// наклон линейной регрессии (МНК) по [{x,y}]; null если <2 точек или нулевая дисперсия x
export function linregSlope(points) {
  const n = points.length;
  if (n < 2) return null;
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (const { x, y } of points) { sx += x; sy += y; sxx += x * x; sxy += x * y; }
  const dx = n * sxx - sx * sx;
  if (dx === 0) return null;
  return (n * sxy - sx * sy) / dx;
}

const dirOf = (slope, thr) => (slope == null || Math.abs(slope) < thr ? 0 : slope > 0 ? 1 : -1);

// тренд жир/мышцы за окно (по умолчанию 90 дней): наклоны регрессии + словесный вердикт.
// Возвращает { series:[{date,label,fat,muscle}], fatSlope, muscleSlope, fatDir, musDir, verdict, tone } | null.
export function recompTrend(bio, windowDays = 90) {
  const all = (bio || []).filter((b) => b && b.date).sort((a, b) => a.date.localeCompare(b.date));
  if (!all.length) return null;
  const day = 864e5;
  const latest = new Date(all[all.length - 1].date).getTime();
  const cutoff = latest - windowDays * day;
  const win = all.filter((b) => new Date(b.date).getTime() >= cutoff);
  const series = win
    .filter((b) => b.fat != null || b.muscle != null)
    .map((b) => ({ date: b.date, label: monthShort(b.date), fat: b.fat ?? null, muscle: b.muscle ?? null }));
  const pts = (k) => win.filter((b) => b[k] != null)
    .map((b) => ({ x: (new Date(b.date).getTime() - cutoff) / day, y: b[k] }));
  const fatPts = pts("fat"), musPts = pts("muscle");
  if (fatPts.length < 2 || musPts.length < 2) return null;
  const fatSlope = linregSlope(fatPts);     // %/день
  const muscleSlope = linregSlope(musPts);  // кг/день
  // пороги «≈стабильно»: жир ~0.3%/мес, мышцы ~0.15 кг/мес
  const fatDir = dirOf(fatSlope, 0.01);
  const musDir = dirOf(muscleSlope, 0.005);
  let verdict, tone;
  if (fatDir < 0 && musDir >= 0) { verdict = "Рекомпозиция идёт"; tone = "good"; }
  else if (fatDir < 0 && musDir < 0) { verdict = "Теряешь и жир, и мышцы"; tone = "warn"; }
  else if (fatDir > 0 && musDir > 0) { verdict = "Набор массы"; tone = "neutral"; }
  else if (fatDir > 0 && musDir < 0) { verdict = "Регресс"; tone = "bad"; }
  else if (fatDir > 0 && musDir === 0) { verdict = "Набор жира"; tone = "warn"; }
  else if (fatDir === 0 && musDir > 0) { verdict = "Растут мышцы"; tone = "good"; }
  else if (fatDir === 0 && musDir < 0) { verdict = "Уходят мышцы"; tone = "warn"; }
  else { verdict = "Без изменений"; tone = "neutral"; }
  return { series, fatSlope, muscleSlope, fatDir, musDir, verdict, tone };
}

// нормализует названия в сессии и объединяет совпавшие упражнения внутри неё
export function normSession(s) {
  const map = new Map();
  (s.exercises || []).forEach((e) => {
    const n = canon(e.n);
    const sets = e.sets || [];
    if (map.has(n)) map.get(n).sets.push(...sets);
    else map.set(n, { n, sets: [...sets] });
  });
  return { ...s, exercises: [...map.values()] };
}

/* ---------------------------- CSS ---------------------------- */
export const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Hanken+Grotesk:wght@400;500;600&family=JetBrains+Mono:wght@400;500;700&display=swap');
html,body{overflow-x:hidden;max-width:100%;touch-action:manipulation;-webkit-text-size-adjust:100%;}
.ft-root{font-family:'Hanken Grotesk',sans-serif;-webkit-font-smoothing:antialiased;padding-bottom:40px;overflow-x:hidden;max-width:100%;}
.ft-root *{box-sizing:border-box;}
.ft-mono{font-family:'JetBrains Mono',monospace;font-variant-numeric:tabular-nums;}
.ft-muted{color:${C.muted};}
.ft-mini{font-size:12px;}
.ft-trunc{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:62%;}

.ft-head{padding:calc(14px + env(safe-area-inset-top)) calc(18px + env(safe-area-inset-right)) 12px calc(18px + env(safe-area-inset-left));}
.ft-head-top{display:flex;align-items:center;justify-content:space-between;gap:8px;}
.ft-logo{font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:22px;letter-spacing:-.5px;display:flex;align-items:center;gap:8px;}
.ft-head-sub{color:${C.muted};font-size:12.5px;margin-top:2px;}
.ft-logout{background:none;border:1px solid ${C.line};color:${C.muted};border-radius:8px;padding:0 10px;height:38px;cursor:pointer;display:flex;align-items:center;gap:5px;font-size:12px;}
.ft-logout:hover{color:${C.txt};border-color:#3a4030;}

.ft-sync{display:flex;align-items:center;gap:6px;font-size:11.5px;margin-top:6px;}
.ft-sync.err{color:${C.danger};}
.ft-sync.ok{color:${C.muted};}

.ft-nav{display:flex;gap:6px;padding:0 12px;position:sticky;top:0;z-index:5;background:linear-gradient(${C.bg},${C.bg} 70%,transparent);padding-bottom:6px;overflow-x:auto;}
.ft-tab{flex:1;min-width:78px;min-height:54px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:9px 4px;border:1px solid ${C.line};background:${C.card};color:${C.muted};border-radius:11px;font-size:11.5px;font-weight:600;cursor:pointer;transition:.15s;}
.ft-tab.on{color:${C.bg};background:${C.accent};border-color:${C.accent};}
.ft-tab:not(.on):hover{color:${C.txt};border-color:#3a4030;}

.ft-main{padding:14px calc(14px + env(safe-area-inset-right)) 0 calc(14px + env(safe-area-inset-left));max-width:760px;margin:0 auto;}

.ft-card{background:${C.card};border:1px solid ${C.line};border-radius:14px;padding:14px;margin-bottom:12px;}
.ft-card-h{font-family:'Bricolage Grotesque',sans-serif;font-weight:700;font-size:14px;margin-bottom:10px;}
.ft-row{display:flex;align-items:center;justify-content:space-between;gap:8px;}

.ft-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
.ft-mini.ft-set{}
.ft-bio-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;}
.ft-bio-cell{background:${C.bg};border:1px solid ${C.line};border-radius:9px;padding:8px 9px;}
.ft-bio-v{font-size:17px;font-weight:600;margin-top:2px;}
.ft-unit{font-size:11px;color:${C.muted};margin-left:2px;}

.ft-seg{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;}
.ft-seg-b{display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:1px;padding:11px 12px;min-height:50px;border:1px solid ${C.line};background:${C.card};color:${C.txt};border-radius:11px;cursor:pointer;text-align:left;transition:.15s;}
.ft-seg-b strong{font-family:'Bricolage Grotesque',sans-serif;font-size:14px;}
.ft-seg-b.on{border-color:${C.accent};box-shadow:inset 0 0 0 1px ${C.accent};}
.ft-seg-b.on strong{color:${C.accent};}
.ft-last{margin-top:4px;color:${C.muted};}
.ft-next{font-family:'Hanken Grotesk',sans-serif;font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:${C.bg};background:${C.accent};border-radius:5px;padding:2px 5px;flex:none;}

.ft-ex-del{margin-left:auto;color:${C.muted};}
.ft-toast{display:flex;align-items:center;gap:7px;margin-top:10px;padding:9px 12px;background:rgba(200,242,63,.12);border:1px solid ${C.accent};color:${C.accent};border-radius:9px;font-size:13px;font-weight:600;animation:ft-pop .25s ease;}
@keyframes ft-pop{from{opacity:0;transform:translateY(4px);}to{opacity:1;transform:none;}}
.ft-confirm-del{background:${C.danger};color:#fff;border:none;border-radius:7px;padding:5px 14px;min-height:50px;font-size:13px;font-weight:700;cursor:pointer;}
.ft-edit-bar{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:4px 0 8px;padding:8px 12px;background:rgba(111,211,255,.1);border:1px solid ${C.blue};color:${C.blue};border-radius:9px;font-weight:600;}
.ft-edit-bar span{display:flex;align-items:center;gap:6px;}
.ft-edit-bar .ft-icon-b{color:${C.blue};}
.ft-bw-hint{margin:-2px 0 9px;line-height:1.35;}

.ft-datebar{justify-content:flex-start;gap:10px;margin-bottom:10px;}
/* font-size:16px обязателен — iOS зумит фокус на полях с меньшим шрифтом; min-height:50px — тап пальцем */
.ft-input{background:${C.bg};border:1px solid ${C.line};color:${C.txt};border-radius:8px;padding:10px 12px;font-size:16px;min-height:50px;width:100%;outline:none;transition:.12s;}
.ft-input:focus{border-color:${C.accent};}
.ft-input[type=date]{width:auto;}

.ft-ex{padding:12px;}
.ft-ex-h{display:flex;align-items:center;gap:9px;margin-bottom:9px;}
.ft-ex-num{display:flex;align-items:center;justify-content:center;width:22px;height:22px;background:${C.bg};border:1px solid ${C.line};border-radius:6px;font-size:12px;color:${C.accent};flex:none;}
.ft-ex-name{font-weight:600;font-size:14px;}
.ft-ex-toggle{flex:1;min-width:0;display:flex;align-items:center;justify-content:space-between;gap:8px;background:none;border:none;color:${C.txt};cursor:pointer;padding:2px 0;text-align:left;}
.ft-ex-toggle .ft-ex-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.ft-ex-toggle svg{color:${C.muted};flex:none;}
.ft-ex-toggle:hover .ft-ex-name,.ft-ex-toggle:hover svg{color:${C.accent};}
.ft-ex-preview{width:100%;display:flex;align-items:center;text-align:left;background:none;border:none;border-top:1px dashed ${C.line};margin-top:2px;padding:8px 0 0;color:${C.muted};font-size:13px;cursor:pointer;}
.ft-ex-preview:hover{color:${C.accent};}
.ft-sets{display:flex;flex-direction:column;gap:6px;}
.ft-set{display:grid;grid-template-columns:24px 1fr 1fr 50px;gap:8px;align-items:center;}
.ft-set-head{padding:0 2px;}
.ft-set-head span:nth-child(2),.ft-set-head span:nth-child(3){padding-left:9px;}
.ft-icon-b{background:none;border:none;color:${C.muted};cursor:pointer;display:flex;align-items:center;justify-content:center;padding:4px;min-width:50px;min-height:50px;border-radius:6px;transition:.12s;}
.ft-icon-b:hover{color:${C.danger};background:rgba(255,107,94,.1);}
.ft-gear:hover{color:${C.accent};background:rgba(200,242,63,.1);}
.ft-add{margin-top:8px;background:none;border:1px dashed ${C.line};color:${C.muted};border-radius:8px;padding:6px;min-height:50px;font-size:13px;width:100%;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:5px;transition:.12s;}
.ft-add:hover{color:${C.accent};border-color:${C.accent};}

.ft-btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;background:${C.accent};color:${C.bg};border:none;border-radius:10px;padding:11px 16px;min-height:50px;font-weight:700;font-size:15px;cursor:pointer;font-family:'Bricolage Grotesque',sans-serif;transition:.15s;}
.ft-btn:hover{background:#d9ff5c;}
.ft-btn:disabled{opacity:.5;cursor:default;}
.ft-save{width:100%;margin-top:4px;}

.ft-hist-toggle{width:100%;background:none;border:1px solid ${C.line};color:${C.txt};border-radius:10px;padding:10px;min-height:50px;font-weight:600;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;margin:14px 0 12px;}
.ft-hist .ft-mini{margin-top:3px;}
.ft-hist .ft-mini .ft-mono{color:${C.txt};}
/* в карточках истории/замеров и в шапке упражнений иконки не раздуваем до 50px — иначе верхний ряд делает паддинг визуально больше боковых */
.ft-hist .ft-icon-b,.ft-ex-h .ft-icon-b{min-height:36px;min-width:36px;}
/* в шапке упражнения тап-зона иконки 36px, но в раскладке схлопываем до высоты плашки (22px) отрицательным margin — иначе ряд центрирует «№» ниже, и отступ сверху становится больше бокового */
.ft-ex-h .ft-icon-b{margin-top:-7px;margin-bottom:-7px;}

.ft-bio-form{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:12px;}
.ft-field{display:flex;flex-direction:column;gap:4px;}

.ft-seg-table{display:flex;flex-direction:column;gap:6px;margin-bottom:12px;}
.ft-seg-trow{display:grid;grid-template-columns:minmax(64px,1.3fr) repeat(4,1fr);gap:6px;align-items:center;}
.ft-seg-thead span{text-align:center;line-height:1.2;}
.ft-seg-thead span:first-child{text-align:left;}
.ft-seg-in{padding:6px 6px;text-align:center;}

.ft-pills{display:flex;gap:6px;}
.ft-pill{display:inline-flex;align-items:center;background:${C.bg};border:1px solid ${C.line};color:${C.muted};border-radius:20px;padding:6px 12px;font-size:12px;font-weight:600;cursor:pointer;transition:.12s;}
.ft-pill.on{background:${C.accent};color:${C.bg};border-color:${C.accent};}
.ft-period-card{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
.ft-pick-list{display:flex;flex-direction:column;gap:6px;margin-top:10px;max-height:50vh;overflow-y:auto;}
.ft-pick-item{display:flex;align-items:center;gap:6px;width:100%;text-align:left;background:${C.bg};border:1px solid ${C.line};color:${C.txt};border-radius:9px;padding:11px 12px;min-height:50px;font-size:14px;cursor:pointer;transition:.12s;}
.ft-pick-item:hover{border-color:${C.accent};color:${C.accent};}
.ft-pick-new{color:${C.accent};border-color:${C.accent2};border-style:dashed;font-weight:700;}
.ft-select-wrap{position:relative;flex:1;min-width:0;}
.ft-select{appearance:none;width:100%;background:${C.bg};border:1px solid ${C.line};color:${C.txt};border-radius:8px;padding:10px 34px 10px 12px;font-size:16px;min-height:50px;cursor:pointer;outline:none;}
.ft-select-ic{position:absolute;right:9px;top:50%;transform:translateY(-50%);color:${C.muted};pointer-events:none;}

/* таймер отдыха (фичи #1) */
.ft-rest-timer{position:fixed;right:16px;bottom:16px;z-index:30;display:flex;align-items:center;gap:6px;}
.ft-rest-timer.open{left:16px;right:16px;justify-content:center;gap:10px;background:${C.card};border:1px solid ${C.line};border-radius:14px;padding:12px 14px;box-shadow:0 8px 24px rgba(0,0,0,.45);flex-wrap:wrap;max-width:calc(100vw - 32px);}
.ft-rest-fab{display:flex;align-items:center;justify-content:center;width:54px;height:54px;border-radius:50%;background:${C.accent};color:${C.bg};border:none;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.45);}
.ft-rest-fab:hover{background:#d9ff5c;}
.ft-rest-time{font-size:18px;font-weight:700;min-width:46px;text-align:center;color:${C.accent};}
.ft-rest-presets{display:flex;gap:4px;}
.ft-rest-preset{background:${C.bg};border:1px solid ${C.line};color:${C.txt};border-radius:7px;padding:5px 8px;font-size:12px;font-weight:600;cursor:pointer;transition:.12s;}
.ft-rest-preset:hover{border-color:${C.accent};color:${C.accent};}
.ft-rest-ctl{color:${C.txt};}
.ft-rest-ctl:hover{color:${C.accent};background:rgba(200,242,63,.1);}
.ft-rest-ctl:disabled{opacity:.4;cursor:default;}

/* бейдж личного рекорда (графики #1) */
.ft-pr{display:inline-flex;align-items:center;justify-content:center;vertical-align:middle;color:${C.accent};background:rgba(200,242,63,.12);border:1px solid ${C.accent2};border-radius:6px;padding:1px 4px;}

/* program editor (фичи #2) */
.ft-prog-bar{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;}
.ft-prog-btn{display:inline-flex;align-items:center;justify-content:center;gap:5px;background:${C.bg};border:1px solid ${C.line};color:${C.txt};border-radius:8px;padding:6px 12px;min-height:50px;font-size:13px;font-weight:600;cursor:pointer;transition:.12s;}
.ft-prog-btn:hover{border-color:${C.accent};color:${C.accent};}
.ft-prog-overlay{position:fixed;inset:0;z-index:40;background:rgba(0,0,0,.6);display:flex;align-items:flex-start;justify-content:center;padding:max(24px,env(safe-area-inset-top)) 12px 24px;overflow-y:auto;-webkit-overflow-scrolling:touch;}
.ft-prog-editor{background:${C.card};border:1px solid ${C.line};border-radius:14px;padding:14px;width:100%;max-width:560px;margin:auto 0;}
.ft-prog-head{margin-bottom:12px;}
.ft-prog-head strong{font-family:'Bricolage Grotesque',sans-serif;font-size:16px;}
.ft-prog-list{display:flex;flex-direction:column;gap:8px;}
.ft-prog-item{display:flex;align-items:center;justify-content:space-between;gap:8px;background:${C.bg};border:1px solid ${C.line};border-radius:10px;padding:9px 11px;}
.ft-prog-form{display:flex;flex-direction:column;gap:10px;}
.ft-prog-ex{padding:11px 12px 10px;margin-bottom:0;background:${C.bg};}
.ft-prog-ex .ft-ex-h{gap:8px;}
.ft-prog-ex .ft-ex-h .ft-input{flex:1;}

/* логотип-вордмарк (буква O — знак-болт) */
.ft-logo-mark{display:inline-flex;align-items:center;}
.ft-logo-o{width:.82em;height:.82em;margin:0 -1px;}

/* шапка: блок действий + индикатор синка */
.ft-head-actions{display:flex;align-items:center;gap:10px;flex:none;}
.ft-head-actions .ft-icon-b{min-width:38px;min-height:38px;}
.ft-syncchip{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:600;color:${C.muted};}
.ft-syncchip-dot{width:8px;height:8px;border-radius:50%;background:${C.accent};box-shadow:0 0 6px ${C.accent};}
.ft-syncchip.err{color:${C.danger};}
.ft-syncchip.err .ft-syncchip-dot{background:${C.danger};box-shadow:none;}

/* hero-метрика «Обзора» */
.ft-hero{padding:16px 16px 8px;}
.ft-hero-top{display:flex;align-items:center;justify-content:space-between;gap:8px;}
.ft-hero-label{font-size:12px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:${C.muted};}
.ft-badge{display:inline-flex;align-items:center;gap:3px;font-family:'JetBrains Mono',monospace;font-variant-numeric:tabular-nums;font-size:12px;font-weight:700;color:${C.bg};background:${C.accent};border-radius:8px;padding:4px 8px;white-space:nowrap;}
.ft-badge.down{background:${C.blue};}
.ft-hero-v{font-family:'Bricolage Grotesque',sans-serif;font-size:54px;font-weight:800;line-height:1;letter-spacing:-1px;margin:8px 0 4px;}
.ft-hero-unit{font-size:20px;font-weight:700;color:${C.muted};margin-left:8px;letter-spacing:0;}

/* карточки-метрики «Обзора» */
.ft-stat2{display:flex;flex-direction:column;}
.ft-stat2-v{font-size:24px;font-weight:700;line-height:1.1;margin-top:4px;}
.ft-stat2-sub{display:inline-flex;align-items:center;gap:3px;font-family:'JetBrains Mono',monospace;font-variant-numeric:tabular-nums;font-size:11.5px;font-weight:700;color:${C.accent};margin-top:4px;}
.ft-stat2-sub.down{color:${C.blue};}

/* список «Последние» */
.ft-section-h{font-family:'Bricolage Grotesque',sans-serif;font-weight:700;font-size:11.5px;letter-spacing:.6px;text-transform:uppercase;color:${C.muted};margin-bottom:8px;}
.ft-recent-row{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:9px 0;border-top:1px solid ${C.line};font-size:13px;}
.ft-recent-row:first-of-type{border-top:none;}
.ft-recent-row .ft-mono{font-weight:600;white-space:nowrap;}

/* token gate */
.ft-gate{min-height:100vh;min-height:100dvh;height:100dvh;display:flex;align-items:center;justify-content:center;padding:calc(20px + env(safe-area-inset-top)) calc(20px + env(safe-area-inset-right)) calc(20px + env(safe-area-inset-bottom)) calc(20px + env(safe-area-inset-left));overflow:hidden;}
.ft-gate-card{width:100%;max-width:360px;}
.ft-gate-card .ft-logo{justify-content:center;margin-bottom:6px;}
.ft-gate-err{color:${C.danger};font-size:12.5px;margin-top:8px;text-align:center;}

/* празднование PR (фича #2) */
.ft-toast.pr{background:${C.accent};color:${C.bg};border-color:${C.accent};font-weight:700;animation:ft-pop .25s ease, ft-pr-pulse 1.1s ease 1;}
@keyframes ft-pr-pulse{0%{box-shadow:0 0 0 0 rgba(200,242,63,.55);}100%{box-shadow:0 0 0 16px rgba(200,242,63,0);}}

/* дашборд рекомпозиции — вердикт (фича #4) */
.ft-verdict{font-size:11.5px;font-weight:700;padding:3px 9px;border-radius:8px;white-space:nowrap;}
.ft-verdict-good{color:${C.bg};background:${C.accent};}
.ft-verdict-bad{color:#fff;background:${C.danger};}
.ft-verdict-warn{color:${C.bg};background:${C.pink};}
.ft-verdict-neutral{color:${C.muted};background:rgba(141,146,128,.18);}

/* таймер отдыха — крупный, во всю ширину + сигнал по нулю (фича #5) */
.ft-rest-timer.open .ft-rest-time{font-size:30px;min-width:92px;}
.ft-rest-timer.open .ft-rest-preset{padding:8px 13px;min-height:50px;font-size:14px;}
.ft-rest-timer.done{background:${C.accent};border-color:${C.accent};animation:ft-rest-flash .5s ease-in-out 4;}
.ft-rest-timer.done .ft-rest-time,.ft-rest-timer.done .ft-rest-ctl{color:${C.bg};}
@keyframes ft-rest-flash{0%,100%{box-shadow:0 0 0 0 rgba(200,242,63,0);}50%{box-shadow:0 0 0 5px rgba(200,242,63,.6);}}

/* панель настроек */
.ft-set-group{display:flex;flex-direction:column;}
.ft-set-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px 0;border-bottom:1px solid ${C.line};font-size:13px;}
.ft-set-row:last-child{border-bottom:none;}
.ft-set-row .ft-input{max-width:96px;text-align:right;}
.ft-set-row input[type=checkbox]{width:18px;height:18px;accent-color:${C.accent};}

/* личные рекорды (вкладка «Прогресс») */
.ft-pr-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;}
.ft-pr-card{padding:12px 14px;display:flex;flex-direction:column;gap:3px;}
.ft-pr-name{font-weight:700;font-size:14px;color:${C.txt};}
.ft-pr-val{font-size:20px;font-weight:700;color:${C.accent};}
.ft-pr-val .ft-pr-reps{font-size:13px;font-weight:600;color:${C.muted};}
.ft-pr-date{margin-top:1px;}
.ft-pr-sub{display:flex;align-items:baseline;justify-content:space-between;gap:8px;font-size:12px;margin-top:3px;}
.ft-pr-sub-k{color:${C.muted};}
.ft-pr-sub-v{font-family:'JetBrains Mono',monospace;font-variant-numeric:tabular-nums;color:${C.txt};font-weight:600;}
.ft-pr-sub-d{color:${C.muted};font-weight:400;margin-left:4px;}

/* подход «сделан»: заблокированные поля + кнопка-галочка (фича) */
.ft-set.ft-set-log{grid-template-columns:24px 1fr 1fr 28px 28px;}
.ft-input-locked{opacity:.55;color:${C.muted};border-color:${C.line};cursor:default;}
.ft-set-check{background:none;border:1px solid ${C.line};color:${C.muted};cursor:pointer;display:flex;align-items:center;justify-content:center;padding:4px;border-radius:6px;transition:.12s;}
.ft-set-check:hover{color:${C.accent};border-color:${C.accent};}
.ft-set-check.on{color:${C.bg};background:${C.accent};border-color:${C.accent};}
.ft-set-check.on:hover{background:#d9ff5c;}
/* BW-упражнения: тумблер знака «±» в ячейке веса (утяжелитель −), без новой колонки в сетке */
.ft-weight-wrap{position:relative;display:flex;align-items:center;}
.ft-weight-wrap .ft-input{width:100%;padding-left:34px;}
.ft-sign-btn{position:absolute;left:5px;top:50%;transform:translateY(-50%);z-index:2;width:26px;height:26px;display:flex;align-items:center;justify-content:center;padding:0;border:1px solid ${C.line};border-radius:6px;background:${C.bg};color:${C.muted};font-family:'JetBrains Mono',monospace;font-size:15px;font-weight:700;line-height:1;cursor:pointer;transition:.12s;}
.ft-sign-btn:hover{color:${C.accent};border-color:${C.accent};}
.ft-sign-btn.on{color:${C.bg};background:${C.accent};border-color:${C.accent};}
.ft-sign-btn:disabled{opacity:.55;cursor:default;}
/* чекбокс на уровне упражнения — тот же вид, что у галочки подхода; в flex-шапке не сжимаем и не раздуваем высоту ряда */
.ft-ex-check{flex:none;width:28px;height:28px;margin-top:-3px;margin-bottom:-3px;}

/* недельный стрик (фича) */
.ft-streak{display:flex;align-items:center;gap:14px;}
.ft-streak-icon{display:flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:12px;background:rgba(200,242,63,.12);border:1px solid ${C.accent2};color:${C.accent};flex:none;}
.ft-streak-main{display:flex;flex-direction:column;min-width:0;flex:1;}
.ft-streak-v{font-family:'Bricolage Grotesque',sans-serif;font-size:26px;font-weight:800;line-height:1;}
.ft-streak-v .ft-streak-unit{font-size:13px;font-weight:700;color:${C.muted};margin-left:6px;}
.ft-streak-sub{font-size:12px;color:${C.muted};margin-top:4px;display:flex;align-items:center;gap:7px;flex-wrap:wrap;}
.ft-streak-dots{display:inline-flex;gap:4px;}
.ft-streak-dot{width:9px;height:9px;border-radius:50%;border:1px solid ${C.accent2};background:none;}
.ft-streak-dot.on{background:${C.accent};box-shadow:0 0 5px ${C.accent};}
.ft-streak-weeks{display:flex;align-items:flex-end;gap:3px;height:26px;flex:none;}
.ft-streak-week{width:7px;border-radius:2px;background:${C.line};}
.ft-streak-week.on{background:${C.accent};}

@media(max-width:520px){
  .ft-bio-form{grid-template-columns:1fr 1fr;}
  .ft-bio-grid{grid-template-columns:repeat(2,1fr);}

  /* таймер — над фиксированным нижним меню */
  .ft-rest-timer{bottom:calc(74px + env(safe-area-inset-bottom));}

  /* нижнее фиксированное меню — удобнее для большого пальца */
  .ft-root{padding-bottom:calc(72px + env(safe-area-inset-bottom));}
  .ft-nav{position:fixed;top:auto;bottom:0;left:0;right:0;z-index:20;
    padding:7px calc(8px + env(safe-area-inset-right)) calc(7px + env(safe-area-inset-bottom)) calc(8px + env(safe-area-inset-left));
    background:${C.card};border-top:1px solid ${C.line};
    box-shadow:0 -6px 18px rgba(0,0,0,.35);overflow-x:visible;}
  .ft-tab{min-width:0;border:none;background:none;border-radius:9px;padding:5px 2px;font-size:11px;}
  .ft-tab.on{background:none;border:none;color:${C.accent};}
}
`;
