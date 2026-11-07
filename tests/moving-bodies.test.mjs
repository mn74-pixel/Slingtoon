// The pendulums were ghosts. From 0.26.0 the physics lab drew them, labelled
// them and taught them ("count to three and fly through while it swings
// away"), but the solver's contact loop never listed the type: measured over
// 845 shots at the five pendulum missions, 318 flew straight through the bob.
// They collide now, and anything that moves (pendulums and sliding blocks)
// bounces the hero in its own frame, by how fast the two close on each other.
import test from "node:test";
import assert from "node:assert/strict";
import { GameModel, GamePhase, LEVELS } from "../src/game.js";
import { bobRadius, bodyVelocity, pendulumAngle, pendulumBob, resolveContact } from "../src/physics.js";

const pendulumMissions = LEVELS.filter((level) => level.interactions.some((item) => item.type === "pendulum"));

test("no shot passes through a pendulum", () => {
  assert.ok(pendulumMissions.length >= 5, "the pendulum missions are gone");
  let flights = 0, through = 0;
  for (const level of pendulumMissions) {
    for (let dx = -60; dx <= 60; dx += 20) for (let dy = -60; dy <= 60; dy += 20) {
      const model = new GameModel(() => {}, level);
      model.beginSling(model.anchor);
      model.dragSling({ x: level.assistPull.x + dx, y: level.assistPull.y + dy });
      if (!model.releaseSling()) continue;
      flights += 1;
      let passed = false;
      for (let step = 0; step < 1200 && model.phase === GamePhase.FLYING; step += 1) {
        model.update(1 / 120);
        for (const item of model.interactions) {
          if (item.type !== "pendulum") continue;
          const bob = pendulumBob(item, model.flightTime);
          if (Math.hypot(model.avatarPosition.x - bob.x, model.avatarPosition.y - bob.y) - model.avatarRadius - bobRadius(item) < -8) passed = true;
        }
      }
      if (passed) through += 1;
    }
  }
  assert.ok(flights > 200, `only ${flights} shots were fired`);
  assert.equal(through, 0, `${through} of ${flights} shots flew through a pendulum`);
});

test("a pendulum actually stops shots, so its timing is a real lesson", () => {
  let blocked = 0;
  for (const level of pendulumMissions) {
    const model = new GameModel((event) => { if (event.type === "impact" && event.surface === "pendulum") blocked += 1; }, level);
    for (let dx = -60; dx <= 60; dx += 20) {
      model.resetLevel(false);
      model.beginSling(model.anchor);
      model.dragSling({ x: level.assistPull.x + dx, y: level.assistPull.y });
      if (!model.releaseSling()) continue;
      for (let step = 0; step < 1200 && model.phase === GamePhase.FLYING; step += 1) model.update(1 / 120);
    }
  }
  assert.ok(blocked >= 3, `pendulums were hit only ${blocked} times across the missions that teach them`);
});

test("a static surface bounces exactly as before", () => {
  const contact = { nx: -1, ny: 0, depth: 2 };
  const a = { position: { x: 0, y: 0 }, velocity: { x: 300, y: 40 } }, b = { position: { x: 0, y: 0 }, velocity: { x: 300, y: 40 } };
  resolveContact(a.position, a.velocity, contact, 0.4);
  resolveContact(b.position, b.velocity, contact, 0.4, null, { x: 0, y: 0 });
  assert.deepEqual(a, b);
  assert.equal(a.velocity.x, -120);
});

test("a moving surface throws the hero in its own frame", () => {
  // The hero hangs still; a block slides into it at 200 px/s from the left.
  const position = { x: 0, y: 0 }, velocity = { x: 0, y: 0 };
  const speed = resolveContact(position, velocity, { nx: 1, ny: 0, depth: 1 }, 0.5, null, { x: 200, y: 0 });
  assert.equal(speed, 200, "the closing speed is the block's speed");
  assert.equal(velocity.x, 300, "a resting hero struck at 200 px/s with e=0.5 leaves at 300 px/s");
  // Running away faster than the block chases: no kick at all.
  const fleeing = { x: 260, y: 0 };
  assert.equal(resolveContact({ x: 0, y: 0 }, fleeing, { nx: 1, ny: 0, depth: 1 }, 0.5, null, { x: 200, y: 0 }), 0);
  assert.deepEqual(fleeing, { x: 260, y: 0 });
});

test("a pendulum's velocity is the derivative of its real swing", () => {
  const item = pendulumMissions[0].interactions.find((entry) => entry.type === "pendulum");
  const { length, speed, swing, phase = 0 } = item.pendulum;
  for (const time of [0.1, 0.7, 1.3, 2.9]) {
    const angle = pendulumAngle(item, time);
    const rate = -swing * speed * Math.sin(time * speed + phase);
    const expected = { x: Math.cos(angle) * length * rate, y: -Math.sin(angle) * length * rate };
    const measured = bodyVelocity(item, time);
    assert.ok(Math.hypot(measured.x - expected.x, measured.y - expected.y) < 0.5, `t=${time}: ${JSON.stringify(measured)} vs ${JSON.stringify(expected)}`);
  }
  const still = { id: "box", type: "solid", x: 10, y: 10, width: 20, height: 20 };
  assert.deepEqual(bodyVelocity(still, 1), { x: 0, y: 0 });
});

test("the bob collides as the disc it is drawn as, not its bounding square", async () => {
  const { bobContact } = await import("../src/physics.js");
  const item = pendulumMissions[0].interactions.find((entry) => entry.type === "pendulum");
  const bob = pendulumBob(item, 0), r = 35, corner = (item.width / 2) * Math.SQRT2;
  // Diagonally off the bob, inside the old square's corner but clear of the disc.
  const gap = (bobRadius(item) + r + (corner + r)) / 2 - 0.5;
  const point = { x: bob.x + gap / Math.SQRT2, y: bob.y + gap / Math.SQRT2 };
  assert.equal(bobContact(point, r, item, 0), null, "a hit on the empty corner of the bob's box");
  assert.ok(bobContact({ x: bob.x + bobRadius(item) + r - 2, y: bob.y }, r, item, 0), "a real touch was missed");
});
