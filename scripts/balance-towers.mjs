// Offline authoring aid for the tower chapters (12-15). It never moves a
// block. For every fort it fires the campaign balancer's own grid of pulls
// (scripts/lib/route-search.mjs) and stores:
//
// - pull: the most forgiving shot that brings the whole fort down on its own,
//   or, where no single shot does it with room to spare, the first shot of a
//   measured plan;
// - plan: the shots, in order, that win the fort (one shot where one does);
// - star/starPull: the optional star on another winning shot, where one exists;
// - scoreStars: the fort points for two and three stars. Three stars is the
//   median score of the single shots that win (half of them earn it), or 90%
//   of the plan's score where the fort needs several shots. Two stars sits
//   halfway between that and the plainest possible win.
//
// --write stores the routes in src/tower-routes.js; --only=97,98 measures just
// those forts and keeps the stored routes of the rest.
import { writeFile } from "node:fs/promises";
import { GameModel, GamePhase, LEVELS } from "../src/game.js";
import { worldAsleep } from "../src/blocks.js";
import { TARGET_POINTS } from "../src/physics.js";
import { starFor, widestRoute, winningPulls } from "./lib/route-search.mjs";

const only = process.argv.find((arg) => arg.startsWith("--only="))?.slice(7).split(",").map(Number);
const STEP = 1 / 120;
const floorTo = (value, step = 500) => Math.floor(value / step) * step;

// The real model, the real input path, shot after shot, with the fort allowed
// to settle between them exactly as it does for a player.
export function play(level, pulls) {
  const model = new GameModel(() => {}, level);
  for (const pull of pulls) {
    if (model.phase !== GamePhase.READY) break;
    model.beginSling(model.anchor);
    model.dragSling(pull);
    model.releaseSling();
    for (let i = 0; i < 1300 && model.phase === GamePhase.FLYING; i += 1) model.update(STEP);
    for (let i = 0; i < 1500 && model.phase === GamePhase.READY && !worldAsleep(model.world); i += 1) model.update(STEP);
  }
  return model;
}

// Lexicographic: a win beats no win, then more score (or more clocks down),
// then more points.
const better = (a, b) => {
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return a[i] > b[i];
  return false;
};

function greedyPlan(level) {
  const plan = [];
  for (let shot = 0; shot < level.shots; shot += 1) {
    let best = null;
    for (let x = 35; x <= 150; x += 10) for (let y = 440; y <= 565; y += 10) {
      const model = play(level, [...plan, { x, y }]);
      const won = model.phase === GamePhase.SUCCEEDED;
      const rank = [won ? 1 : 0, won ? model.towerScore : model.downTargets.size, model.towerPoints];
      if (!best || better(rank, best.rank)) best = { pull: { x, y }, rank, model };
    }
    plan.push(best.pull);
    if (best.rank[0]) return { plan, score: best.model.towerScore };
  }
  return null;
}

const routes = {}, failed = [];
for (const level of LEVELS.filter((entry) => entry.towers && (!only || only.includes(entry.number)))) {
  const started = Date.now();
  const clocks = level.towers.filter((piece) => piece.target).length;
  const plainest = clocks * TARGET_POINTS;
  const model = new GameModel(() => {}, level);
  const { winners, total } = winningPulls(model);
  const { best, margin, ranked } = widestRoute(model, winners);
  let route;
  if (best) {
    const scores = winners.map((winner) => play(level, [winner.pull]).towerScore).sort((a, b) => a - b);
    const three = floorTo(scores[Math.floor(scores.length / 2)]);
    const star = starFor(level, ranked, best);
    route = { pull: best.pull, plan: [best.pull], star: star?.star ?? null, starPull: star?.starPull, margin, winningGridShots: winners.length, gridShots: total, scoreStars: [floorTo((three + plainest) / 2), three] };
  } else {
    const greedy = greedyPlan(level);
    if (!greedy) {
      failed.push(level.number);
      console.log(`${level.number}: NO PLAN OF ${level.shots} SHOTS BRINGS IT DOWN`);
      continue;
    }
    const three = floorTo(greedy.score * 0.9);
    route = { pull: greedy.plan[0], plan: greedy.plan, star: null, margin: 0, winningGridShots: winners.length, gridShots: total, scoreStars: [floorTo((three + plainest) / 2), three] };
  }
  routes[level.number] = route;
  console.log(`${level.number}: ${route.plan.length} shot(s) ±${route.margin} (${route.winningGridShots}/${total}) stars ${route.scoreStars.join("/")}${route.star ? " +star" : ""} ${((Date.now() - started) / 1000).toFixed(0)}s`);
}
if (failed.length) {
  console.log(`Needs a different fort: ${failed.join(", ")}`);
  process.exitCode = 1;
} else if (process.argv.includes("--write")) {
  const { TOWER_ROUTES } = await import("../src/tower-routes.js");
  const merged = only ? { ...TOWER_ROUTES, ...routes } : routes;
  await writeFile("src/tower-routes.js", `// Measured with scripts/balance-towers.mjs. No search runs on the player's device.\nexport const TOWER_ROUTES = ${JSON.stringify(merged, null, 2)};\n`);
  console.log(`Stored ${Object.keys(merged).length} tower routes.`);
}
