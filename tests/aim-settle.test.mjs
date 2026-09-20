// The shot used to be fired from the very last pointermove — including the
// slide a finger makes as it leaves the glass. Measured on the real solver
// over 12 896 winning aims: a 1 px lift-off wobble loses 6% of them, 2 px loses
// 11%, 3 px loses 16%. The player held a winning aim and the game took another.
//
// The precision this protects is real: 14 of 88 missions have no spot more
// forgiving than ±8 world px of pull, and the tightest two are ±4 — about
// ±2 CSS px on a phone, inside an aim disc only 140 CSS px across.
import test from "node:test";
import assert from "node:assert/strict";
import { SETTLE_TRAVEL_PX, SETTLE_WINDOW_MS, settledAim, trimAimTrail } from "../src/aim-settle.js";

const hold = (x, y, samples = 30, step = 16) =>
  Array.from({ length: samples }, (_, i) => ({ x, y, t: i * step }));

test("the shot is fired from the aim the finger was holding, not the lift-off", () => {
  const trail = hold(300, 200);
  const last = trail[trail.length - 1];
  trail.push({ x: 302, y: 198.5, t: last.t + 12 });
  trail.push({ x: 303.5, y: 197, t: last.t + 23 });
  const aim = settledAim(trail);
  assert.equal(aim.x, 300, "the wobble was taken as the aim");
  assert.equal(aim.y, 200);
});

test("a deliberate sweep into the release is kept exactly", () => {
  const trail = [];
  for (let i = 0; i <= 30; i += 1) trail.push({ x: 300 + i * 4, y: 200, t: i * 16 });
  const aim = settledAim(trail);
  assert.deepEqual(aim, trail[trail.length - 1],
    "a finger still travelling is aiming, and its last position is the aim");
});

// The boundary is what decides whether a slow last adjustment survives.
test("the sweep threshold is measured over the settle window", () => {
  const still = [...hold(0, 0, 20), { x: SETTLE_TRAVEL_PX - 1, y: 0, t: 20 * 16 }];
  assert.equal(settledAim(still).x, 0, "movement under the threshold is a wobble");
  const swept = [...hold(0, 0, 20), { x: SETTLE_TRAVEL_PX + 1, y: 0, t: 20 * 16 }];
  assert.equal(settledAim(swept).x, SETTLE_TRAVEL_PX + 1, "movement over it is intent");
});

test("a flick too short to have a past is fired as made", () => {
  const trail = [{ x: 10, y: 10, t: 0 }, { x: 40, y: 30, t: 20 }];
  assert.deepEqual(settledAim(trail), trail[1], "there is no held aim to rewind to");
});

test("the rewind never reaches further back than the settle window", () => {
  const trail = [];
  // A slow drift: every sample differs, so the rewind must not hand back an
  // aim from half a second ago.
  for (let i = 0; i <= 40; i += 1) trail.push({ x: i * 0.1, y: 0, t: i * 16 });
  const aim = settledAim(trail);
  const last = trail[trail.length - 1];
  assert.ok(last.t - aim.t >= SETTLE_WINDOW_MS, "it must predate the wobble");
  assert.ok(last.t - aim.t < SETTLE_WINDOW_MS + 32, `it must stay close to the release, got ${last.t - aim.t}ms`);
});

test("an empty trail asks for nothing", () => {
  assert.equal(settledAim([]), null);
  assert.equal(settledAim(null), null);
});

test("the trail stays short, so a long aim costs nothing", () => {
  const trail = [];
  for (let t = 0; t <= 4000; t += 16) {
    trail.push({ x: 1, y: 1, t });
    trimAimTrail(trail, t);
  }
  assert.ok(trail.length < 24, `the trail grew to ${trail.length} samples over four seconds of aiming`);
  assert.ok(trail.length > 4, "it must still hold enough history to rewind through a wobble");
});

// The property that matters, stated directly: holding an aim and letting go
// must fire that aim, whatever direction the finger slips.
test("no lift-off direction can move the fired aim", () => {
  for (let i = 0; i < 16; i += 1) {
    const angle = (i / 16) * Math.PI * 2;
    const trail = hold(500, 400);
    const last = trail[trail.length - 1];
    trail.push({ x: 500 + Math.cos(angle) * 3, y: 400 + Math.sin(angle) * 3, t: last.t + 18 });
    const aim = settledAim(trail);
    assert.equal(aim.x, 500, `a wobble at ${Math.round((angle * 180) / Math.PI)}° moved the aim`);
    assert.equal(aim.y, 400);
  }
});

// End to end through the real main module: the unit tests above would all
// still pass if the settle were never wired into the release, which is the
// state this change fixes.
//
// The main module keeps its state at module scope, so it is booted once here;
// the fixture is checked against the solver instead of a second boot.
test("the real release path fires the held aim, not the slip", async () => {
  const { GameModel, LEVELS } = await import("../src/game.js");
  const { bootMainModule } = await import("./dom-harness.mjs");
  const held = { x: 40, y: 551 };
  const slipped = { x: 43, y: 554 };

  // The fixture, stated against the physics: this aim wins and the same aim
  // 3 px down-right — one finger's lift-off — does not.
  const model = new GameModel(() => {}, LEVELS[0]);
  assert.equal(model.simulate(model.clampedSlingPoint(held), 1).reachesGoal, true, "the held aim must win");
  assert.equal(model.simulate(model.clampedSlingPoint(slipped), 1).reachesGoal, false,
    "the slipped aim must lose, or this test proves nothing");

  const { elements, advance, restoreTimers } = await bootMainModule();
  const canvas = elements.gameCanvas;
  canvas.dispatch("pointerdown", { clientX: 173, clientY: 455, pointerId: 1, timeStamp: 0 });
  for (let t = 16; t <= 320; t += 16) {
    canvas.dispatch("pointermove", { clientX: held.x, clientY: held.y, pointerId: 1, timeStamp: t });
  }
  canvas.dispatch("pointermove", { clientX: slipped.x, clientY: slipped.y, pointerId: 1, timeStamp: 332 });
  canvas.dispatch("pointerup", { clientX: slipped.x, clientY: slipped.y, pointerId: 1, timeStamp: 344 });
  advance(410);
  const won = elements.resultPanel.classes.has("is-success");
  restoreTimers();
  assert.equal(won, true,
    "a 3 px slip as the finger left the glass lost the shot; the settle is not wired into the release");
});
