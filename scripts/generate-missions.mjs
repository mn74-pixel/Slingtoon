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


// --promote=<name> turns one kept prototype into the line a campaign author
// would have written. The generator invents layouts; it does not write gags,
// does not know a chapter's theme and cannot judge where a rule belongs in the
// teaching order. So it stops at the code and hands it over.
const promoting = process.argv.find((value) => value.startsWith("--promote="))?.split("=")[1];
if (promoting) {
  const { readFile } = await import("node:fs/promises");
  const stored = JSON.parse(await readFile(resolve("docs/generated-missions.json"), "utf8"));
  const found = stored.kept.find((entry) => entry.name.toLowerCase().includes(promoting.toLowerCase()));
  if (!found) {
    console.log(`no kept mission matches "${promoting}". Available: ${stored.kept.map((entry) => entry.name).join(", ")}`);
    process.exit(1);
  }
  // Written out by hand rather than by regexing JSON: a label containing a
  // comma or a colon would come back mangled from the regex version, and the
  // point of this output is that it can be pasted without being read twice.
  const literal = (value) => {
    if (Array.isArray(value)) return `[${value.map(literal).join(", ")}]`;
    if (value && typeof value === "object") {
      return `{ ${Object.entries(value).map(([key, inner]) => `${key}: ${literal(inner)}`).join(", ")} }`;
    }
    return JSON.stringify(value);
  };
  const items = found.interactions.map((item) => `    ${literal(item)}`).join(",\n");
  console.log(`\n// ${found.name} — ±${found.margin} px of aim, ${Math.round(found.winningShare * 1000) / 10}% of pulls win`);
  console.log(`// Mechanics: ${found.archetypes.join(" + ")}. Shot: ${found.shape.reach}/${found.shape.height}.`);
  console.log(`// Paste into src/campaign.js in the slot you want, then rename, write the`);
  console.log(`// clue and the punchline, and run: npm run balance -- --write`);
  console.log(`mission(${found.slot}, "${found.name}", "suitcase", ${found.authored.x}, ${found.authored.y}, "${found.mechanic}",`);
  console.log(`  "${found.clue}",`);
  console.log(`  "TU WPISZ PUENTĘ.", [`);
  console.log(items);
  console.log(`  ], { shot: { reach: "${found.shape.reach}", height: "${found.shape.height}" } }),`);
  console.log(`\n// The route below was measured, but do not paste it: the balancer`);
  console.log(`// re-measures every mission from scratch once this one is in place.`);
  console.log(`// pull ${JSON.stringify(found.route.pull)} · star ${JSON.stringify(found.route.star)}`);
  process.exit(0);
}

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
