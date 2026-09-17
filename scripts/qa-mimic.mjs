// Opcjonalne QA rastrowe dla mimiki. Gra nie ma zależności od Canvasa w Node —
// ten skrypt jej potrzebuje, więc nie wchodzi do `npm run check`.
//
// Mierzy to, czego test jednostkowy zmierzyć nie może: ile z miny zostaje po
// zmniejszeniu głowy do rozmiaru, w jakim rysuje ją gra. Trzy razy okazało się,
// że liczby z geometrii mówią co innego niż obrazek — dlatego oprócz procentów
// skrypt składa arkusz podglądowy w tej samej skali, powiększony wyłącznie do
// oglądania.
//
//   node scripts/qa-mimic.mjs <baza> <wyjście.png> [siła]
//
// <baza> to para plików <baza>.png (portret 512 px) i <baza>.json
// ({ anchors, faceHeight }) zrzucona z pracowni twarzy w przeglądarce.
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import { buildExpressionSheet, MIMIC_EXPRESSIONS } from "../src/face-mimic.js";

const require = createRequire(import.meta.url);
const modulePath = process.env.CANVAS_QA_MODULE ?? require.resolve("@napi-rs/canvas", {
  paths: [process.cwd(), process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES].filter(Boolean),
});
const { createCanvas, loadImage } = require(modulePath);

// Dokładnie tyle, ile rysuje render.js: drawImage(głowa, -48, -48, 96, 96).
const HEAD = 96;
const base = process.argv[2] ?? "/tmp/slingtoon-mimic";
const out = process.argv[3] ?? "/tmp/slingtoon-mimic.png";
const strength = Number(process.argv[4] ?? 1);

const portraitImage = await loadImage(`${base}.png`);
const { anchors, faceHeight } = JSON.parse(readFileSync(`${base}.json`, "utf8"));
const portrait = createCanvas(portraitImage.width, portraitImage.height);
portrait.getContext("2d").drawImage(portraitImage, 0, 0);

const started = performance.now();
const sheet = buildExpressionSheet(portrait, anchors, faceHeight, createCanvas, strength);
const bake = performance.now() - started;

const shrink = (canvas) => {
  const small = createCanvas(HEAD, HEAD);
  const context = small.getContext("2d");
  context.imageSmoothingEnabled = true;
  context.drawImage(canvas, 0, 0, HEAD, HEAD);
  return context.getImageData(0, 0, HEAD, HEAD).data;
};
const neutral = shrink(sheet.neutral);
const luma = (data, i) => 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];

const rows = [];
for (const name of MIMIC_EXPRESSIONS) {
  if (name === "neutral") continue;
  const data = shrink(sheet[name]);
  let changed = 0, covered = 0, sum = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (neutral[i + 3] < 8 && data[i + 3] < 8) continue;
    covered += 1;
    const delta = Math.abs(luma(data, i) - luma(neutral, i)) + Math.abs(data[i + 3] - neutral[i + 3]);
    if (delta > 12) changed += 1;
    sum += delta;
  }
  rows.push({ name, changed: (100 * changed) / covered, average: sum / covered });
}
rows.sort((a, b) => a.changed - b.changed);
console.log(`siła ${strength}, głowa ${HEAD} px, wypiek ${bake.toFixed(0)} ms`);
for (const row of rows) {
  console.log(`  ${row.name.padEnd(11)} zmienione ${row.changed.toFixed(1).padStart(5)}%  średnia ${row.average.toFixed(1).padStart(5)}`);
}

// Strażnik kadru: żadna mina nie może dotknąć krawędzi, jeśli neutralna jej nie
// dotyka — inaczej gracz widzi obcięty kapelusz, nie minę.
const touchedEdges = (canvas) => {
  const { width, height } = canvas;
  const data = canvas.getContext("2d").getImageData(0, 0, width, height).data;
  const on = (x, y) => data[(y * width + x) * 4 + 3] > 8;
  const edges = [];
  for (let x = 0; x < width; x += 1) if (on(x, 0)) { edges.push("góra"); break; }
  for (let x = 0; x < width; x += 1) if (on(x, height - 1)) { edges.push("dół"); break; }
  for (let y = 0; y < height; y += 1) if (on(0, y)) { edges.push("lewo"); break; }
  for (let y = 0; y < height; y += 1) if (on(width - 1, y)) { edges.push("prawo"); break; }
  return edges.join(",");
};
const neutralEdges = touchedEdges(sheet.neutral);
let cropped = 0;
for (const name of MIMIC_EXPRESSIONS) {
  const edges = touchedEdges(sheet[name]);
  if (edges === neutralEdges) continue;
  console.log(`  KADR: ${name} dotyka [${edges}], neutralna [${neutralEdges}]`);
  cropped += 1;
}
console.log(cropped ? `strażnik kadru: ${cropped} min wychodzi poza kadr` : "strażnik kadru: czysto");

const zoom = 3, cell = HEAD * zoom, columns = 6;
const lines = Math.ceil(MIMIC_EXPRESSIONS.length / columns);
const board = createCanvas(cell * columns, (cell + 26) * lines);
const context = board.getContext("2d");
context.fillStyle = "#171030";
context.fillRect(0, 0, board.width, board.height);
MIMIC_EXPRESSIONS.forEach((name, index) => {
  const small = createCanvas(HEAD, HEAD);
  small.getContext("2d").drawImage(sheet[name], 0, 0, HEAD, HEAD);
  const x = (index % columns) * cell;
  const y = Math.floor(index / columns) * (cell + 26);
  context.imageSmoothingEnabled = false;
  context.drawImage(small, x, y, cell, cell);
  context.fillStyle = "#fff5d9";
  context.font = "bold 15px sans-serif";
  context.textAlign = "center";
  context.fillText(name, x + cell / 2, y + cell + 18);
});
writeFileSync(out, board.toBuffer("image/png"));
console.log("podgląd:", out);
