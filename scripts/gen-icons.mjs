/* Генерация PNG-иконок из нового знака STRONG·LOG (буква O — зелёный болт).
 * Запуск: npm run gen-icons (нужен devDependency sharp).
 * Источник правды по форме знака — favicon.svg / LogoMark в src/App.jsx. */
import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const PUB = path.join(here, "..", "public");
const BG = "#0c0e0a";
const FG = "#c8f23f";

// знак вписан в бокс 100×100; f — доля тайла под знак, центрируется
function glyph(size, f) {
  const sc = (size * f) / 100;
  return `<g transform="translate(${size / 2} ${size / 2}) scale(${sc}) translate(-50 -50)">
    <rect x="6" y="10" width="88" height="80" rx="40" fill="${FG}"/>
    <path d="M58 20 L34 56 L48 56 L42 82 L68 44 L52 44 Z" fill="${BG}"/>
  </g>`;
}

function tile(size, { rx = 0, f = 0.66 } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" rx="${rx}" fill="${BG}"/>
    ${glyph(size, f)}
  </svg>`;
}

// [файл, размер, опции]
const jobs = [
  ["favicon-16.png", 16, { rx: 3, f: 0.78 }],
  ["favicon-32.png", 32, { rx: 7, f: 0.72 }],
  ["favicon-48.png", 48, { rx: 10, f: 0.7 }],
  ["icon-192.png", 192, { rx: 42, f: 0.66 }],
  ["icon-512.png", 512, { rx: 112, f: 0.66 }],
  ["apple-touch-icon.png", 180, { rx: 0, f: 0.62 }], // iOS сам скругляет
  ["maskable-512.png", 512, { rx: 0, f: 0.52 }],      // safe-zone под маску
];

for (const [out, size, opts] of jobs) {
  const svg = tile(size, opts);
  await sharp(Buffer.from(svg)).png().toFile(path.join(PUB, out));
  console.log("wrote", out, `${size}×${size}`);
}
console.log("done");
