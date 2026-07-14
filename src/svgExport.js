/* ============================================================
 * svgExport.js — экспорт истории тренировок в самодостаточный SVG.
 *
 * buildHistorySVG(sessions, bio) -> строка SVG (чистая функция, без DOM):
 *   постер в тёмной теме приложения — сводка, календарь-тепловая карта
 *   тренировочных дней, тренд тоннажа по тренировкам и личные рекорды.
 *   Пригодна для запуска в браузере и в Node (генерация примеров/тестов).
 *
 * downloadHistorySVG(sessions, bio, filename) — обёртка для браузера:
 *   собирает SVG и отдаёт его файлом через Blob + <a download>.
 * ========================================================== */

import { C, sessionVolume, exercisePRList, fmtDate, num1000, monthShort } from "./data.js";

/* ---- геометрия постера ---- */
const W = 920;          // ширина холста
const PAD = 44;         // боковые поля
const CW = W - PAD * 2; // рабочая ширина
const CELL = 15, GAP = 4, PITCH = CELL + GAP; // календарь: сторона ячейки и шаг

/* палитра интенсивности календаря: нет тренировки → всё ярче к акценту */
const HEAT = ["#171a10", "#2f3d18", "#57781d", "#9ac62c", C.accent];

/* ---- мелкие хелперы ---- */
const esc = (s) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const n2 = (v) => Math.round((v + Number.EPSILON) * 100) / 100; // 2 знака без хвостов
// понедельник недели, в которую попадает YYYY-MM-DD (как локальная полночь)
function weekStart(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const dow = (d.getDay() + 6) % 7; // пн=0 … вс=6
  d.setDate(d.getDate() - dow);
  d.setHours(0, 0, 0, 0);
  return d;
}
const iso = (d) => {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
};
const DAY_MS = 864e5;

/* ---- сбор данных для постера ---- */
function collect(sessions, bio) {
  const list = (sessions || []).filter((s) => s && s.date);
  const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date));
  // тоннаж по дате (несколько тренировок в день суммируются) и по тренировке (для тренда)
  const volByDate = new Map();
  const trend = [];
  let total = 0;
  for (const s of sorted) {
    const v = sessionVolume(s, bio) || 0;
    total += v;
    volByDate.set(s.date, (volByDate.get(s.date) || 0) + v);
    trend.push({ date: s.date, v });
  }
  const days = [...volByDate.keys()].sort();
  const first = days[0] || null;
  const last = days[days.length - 1] || null;
  const spanDays = first && last ? Math.round((new Date(last) - new Date(first)) / DAY_MS) + 1 : 0;
  const weeks = spanDays ? Math.max(1, Math.round(spanDays / 7)) : 0;
  const prs = exercisePRList(sorted);
  return {
    count: sorted.length, total, first, last, spanDays, weeks,
    perWeek: weeks ? sorted.length / weeks : 0,
    volByDate, trend, prs,
  };
}

/* ---- секция: заголовок с вордмарком ---- */
function headerSVG(y, d) {
  const range = d.first
    ? `${fmtDate(d.first)} — ${fmtDate(d.last)}`
    : "нет данных";
  // вордмарк STR<болт>NG·LOG: «O» — зелёный знак-молния (как в приложении)
  const logo = `
    <g transform="translate(${PAD},${y})" font-family="'Bricolage Grotesque', system-ui, sans-serif"
       font-weight="800" font-size="30" letter-spacing="-.5" fill="${C.txt}">
      <text x="0" y="24">STR</text>
      <g transform="translate(52,4)">
        <rect x="0" y="0" width="26" height="24" rx="12" fill="${C.accent}"/>
        <path d="M15 4 L8.5 14 L12.5 14 L11 22 L18 11 L13.5 11 Z" fill="${C.bg}"/>
      </g>
      <text x="82" y="24">NG<tspan fill="${C.accent}">·</tspan>LOG</text>
    </g>`;
  const cap = `
    <text x="${W - PAD}" y="${y + 10}" text-anchor="end"
      font-family="'Hanken Grotesk', system-ui, sans-serif" font-size="12"
      letter-spacing="1.5" fill="${C.muted}">ИСТОРИЯ ТРЕНИРОВОК</text>
    <text x="${W - PAD}" y="${y + 28}" text-anchor="end"
      font-family="'JetBrains Mono', ui-monospace, monospace" font-size="13" fill="${C.txt}">${esc(range)}</text>`;
  return logo + cap;
}

/* ---- секция: 4 плитки-метрики ---- */
function statsSVG(y, d) {
  const tiles = [
    { label: "Тренировок", value: String(d.count), unit: "" },
    { label: "Тоннаж всего", value: num1000(d.total), unit: "кг" },
    { label: "Период", value: String(d.weeks), unit: "нед" },
    { label: "В среднем", value: d.perWeek ? n2(d.perWeek).toString() : "—", unit: "/нед" },
  ];
  const gap = 14;
  const tw = (CW - gap * (tiles.length - 1)) / tiles.length;
  const h = 82;
  let out = "";
  tiles.forEach((t, i) => {
    const x = PAD + i * (tw + gap);
    out += `
      <g transform="translate(${x},${y})">
        <rect width="${tw}" height="${h}" rx="14" fill="${C.card}" stroke="${C.line}"/>
        <text x="16" y="26" font-family="'Hanken Grotesk', system-ui, sans-serif" font-size="12"
          fill="${C.muted}">${esc(t.label)}</text>
        <text x="16" y="62" font-family="'Bricolage Grotesque', system-ui, sans-serif" font-weight="800"
          font-size="30" fill="${C.txt}">${esc(t.value)}<tspan font-size="14" font-weight="700"
          fill="${C.muted}" dx="4">${esc(t.unit)}</tspan></text>
      </g>`;
  });
  return { svg: out, height: h };
}

/* ---- секция: календарь-тепловая карта тренировочных дней ---- */
function heatmapSVG(y, d) {
  const titleH = 22, monthH = 16, gridTop = y + titleH + monthH;
  const leftLabels = 30; // место под подписи дней недели
  if (!d.first) {
    return { svg: `<text x="${PAD}" y="${y + 16}" font-family="'Bricolage Grotesque', system-ui, sans-serif"
      font-weight="700" font-size="15" fill="${C.txt}">Календарь тренировок</text>`, height: titleH };
  }
  const start = weekStart(d.first);
  const end = weekStart(d.last);
  const weeks = Math.round((end - start) / (7 * DAY_MS)) + 1;
  const maxDay = Math.max(...d.volByDate.values(), 1);
  const level = (v) => (v <= 0 ? 0 : Math.min(4, Math.ceil((v / maxDay) * 4)));

  let cells = "", months = "", lastMonth = -1;
  for (let w = 0; w < weeks; w++) {
    const colX = PAD + leftLabels + w * PITCH;
    const weekMon = new Date(start.getTime() + w * 7 * DAY_MS);
    if (weekMon.getMonth() !== lastMonth) {
      lastMonth = weekMon.getMonth();
      months += `<text x="${colX}" y="${y + titleH + 11}"
        font-family="'Hanken Grotesk', system-ui, sans-serif" font-size="11" fill="${C.muted}">${esc(monthShort(iso(weekMon)))}</text>`;
    }
    for (let day = 0; day < 7; day++) {
      const cur = new Date(weekMon.getTime() + day * DAY_MS);
      const key = iso(cur);
      if (key < d.first || key > d.last) continue;
      const v = d.volByDate.get(key) || 0;
      const cy = gridTop + day * PITCH;
      const title = v > 0 ? `${fmtDate(key)}: ${num1000(v)} кг` : fmtDate(key);
      cells += `<rect x="${colX}" y="${cy}" width="${CELL}" height="${CELL}" rx="3"
        fill="${HEAT[level(v)]}"><title>${esc(title)}</title></rect>`;
    }
  }
  // подписи дней недели (Пн/Ср/Пт)
  const dowLabels = [[0, "Пн"], [2, "Ср"], [4, "Пт"]]
    .map(([r, t]) => `<text x="${PAD}" y="${gridTop + r * PITCH + 12}"
      font-family="'Hanken Grotesk', system-ui, sans-serif" font-size="10" fill="${C.muted}">${t}</text>`)
    .join("");
  // легенда «меньше → больше»
  const legY = gridTop + 7 * PITCH + 14;
  let legend = `<text x="${PAD + leftLabels}" y="${legY + 11}"
    font-family="'Hanken Grotesk', system-ui, sans-serif" font-size="10" fill="${C.muted}">меньше</text>`;
  HEAT.forEach((c, i) => {
    legend += `<rect x="${PAD + leftLabels + 52 + i * (CELL + 3)}" y="${legY}" width="${CELL}" height="${CELL}" rx="3" fill="${c}"/>`;
  });
  legend += `<text x="${PAD + leftLabels + 52 + HEAT.length * (CELL + 3) + 6}" y="${legY + 11}"
    font-family="'Hanken Grotesk', system-ui, sans-serif" font-size="10" fill="${C.muted}">больше</text>`;

  const title = `<text x="${PAD}" y="${y + 16}" font-family="'Bricolage Grotesque', system-ui, sans-serif"
    font-weight="700" font-size="15" fill="${C.txt}">Календарь тренировок</text>`;
  const height = (legY + CELL) - y;
  return { svg: title + months + dowLabels + cells + legend, height };
}

/* ---- секция: тренд тоннажа по тренировкам (area + линия) ---- */
function trendSVG(y, d) {
  const titleH = 24;
  const title = `<text x="${PAD}" y="${y + 16}" font-family="'Bricolage Grotesque', system-ui, sans-serif"
    font-weight="700" font-size="15" fill="${C.txt}">Тоннаж по тренировкам</text>`;
  const pts = d.trend;
  const chartH = 150;
  const top = y + titleH;
  if (pts.length < 2) {
    const msg = `<text x="${PAD}" y="${top + 20}" font-family="'Hanken Grotesk', system-ui, sans-serif"
      font-size="12" fill="${C.muted}">Недостаточно данных для графика.</text>`;
    return { svg: title + msg, height: titleH + 24 };
  }
  const maxV = Math.max(...pts.map((p) => p.v), 1);
  const x = (i) => PAD + (CW * i) / (pts.length - 1);
  const yv = (v) => top + chartH - (chartH - 8) * (v / maxV);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${n2(x(i))} ${n2(yv(p.v))}`).join(" ");
  const area = `M${n2(x(0))} ${top + chartH} ` +
    pts.map((p, i) => `L${n2(x(i))} ${n2(yv(p.v))}`).join(" ") +
    ` L${n2(x(pts.length - 1))} ${top + chartH} Z`;
  const dots = pts.map((p, i) => `<circle cx="${n2(x(i))}" cy="${n2(yv(p.v))}" r="3" fill="${C.accent}">
    <title>${esc(fmtDate(p.date))}: ${num1000(p.v)} кг</title></circle>`).join("");
  // подписи первой/последней даты и максимум
  const axis = `
    <line x1="${PAD}" y1="${top + chartH}" x2="${W - PAD}" y2="${top + chartH}" stroke="${C.line}"/>
    <text x="${PAD}" y="${top + chartH + 16}" font-family="'Hanken Grotesk', system-ui, sans-serif"
      font-size="10" fill="${C.muted}">${esc(fmtDate(pts[0].date))}</text>
    <text x="${W - PAD}" y="${top + chartH + 16}" text-anchor="end"
      font-family="'Hanken Grotesk', system-ui, sans-serif" font-size="10" fill="${C.muted}">${esc(fmtDate(pts[pts.length - 1].date))}</text>
    <text x="${W - PAD}" y="${top + 4}" text-anchor="end"
      font-family="'JetBrains Mono', ui-monospace, monospace" font-size="10" fill="${C.muted}">макс ${num1000(maxV)} кг</text>`;
  const svg = title +
    `<defs><linearGradient id="ftfill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${C.accent}" stop-opacity="0.32"/>
      <stop offset="100%" stop-color="${C.accent}" stop-opacity="0"/>
    </linearGradient></defs>` +
    `<path d="${area}" fill="url(#ftfill)"/>` +
    `<path d="${line}" fill="none" stroke="${C.accent}" stroke-width="2.5" stroke-linejoin="round"/>` +
    dots + axis;
  return { svg, height: titleH + chartH + 22 };
}

/* ---- секция: личные рекорды (сетка карточек) ---- */
function prSVG(y, d) {
  const titleH = 24;
  const title = `<text x="${PAD}" y="${y + 16}" font-family="'Bricolage Grotesque', system-ui, sans-serif"
    font-weight="700" font-size="15" fill="${C.txt}">Личные рекорды</text>`;
  const items = (d.prs || []).slice(0, 8);
  if (!items.length) {
    const msg = `<text x="${PAD}" y="${y + titleH + 16}" font-family="'Hanken Grotesk', system-ui, sans-serif"
      font-size="12" fill="${C.muted}">Пока нет рекордов с рабочим весом.</text>`;
    return { svg: title + msg, height: titleH + 24 };
  }
  const cols = 2, gap = 14, top = y + titleH + 4;
  const cardW = (CW - gap * (cols - 1)) / cols;
  const cardH = 74, rowGap = 12;
  let out = "";
  items.forEach((p, i) => {
    const cx = PAD + (i % cols) * (cardW + gap);
    const cy = top + Math.floor(i / cols) * (cardH + rowGap);
    const name = p.name.length > 34 ? p.name.slice(0, 33) + "…" : p.name;
    const reps = p.reps != null ? ` × ${p.reps}` : "";
    const e1 = p.e1rm > 0 ? `e1RM ${Math.round(p.e1rm)} кг` : "";
    out += `
      <g transform="translate(${cx},${cy})">
        <rect width="${cardW}" height="${cardH}" rx="12" fill="${C.card}" stroke="${C.line}"/>
        <text x="15" y="24" font-family="'Hanken Grotesk', system-ui, sans-serif" font-weight="700"
          font-size="14" fill="${C.txt}">${esc(name)}</text>
        <text x="15" y="50" font-family="'JetBrains Mono', ui-monospace, monospace" font-weight="700"
          font-size="20" fill="${C.accent}">${esc(n2(p.weight))} кг<tspan font-size="13" font-weight="600"
          fill="${C.muted}">${esc(reps)}</tspan></text>
        <text x="15" y="66" font-family="'Hanken Grotesk', system-ui, sans-serif" font-size="11"
          fill="${C.muted}">рекорд: ${esc(fmtDate(p.date))}</text>
        <text x="${cardW - 15}" y="66" text-anchor="end" font-family="'JetBrains Mono', ui-monospace, monospace"
          font-size="11" fill="${C.muted}">${esc(e1)}</text>
      </g>`;
  });
  const rows = Math.ceil(items.length / cols);
  const height = titleH + 4 + rows * cardH + (rows - 1) * rowGap;
  return { svg: title + out, height };
}

/* ============================================================
 * Сборка постера
 * ========================================================== */
export function buildHistorySVG(sessions, bio) {
  const d = collect(sessions, bio);
  const GAP_Y = 30;
  let y = PAD;
  const parts = [];

  parts.push(headerSVG(y, d));
  y += 44 + GAP_Y;

  const stats = statsSVG(y, d);
  parts.push(stats.svg); y += stats.height + GAP_Y + 6;

  const heat = heatmapSVG(y, d);
  parts.push(heat.svg); y += heat.height + GAP_Y + 6;

  const trend = trendSVG(y, d);
  parts.push(trend.svg); y += trend.height + GAP_Y + 6;

  const pr = prSVG(y, d);
  parts.push(pr.svg); y += pr.height;

  const H = y + PAD;
  const footer = `<text x="${W - PAD}" y="${H - 18}" text-anchor="end"
    font-family="'JetBrains Mono', ui-monospace, monospace" font-size="10" fill="${C.muted}">STRØNG·LOG · сгенерировано из истории</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="system-ui, sans-serif">
  <rect width="${W}" height="${H}" fill="${C.bg}"/>
  <rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="20" fill="none" stroke="${C.line}"/>
  ${parts.join("\n  ")}
  ${footer}
</svg>`;
}

/* ---- обёртка для браузера: скачать файл ---- */
export function downloadHistorySVG(sessions, bio, filename) {
  const svg = buildHistorySVG(sessions, bio);
  const name = filename || `strong-log-history-${new Date().toISOString().slice(0, 10)}.svg`;
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
