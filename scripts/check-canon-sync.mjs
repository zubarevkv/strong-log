/* ============================================================
 * check-canon-sync.mjs — страж синхронности словаря синонимов.
 *
 * Канон названий упражнений продублирован в двух местах (см. HANDOFF.md §5):
 *   - клиент: CANON в src/data.js
 *   - сервер: Exercises::CANON в api/lib/Exercises.php
 * Если они разъедутся, клиент и сервер начнут канонизировать по-разному —
 * вернутся скрытые дубли. Скрипт парсит оба словаря как текст (без выполнения
 * кода и без зависимостей) и падает с ненулевым кодом при любом расхождении.
 *
 * Запуск: node scripts/check-canon-sync.mjs  (или npm run check:canon).
 * В CI вызывается перед сборкой — дрейф не доедет до прода.
 * ========================================================== */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Вырезает текст словаря между маркером открытия и первым закрывающим разделителем. */
function slice(text, startMarker, open, close) {
  const i = text.indexOf(startMarker);
  if (i === -1) throw new Error(`не найден маркер «${startMarker}»`);
  const a = text.indexOf(open, i);
  const b = text.indexOf(close, a);
  if (a === -1 || b === -1) throw new Error(`не найдены границы словаря после «${startMarker}»`);
  return text.slice(a + 1, b);
}

/** Собирает пары "ключ" -> "значение" из блока (кавычки одинарные или двойные). */
function pairs(block) {
  const re = /(['"])((?:\\.|(?!\1).)*?)\1\s*(?:=>|:)\s*(['"])((?:\\.|(?!\3).)*?)\3/g;
  const out = new Map();
  for (const m of block.matchAll(re)) out.set(m[2], m[4]);
  return out;
}

const jsDict = pairs(
  slice(readFileSync(join(root, "src/data.js"), "utf8"), "export const CANON", "{", "}")
);
const phpDict = pairs(
  slice(readFileSync(join(root, "api/lib/Exercises.php"), "utf8"), "const CANON", "[", "]")
);

const problems = [];
for (const [k, v] of jsDict) {
  if (!phpDict.has(k)) problems.push(`только в JS: "${k}" => "${v}"`);
  else if (phpDict.get(k) !== v) problems.push(`значения не совпали для "${k}": JS "${v}" ≠ PHP "${phpDict.get(k)}"`);
}
for (const [k, v] of phpDict) {
  if (!jsDict.has(k)) problems.push(`только в PHP: "${k}" => "${v}"`);
}

if (jsDict.size === 0 || phpDict.size === 0) {
  console.error(`❌ словарь пуст (JS: ${jsDict.size}, PHP: ${phpDict.size}) — проверь парсер/маркеры`);
  process.exit(1);
}
if (problems.length) {
  console.error(`❌ CANON рассинхронизирован (JS: ${jsDict.size}, PHP: ${phpDict.size}):`);
  for (const p of problems) console.error("   - " + p);
  console.error("\nПравь src/data.js и api/lib/Exercises.php синхронно (HANDOFF.md §5).");
  process.exit(1);
}
console.log(`✅ CANON синхронен: ${jsDict.size} синонимов в src/data.js и api/lib/Exercises.php совпадают.`);
