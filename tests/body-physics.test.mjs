// The hero was drawn at atan2(velocity). Measured over 615 flights (the
// certified route of every mission plus six deliberate misses each): 9 122
// frames — 7.8% of all flight — showed the hero upside down, in 57 flights,
// and 300 single steps spun the drawing by more than 30 degrees, up to a full
// 180, because every rebound reversed the velocity in one step.
//
// physics.js now gives the hero a body: a facing, a bounded lean and its own
// angular velocity. These tests hold the three things that matter — it never
// turns over, it never snaps, and it never touches the trajectory.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { GameModel, GamePhase, LEVELS } from "../src/game.js";
import { BODY_LEAN, BODY_MAX_SPIN, kickBody, leanFor, startBody, stepBody } from "../src/physics.js";

const OFFSETS = [[0, 0], [-30, 0], [30, 0], [0, -30], [0, 30], [-60, 20], [40, -40]];
function* flights() {
  for (const level of LEVELS) for (const [dx, dy] of OFFSETS) {
    const model = new GameModel(() => {}, level);
    model.beginSling(model.anchor);
    model.dragSling({ x: level.assistPull.x + dx, y: level.assistPull.y + dy });
    if (model.releaseSling()) yield model;
  }
}

test("the hero never turns upside down, and never snaps", () => {
  let frames = 0, upside = 0, worst = 0, turns = 0;
  for (const model of flights()) {
    let last = model.bodyAngle, facing = model.facing;
    for (let step = 0; step < 2000 && model.phase === GamePhase.FLYING; step += 1) {
      model.update(1 / 120);
      if (model.phase !== GamePhase.FLYING) break;
      frames += 1;
      if (Math.abs(model.bodyAngle) > Math.PI / 2) upside += 1;
      // A turnaround mirrors the drawing; that is a turn, measured separately.
      if (model.facing !== facing) { turns += 1; facing = model.facing; last = model.bodyAngle; continue; }
      let jump = Math.abs(model.bodyAngle - last);
      if (jump > Math.PI) jump = Math.PI * 2 - jump;
      worst = Math.max(worst, jump);
      last = model.bodyAngle;
    }
  }
  assert.ok(frames > 100000, `only ${frames} frames were flown`);
  assert.equal(upside, 0, `${upside} frames drew the hero upside down`);
  assert.ok(worst < (12 * Math.PI) / 180, `the body snapped ${(worst * 180 / Math.PI).toFixed(1)} degrees in one step`);
  assert.ok(turns >= 20, `only ${turns} turnarounds: the test is not reaching the bounces it guards`);
});

test("the body is angular state only: it cannot move a trajectory", () => {
  // Contacts stay frictionless. If kickBody or stepBody ever wrote to the
  // position or the velocity, every certified route would be a lie.
  const model = { avatarRadius: 35, facing: 1, spin: 0, bodyAngle: 0, flightTime: 0, groundY: 586,
    avatarPosition: { x: 400, y: 300 }, avatarVelocity: { x: 520, y: -140 } };
  const position = { ...model.avatarPosition }, velocity = { ...model.avatarVelocity };
  kickBody(model, { nx: -1, ny: 0 }, model.avatarVelocity, 520);
  for (let i = 0; i < 240; i += 1) stepBody(model, 1 / 120);
  assert.deepEqual(model.avatarPosition, position);
  assert.deepEqual(model.avatarVelocity, velocity);
});

test("a hard hit sets the body tumbling, and the air rights it", () => {
  const model = { avatarRadius: 35, flightTime: 0, groundY: 900,
    avatarPosition: { x: 400, y: 300 }, avatarVelocity: { x: 400, y: 380 } };
  startBody(model);
  // Glancing off a floor-facing surface while sliding right: it should roll.
  kickBody(model, { nx: 0, ny: -1 }, model.avatarVelocity, 380);
  assert.ok(model.spin > 3, `a 380 px/s glancing hit only spun the body at ${model.spin.toFixed(2)} rad/s`);
  assert.ok(Math.abs(model.spin) <= BODY_MAX_SPIN);
  const target = leanFor(model.avatarVelocity, model.facing);
  let settled = Infinity;
  for (let i = 0; i < 240; i += 1) {
    stepBody(model, 1 / 120);
    if (settled === Infinity && i > 12 && Math.abs(model.bodyAngle - target) < 0.05 && Math.abs(model.spin) < 0.4) settled = i / 120;
  }
  assert.ok(settled < 1, `the body took ${settled}s to right itself`);
});

test("a scrape does not tumble anyone", () => {
  const model = { avatarRadius: 35, facing: 1, spin: 0, bodyAngle: 0, flightTime: 0 };
  kickBody(model, { nx: 0, ny: -1 }, { x: 300, y: 60 }, 60);
  assert.equal(model.spin, 0);
});

test("the lean follows the arc but never lies down", () => {
  for (const velocity of [{ x: 10, y: 900 }, { x: 10, y: -900 }, { x: -10, y: 900 }, { x: 600, y: 0 }]) {
    const facing = velocity.x < 0 ? -1 : 1;
    const lean = leanFor(velocity, facing);
    assert.ok(Math.abs(lean) <= BODY_LEAN + 1e-9, `lean ${lean} for ${JSON.stringify(velocity)}`);
  }
  assert.equal(leanFor({ x: 600, y: 0 }, 1), 0, "level flight is upright");
});

test("travelling back turns the hero around rather than over", () => {
  const model = { avatarRadius: 35, flightTime: 0.5, groundY: 900,
    avatarPosition: { x: 400, y: 300 }, avatarVelocity: { x: 500, y: 0 } };
  startBody(model);
  model.avatarVelocity.x = -300;
  stepBody(model, 1 / 120);
  assert.equal(model.facing, -1);
  assert.equal(model.turnedAt, 0.5);
  // A small sideways drift is not a reason to spin round on the spot.
  model.avatarVelocity.x = 40;
  stepBody(model, 1 / 120);
  assert.equal(model.facing, -1, "a 40 px/s drift turned the hero around");
});

test("the renderer draws the solver's body, mirrored by its facing", async () => {
  const source = await readFile(new URL("../src/render.js", import.meta.url), "utf8");
  assert.match(source, /model\.bodyAngle/);
  assert.match(source, /const mirror = facing \* Math\.cos/);
  assert.doesNotMatch(source, /model\.phase === GamePhase\.FLYING \? model\.rotation/, "the arrow-style rotation is back");
});
