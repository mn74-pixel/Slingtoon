// Optional developer-only raster QA. The shipped game has no Canvas package dependency.
// CANVAS_QA_MODULE can point to an installed @napi-rs/canvas entry point.
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { GameModel, LEVELS, GamePhase } from "../src/game.js";
import { GameRenderer } from "../src/render.js";
const require = createRequire(import.meta.url);
const modulePath = process.env.CANVAS_QA_MODULE ?? require.resolve("@napi-rs/canvas", {
  paths: [process.cwd(), process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES].filter(Boolean),
});
const { createCanvas, Image } = require(modulePath);
const surface = (width, height) => createCanvas(width, height);
globalThis.Image = Image;
const output = resolve(process.argv[2] ?? "/tmp/slingtoon-qa");
await mkdir(output, { recursive: true });
const sheet = createCanvas(1280, 1800), ctx = sheet.getContext("2d");
for (const [index, level] of LEVELS.entries()) {
  const canvas = createCanvas(1280, 640), model = new GameModel(() => {}, level), renderer = new GameRenderer(canvas, model, surface);
  model.onEvent = (event) => renderer.handleGameEvent(event);
  await renderer.load();
  renderer.render();
  const x = (index % 8) * 160, y = Math.floor(index / 8) * 180;
  ctx.fillStyle = "#24183f"; ctx.fillRect(x, y, 160, 180);
  ctx.fillStyle = "#fff5d9"; ctx.font = "bold 8px sans-serif";
  ctx.fillText(`${level.number}. ${level.name}`, x + 5, y + 11, 150);
  ctx.drawImage(canvas, x, y + 20, 160, 80);
  if ([8, 12, 36, 40, 47, 57, 64, 75, 79].includes(index)) await writeFile(resolve(output, `mission-${level.number}-ready.png`), canvas.toBuffer("image/png"));
  model.beginSling(model.anchor); model.dragSling(level.assistPull); model.releaseSling();
  for (let frame = 0; frame < 720 && model.phase === GamePhase.FLYING; frame++) {
    model.update(1 / 120); renderer.update(1 / 120);
  }
  if (model.phase !== GamePhase.SUCCEEDED) throw new Error(`Render QA shot failed: ${level.id}`);
  if (renderer.particles.length > 140 || renderer.callouts.length > 4) throw new Error("VFX budget exceeded");
  renderer.render();
  ctx.drawImage(canvas, x, y + 100, 160, 80);
  if ([8, 12, 36, 40, 47, 57, 64, 75, 79].includes(index)) await writeFile(resolve(output, `mission-${level.number}-success.png`), canvas.toBuffer("image/png"));
}
await writeFile(resolve(output, "campaign.png"), sheet.toBuffer("image/png"));
// Crop-free mobile aspect ratio: actual canvas surface, not a fake browser screenshot.
for (const [index, width, height] of [[8, 844, 390], [16, 740, 360], [64, 568, 320]]) {
  const canvas = createCanvas(1280, 640), model = new GameModel(() => {}, LEVELS[index]), renderer = new GameRenderer(canvas, model, surface);
  await renderer.load(); renderer.resizeView(width, height); renderer.render();
  const mobile = createCanvas(width, height);
  mobile.getContext("2d").drawImage(canvas, 0, 0, width, height);
  await writeFile(resolve(output, `mobile-${index + 1}.png`), mobile.toBuffer("image/png"));
}
console.log(`Rendered 80 complete winning flights and three mobile canvas layouts: ${output}`);
