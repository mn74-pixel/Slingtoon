// How high can each target go?
//
// Measured, not guessed: 41 of 88 certified flights rise less than 150 px over
// an 885 px span — the game plays as a flat slide. Three levers were tried and
// rejected first (a steeper assist alone loses the width; more launch power
// makes the widest route flatter still; preferring arc among equally forgiving
// routes buys 16 px). The one that works is the targets themselves.
//
// A blanket lift is too blunt: -120 px across the grid costs two missions their
// solution, sixteen their tolerance and five their star. So every mission is
// asked on its own how far it can rise while keeping ALL of:
//   * a certified route at least as forgiving as the one it ships,
//   * a readable star,
//   * its reach (the flight must not end earlier than it does now).
import { writeFileSync } from "node:fs";
import { GameModel, GamePhase, LEVELS } from "../src/game.js";
import { winningPulls, widestRoute, starFor } from "./lib/route-search.mjs";

const LIFTS = [180, 150, 120, 90, 60, 30];
const TOP = 135;

const flight = (level, pull) => {
  const model = new GameModel(() => {}, level);
  model.beginSling(model.anchor); model.dragSling(pull); model.releaseSling();
  const start = { ...model.avatarPosition };
  let top = start.y, far = start.x;
  for (let f = 0; f < 4000 && model.phase === GamePhase.FLYING; f += 1) {
    model.update(1 / 120);
    top = Math.min(top, model.avatarPosition.y);
    far = Math.max(far, model.avatarPosition.x);
  }
  return { rise: start.y - top, far, won: model.phase === GamePhase.SUCCEEDED };
};

const certify = (level) => {
  const model = new GameModel(() => {}, level);
  const { winners } = winningPulls(model);
  const { best, margin, ranked } = widestRoute(model, winners);
  if (!best) return null;
  return { margin, star: Boolean(starFor(level, ranked, best)), ...flight(level, best.pull) };
};

// Chapter 1 keeps its hand-written routes, so its heights are not this tool's
// to move: scripts/balance-campaign.mjs starts at mission 9 for the same reason.
const FIRST = 9;
const report = [];
for (const level of LEVELS.filter((l) => l.number >= FIRST)) {
  const base = certify(level);
  if (!base) { report.push({ n: level.number, lift: 0, note: "already unsolvable" }); continue; }
  let chosen = { lift: 0, y: level.goal.y, ...base };
  for (const lift of LIFTS) {
    const y = level.goal.y - lift;
    if (y < TOP) continue;
    const candidate = certify({ ...level, goal: { ...level.goal, y } });
    if (!candidate) continue;
    if (candidate.margin < base.margin) continue;
    if (base.star && !candidate.star) continue;
    if (candidate.far < base.far - 12) continue;
    chosen = { lift, y, ...candidate };
    break;
  }
  report.push({ n: level.number, x: level.goal.x, from: level.goal.y, ...chosen, baseRise: base.rise, baseMargin: base.margin });
  process.stderr.write(`${level.number}:${chosen.lift} `);
}
const moved = report.filter((r) => r.lift > 0);
const table = moved.map((r) => `${r.n}: ${r.lift}`);
const rows = [];
for (let i = 0; i < table.length; i += 12) rows.push(`  ${table.slice(i, i + 12).join(", ")},`);
const out = process.argv.find((arg) => arg.startsWith("--out="))?.split("=")[1];
if (out) writeFileSync(out, JSON.stringify(report, null, 1));
console.log(rows.join("\n").replace(/,$/, ""));
console.log(`\n// ${moved.length}/${report.length} targets can rise; ${moved.reduce((s, r) => s + r.lift, 0)} px in total.`);
console.log("// Paste into GOAL_LIFT in src/campaign.js, then rerun scripts/balance-campaign.mjs --write.");
console.log("// Two campaign guards are NOT checked here and must be re-run afterwards:");
console.log("//   * no two missions may share a target position;");
console.log("//   * no goal past x=1050 may sit above y=280 (long AND high reaches nothing).");
console.log("// `npm test` enforces both; lower the offending mission's lift by 30 until they pass.");
