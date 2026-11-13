// Offline authoring aid for chapter 12. It never moves a block: it fires the
// campaign balancer's own grid of pulls at every fort (scripts/lib/route-search.mjs)
// and stores the most forgiving shot that really brings the target down.
// --write stores the routes in src/tower-routes.js.
import { writeFile } from "node:fs/promises";
import { GameModel, LEVELS } from "../src/game.js";
import { starFor, widestRoute, winningPulls } from "./lib/route-search.mjs";

const routes = {}, failed = [];
for (const level of LEVELS.filter((entry) => entry.towers)) {
  const model = new GameModel(() => {}, level);
  const { winners, total } = winningPulls(model);
  const { best, margin, ranked } = widestRoute(model, winners);
  if (!best) {
    failed.push(level.number);
    console.log(`${level.number}: NO SHOT BRINGS IT DOWN (${winners.length}/${total})`);
    continue;
  }
  // The optional star sits on another shot that also wins, exactly as in the
  // flight campaign, so a tower can be mastered with all three medals.
  const star = starFor(level, ranked, best);
  if (!star) {
    failed.push(level.number);
    console.log(`${level.number}: OPTIONAL STAR NEEDS ROOM (±${margin})`);
    continue;
  }
  routes[level.number] = { pull: best.pull, star: star.star, starPull: star.starPull, margin, winningGridShots: winners.length, gridShots: total };
  console.log(`${level.number}: OK ±${margin} (${winners.length}/${total})`);
}
if (failed.length) {
  console.log(`Needs a different fort: ${failed.join(", ")}`);
  process.exitCode = 1;
} else if (process.argv.includes("--write")) {
  await writeFile("src/tower-routes.js", `// Measured with scripts/balance-towers.mjs. No search runs on the player's device.\nexport const TOWER_ROUTES = ${JSON.stringify(routes, null, 2)};\n`);
  console.log(`Stored ${Object.keys(routes).length} tower routes.`);
}
