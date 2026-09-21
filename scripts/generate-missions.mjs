// The mission generator — a thin runner over scripts/lib/mission-lab.mjs.
//
//   node scripts/generate-missions.mjs [--count=12] [--seed=7] [--tries=400]
//
// Output: docs/generated-missions.json, for review before anything is promoted
// into the campaign by hand. Nothing is promoted automatically.
import { writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { compose, judge, seed } from "./lib/mission-lab.mjs";

const arg = (name, fallback) => {
  const hit = process.argv.find((value) => value.startsWith(`--${name}=`));
  return hit ? Number(hit.split("=")[1]) : fallback;
};
const WANTED = arg("count", 12);
const TRIES = arg("tries", 400);
const SEED = arg("seed", 7);

seed(SEED);

const kept = [], rejected = {};
let tried = 0;
while (kept.length < WANTED && tried < TRIES) {
  tried += 1;
  const verdict = judge(compose(tried));
  if (verdict.ok) kept.push(verdict.mission);
  else rejected[verdict.why] = (rejected[verdict.why] ?? 0) + 1;
}

// A mission that almost anything wins teaches nothing; one that almost nothing
// wins is a lottery. Middle of the field first.
kept.sort((a, b) => Math.abs(a.winningShare - 0.12) - Math.abs(b.winningShare - 0.12));

console.log(`${kept.length} missions survived out of ${tried} tried`);
for (const m of kept) {
  const air = Number.isFinite(m.clearance) ? `${m.clearance} px air` : "nothing close enough to crowd";
  console.log(`  ${m.name}  ±${m.margin} px aim · ${Math.round(m.winningShare * 1000) / 10}% of pulls win · ${air} · ${m.archetypes.join(" + ")}`);
}
console.log("rejected:");
for (const [why, count] of Object.entries(rejected).sort((a, b) => b[1] - a[1])) console.log(`  ${count.toString().padStart(4)} × ${why}`);

await mkdir(resolve("docs"), { recursive: true });
await writeFile(resolve("docs/generated-missions.json"), JSON.stringify({ seed: SEED, tried, kept }, null, 2) + "\n");
console.log(`\nwritten to docs/generated-missions.json — nothing is promoted into the campaign automatically`);
