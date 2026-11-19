// Hero powers on the fort chapters (src/game.js usePower, src/physics.js
// stepClones/stomp, src/blocks.js multi-hero stepWorld and blastWorld).
// Each power must change what happens to a fort — measured, not assumed —
// once per shot, and never reach the flight missions.
import test from "node:test";
import assert from "node:assert/strict";
import { GameModel, GamePhase, HERO_POWERS, LEVELS, Personality, POWER } from "../src/game.js";
import { HERO_MASS, blastWorld, createWorld, stepWorld } from "../src/blocks.js";
import { scoreTowerStep } from "../src/physics.js";

const forts = LEVELS.filter((level) => level.towers);
const byNumber = (number) => LEVELS.find((level) => level.number === number);
const launch = (level, pull, personality = Personality.DRAMA_QUEEN, events = []) => {
  const model = new GameModel((event) => events.push(event), level);
  model.personality = personality;
  model.beginSling(model.anchor); model.dragSling(pull); model.releaseSling();
  return model;
};
const fly = (model, fireAt = null) => {
  for (let i = 0; i < 1300 && model.phase === GamePhase.FLYING; i += 1) {
    if (fireAt && !model.powerUsed && fireAt(model)) model.usePower();
    model.update(1 / 120);
  }
  return model;
};

test("every character has its own power, and only forts offer one", () => {
  const kinds = Object.values(Personality).map((personality) => HERO_POWERS[personality].kind);
  assert.deepEqual(kinds.slice().sort(), ["blast", "drop", "ram", "split"]);
  for (const level of LEVELS) {
    const model = launch(level, level.assistPull);
    assert.equal(model.canUsePower, Boolean(level.towers), `mission ${level.number}`);
    // A fort brings the power instead of FIK and KAMIEŃ; the flight missions keep theirs.
    if (level.towers) assert.equal(level.airMove || level.diveMove, false);
    else assert.equal(level.airMove, level.number >= 5);
  }
});

test("a power fires once a shot, in flight, and comes back for the next shot", () => {
  const level = byNumber(89);
  const ready = new GameModel(() => {}, level);
  assert.equal(ready.usePower(), false, "a power fired before the launch");
  const model = launch(level, { x: 150, y: 470 });
  assert.equal(model.usePower(), true);
  assert.equal(model.usePower(), false, "a second power in the same shot");
  fly(model);
  assert.equal(model.phase, GamePhase.READY, "the short lob should hand over to the next hero");
  assert.equal(model.powerUsed, false, "the next hero came without a power");
  assert.equal(model.clones.length, 0);
});

test("TRZY DRAMY: two smaller copies fan out at the hero's speed", () => {
  const model = launch(byNumber(89), byNumber(89).assistPull);
  model.update(0.1);
  const v = { ...model.avatarVelocity }, speed = Math.hypot(v.x, v.y);
  model.usePower();
  assert.equal(model.clones.length, 2);
  for (const clone of model.clones) {
    assert.ok(Math.abs(Math.hypot(clone.vx, clone.vy) - speed) < 1e-6, "a copy lost speed");
    assert.ok(clone.radius < model.avatarRadius && clone.mass < HERO_MASS);
  }
  const turn = Math.atan2(model.clones[1].vy, model.clones[1].vx) - Math.atan2(model.clones[0].vy, model.clones[0].vx);
  assert.ok(Math.abs(turn - 2 * POWER.splitAngle) < 1e-9, "the copies do not fan out");
});

test("a copy is a real body: it pushes the blocks it hits", () => {
  const world = createWorld([{ id: "b", material: "wood", x: 700, y: 556, width: 60, height: 60 }], 586);
  const copy = { x: 600, y: 556, vx: 600, vy: 0, radius: 25, mass: HERO_MASS * POWER.splitMass };
  const far = { x: 100, y: 300, vx: 0, vy: 0, radius: 35 };
  for (let step = 0; step < 40; step += 1) {
    copy.x += copy.vx / 120;
    const [, moved] = stepWorld(world, 1 / 120, 620, [far, copy]);
    Object.assign(copy, { x: moved.x, y: moved.y, vx: moved.vx, vy: moved.vy });
  }
  assert.ok(world.bodies[0].x > 705, "the copy passed through the block");
});

test("one hero in an array steps exactly like one hero alone", () => {
  const specs = byNumber(96).towers;
  const a = createWorld(specs, 586), b = createWorld(specs, 586);
  let ha = { x: 820, y: 470, vx: 640, vy: -60, radius: 35 }, hb = { ...ha };
  for (let step = 0; step < 240; step += 1) {
    const ra = stepWorld(a, 1 / 120, 620, ha), [rb] = stepWorld(b, 1 / 120, 620, [hb]);
    ha = { ...ha, x: ra.x + ra.vx / 120, y: ra.y + ra.vy / 120, vx: ra.vx, vy: ra.vy };
    hb = { ...hb, x: rb.x + rb.vx / 120, y: rb.y + rb.vy / 120, vx: rb.vx, vy: rb.vy };
  }
  assert.deepEqual(a.bodies.map((body) => [body.x, body.y, body.angle, body.health]), b.bodies.map((body) => [body.x, body.y, body.angle, body.health]));
});

test("TARAN: faster, and hits like a heavier hero", () => {
  const model = launch(byNumber(89), { x: 150, y: 470 }, Personality.TOUGH_GUY);
  model.update(0.05);
  const before = Math.hypot(model.avatarVelocity.x, model.avatarVelocity.y);
  model.usePower();
  const after = Math.hypot(model.avatarVelocity.x, model.avatarVelocity.y);
  assert.ok(after >= Math.max(before * POWER.ramSpeed, POWER.ramMinSpeed) - 1e-6);
  assert.equal(model.powerMass, POWER.ramMass);
  // The same blow from a heavier hero moves the block further.
  const shove = (mass) => {
    const world = createWorld([{ id: "b", material: "stone", x: 700, y: 556, width: 60, height: 60 }], 586);
    const hero = { x: 600, y: 556, vx: 600, vy: 0, radius: 35, mass };
    for (let step = 0; step < 60; step += 1) { hero.x += hero.vx / 120; Object.assign(hero, stepWorld(world, 1 / 120, 620, hero)); }
    return world.bodies[0].x;
  };
  assert.ok(shove(HERO_MASS * POWER.ramMass) > shove(HERO_MASS) + 5);
  // And the flight really uses that weight: the same rams, one of them with
  // the weight taken away right after the power, move the fort differently.
  const level = byNumber(97);
  const moved = (keepWeight) => {
    let total = 0;
    for (const pull of [level.assistPull, { x: 95, y: 500 }, { x: 120, y: 520 }]) {
      const m = launch(level, pull, Personality.TOUGH_GUY);
      const start = m.world.bodies.map((body) => body.x);
      for (let i = 0; i < 1300 && m.phase === GamePhase.FLYING; i += 1) {
        if (!m.powerUsed && m.avatarPosition.x > 700) { m.usePower(); if (!keepWeight) m.powerMass = 1; }
        m.update(1 / 120);
      }
      total += m.world.bodies.reduce((sum, body, i) => sum + Math.abs(body.x - start[i]), 0);
    }
    return total;
  };
  assert.notEqual(moved(true), moved(false), "the ram's weight never reached the fort");
});

test("PANIKA!: the blast shoves and cracks what is close, and pays for what it breaks", () => {
  const model = new GameModel(() => {}, byNumber(100));
  const world = model.world;
  const centre = world.bodies.find((body) => body.material === "glass");
  const far = { id: "far", material: "wood", x: centre.x + 400, y: 556, width: 60, height: 60 };
  world.bodies.push({ ...createWorld([far]).bodies[0] });
  const before = world.bodies.map((body) => ({ x: body.x, health: body.health }));
  blastWorld(world, centre.x, centre.y, POWER.blastRadius, POWER.blastImpulse, POWER.blastBlow);
  assert.ok(centre.broken, "glass at the centre of a panic survived");
  const farBody = world.bodies.at(-1);
  assert.equal(farBody.health, before.at(-1).health, "the blast reached past its radius");
  assert.equal(farBody.asleep, true);
  // Broken by the blast, reported and paid with the next step.
  model.phase = GamePhase.FLYING;
  stepWorld(world, 1 / 120, 620);
  assert.ok(world.breaks.some((piece) => piece.id === centre.id));
  scoreTowerStep(model);
  assert.ok(model.towerPoints >= 300);
});

test("OM: stops dead, drops, and lands once with a shock wave", () => {
  const events = [];
  const model = launch(byNumber(89), { x: 150, y: 470 }, Personality.ZEN, events);
  model.update(0.3);
  const vx = model.avatarVelocity.x;
  model.usePower();
  assert.ok(Math.abs(model.avatarVelocity.x - vx * POWER.dropBrake) < 1e-9);
  assert.ok(model.avatarVelocity.y >= POWER.dropSpeed);
  fly(model);
  assert.equal(events.filter((event) => event.type === "stomp").length, 1);
});

test("a power shot replays the same way twice", () => {
  const run = (personality) => {
    const level = byNumber(97);
    const model = fly(launch(level, level.assistPull, personality), (m) => m.flightTime > 0.6);
    return model.world.bodies.map((body) => [body.x, body.y, body.angle, body.broken]);
  };
  for (const personality of Object.values(Personality)) assert.deepEqual(run(personality), run(personality));
});

test("every power does real work on the forts: more blocks broken than the same shots without it", () => {
  // A fixed sample: every fourth fort, a coarse grid of pulls, the power fired
  // just before the fort (OM over the first clock). Measured over the whole
  // chapter with a finer grid, each power wins 5-11 points more often.
  const sample = forts.filter((_, i) => i % 4 === 0);
  const pulls = [];
  for (let x = 55; x <= 145; x += 30) for (let y = 450; y <= 560; y += 36) pulls.push({ x, y });
  for (const personality of Object.values(Personality)) {
    let plain = 0, powered = 0;
    for (const level of sample) {
      const left = Math.min(...level.towers.map((block) => block.x - block.width / 2));
      const clockX = Math.min(...level.towers.filter((block) => block.target).map((block) => block.x));
      const at = personality === Personality.ZEN ? clockX - 40 : left - 130;
      for (const pull of pulls) {
        plain += fly(launch(level, pull, personality)).towerPoints;
        powered += fly(launch(level, pull, personality), (m) => m.avatarPosition.x > at).towerPoints;
      }
    }
    assert.ok(powered > plain * 1.05, `${personality}: ${powered} points with the power, ${plain} without`);
  }
});
