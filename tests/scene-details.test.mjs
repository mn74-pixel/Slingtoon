// Three small lies the picture told, each measured before it was fixed.
import test from "node:test";
import assert from "node:assert/strict";
import { GameModel, GamePhase, LEVELS } from "../src/game.js";
import { surfaceBelow } from "../src/physics.js";
import { drawObjective } from "../src/interactions-renderer.js";
import { GameRenderer } from "../src/render.js";

const base = (interactions, state = {}) => ({ groundY: 586, flightTime: 0, objectState: state, interactions });

test("a shadow lands on the first real surface below the hero", () => {
  // Measured: 10.3% of every certified flight passes over a prop, and the
  // shadow was painted on the floor line behind it.
  const crate = { id: "crate", type: "solid", x: 500, y: 420, width: 120, height: 166 };
  assert.equal(surfaceBelow(base([crate]), 560, 300), 420, "over a crate");
  assert.equal(surfaceBelow(base([crate]), 700, 300), 586, "beside it");
  assert.equal(surfaceBelow(base([crate]), 560, 450), 586, "already below its top");
  const gate = { id: "g", type: "gate", x: 500, y: 300, width: 24, height: 286, switchId: "b" };
  assert.equal(surfaceBelow(base([gate], { b: true }), 510, 200), 586, "an open gate catches nothing");
  const box = { id: "box", type: "breakable", x: 500, y: 450, width: 80, height: 80 };
  assert.equal(surfaceBelow(base([box], { box: true }), 540, 200), 586, "a broken box catches nothing");
  const ramp = { id: "r", type: "cushion", a: { x: 400, y: 440 }, b: { x: 800, y: 560 }, thickness: 16 };
  assert.equal(surfaceBelow(base([ramp]), 600, 200), 500 - 16, "on a slope, at the slope's height");
  assert.equal(surfaceBelow(base([{ id: "fan", type: "steam", x: 500, y: 300, width: 200, height: 200 }]), 560, 200), 586, "air does not cast a floor");
});

test("once the hero is in, the goal stops saying 'hit here'", () => {
  const level = LEVELS[0];
  const words = (phase) => {
    const model = new GameModel(() => {}, level);
    model.phase = phase;
    const text = [];
    const ctx = new Proxy({ fillText: (value) => text.push(value), measureText: (v) => ({ width: v.length * 7 }),
      createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }) },
    { get: (target, key) => key in target ? target[key] : () => {}, set: () => true });
    drawObjective(ctx, model, 1);
    return text.join("|");
  };
  assert.match(words(GamePhase.READY), /TRAF TUTAJ|CEL ZAMKNIĘTY/);
  assert.doesNotMatch(words(GamePhase.SUCCEEDED), /TRAF TUTAJ|CEL ZAMKNIĘTY/, "the caption prints through the success tag");
});

test("the released pouch rings along the shot, as hard as the shot", () => {
  const offsetAt = (velocity, time) => {
    const renderer = Object.create(GameRenderer.prototype);
    renderer.model = { previousShot: { launchVelocity: velocity }, flightTime: time };
    const frame = { farTip: { x: 100, y: 400 }, nearTip: { x: 140, y: 400 } };
    const grip = renderer.emptyGrip(frame);
    return { x: grip.x - 86, y: grip.y - 466 };
  };
  const hard = offsetAt({ x: 800, y: -460 }, 0.04), soft = offsetAt({ x: 200, y: -115 }, 0.04);
  // Parallel to the launch line.
  assert.ok(Math.abs(hard.x * -460 - hard.y * 800) < 1e-6, "the pouch swings off the line of fire");
  assert.ok(Math.hypot(hard.x, hard.y) > Math.hypot(soft.x, soft.y) * 2, "a tap and a full launch ring the same");
  const later = offsetAt({ x: 800, y: -460 }, 0.8);
  assert.ok(Math.hypot(later.x, later.y) < 0.5, "the band is still ringing after 0.8 s");
});

test("the renderer really uses the shadow surface and the particle floor", async () => {
  // Unit tests on surfaceBelow and stepParticle prove nothing if the renderer
  // quietly goes back to the floor line and to its own integrator.
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(new URL("../src/render.js", import.meta.url), "utf8");
  const shadow = source.slice(source.indexOf("  drawAvatarShadow(ctx) {"), source.indexOf("  drawSpeedTrail(ctx) {"));
  assert.match(shadow, /surfaceBelow\(this\.model,/, "the shadow is back on the floor line");
  assert.match(source, /stepParticle\(particle, dt, this\.model\.groundY\)/, "particles no longer know where the floor is");
  assert.doesNotMatch(source, /Math\.random\(\)/, "the effects are unseeded again");
});
