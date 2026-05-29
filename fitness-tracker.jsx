/* ============================================================
 * fitness-tracker.jsx — ИСХОДНЫЙ ПРОТОТИП (артефакт Claude).
 * Источник истины по фронту: компоненты, TEMPLATES, CANON,
 * normSession, расчёты, стили (HANDOFF.md §11).
 *
 * ВНИМАНИЕ: это не используемый в сборке файл. Рабочее приложение —
 * в src/ (App.jsx + data.js + api.js), где window.storage заменён
 * на модуль api (шаги 1–4 спеки). Этот файл оставлен для справки.
 * ========================================================== */
import React, { useState, useEffect, useMemo } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import {
  LayoutDashboard, Dumbbell, HeartPulse, TrendingUp,
  Plus, Trash2, Check, X, ChevronDown, ChevronUp, Flame, Scale, ArrowUp, ArrowDown,
} from "lucide-react";

/* ---------- theme colors (mirror CSS vars for recharts SVG) ---------- */
const C = {
  bg: "#0c0e0a", card: "#15170f", line: "#262a1d",
  txt: "#e9ebe0", muted: "#8d9280", accent: "#c8f23f", accent2: "#86b81f",
  blue: "#6fd3ff", pink: "#ff8ab0", danger: "#ff6b5e",
};

/* ---------- program templates (targets prefill the log form) ---------- */
const TEMPLATES = [
  {
    id: "h1t1", name: "Н1 · Т1", sub: "Грудь / спина / руки",
    ex: [
      { n: "Выпрыгивания с гантелью", s: [[12,5],[12,5],[12,5],[12,5]] },
      { n: "Жим лёжа", s: [[60,8],[70,5],[70,5,"4–5"],[70,4]] },
      { n: "Разведения лёжа", s: [[14,10],[14,10],[14,11,"10–12"]] },
      { n: "Подтягивания", s: [[0,6,"б/п"],[0,6,"5–6 б/п"],[14,9,"помощь 8–10"]] },
      { n: "Махи в стороны", s: [[9,12],[9,12],[9,11,"10–12"]] },
      { n: "Бицепс штанга", s: [[20,10],[20,10],[17.5,10]] },
      { n: "Подъём ног в висе", s: [[0,12],[0,12],[0,12]] },
    ],
  },
  {
    id: "h1t2", name: "Н1 · Т2", sub: "Ноги / плечи / трицепс",
    ex: [
      { n: "Подъёмы на носки сидя", s: [[20,15],[20,15],[25,12]] },
      { n: "Жим гантелей 15°", s: [[22,10],[22,10],[22,10,"9–10"]] },
      { n: "Тяга верт. блока к груди", s: [[45,12],[45,12],[45,10]] },
      { n: "Брусья", s: [[0,12,"б/п"],[0,9,"8–10 б/п"],[9,9,"помощь 9–10"]] },
      { n: "Жим гантелей сидя", s: [[16,10],[16,10],[16,10,"9–10"]] },
      { n: "Трицепс канат", s: [[11.3,12],[11.3,12],[13.5,9,"8–10"]] },
      { n: "Пресс в тренажёре", s: [[0,12],[0,12],[0,12]] },
    ],
  },
  {
    id: "h2t1", name: "Н2 · Т1", sub: "Грудь / спина / руки",
    ex: [
      { n: "Гоблет-присед", s: [[26,8],[26,8],[26,8],[26,8]] },
      { n: "Жим гантелей 15°", s: [[22,10],[24,8],[24,8]] },
      { n: "Бабочка / сведения", s: [[15,12],[15,11,"10–12"],[15,11,"10–12"]] },
      { n: "Подтягивания", s: [[0,8,"б/п"],[0,5,"б/п"],[14,9,"помощь 8–10"]] },
      { n: "Протяжка к подбородку", s: [[25,10],[25,10],[25,9,"8–10"]] },
      { n: "Молотковые", s: [[10,10],[10,10],[7.5,10]] },
      { n: "Подъём ног в висе / dead bug", s: [[0,null],[0,null],[0,null]] },
    ],
  },
  {
    id: "h2t2", name: "Н2 · Т2", sub: "Ноги / плечи / руки",
    ex: [
      { n: "Подъёмы на носки сидя", s: [[20,15],[25,12],[25,12]] },
      { n: "Жим в тренажёре на грудь (1 рука)", s: [[30,10],[30,10],[32.5,9,"8–10"]] },
      { n: "Тяга гориз. блока к поясу", s: [[45,10],[45,10],[50,9,"8–10"]] },
      { n: "Брусья", s: [[0,10],[0,10],[0,9,"9–10 б/п"]] },
      { n: "Жим гантелей сидя", s: [[16,10],[18,8],[18,8]] },
      { n: "Подъём штанги на бицепс", s: [[25,10],[25,10],[25,9,"8–9"]] },
      { n: "Пресс в тренажёре", s: [[0,12],[0,12],[0,12]] },
    ],
  },
];

const SEED_HISTORY = [{"id":"S01_N2T_old","date":"2026-03-21","templateId":"h2t2","exercises":[{"n":"Жим гантелей под углом 30°","sets":[{"weight":16,"reps":12},{"weight":18,"reps":12},{"weight":20,"reps":11}]},{"n":"Отжимания на брусьях","sets":[{"weight":"","reps":12},{"weight":"","reps":6},{"weight":9,"reps":5},{"weight":9,"reps":11}]},{"n":"Тяга горизонтального блока к поясу","sets":[{"weight":39,"reps":12},{"weight":39,"reps":12},{"weight":39,"reps":12}]},{"n":"Махи гантелей в стороны","sets":[{"weight":6,"reps":15},{"weight":6,"reps":12},{"weight":4,"reps":28}]},{"n":"Молотковые подъёмы гантелей","sets":[{"weight":12,"reps":8},{"weight":10,"reps":6},{"weight":10,"reps":6},{"weight":6,"reps":8},{"weight":6,"reps":10}]},{"n":"Гиперэкстензия классическая","sets":[{"weight":0,"reps":20},{"weight":5,"reps":20},{"weight":5,"reps":20}]}]},{"id":"S02_N1T1_2025-03-27","date":"2026-03-27","templateId":"h1t1","exercises":[{"n":"Жим штанги лёжа","sets":[{"weight":50,"reps":8},{"weight":60,"reps":6},{"weight":65,"reps":4},{"weight":70,"reps":4},{"weight":70,"reps":4}]},{"n":"Разведения гантелей лёжа","sets":[{"weight":14,"reps":8},{"weight":12,"reps":12},{"weight":12,"reps":6}]},{"n":"Жим гантелей лёжа","sets":[{"weight":12,"reps":6}]},{"n":"Подтягивания в гравитроне","sets":[{"weight":7,"reps":6},{"weight":21,"reps":12},{"weight":21,"reps":8}]},{"n":"Махи гантелей в стороны","sets":[{"weight":7,"reps":15},{"weight":7,"reps":15},{"weight":6,"reps":5},{"weight":3,"reps":"до отказа"}]},{"n":"Подъём штанги на бицепс","sets":[{"weight":20,"reps":13},{"weight":20,"reps":6},{"weight":10,"reps":7}]},{"n":"Подъём ног в висе","sets":[{"weight":"","reps":12},{"weight":"","reps":12},{"weight":"","reps":12}]}]},{"id":"S03_N1T2_light","date":"2026-03-29","templateId":"h1t2","exercises":[{"n":"Жим гантелей 15°","sets":[{"weight":18,"reps":12},{"weight":18,"reps":12},{"weight":18,"reps":10}]},{"n":"Подъём на носки в тренажёре сидя","sets":[{"weight":20,"reps":12},{"weight":20,"reps":12}]},{"n":"Жим гантелей сидя","sets":[{"weight":12,"reps":12},{"weight":12,"reps":12}]},{"n":"Подъём ног в висе","sets":[{"weight":"","reps":12},{"weight":"","reps":12}]}]},{"id":"S04_N2T1","date":"2026-04-03","templateId":"h2t1","exercises":[{"n":"Жим гантелей 15°","sets":[{"weight":18,"reps":10},{"weight":20,"reps":9},{"weight":20,"reps":9}]},{"n":"Сведения в кроссовере","sets":[{"weight":9,"reps":12},{"weight":9,"reps":10},{"weight":6,"reps":12}]},{"n":"Подтягивания в гравитроне","sets":[{"weight":14,"reps":10},{"weight":14,"reps":10},{"weight":14,"reps":8}]},{"n":"Протяжка штанги к подбородку","sets":[{"weight":20,"reps":12},{"weight":20,"reps":12},{"weight":20,"reps":12}]},{"n":"Молотковые подъёмы гантелей","sets":[{"weight":10,"reps":10}]}]},{"id":"S05_N1T1","date":"2026-04-10","templateId":"h1t1","exercises":[{"n":"Жим штанги лёжа","sets":[{"weight":50,"reps":8},{"weight":60,"reps":5},{"weight":65,"reps":3},{"weight":"67.5","reps":5},{"weight":"67.5","reps":3}]},{"n":"Разведения гантелей лёжа","sets":[{"weight":12,"reps":10},{"weight":12,"reps":10},{"weight":12,"reps":10}]},{"n":"Подтягивания в гравитроне","sets":[{"weight":14,"reps":9},{"weight":14,"reps":7},{"weight":14,"reps":6}]},{"n":"Махи гантелей в стороны","sets":[{"weight":9,"reps":12},{"weight":9,"reps":12},{"weight":9,"reps":10}]},{"n":"Подъём штанги на бицепс","sets":[{"weight":20,"reps":11},{"weight":20,"reps":9},{"weight":15,"reps":12}]}]},{"id":"S06_N1T2","date":"2026-04-12","templateId":"h1t2","exercises":[{"n":"Жим гантелей 15°","sets":[{"weight":22,"reps":10},{"weight":22,"reps":10},{"weight":22,"reps":8}]},{"n":"Тяга вертикального блока к груди","sets":[{"weight":45,"reps":12},{"weight":45,"reps":12},{"weight":45,"reps":8}]},{"n":"Брусья","sets":[{"weight":"","reps":12},{"weight":"","reps":8},{"weight":9,"reps":9}]},{"n":"Жим гантелей сидя","sets":[{"weight":16,"reps":10},{"weight":16,"reps":10},{"weight":16,"reps":8}]},{"n":"Трицепс в канате","sets":[{"weight":11.3,"reps":12},{"weight":13.5,"reps":8},{"weight":11.3,"reps":10}]}]},{"id":"S07_N2T1","date":"2026-05-08","templateId":"h2t1","exercises":[{"n":"Жим гантелей 15°","sets":[{"weight":22,"reps":10},{"weight":22,"reps":10},{"weight":24,"reps":8}]},{"n":"Сведения в тренажёре бабочка","sets":[{"weight":15,"reps":10},{"weight":15,"reps":10},{"weight":15,"reps":10}]},{"n":"Подтягивания","sets":[{"weight":"","reps":7},{"weight":"","reps":4},{"weight":"","reps":2},{"weight":14,"reps":8}]},{"n":"Протяжка штанги к подбородку","sets":[{"weight":25,"reps":10},{"weight":25,"reps":10},{"weight":20,"reps":10}]}]},{"id":"S08_N2T2","date":"2026-05-10","templateId":"h2t2","exercises":[{"n":"Жим в тренажёре сидя на грудь","sets":[{"weight":20,"reps":12},{"weight":20,"reps":10},{"weight":25,"reps":10},{"weight":27.5,"reps":10}]},{"n":"Тяга горизонтального блока к поясу","sets":[{"weight":45,"reps":10},{"weight":45,"reps":10},{"weight":45,"reps":10}]},{"n":"Брусья","sets":[{"weight":"","reps":8},{"weight":7,"reps":7},{"weight":14,"reps":10}]},{"n":"Жим гантелей сидя","sets":[{"weight":16,"reps":10},{"weight":18,"reps":7},{"weight":16,"reps":7}]},{"n":"Трицепс в канате","sets":[{"weight":15,"reps":8},{"weight":12.5,"reps":10}]}]},{"id":"S09_N2T2","date":"2026-05-15","templateId":"h2t2","exercises":[{"n":"Жим в тренажёре сидя на грудь","sets":[{"weight":30,"reps":10},{"weight":30,"reps":10},{"weight":30,"reps":10}]},{"n":"Тяга горизонтального блока к поясу","sets":[{"weight":45,"reps":10},{"weight":45,"reps":10},{"weight":45,"reps":10}]},{"n":"Брусья","sets":[{"weight":"","reps":10},{"weight":"","reps":10},{"weight":"","reps":8.5}]},{"n":"Жим гантелей сидя","sets":[{"weight":16,"reps":10},{"weight":16,"reps":10},{"weight":18,"reps":8}]},{"n":"Подъём штанги на бицепс","sets":[{"weight":25,"reps":10},{"weight":25,"reps":10},{"weight":25,"reps":7}]}]},{"id":"S10_N1T1","date":"2026-05-17","templateId":"h1t1","exercises":[{"n":"Жим штанги лёжа","sets":[{"weight":60,"reps":8},{"weight":70,"reps":5},{"weight":70,"reps":4},{"weight":70,"reps":2}]},{"n":"Разведения гантелей лёжа","sets":[{"weight":14,"reps":10},{"weight":14,"reps":10},{"weight":14,"reps":10}]},{"n":"Подтягивания","sets":[{"weight":"","reps":7},{"weight":"","reps":6},{"weight":14,"reps":8}]},{"n":"Махи гантелей в стороны","sets":[{"weight":9,"reps":12},{"weight":9,"reps":12},{"weight":9,"reps":12}]},{"n":"Подъём штанги на бицепс","sets":[{"weight":20,"reps":10},{"weight":20,"reps":10},{"weight":20,"reps":10}]},{"n":"Подъём ног в висе","sets":[{"weight":"","reps":12},{"weight":"","reps":12},{"weight":"","reps":12}]}]}];

const BIO_METRICS = [
  { k: "weight", label: "Вес", unit: "кг", color: C.accent },
  { k: "fat", label: "Жир", unit: "%", color: C.pink },
  { k: "muscle", label: "Мышцы", unit: "кг", color: C.blue },
  { k: "water", label: "Вода", unit: "%", color: "#7fe0c0" },
  { k: "visceral", label: "Висц. жир", unit: "", color: "#ffb347" },
  { k: "bone", label: "Кости", unit: "кг", color: "#b6a8ff" },
];

/* ---------- storage helpers (artifact persistent storage) ---------- */
const store = {
  async get(key, def) {
    try {
      if (!window.storage) return def;
      const r = await window.storage.get(key);
      return r ? JSON.parse(r.value) : def;
    } catch { return def; }
  },
  async set(key, val) {
    try { if (window.storage) await window.storage.set(key, JSON.stringify(val)); }
    catch (e) { console.error("storage", e); }
  },
};

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const today = () => new Date().toISOString().slice(0, 10);
const fmtDate = (d) => new Date(d).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
const num = (v) => (v === "" || v == null ? null : Number(v));

/* ---- единые названия упражнений (синонимы -> канон) ---- */
const CANON = {
  "Жим гантелей лёжа": "Жим гантелей 15°",
  "Жим гантелей под углом 30°": "Жим гантелей 15°",
  "Жим лёжа": "Жим штанги лёжа",
  "Жим в тренажёре на грудь (1 рука)": "Жим в тренажёре сидя на грудь",
  "Махи в стороны": "Махи гантелей в стороны",
  "Молотковые": "Молотковые подъёмы гантелей",
  "Бицепс штанга": "Подъём штанги на бицепс",
  "Отжимания на брусьях": "Брусья",
  "Подтягивания в гравитроне": "Подтягивания",
  "Подъёмы на носки в тренажёре сидя": "Подъём на носки в тренажёре сидя",
  "Подъём ног в висе или dead bug": "Подъём ног в висе",
  "Протяжка к подбородку": "Протяжка штанги к подбородку",
  "Разведения лёжа": "Разведения гантелей лёжа",
  "Бабочка / сведения": "Сведения в тренажёре",
  "Сведения в тренажёре бабочка": "Сведения в тренажёре",
  "Сведения в кроссовере": "Сведения в тренажёре",
  "Трицепс в блоке / канат": "Трицепс в канате",
};
const canon = (n) => CANON[n] || n;
// нормализует названия в сессии и объединяет совпавшие упражнения внутри неё
function normSession(s) {
  const map = new Map();
  (s.exercises || []).forEach((e) => {
    const n = canon(e.n);
    const sets = e.sets || [];
    if (map.has(n)) map.get(n).sets.push(...sets);
    else map.set(n, { n, sets: [...sets] });
  });
  return { ...s, exercises: [...map.values()] };
}

/* NB: полная реализация компонентов перенесена в src/App.jsx.
 * Здесь оставлены только данные и логика как референс для миграции. */
