// The flight had no pulse: every impact played back at the same speed as every
// other, so a hard hit and a graze read identically. Hit-stop and the one
// slow-motion per flight are the fix — and the thing that could go wrong with
// them is worse than the thing they fix, so most of this file is about that.
//
// Scaling the seconds handed to `model.update` MUST NOT move the flight. The
// solver is a fixed 1/120 accumulator: the same steps run in the same order
// whatever pace they arrive at. If that ever stops being true, replays, the
// trajectory preview and the offline route search all start disagreeing with
// what the player sees.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { GameModel, GamePhase, LEVELS } from "../src/game.js";
import {
  HIT_STOP_MAX, HIT_STOP_MIN, HIT_STOP_SPEED, SLOW_MO_REACH, SLOW_MO_SCALE, SLOW_MO_SECONDS,
  approachTimeFeel, armTimeFeel, createTimeFeel, punchTimeFeel, timeScale,
} from "../src/time-feel.js";

// Flies a real mission and returns where it ended. `pace` decides how each
// frame's real seconds are turned into simulated ones.
function fly(level, pace) {
  const model = new GameModel(() => {}, level);
  model.beginSling(model.anchor);
  model.dragSling(level.assistPull);
  model.releaseSling();
  let frames = 0;
  while (model.phase === GamePhase.FLYING && frames < 4000) {
    model.update(pace(frames));
    frames += 1;
  }
  return { x: model.avatarPosition.x, y: model.avatarPosition.y, phase: model.phase, frames };
}

test("a hit-stop and a slow-motion do not move the flight by one pixel", () => {
  for (const level of LEVELS) {
    const flat = fly(level, () => 1 / 60);
    // The same flight watched through the worst clock the feel can produce:
    // frozen for five frames around the impact, then a third speed, then a
    // stutter of uneven frames for good measure.
    const paced = fly(level, (frame) => {
      if (frame >= 40 && frame < 45) return 0;
      if (frame >= 45 && frame < 90) return (1 / 60) * SLOW_MO_SCALE;
      return (1 / 60) * (frame % 3 === 0 ? 1.4 : 0.8);
    });
    assert.equal(paced.phase, flat.phase, `${level.id} ended differently`);
    assert.equal(paced.x, flat.x, `${level.id} landed at a different x`);
    assert.equal(paced.y, flat.y, `${level.id} landed at a different y`);
  }
});

test("a hard hit freezes the picture, and thaws on its own", () => {
  const feel = createTimeFeel();
  const stop = punchTimeFeel(feel, HIT_STOP_SPEED + 600);
  assert.ok(stop >= HIT_STOP_MIN && stop <= HIT_STOP_MAX, `a hit stopped time for ${stop}s`);
  assert.equal(timeScale(feel, 0.001), 0, "the hit did not stop the clock");
  let waited = 0;
  while (timeScale(feel, 1 / 60) === 0 && waited < 1) waited += 1 / 60;
  assert.ok(waited <= HIT_STOP_MAX + 1 / 60, `time stayed frozen for ${waited}s`);
});

test("a scrape is not a punch", () => {
  // Deliberately literal, not HIT_STOP_SPEED: a test written against the
  // constant moves with it and would bless a threshold of zero.
  const feel = createTimeFeel();
  assert.equal(punchTimeFeel(feel, 150), 0, "a 150 px/s scrape stopped time");
  assert.equal(punchTimeFeel(feel, 0), 0);
  assert.equal(punchTimeFeel(feel, NaN), 0);
  assert.equal(timeScale(feel, 1 / 60), 1, "a scrape stopped the clock");
});

test("the threshold splits the campaign's own hits, rather than taking all or none", () => {
  // Measured over the 88 assisted winning flights: 20 impacts, from 87 to 623
  // px/s, median 242. A threshold that punched all of them would stutter every
  // board; one that punched none would be a feature that does nothing.
  const speeds = [];
  for (const level of LEVELS) {
    const model = new GameModel((event) => { if (event.type === "impact") speeds.push(event.speed); }, level);
    model.beginSling(model.anchor);
    model.dragSling(level.assistPull);
    model.releaseSling();
    for (let frame = 0; frame < 4000 && model.phase === GamePhase.FLYING; frame += 1) model.update(1 / 120);
  }
  assert.ok(speeds.length >= 12, `the campaign only produced ${speeds.length} impacts to judge by`);
  const punched = speeds.filter((speed) => punchTimeFeel(createTimeFeel(), speed) > 0).length;
  assert.ok(punched >= speeds.length * 0.25, `only ${punched}/${speeds.length} real impacts land as hits`);
  assert.ok(punched <= speeds.length * 0.75, `${punched}/${speeds.length} real impacts freeze the screen`);
});

test("the last breath comes once a flight, and comes back on the next launch", () => {
  const feel = createTimeFeel();
  const radius = 60;
  assert.equal(approachTimeFeel(feel, radius * (SLOW_MO_REACH + 1), radius), false, "it fired from across the board");
  assert.equal(approachTimeFeel(feel, radius * (SLOW_MO_REACH - 0.4), radius), true, "it never fired on approach");
  assert.equal(timeScale(feel, 1 / 60), SLOW_MO_SCALE);
  assert.equal(approachTimeFeel(feel, radius * 0.5, radius), false, "it fired twice in one flight");
  let waited = 0;
  while (timeScale(feel, 1 / 60) !== 1 && waited < 2) waited += 1 / 60;
  assert.ok(waited <= SLOW_MO_SECONDS + 1 / 60, `the slow motion ran for ${waited}s`);
  armTimeFeel(feel);
  assert.equal(approachTimeFeel(feel, radius * 0.5, radius), true, "a new flight did not get its moment back");
});

test("a hero leaving the goal behind has already had their moment", () => {
  const feel = createTimeFeel();
  const radius = 60;
  approachTimeFeel(feel, radius * 10, radius);
  approachTimeFeel(feel, radius * 6, radius);
  armTimeFeel(feel);
  // Closing in, then bouncing back out: the outbound frames must not re-fire.
  approachTimeFeel(feel, radius * 4, radius);
  assert.equal(approachTimeFeel(feel, radius * 2, radius), true);
  armTimeFeel(feel);
  approachTimeFeel(feel, radius * 1.2, radius);
  feel.slowSpent = false;
  feel.slow = 0;
  assert.equal(approachTimeFeel(feel, radius * 2.2, radius), false, "an outbound frame re-fired the slow motion");
});

test("the clock never runs backwards and never runs fast", () => {
  const feel = createTimeFeel();
  const scales = [];
  for (let frame = 0; frame < 400; frame += 1) {
    if (frame % 37 === 0) punchTimeFeel(feel, 200 + (frame % 900));
    if (frame % 53 === 0) { armTimeFeel(feel); approachTimeFeel(feel, 40, 60); }
    scales.push(timeScale(feel, 1 / 60));
  }
  for (const scale of scales) assert.ok(scale >= 0 && scale <= 1, `the clock ran at ${scale}`);
  assert.ok(scales.some((scale) => scale === 0), "nothing ever froze");
  assert.ok(scales.some((scale) => scale === 1), "the clock never came back to normal speed");
});

test("a bad frame time cannot stall the game", () => {
  const feel = createTimeFeel();
  punchTimeFeel(feel, 900);
  assert.equal(timeScale(feel, -5), 0, "a negative frame was treated as time passing");
  assert.equal(timeScale(feel, 10), 1, "a long frame did not clear the freeze");
});

test("the loop really scales both clocks, and only on the real one", async () => {
  // Handing the renderer an unscaled delta would leave the confetti running
  // while the hero it came off stood still; forgetting to advance the feel on
  // REAL seconds would freeze the game forever.
  const source = await readFile(new URL("../src/main.js", import.meta.url), "utf8");
  assert.match(source, /const deltaSeconds = realSeconds \* timeScale\(timeFeel, realSeconds\);/);
  assert.match(source, /model\.update\(deltaSeconds\);\s*\n\s*renderer\.update\(deltaSeconds\);/);
  assert.match(source, /if \(event\.type === "impact"\) punchTimeFeel\(timeFeel, event\.speed\);/);
  assert.match(source, /armTimeFeel\(timeFeel\)/);
  const worker = await readFile(new URL("../sw.js", import.meta.url), "utf8");
  assert.ok(worker.includes("./src/time-feel.js?v="), "the offline shell would boot without the clock");
});
