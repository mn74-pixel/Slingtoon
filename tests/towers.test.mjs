// Chapter 12: towers of wood, glass and stone (src/blocks.js, src/towers.js).
// What a stacking engine must never do: fall over on its own, wear a block
// down by its own weight, give two answers to the same shot, or let the hero
// pass through. What the chapter must always do: every fort can be brought
// down by its stored shot, and the 88 flight missions stay exactly as they were.
import test from "node:test";
import assert from "node:assert/strict";
import { GameModel, GamePhase, LEVELS } from "../src/game.js";
import { MATERIALS, createWorld, stepWorld, worldAsleep } from "../src/blocks.js";
import { towerFallen } from "../src/physics.js";

const towers = LEVELS.filter((level) => level.towers);
// Shot after shot through the real input path, letting the fort settle in
// between, as scripts/balance-towers.mjs measured the plan.
const playPlan = (level, pulls) => {
  const model = new GameModel(() => {}, level);
  for (const pull of pulls) {
    if (model.phase !== GamePhase.READY) break;
    model.beginSling(model.anchor);
    model.dragSling(pull);
    model.releaseSling();
    for (let i = 0; i < 1300 && model.phase === GamePhase.FLYING; i += 1) model.update(1 / 120);
    for (let i = 0; i < 1500 && model.phase === GamePhase.READY && !worldAsleep(model.world); i += 1) model.update(1 / 120);
  }
  return model;
};
const fly = (level, pull) => {
  const model = new GameModel(() => {}, level);
  model.beginSling(model.anchor);
  model.dragSling(pull);
  model.releaseSling();
  for (let step = 0; step < 1300 && model.phase === GamePhase.FLYING; step += 1) model.update(1 / 120);
  return model;
};

test("chapters 12-15 are thirty-two forts after the flight campaign", () => {
  assert.equal(towers.length, 32);
  assert.deepEqual(towers.map((level) => level.number), Array.from({ length: 32 }, (_, i) => 89 + i));
  assert.ok(LEVELS.filter((level) => level.number <= 88).every((level) => !level.towers), "a flight mission grew a tower");
  for (const level of towers) {
    const clocks = level.towers.filter((block) => block.target);
    // Chapter 12 teaches the materials on one clock; the fort chapters add more.
    if (level.number <= 96) assert.equal(clocks.length, 1, `mission ${level.number} needs exactly one target`);
    else assert.ok(clocks.length >= 1 && clocks.length <= 4, `mission ${level.number} has ${clocks.length} clocks`);
    assert.equal(new Set(level.towers.map((block) => block.id)).size, level.towers.length, `mission ${level.number} repeats a block id`);
    assert.ok(new Set(level.towers.map((block) => block.material)).size >= 2, `mission ${level.number} is one material`);
  }
});

test("no block of any fort starts inside another", () => {
  for (const level of towers) {
    const t = level.towers;
    for (let i = 0; i < t.length; i += 1) for (let j = i + 1; j < t.length; j += 1) {
      const a = t[i], b = t[j];
      const ox = Math.min(a.x + a.width / 2, b.x + b.width / 2) - Math.max(a.x - a.width / 2, b.x - b.width / 2);
      const oy = Math.min(a.y + a.height / 2, b.y + b.height / 2) - Math.max(a.y - a.height / 2, b.y - b.height / 2);
      assert.ok(!(ox > 0.5 && oy > 0.5), `mission ${level.number}: ${a.id} overlaps ${b.id}`);
    }
    // A clock on the floor would already count as knocked down.
    for (const clock of t.filter((block) => block.target)) assert.ok(clock.y + clock.height / 2 < level.groundY - 2, `mission ${level.number}: ${clock.id} starts down`);
  }
});

test("every fort stands on its own, untouched, for ten seconds", () => {
  for (const level of towers) {
    const world = createWorld(level.towers, level.groundY);
    for (const body of world.bodies) body.asleep = false; // wake it: it must still stand
    const start = world.bodies.map((body) => [body.x, body.y, body.angle]);
    for (let step = 0; step < 1200; step += 1) stepWorld(world, 1 / 120, 620);
    world.bodies.forEach((body, i) => {
      assert.ok(Math.hypot(body.x - start[i][0], body.y - start[i][1]) < 1, `mission ${level.number}: ${body.id} slid`);
      assert.ok(Math.abs(body.angle - start[i][2]) < 0.01, `mission ${level.number}: ${body.id} tilted`);
      assert.equal(body.broken, false, `mission ${level.number}: ${body.id} broke by itself`);
      assert.equal(body.health, body.strength, `mission ${level.number}: ${body.id} wore down under its own weight`);
    });
    assert.ok(worldAsleep(world), `mission ${level.number} never settled`);
    assert.equal(towerFallen({ world }), false, `mission ${level.number} starts already won`);
  }
});

test("a tall stack of stone carries its own weight without wearing out", () => {
  const specs = Array.from({ length: 7 }, (_, i) => ({ id: `s${i}`, material: "stone", x: 600, y: 586 - 30 - i * 60, width: 60, height: 60 }));
  const world = createWorld(specs, 586);
  for (const body of world.bodies) body.asleep = false;
  for (let step = 0; step < 1200; step += 1) stepWorld(world, 1 / 120, 620);
  assert.ok(world.bodies.every((body) => body.health === body.strength), "weight was counted as a blow");
});

test("every fort comes down to its stored plan within its shots", () => {
  for (const level of towers) {
    assert.ok(level.plan.length >= 1 && level.plan.length <= level.shots, `mission ${level.number}: a plan of ${level.plan.length} for ${level.shots} shots`);
    assert.deepEqual(level.plan[0], level.assistPull, `mission ${level.number}: the hint is not the plan's first shot`);
    const model = playPlan(level, level.plan);
    assert.equal(model.phase, GamePhase.SUCCEEDED, `mission ${level.number}: the stored plan left a clock standing`);
    assert.ok(towerFallen(model), `mission ${level.number} was won without every clock coming down`);
    assert.ok(Array.isArray(level.scoreStars) && level.scoreStars[0] < level.scoreStars[1], `mission ${level.number} has no star thresholds`);
  }
});

test("the same shot brings the same tower down the same way", () => {
  for (const level of [towers[0], towers[7]]) {
    const a = fly(level, level.assistPull), b = fly(level, level.assistPull);
    assert.deepEqual(a.world.bodies.map((body) => [body.x, body.y, body.angle, body.broken]), b.world.bodies.map((body) => [body.x, body.y, body.angle, body.broken]));
  }
});

test("a target is not won by touching it gently, only by bringing it down", () => {
  // A soft lob that never reaches the fort must not count.
  const model = fly(towers[0], { x: 150, y: 470 });
  assert.notEqual(model.phase, GamePhase.SUCCEEDED);
  assert.equal(towerFallen(model), false);
});

test("glass breaks from a blow that wood shrugs off", () => {
  const hit = (material) => {
    const world = createWorld([{ id: "b", material, x: 700, y: 586 - 50, width: 22, height: 100 }], 586);
    const hero = { x: 600, y: 530, vx: 520, vy: 0, radius: 35 };
    for (let step = 0; step < 60; step += 1) {
      hero.x += hero.vx / 120;
      const r = stepWorld(world, 1 / 120, 620, hero);
      if (r) Object.assign(hero, { x: r.x, y: r.y, vx: r.vx, vy: r.vy });
    }
    return world.bodies[0];
  };
  assert.equal(hit("glass").broken, true, "glass survived a 520 px/s hit");
  assert.equal(hit("wood").broken, false, "wood broke as easily as glass");
  assert.ok(MATERIALS.stone.density > MATERIALS.wood.density && MATERIALS.wood.density > MATERIALS.glass.density);
});

test("the hero hands its momentum to what it hits", () => {
  const world = createWorld([{ id: "b", material: "wood", x: 700, y: 586 - 30, width: 60, height: 60 }], 586);
  const hero = { x: 600, y: 556, vx: 600, vy: 0, radius: 35 };
  let touched = false;
  for (let step = 0; step < 40; step += 1) {
    hero.x += hero.vx / 120;
    const r = stepWorld(world, 1 / 120, 620, hero);
    if (r) { touched ||= r.touched; Object.assign(hero, { x: r.x, y: r.y, vx: r.vx, vy: r.vy }); }
  }
  assert.ok(touched, "the hero never met the block");
  assert.ok(hero.vx < 600, "the hero kept all its speed");
  assert.ok(world.bodies[0].x > 705, "the block did not move");
  assert.ok(hero.x < world.bodies[0].x, "the hero passed through the block");
});

test("every collapse comes to rest", () => {
  // Two settling neighbours once woke each other in turn forever.
  for (const level of towers) {
    const model = fly(level, level.assistPull);
    for (let frame = 0; frame < 900; frame += 1) model.update(1 / 60);
    assert.ok(worldAsleep(model.world), `mission ${level.number}: the fallen tower never came to rest`);
  }
});

test("a nudge that leaves the target standing is not a win", () => {
  const world = createWorld([
    { id: "post", material: "stone", x: 700, y: 586 - 60, width: 100, height: 120 },
    { id: "target", material: "target", target: true, x: 700, y: 586 - 120 - 29, width: 58, height: 58 },
  ], 586);
  const hero = { x: 620, y: 586 - 150, vx: 100, vy: 0, radius: 35 };
  let everDown = false, woke = false;
  for (let step = 0; step < 240; step += 1) {
    hero.x += hero.vx / 120;
    const r = stepWorld(world, 1 / 120, 620, step < 30 ? hero : null);
    if (r) Object.assign(hero, { x: r.x, y: r.y, vx: r.vx, vy: r.vy });
    woke ||= !world.bodies[1].asleep;
    // Checked on every step, as the solver does: a win is decided mid-flight.
    everDown ||= towerFallen({ world });
  }
  assert.ok(woke, "the nudge never reached the target");
  assert.equal(world.bodies[1].broken, false);
  assert.equal(everDown, false, "a gentle touch counted as bringing the target down");
});

test("the collapse finishes after the shot is decided", () => {
  const model = fly(towers[0], towers[0].assistPull);
  assert.equal(model.phase, GamePhase.SUCCEEDED);
  const before = JSON.stringify(model.world.bodies.map((body) => [body.x, body.y]));
  for (let frame = 0; frame < 600; frame += 1) model.update(1 / 60);
  assert.ok(worldAsleep(model.world), "the tower never came to rest");
  assert.notEqual(JSON.stringify(model.world.bodies.map((body) => [body.x, body.y])), before, "the tower froze the moment the target fell");
});
