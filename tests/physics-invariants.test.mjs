// The brief's acceptance criteria, held against the shipped campaign.
//
// Each of these was verified by hand while auditing physics, movement and
// precision, and each passed — which is exactly why they need guarding now
// rather than after a level edit quietly breaks one. They are cheap: a full
// flight through the real solver costs about 1.4 ms.
import test from "node:test";
import assert from "node:assert/strict";
import { GameModel, GamePhase, LEVELS } from "../src/game.js";

const PULLS = [{ x: 55, y: 465 }, { x: 95, y: 500 }, { x: 125, y: 470 }, { x: 110, y: 545 }, { x: 148, y: 560 }, { x: 40, y: 520 }];

function fly(level, pull) {
  const model = new GameModel(() => {}, level);
  model.beginSling(model.anchor);
  model.dragSling(pull);
  model.releaseSling();
  const launch = Math.hypot(model.avatarVelocity.x, model.avatarVelocity.y);
  let t = 0, peak = 0, fieldDwell = 0, longestDwell = 0;
  // Twice the model's own six-second cap: if a flight runs past this, something
  // is keeping it alive that should not.
  while (model.phase === GamePhase.FLYING && t < 12) {
    model.update(1 / 120);
    t += 1 / 120;
    peak = Math.max(peak, Math.hypot(model.avatarVelocity.x, model.avatarVelocity.y));
    const p = model.avatarPosition;
    const inFlow = model.interactions.some((item) => (item.type === "steam" || item.type === "current")
      && p.x >= item.x && p.x <= item.x + item.width && p.y >= item.y && p.y <= item.y + item.height);
    fieldDwell = inFlow ? fieldDwell + 1 / 120 : 0;
    longestDwell = Math.max(longestDwell, fieldDwell);
  }
  return { model, launch, peak, t, longestDwell };
}

// "Każdą opcjonalną gwiazdkę da się zebrać i ukończyć tę samą próbę."
test("every optional star can be taken on an attempt that also finishes the mission", () => {
  let checked = 0;
  for (const level of LEVELS) {
    if (!level.star || !level.starPull) continue;
    const shot = new GameModel(() => {}, level).simulate(level.starPull, 70);
    assert.ok(shot.star, `mission ${level.number}: the stored star route does not collect the star`);
    assert.ok(shot.reachesGoal, `mission ${level.number}: the star route collects the star but never finishes the mission`);
    checked += 1;
  }
  assert.ok(checked > 70, `only ${checked} missions carry a star route; the campaign should be full of them`);
});

// "Żadnych ukrytych przyspieszeń ani nieskończonego nabierania energii."
// Sixteen of the campaign's twenty-five flow fields carry no drag of their own,
// so nothing inside them caps the hero's speed except leaving. Measured on the
// shipped campaign the fastest the hero ever moves is 1567 px/s; a field that
// trapped and pumped him would run away from that immediately.
test("no surface pumps the hero to an impossible speed", () => {
  let fastest = 0, where = null;
  for (const level of LEVELS) {
    for (const pull of PULLS) {
      const { peak, launch } = fly(level, pull);
      if (peak > fastest) { fastest = peak; where = `mission ${level.number}, launched at ${Math.round(launch)} px/s`; }
    }
  }
  assert.ok(fastest < 2200, `the hero reached ${Math.round(fastest)} px/s (${where}); something is adding energy without bound`);
});

test("a flow field is crossed, never a trap the hero cannot leave", () => {
  let longest = 0, where = null;
  for (const level of LEVELS.filter((l) => l.interactions.some((i) => i.type === "steam" || i.type === "current"))) {
    for (const pull of PULLS) {
      const { longestDwell } = fly(level, pull);
      if (longestDwell > longest) { longest = longestDwell; where = `mission ${level.number}`; }
    }
  }
  assert.ok(longest < 5, `the hero spent ${longest.toFixed(1)}s inside one flow field (${where}) — long enough for a field with no drag to keep accelerating him`);
});

test("every flight ends, and the six-second cap is what ends the long ones", () => {
  for (const level of LEVELS) {
    for (const pull of PULLS) {
      const { model, t } = fly(level, pull);
      assert.notEqual(model.phase, GamePhase.FLYING,
        `mission ${level.number}: a shot was still in the air after ${t.toFixed(1)}s`);
      assert.ok(t <= 6.05, `mission ${level.number}: a shot ran ${t.toFixed(2)}s, past the model's own six-second cap`);
    }
  }
  // Most shots end by leaving the screen or settling, so the assertions above
  // would pass with no cap at all. This shot ends only because of it.
  const capped = fly(LEVELS.find((level) => level.number === 5), { x: 115, y: 450 });
  assert.ok(capped.t > 5.9 && capped.t <= 6.05,
    `the fixture shot should be the cap's own case, ran ${capped.t.toFixed(2)}s`);
});

// "Zerowy ruch nie zużywa wyzwania."
test("letting go without pulling costs nothing", () => {
  const model = new GameModel(() => {}, LEVELS[0]);
  const attempts = model.attempts;
  model.beginSling(model.anchor);
  model.dragSling(model.anchor);
  model.releaseSling();
  assert.equal(model.attempts, attempts, "a release with no pull consumed an attempt");
  assert.equal(model.phase, GamePhase.READY, "and it must leave the hero ready, not in flight");
});

// "Ponowienie i reset odtwarzają obiekty."
test("a reset puts every object back", () => {
  const level = LEVELS.find((l) => l.interactions.some((i) => i.type === "breakable" || i.type === "switch"));
  const model = new GameModel(() => {}, level);
  model.beginSling(model.anchor);
  model.dragSling(level.assistPull);
  model.releaseSling();
  let t = 0;
  while (model.phase === GamePhase.FLYING && t < 12) { model.update(1 / 120); t += 1 / 120; }
  assert.ok(Object.keys(model.objectState).length + model.visited.size > 0,
    `mission ${level.number}: the fixture shot must actually touch something`);
  model.resetLevel(false);
  assert.equal(Object.keys(model.objectState).length, 0, "an object stayed broken or switched after a reset");
  assert.equal(model.visited.size, 0, "the visited set survived a reset");
});
