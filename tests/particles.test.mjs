// Measured over the same 615 flights: 11.5% of every particle-frame was spent
// below the floor — sparks and confetti fell straight through it — and impact
// sparks sprayed a full circle, so by construction half of each burst flew
// into the surface the hero had just hit. src/particles.js is the fix; these
// tests hold it without drawing a pixel.
import test from "node:test";
import assert from "node:assert/strict";
import { FLOOR_BOUNCE, SPRAY_HALF_ANGLE, createRng, sprayAngle, stepParticle } from "../src/particles.js";
import { GameRenderer } from "../src/render.js";

const particle = (extra = {}) => ({ kind: "circle", x: 400, y: 300, velocity: { x: 120, y: 0 }, gravity: 520, size: 8, age: 0, life: 3, rotation: 0, spin: 4, ...extra });

test("the random is seeded: same seed, same sparks", () => {
  const a = createRng(42), b = createRng(42), c = createRng(43);
  const first = Array.from({ length: 50 }, a), second = Array.from({ length: 50 }, b);
  assert.deepEqual(first, second);
  assert.notDeepEqual(first, Array.from({ length: 50 }, c));
  for (const value of first) assert.ok(value >= 0 && value < 1);
});

test("an impact never sprays into the surface it came off", () => {
  const random = createRng(7);
  const floor = Math.cos(SPRAY_HALF_ANGLE) - 1e-9;
  for (let i = 0; i < 400; i += 1) {
    const turn = random() * Math.PI * 2, normal = { x: Math.cos(turn), y: Math.sin(turn) };
    for (let j = 0; j < 20; j += 1) {
      const angle = sprayAngle(random, normal);
      assert.ok(Math.cos(angle) * normal.x + Math.sin(angle) * normal.y >= floor, "a spark left through the wall");
    }
  }
});

test("without a surface a burst is still a full circle", () => {
  const random = createRng(9), quadrants = new Set();
  for (let i = 0; i < 200; i += 1) {
    const angle = sprayAngle(random, null);
    quadrants.add(`${Math.sign(Math.cos(angle))}${Math.sign(Math.sin(angle))}`);
  }
  assert.equal(quadrants.size, 4);
});

test("nothing falls through the floor, and what lands comes to rest", () => {
  const floor = 586, p = particle({ velocity: { x: 200, y: 400 } });
  let lowest = -Infinity, bounced = false, lastVy = p.velocity.y;
  for (let i = 0; i < 600; i += 1) {
    stepParticle(p, 1 / 120, floor);
    lowest = Math.max(lowest, p.y);
    if (lastVy > 0 && p.velocity.y < 0) bounced = true;
    lastVy = p.velocity.y;
  }
  assert.ok(lowest <= floor - p.size * 0.5 + 1e-9, `a particle reached y=${lowest}`);
  assert.ok(bounced, "it hit the floor like a sheet of glass");
  assert.ok(Math.abs(p.velocity.y) < 1 && Math.abs(p.velocity.x) < 1, "it is still skating after five seconds");
  assert.ok(FLOOR_BOUNCE < 0.5, "debris bounces higher than half its fall");
});

test("confetti floats down; a spark points where it flies", () => {
  const paper = particle({ kind: "confetti", velocity: { x: 0, y: 0 }, gravity: 430, drag: 2.1, sway: 260, flutter: 6, phase: 0 });
  for (let i = 0; i < 360; i += 1) stepParticle(paper, 1 / 120);
  assert.ok(paper.velocity.y < 230, `confetti falls at ${paper.velocity.y.toFixed(0)} px/s, like gravel`);
  const spark = particle({ kind: "spark", velocity: { x: 300, y: -200 } });
  for (let i = 0; i < 30; i += 1) stepParticle(spark, 1 / 120);
  assert.ok(Math.abs(spark.rotation - Math.atan2(spark.velocity.y, spark.velocity.x)) < 1e-9);
});

test("the same flight throws the same sparks", () => {
  const throwSparks = () => {
    const renderer = Object.create(GameRenderer.prototype);
    Object.assign(renderer, { particles: [], callouts: [], trail: [], flightPath: [], shake: 0, goalWobble: 0, landing: null,
      random: createRng(1),
      model: { goalCentre: { x: 1000, y: 300 }, avatarRadius: 35, avatarPosition: { x: 200, y: 400 }, attempts: 3, level: { number: 17 } } });
    renderer.spawnDust = () => {};
    renderer.handleGameEvent({ type: "launch", position: { x: 200, y: 400 } });
    renderer.handleGameEvent({ type: "impact", x: 600, y: 320, speed: 480, surface: "solid", normal: { x: -1, y: 0 } });
    return JSON.stringify(renderer.particles);
  };
  assert.equal(throwSparks(), throwSparks());
});

test("sparks start on the surface, not inside the hero", () => {
  const renderer = Object.create(GameRenderer.prototype);
  Object.assign(renderer, { particles: [], callouts: [], shake: 0, goalWobble: 0, random: createRng(1),
    model: { goalCentre: { x: 1000, y: 300 }, avatarRadius: 35 } });
  renderer.handleGameEvent({ type: "impact", x: 600, y: 320, speed: 480, surface: "solid", normal: { x: -1, y: 0 } });
  for (const p of renderer.particles) assert.equal(p.x, 635, "the burst came from the hero's middle");
});
