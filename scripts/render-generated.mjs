// Renders the generated missions so they can be judged by eye, not by numbers.
// Developer-only: the shipped game has no Canvas dependency in Node.
import { createRequire } from "node:module";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { GameModel, GamePhase } from "../src/game.js";
import { GameRenderer } from "../src/render.js";
import { mission } from "../src/campaign.js";
import { level } from "../src/levels.js";

const require = createRequire(import.meta.url);
const modulePath = process.env.CANVAS_QA_MODULE ?? require.resolve("@napi-rs/canvas", { paths: [process.cwd()] });
const { createCanvas, Image } = require(modulePath);
globalThis.Image = Image;
const surface = (w, h) => createCanvas(w, h);

const out = resolve(process.argv[2] ?? "/tmp/slingtoon-generated");
await mkdir(out, { recursive: true });
const { kept } = JSON.parse(await readFile(resolve("docs/generated-missions.json"), "utf8"));
const COLS = 3, W = 560, H = 280;
const sheet = createCanvas(COLS * W, Math.ceil(kept.length / COLS) * H), sc = sheet.getContext("2d");

for (const [index, m] of kept.entries()) {
  const built = level(mission(m.slot, m.name, "suitcase", m.authored.x, m.authored.y, m.mechanic, m.clue,
    "Prototyp wylądował.", m.interactions, { route: m.route, shot: m.shape }));
  const canvas = createCanvas(1280, 640);
  const model = new GameModel(() => {}, built);
  const renderer = new GameRenderer(canvas, model, surface);
  model.onEvent = (event) => renderer.handleGameEvent(event);
  await renderer.load();
  // Play the stored route, so the sheet shows a mission that was really won.
  model.beginSling(model.anchor); model.dragSling(m.route.pull); model.releaseSling();
  for (let frame = 0; frame < 900 && model.phase === GamePhase.FLYING; frame += 1) {
    model.update(1 / 120); renderer.update(1 / 120);
  }
  const won = model.phase === GamePhase.SUCCEEDED;
  renderer.render();
  const x = (index % COLS) * W, y = Math.floor(index / COLS) * H;
  sc.drawImage(canvas, x, y + 26, W, H - 26);
  sc.fillStyle = "#19142d"; sc.fillRect(x, y, W, 26);
  sc.fillStyle = won ? "#5ce1bd" : "#ff6078";
  sc.font = "bold 13px sans-serif";
  sc.fillText(`${m.name} · ${m.archetypes.join(" + ")} · ±${m.margin}px · ${won ? "won" : "THE STORED ROUTE FAILED"}`, x + 8, y + 17);
  await writeFile(resolve(out, `${m.name.replace(/\s+/g, "-").toLowerCase()}.png`), canvas.toBuffer("image/png"));
}
await writeFile(resolve(out, "sheet.png"), sheet.toBuffer("image/png"));
console.log(`rendered ${kept.length} generated missions to ${out}`);
