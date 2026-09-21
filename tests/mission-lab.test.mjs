// The mission generator judges what it invents by the machinery that certifies
// the shipped campaign. These tests hold that promise: if the lab ever starts
// grading on a kinder curve, it will produce missions the game cannot honour.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { GameModel, LEVELS } from "../src/game.js";
import { mission } from "../src/campaign.js";
import { level } from "../src/levels.js";
import { ARCHETYPES, compose, judge, seed } from "../scripts/lib/mission-lab.mjs";
import { widestRoute, winningPulls } from "../scripts/lib/route-search.mjs";

// The shared search was lifted out of scripts/balance-campaign.mjs. If it ever
// drifts, the campaign's own recorded tolerances are the thing that proves it.
test("the shared route search still measures the shipped campaign the same way", async () => {
  const report = JSON.parse(await readFile(new URL("../docs/campaign-balance.json", import.meta.url), "utf8"));
  for (const number of [20, 47, 75]) {
    const level = LEVELS.find((entry) => entry.number === number);
    const recorded = report.find((entry) => entry.number === number);
    const model = new GameModel(() => {}, level);
    const { winners, total } = winningPulls(model);
    assert.equal(total, recorded.gridShots, `mission ${number}: the pull grid changed size`);
    assert.equal(winners.length, recorded.winningGridShots, `mission ${number}: a different set of pulls now wins`);
    const { margin } = widestRoute(model, winners);
    assert.equal(margin, recorded.margin, `mission ${number}: the measured tolerance moved from ±${recorded.margin} to ±${margin}`);
  }
});

// A portal that drops the hero onto the goal hands him the win. The layout's
// gap relaxation covers most placements, but not a portal authored PAST the
// goal: measured, one builds 126 px from the target while satisfying every
// spacing rule. That is what this gate is for.
test("a candidate whose portal drops the hero onto the goal is refused", () => {
  const candidate = {
    slot: 40, shape: { reach: "mid", height: "mid" }, name: "Fixture",
    mechanic: "PORTAL", clue: "x", archetypes: ["portal"],
    authored: { x: 980, y: 400 },
    interactions: [{ id: "pipe-0", type: "portal", entry: { x: 520, y: 380 }, exit: { x: 1040, y: 420 }, radius: 68, turn: 0 }],
  };
  const verdict = judge(candidate);
  assert.equal(verdict.ok, false, "a pipe that delivers the win was accepted");
  assert.match(verdict.why, /portal exit/, `rejected for the wrong reason: ${verdict.why}`);
});

// And the ordinary case: a portal authored before the goal is spaced by the
// layout itself, without the gate having to intervene.
test("the layout spaces an ordinary portal from the goal by itself", () => {
  const built = level(mission(40, "Fixture", "suitcase", 980, 400, "PORTAL", "x", "y",
    [{ id: "pipe-0", type: "portal", entry: { x: 520, y: 380 }, exit: { x: 900, y: 380 }, radius: 68, turn: 0 }],
    { route: null, shot: { reach: "mid", height: "mid" } }));
  const portal = built.interactions.find((item) => item.type === "portal");
  const drop = Math.hypot(portal.exit.x - built.goal.x, portal.exit.y - built.goal.y);
  assert.ok(drop >= 180, `the layout left the exit ${Math.round(drop)} px from the goal`);
});

// The layout machinery relaxes overlapping furniture by itself — that is what
// relaxGaps is for — so a candidate cannot be refused for piling crates up.
// What it can be refused for is leaving no way through at all.
test("a candidate with no way through is refused", () => {
  const candidate = {
    slot: 40, shape: { reach: "mid", height: "mid" }, name: "Fixture",
    mechanic: "MUR", clue: "x", archetypes: ["hazard"],
    authored: { x: 980, y: 400 },
    // A hazard from the floor to the ceiling, right across the flight.
    interactions: [{ id: "wall-0", type: "hazard", x: 600, y: 0, width: 120, height: 586, label: "NIE DOTYKAJ" }],
  };
  const verdict = judge(candidate);
  assert.equal(verdict.ok, false, "a mission with no way through was accepted");
  assert.match(verdict.why, /route/, `rejected for the wrong reason: ${verdict.why}`);
});

// Everything the lab keeps has to be playable, forgiving and starrable.
test("anything the lab keeps wins through the real model, with a star", () => {
  seed(7);
  let kept = null;
  for (let i = 1; i <= 40 && !kept; i += 1) {
    const verdict = judge(compose(i));
    if (verdict.ok) kept = verdict.mission;
  }
  assert.ok(kept, "the lab produced nothing in forty tries; the archetypes or the gates are broken");
  assert.ok(kept.margin >= 8, `a kept mission shipped with only ±${kept.margin} px of aim`);
  assert.ok(kept.route.pull && kept.route.star && kept.route.starPull, "a kept mission must carry its measured route and star");
});

test("every archetype builds something the renderer can draw", () => {
  seed(3);
  for (const archetype of ARCHETYPES) {
    for (const band of ["near", "mid", "far"]) {
      const items = archetype.build(band);
      assert.ok(items.length > 0, `${archetype.id} built nothing`);
      for (const item of items) {
        assert.ok(typeof item.id === "string" && item.type, `${archetype.id} built an item with no id or type`);
        for (const [key, value] of Object.entries(item)) {
          if (typeof value === "number") assert.ok(Number.isFinite(value), `${archetype.id}.${key} is not a finite number`);
        }
      }
    }
  }
});
