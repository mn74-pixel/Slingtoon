// Offline authoring aid. It finds forgiving routes; it never changes obstacles or goals.
// --write stores measured pulls and reachable optional stars after all layouts pass.
//
// The search itself lives in scripts/lib/route-search.mjs, because the mission
// generator has to judge what it invents by exactly these measurements.
import { writeFile } from "node:fs/promises";
import { GameModel, LEVELS } from "../src/game.js";
import { starFor, widestRoute, winningPulls } from "./lib/route-search.mjs";

const routes = {}, report = [];
const selected = process.argv.find((arg) => arg.startsWith("--level="))?.split("=")[1];
const failed = [];

for (const level of LEVELS.slice(8).filter((l) => !selected || l.number === Number(selected))) {
  const model = new GameModel(() => {}, level);
  const { winners, total } = winningPulls(model);
  const { best, margin, ranked } = widestRoute(model, winners);
  if (!best) {
    failed.push(level.number);
    console.log(`${level.number}: NEEDS DESIGN ADJUSTMENT (${winners.length}/${total} successful visible routes)`);
    continue;
  }
  const starChoice = starFor(level, ranked, best);
  if (!starChoice) {
    failed.push(level.number);
    console.log(`${level.number}: OPTIONAL STAR NEEDS ROOM (${winners.length}/${total} routes, ±${margin})`);
    continue;
  }
  routes[level.number] = { pull: best.pull, star: starChoice.star, starPull: starChoice.starPull };
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
  // Counted, not hardcoded: the message said 72 long after the campaign grew.
  console.log(`Stored ${Object.keys(routes).length} forgiving routes, alternate star routes and their measured tolerance.`);
}
