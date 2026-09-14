// Offline authoring aid. It finds forgiving routes; it never changes obstacles or goals.
// --write stores measured pulls and reachable optional stars after all layouts pass.
import { writeFile } from "node:fs/promises";
import { GameModel, LEVELS } from "../src/game.js";
import { segmentDistance, contains } from "../src/physics.js";

const routes = {}, report = [];
const selected = process.argv.find((arg) => arg.startsWith("--level="))?.split("=")[1];
const failed = [];
const pointDistance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function distanceToPath(point, points) {
  return Math.min(...points.slice(1).map((to, i) => segmentDistance(points[i], to, point)));
}
function starIsReadable(point, level) {
  if (point.x < 340 || point.x > 1090 || point.y < 145 || point.y > 470) return false;
  if (pointDistance(point, level.goal) < level.goal.radius + 85) return false;
  return level.interactions.every((item) => {
    // A star inside a hazard could never be collected, and a moving obstacle
    // sweeps a whole band, not just its resting rectangle.
    if (["solid", "gate", "breakable", "hazard"].includes(item.type)) {
      const reach = item.motion?.amplitude ?? 0;
      const spreadX = item.motion?.axis === "x" ? reach : 0;
      const spreadY = item.motion?.axis === "y" ? reach : 0;
      return !contains({
        x: item.x - 30 - spreadX,
        y: item.y - 30 - spreadY,
        width: item.width + 60 + spreadX * 2,
        height: item.height + 60 + spreadY * 2,
      }, point);
    }
    if (item.type === "portal") return [item.entry, item.exit].every((p) => pointDistance(point, p) > item.radius + 35);
    if (item.type === "switch") return pointDistance(point, item) > item.radius + 35;
    if (item.type === "gravity") return pointDistance(point, item) > item.coreRadius + 40;
    return true;
  });
}
for (const level of LEVELS.slice(8).filter((l) => !selected || l.number === Number(selected))) {
  const model = new GameModel(() => {}, level), winners = [], seen = new Set();
  let total = 0;
  for (let x = 35; x <= 150; x += 5) for (let y = 440; y <= 565; y += 5) {
    const pull = model.clampedSlingPoint({ x, y });
    const key = `${pull.x.toFixed(1)}:${pull.y.toFixed(1)}`;
    if (seen.has(key)) continue;
    seen.add(key); total++;
    const shot = model.simulate(pull, 70);
    if (shot.reachesGoal && shot.points.every((p) => p.y > 70 && p.x > 15 && p.x < 1320)) winners.push({ pull: { x, y }, shot });
  }
  // A fixed 4 px stride skipped the far corners of the box, so a reported
  // tolerance could be one the route never actually survived. Sample a grid
  // that always lands exactly on ±margin.
  const tolerates = (pull, margin) => {
    const steps = Math.max(2, Math.ceil((margin * 2) / 4));
    for (let ix = 0; ix <= steps; ix += 1) for (let iy = 0; iy <= steps; iy += 1) {
      const dx = -margin + (margin * 2 * ix) / steps;
      const dy = -margin + (margin * 2 * iy) / steps;
      if (!model.simulate({ x: pull.x + dx, y: pull.y + dy }, 1).reachesGoal) return false;
    }
    return true;
  };
  let best = null, margin = 0;
  // Favour modest pull lengths and plenty of headroom, not edge-of-screen solutions.
  winners.sort((a, b) => Math.abs(pointDistance(a.pull, model.anchor) - 110) - Math.abs(pointDistance(b.pull, model.anchor) - 110));
  // The widest window that still works is the one we ship. Late missions have
  // smaller goals, so the ladder has to reach below the old ±8 floor.
  for (const tolerance of [20, 16, 12, 10, 8, 6, 5]) {
    best = winners.find((entry) => tolerates(entry.pull, tolerance));
    if (best) { margin = tolerance; break; }
  }
  if (!best) {
    failed.push(level.number);
    console.log(`${level.number}: NEEDS DESIGN ADJUSTMENT (${winners.length}/${total} successful visible routes)`);
    continue;
  }
  let starChoice = null;
  // Select a real alternate route with a star away from the ordinary hint route.
  for (const candidate of winners) {
    if (pointDistance(candidate.pull, best.pull) < 15) continue;
    for (const point of candidate.shot.points) {
      if (!starIsReadable(point, level)) continue;
      const distance = distanceToPath(point, best.shot.points);
      if (distance < 63) continue;
      const score = Math.min(distance, 130) - Math.abs(point.x - 650) * .07;
      if (!starChoice || score > starChoice.score) starChoice = { point, pull: candidate.pull, score };
    }
  }
  if (!starChoice) {
    failed.push(level.number);
    console.log(`${level.number}: OPTIONAL STAR NEEDS ROOM (${winners.length}/${total} routes, ±${margin})`);
    continue;
  }
  const star = { x: Math.round(starChoice.point.x), y: Math.round(starChoice.point.y) };
  const starModel = new GameModel(() => {}, { ...level, star });
  if (!starModel.simulate(starChoice.pull).star || starModel.simulate(best.pull).star) throw new Error(`Star separation failed: ${level.number}`);
  routes[level.number] = { pull: best.pull, star, starPull: starChoice.pull };
  report.push({ number: level.number, id: level.id, margin, winningGridShots: winners.length, gridShots: total, required: level.required.length });
  console.log(`${level.number}: OK ±${margin} (${winners.length}/${total})`);
}
if (failed.length) {
  console.log(`Needs adjustment: ${failed.join(", ")}`);
  if (process.argv.includes("--diagnose")) await writeFile("/tmp/slingtoon-balanced-partial.json", JSON.stringify({ routes, report }, null, 2));
  process.exitCode = 1;
} else if (process.argv.includes("--write") && !selected) {
  await writeFile("src/campaign-routes.js", `// Measured with scripts/balance-campaign.mjs. No search runs on the player's device.\nexport const CAMPAIGN_ROUTES = ${JSON.stringify(routes, null, 2)};\n`);
  await writeFile("docs/campaign-balance.json", JSON.stringify(report, null, 2) + "\n");
  console.log("Stored 72 forgiving routes, alternate star routes and their measured tolerance.");
}
