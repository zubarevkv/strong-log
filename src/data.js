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

/* ---------- program templates (targets prefill the log form) ---------- */
export const TEMPLATES = [
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

export const BIO_METRICS = [
  { k: "weight", label: "Вес", unit: "кг", color: C.accent },
  { k: "fat", label: "Жир", unit: "%", color: C.pink },
  { k: "muscle", label: "Мышцы", unit: "кг", color: C.blue },
  { k: "water", label: "Вода", unit: "%", color: "#7fe0c0" },
  { k: "visceral", label: "Висц. жир", unit: "", color: "#ffb347" },
  { k: "bone", label: "Кости", unit: "кг", color: "#b6a8ff" },
];

/* ---- helpers ---- */
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
export const today = () => new Date().toISOString().slice(0, 10);
// парсим YYYY-MM-DD как локальную дату (new Date("YYYY-MM-DD") трактует строку как UTC
// и в отрицательных таймзонах сдвигает на предыдущий день)
export const fmtDate = (d) => {
  const [y, m, day] = String(d).split("-").map(Number);
  const dt = (y && m && day) ? new Date(y, m - 1, day) : new Date(d);
  return dt.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
};
export const num = (v) => (v === "" || v == null ? null : Number(v));

/* ---- единые названия упражнений (синонимы -> канон) ----
 * Применяется на клиенте при сейве. Дублирование на бэкенде и в /import —
 * шаг 6 спеки (TODO). Спорные слияния помечены в HANDOFF.md §5. */
export const CANON = {
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
export const canon = (n) => CANON[n] || n;

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
.ft-root{font-family:'Hanken Grotesk',sans-serif;-webkit-font-smoothing:antialiased;padding-bottom:40px;}
.ft-root *{box-sizing:border-box;}
.ft-mono{font-family:'JetBrains Mono',monospace;font-variant-numeric:tabular-nums;}
.ft-muted{color:${C.muted};}
.ft-mini{font-size:12px;}
.ft-trunc{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:62%;}

.ft-head{padding:22px 18px 14px;}
.ft-head-top{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;}
.ft-logo{font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:22px;letter-spacing:-.5px;display:flex;align-items:center;gap:8px;}
.ft-head-sub{color:${C.muted};font-size:12.5px;margin-top:2px;}
.ft-logout{background:none;border:1px solid ${C.line};color:${C.muted};border-radius:8px;padding:6px;cursor:pointer;display:flex;align-items:center;gap:5px;font-size:12px;}
.ft-logout:hover{color:${C.txt};border-color:#3a4030;}

.ft-sync{display:flex;align-items:center;gap:6px;font-size:11.5px;margin-top:6px;}
.ft-sync.err{color:${C.danger};}
.ft-sync.ok{color:${C.muted};}

.ft-nav{display:flex;gap:6px;padding:0 12px;position:sticky;top:0;z-index:5;background:linear-gradient(${C.bg},${C.bg} 70%,transparent);padding-bottom:6px;overflow-x:auto;}
.ft-tab{flex:1;min-width:78px;display:flex;flex-direction:column;align-items:center;gap:4px;padding:9px 4px;border:1px solid ${C.line};background:${C.card};color:${C.muted};border-radius:11px;font-size:11.5px;font-weight:600;cursor:pointer;transition:.15s;}
.ft-tab.on{color:${C.bg};background:${C.accent};border-color:${C.accent};}
.ft-tab:not(.on):hover{color:${C.txt};border-color:#3a4030;}

.ft-main{padding:14px 14px 0;max-width:760px;margin:0 auto;}

.ft-card{background:${C.card};border:1px solid ${C.line};border-radius:14px;padding:14px;margin-bottom:12px;}
.ft-card-h{font-family:'Bricolage Grotesque',sans-serif;font-weight:700;font-size:14px;margin-bottom:10px;}
.ft-row{display:flex;align-items:center;justify-content:space-between;gap:8px;}

.ft-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
.ft-grid .span2{grid-column:1 / -1;}
.ft-stat .ft-stat-v{font-size:26px;font-weight:700;line-height:1.1;margin-top:4px;}
.ft-mini.ft-set{}
.ft-bio-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;}
.ft-bio-cell{background:${C.bg};border:1px solid ${C.line};border-radius:9px;padding:8px 9px;}
.ft-bio-v{font-size:17px;font-weight:600;margin-top:2px;}
.ft-unit{font-size:11px;color:${C.muted};margin-left:2px;}

.ft-seg{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;}
.ft-seg-b{display:flex;flex-direction:column;align-items:flex-start;gap:1px;padding:11px 12px;border:1px solid ${C.line};background:${C.card};color:${C.txt};border-radius:11px;cursor:pointer;text-align:left;transition:.15s;}
.ft-seg-b strong{font-family:'Bricolage Grotesque',sans-serif;font-size:14px;}
.ft-seg-b.on{border-color:${C.accent};box-shadow:inset 0 0 0 1px ${C.accent};}
.ft-seg-b.on strong{color:${C.accent};}
.ft-last{margin-top:4px;color:${C.muted};}
.ft-next{font-family:'Hanken Grotesk',sans-serif;font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:${C.bg};background:${C.accent};border-radius:5px;padding:2px 5px;flex:none;}

.ft-ex-del{margin-left:auto;color:${C.muted};}
.ft-toast{display:flex;align-items:center;gap:7px;margin-top:10px;padding:9px 12px;background:rgba(200,242,63,.12);border:1px solid ${C.accent};color:${C.accent};border-radius:9px;font-size:13px;font-weight:600;animation:ft-pop .25s ease;}
@keyframes ft-pop{from{opacity:0;transform:translateY(4px);}to{opacity:1;transform:none;}}

.ft-datebar{justify-content:flex-start;gap:10px;margin-bottom:10px;}
.ft-input{background:${C.bg};border:1px solid ${C.line};color:${C.txt};border-radius:8px;padding:7px 9px;font-size:14px;width:100%;outline:none;transition:.12s;}
.ft-input:focus{border-color:${C.accent};}
.ft-input[type=date]{width:auto;}

.ft-ex{padding:12px 12px 10px;}
.ft-ex-h{display:flex;align-items:center;gap:9px;margin-bottom:9px;}
.ft-ex-num{display:flex;align-items:center;justify-content:center;width:22px;height:22px;background:${C.bg};border:1px solid ${C.line};border-radius:6px;font-size:12px;color:${C.accent};flex:none;}
.ft-ex-name{font-weight:600;font-size:14px;}
.ft-sets{display:flex;flex-direction:column;gap:6px;}
.ft-set{display:grid;grid-template-columns:24px 1fr 1fr 30px;gap:8px;align-items:center;}
.ft-set-head{padding:0 2px;}
.ft-set-head span:nth-child(2),.ft-set-head span:nth-child(3){padding-left:9px;}
.ft-icon-b{background:none;border:none;color:${C.muted};cursor:pointer;display:flex;align-items:center;justify-content:center;padding:4px;border-radius:6px;transition:.12s;}
.ft-icon-b:hover{color:${C.danger};background:rgba(255,107,94,.1);}
.ft-add{margin-top:8px;background:none;border:1px dashed ${C.line};color:${C.muted};border-radius:8px;padding:6px;font-size:12px;width:100%;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:5px;transition:.12s;}
.ft-add:hover{color:${C.accent};border-color:${C.accent};}

.ft-btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;background:${C.accent};color:${C.bg};border:none;border-radius:10px;padding:11px 16px;font-weight:700;font-size:14px;cursor:pointer;font-family:'Bricolage Grotesque',sans-serif;transition:.15s;}
.ft-btn:hover{background:#d9ff5c;}
.ft-btn:disabled{opacity:.5;cursor:default;}
.ft-save{width:100%;margin-top:4px;}

.ft-hist-toggle{width:100%;background:none;border:1px solid ${C.line};color:${C.txt};border-radius:10px;padding:10px;font-weight:600;font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;margin:14px 0 12px;}
.ft-hist .ft-mini{margin-top:3px;}
.ft-hist .ft-mini .ft-mono{color:${C.txt};}

.ft-bio-form{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:12px;}
.ft-field{display:flex;flex-direction:column;gap:4px;}

.ft-pills{display:flex;gap:6px;}
.ft-pill{background:${C.bg};border:1px solid ${C.line};color:${C.muted};border-radius:20px;padding:6px 12px;font-size:12px;font-weight:600;cursor:pointer;transition:.12s;}
.ft-pill.on{background:${C.accent};color:${C.bg};border-color:${C.accent};}
.ft-select-wrap{position:relative;flex:1;min-width:160px;}
.ft-select{appearance:none;width:100%;background:${C.bg};border:1px solid ${C.line};color:${C.txt};border-radius:8px;padding:8px 30px 8px 10px;font-size:13px;cursor:pointer;outline:none;}
.ft-select-ic{position:absolute;right:9px;top:50%;transform:translateY(-50%);color:${C.muted};pointer-events:none;}

/* backup (export / import) */
.ft-backup{margin-top:22px;border-style:dashed;}
.ft-backup-b{background:${C.bg};color:${C.txt};border:1px solid ${C.line};}
.ft-backup-b:hover:not(:disabled){background:${C.bg};border-color:${C.accent};color:${C.accent};}

/* token gate */
.ft-gate{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;}
.ft-gate-card{width:100%;max-width:360px;}
.ft-gate-card .ft-logo{justify-content:center;margin-bottom:6px;}
.ft-gate-err{color:${C.danger};font-size:12.5px;margin-top:8px;text-align:center;}

@media(max-width:520px){
  .ft-bio-form{grid-template-columns:1fr 1fr;}
  .ft-bio-grid{grid-template-columns:repeat(2,1fr);}
}
`;
