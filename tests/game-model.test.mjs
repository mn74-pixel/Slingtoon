import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_LEVEL, GameModel, GameMode, GamePhase, LEVELS, Modifier, Personality } from "../src/game.js";
import { FIXED_STEP, magnitude, rectContact, resolveContact, stepPhysics } from "../src/physics.js";

function launch(model, pull = model.level.assistPull) {
  assert.equal(model.beginSling(model.avatarPosition), true);
  model.dragSling(pull);
  assert.equal(model.releaseSling(), true);
}
function finish(model, hz = 60) {
  for (let frame = 0; frame < hz * 8 && model.phase === GamePhase.FLYING; frame++) model.update(1 / hz);
  assert.notEqual(model.phase, GamePhase.FLYING);
}
const starShots = [{ x: 120, y: 550 }, { x: 65, y: 525 }, { x: 105, y: 510 }, { x: 135, y: 565 }, { x: 130, y: 530 }, { x: 55, y: 550 }, { x: 65, y: 550 }, { x: 110, y: 520 }];

test("eight distinct mechanics, stable progress IDs and immutable level data", () => {
  assert.equal(LEVELS.length, 8);
  assert.equal(new Set(LEVELS.map((l) => l.id)).size, 8);
  assert.equal(new Set(LEVELS.map((l) => l.mechanic)).size, 8);
  assert.ok(LEVELS.every((l) => Object.isFrozen(l.interactions)));
  assert.ok(LEVELS.every((l) => !l.interactions.some((i) => i.type === "trampoline")));
  assert.equal(DEFAULT_LEVEL.interactions.length, 0);
  assert.equal(DEFAULT_LEVEL.airMove, false);
});

for (const level of LEVELS) {
  test(`mission ${level.number}: verified unmodified route, required interactions and forgiving hint`, () => {
    const model = new GameModel(() => {}, level);
    model.revealHint(3);
    model.beginSling(model.anchor);
    model.dragSling(level.assistPull);
    const preview = model.predictShot();
    assert.equal(preview.reachesGoal, true);
    assert.strictEqual(model.predictShot(), preview, "unchanged preview should hit the cache");
    const ghost = model.trajectoryForPull(level.assistPull);
    assert.strictEqual(model.trajectoryForPull(level.assistPull), ghost);
    model.releaseSling(); finish(model);
    assert.deepEqual(ghost.at(-1), model.avatarPosition, "full ghost reaches the actual end of the flight");
    assert.equal(model.phase, GamePhase.SUCCEEDED);
    assert.equal(model.objectiveMet, true);
    assert.equal(model.airMoveUsed, false);
    for (const dx of [-8, 0, 8]) for (const dy of [-8, 0, 8]) {
      assert.equal(model.simulate({ x: level.assistPull.x + dx, y: level.assistPull.y + dy }).reachesGoal, true, `hint tolerance ${dx},${dy}`);
    }
  });
  test(`mission ${level.number}: optional star can be collected in a successful shot`, () => {
    const model = new GameModel(() => {}, level);
    launch(model, starShots[level.number - 1]); finish(model);
    assert.equal(model.phase, GamePhase.SUCCEEDED);
    assert.equal(model.collectedStar, true);
  });
  test(`mission ${level.number}: 30/60/120 Hz produce identical physics`, () => {
    const results = [30, 60, 120].map((hz) => {
      const model = new GameModel(() => {}, level);
      launch(model); finish(model, hz);
      return { phase: model.phase, position: model.avatarPosition, time: model.flightTime, star: model.collectedStar, visited: [...model.visited] };
    });
    assert.deepEqual(results[0], results[1]);
    assert.deepEqual(results[1], results[2]);
  });
}

test("first mission accepts a broad range instead of a single precise shot", () => {
  const model = new GameModel(); let wins = 0, total = 0;
  for (let x = 35; x <= 150; x += 5) for (let y = 445; y <= 580; y += 5) {
    total++;
    if (model.simulate({ x, y }, 1).reachesGoal) wins++;
  }
  assert.ok(wins / total > .45);
});

test("large touch target has no off-centre grab jump, and cancelled tap never launches", () => {
  const model = new GameModel();
  assert.ok(model.avatarGrabRadius > model.avatarRadius * 2.5);
  const grip = { x: model.anchor.x + 80, y: model.anchor.y - 20 };
  assert.equal(model.beginSling(grip), true);
  assert.deepEqual(model.avatarPosition, model.anchor);
  model.dragSling(grip);
  assert.deepEqual(model.avatarPosition, model.anchor);
  assert.equal(model.releaseSling(), false);
  assert.equal(model.attempts, 0);
});

test("maximum pull, invalid input and non-finite time remain safe", () => {
  const model = new GameModel();
  model.beginSling(model.anchor);
  model.dragSling({ x: -1e5, y: 1e5 });
  assert.ok(Math.hypot(model.avatarPosition.x - model.anchor.x, model.avatarPosition.y - model.anchor.y) <= 132.00001);
  const before = { ...model.avatarPosition };
  model.dragSling({ x: NaN, y: Infinity });
  assert.deepEqual(model.avatarPosition, before);
  model.releaseSling();
  model.update(NaN); model.update(Infinity); model.update(-1);
  assert.equal(model.flightTime, 0);
  model.update(300);
  assert.ok(model.flightTime <= .10001);
});

test("a brief pointer drag stores an exact replay recipe", () => {
  const model = new GameModel(); launch(model);
  assert.notDeepEqual(model.previousShot.launchPosition, model.anchor);
  assert.deepEqual(model.previousShot.launchPosition, model.avatarPosition);
  assert.deepEqual(model.previousShot.launchVelocity, model.avatarVelocity);
  assert.equal(model.previousShot.levelId, model.level.id);
});

test("later aim shows only a neutral opening arc until full hint is requested", () => {
  const model = new GameModel(() => {}, LEVELS[2]);
  model.beginSling(model.anchor); model.dragSling(model.level.assistPull);
  assert.equal(model.predictShot().reachesGoal, false);
  assert.ok(model.predictShot().points.length <= 9);
  model.revealHint(2);
  assert.equal(model.activeHint.pull, undefined, "direction hint must not leak the exact coordinates");
  assert.equal(model.predictShot().reachesGoal, false);
  model.revealHint(3);
  assert.equal(model.predictShot().reachesGoal, true);
});

test("ONE MOVE exists only for a real editable object and a tap/cancel does not consume it", () => {
  const model = new GameModel();
  assert.equal(model.setMode(GameMode.ONE_MOVE), false);
  model.setLevel(LEVELS[3]); model.setMode(GameMode.ONE_MOVE);
  assert.equal(model.canAim(), false);
  const grip = { x: 480, y: 460 };
  assert.equal(model.beginObjectMove(grip), true);
  assert.equal(model.endObjectMove(), false);
  model.beginObjectMove(grip); model.dragObject({ x: 500, y: 460 });
  assert.equal(model.endObjectMove(true), false);
  assert.equal(model.layoutOffset, 0);
  model.beginObjectMove(grip); model.dragObject({ x: 500, y: 460 });
  assert.equal(model.endObjectMove(), true);
  assert.equal(model.layoutOffset, 20);
  assert.equal(model.canAim(), true);
  assert.equal(model.beginObjectMove(grip), false);
  launch(model, { x: 125, y: 535 }); finish(model);
  assert.equal(model.phase, GamePhase.SUCCEEDED);
});

test("full hint in ONE MOVE explicitly restores the reference layout", () => {
  const model = new GameModel(() => {}, LEVELS[3]);
  model.setMode(GameMode.ONE_MOVE); model.layoutOffset = -75;
  model.revealHint(3);
  assert.equal(model.layoutOffset, 0);
  assert.equal(model.moveUsed, true);
  launch(model); finish(model);
  assert.equal(model.phase, GamePhase.SUCCEEDED);
});

test("FIK is once per shot, absent from early lessons and reproducible with replay timing", () => {
  const early = new GameModel(); launch(early);
  assert.equal(early.useAirMove(), false);
  const model = new GameModel(() => {}, LEVELS[5]);
  launch(model, { x: 150, y: 465 });
  model.update(.1);
  const velocity = { ...model.avatarVelocity };
  assert.equal(model.useAirMove(), true);
  assert.equal(model.avatarVelocity.x, velocity.x + 65);
  assert.equal(model.avatarVelocity.y, velocity.y - 260);
  assert.equal(model.useAirMove(), false);
  const saved = structuredClone(model.previousShot);
  finish(model); assert.equal(model.phase, GamePhase.FAILED);
  assert.equal(model.replayWith(Modifier.LOW_GRAVITY), true);
  const control = new GameModel(() => {}, model.level);
  control.startFlight(saved.launchVelocity, false, saved.launchPosition);
  control.modifier = Modifier.LOW_GRAVITY;
  for (let i = 0; i < 200 && control.phase === GamePhase.FLYING; i++) {
    if (control.flightTime + 1e-8 >= saved.airMoveAt) control.useAirMove();
    control.update(FIXED_STEP); model.update(FIXED_STEP);
    assert.deepEqual(model.avatarPosition, control.avatarPosition);
  }
  assert.deepEqual(model.previousShot, saved);
  model.resetLevel(false); assert.equal(model.airMoveUsed, false);
});

test("rect collision pushes an interior centre fully out and does not energize separating motion", () => {
  const p = { x: 110, y: 120 }, v = { x: 80, y: 0 }, r = { x: 100, y: 100, width: 100, height: 100 };
  const speed = resolveContact(p, v, rectContact(p, 35, r), .5);
  assert.equal(speed, 80);
  assert.ok(p.x < 65);
  assert.equal(v.x, -40);
  assert.equal(rectContact(p, 35, r), null);
  const p2 = { x: 75, y: 120 }, v2 = { x: -90, y: 0 };
  assert.equal(resolveContact(p2, v2, rectContact(p2, 35, r), .8), 0);
  assert.deepEqual(v2, { x: -90, y: 0 });
});

test("cardboard breaks once, slows the shot, and reset restores it", () => {
  const events = [], model = new GameModel((e) => events.push(e), LEVELS[1]);
  model.startFlight({ x: 700, y: 0 }, false, { x: 514, y: 350 });
  stepPhysics(model);
  assert.equal(model.objectState.parcel, true);
  assert.ok(model.avatarVelocity.x < 620);
  stepPhysics(model);
  assert.equal(events.filter((e) => e.kind === "break").length, 1);
  model.resetLevel(); assert.equal(model.objectState.parcel, undefined);
});

test("portal conserves velocity apart from ordinary drag/gravity, never sweeps across teleport gap", () => {
  const level = { ...LEVELS[2], goal: { ...LEVELS[2].goal, x: 650, y: 350, radius: 20 }, star: { x: 650, y: 350 } };
  const model = new GameModel(() => {}, level);
  model.startFlight({ x: 500, y: 0 }, false, { x: 400, y: 390 });
  stepPhysics(model);
  assert.equal(model.avatarPosition.x, 845);
  assert.ok(Math.abs(model.avatarVelocity.x - 500) < 1);
  assert.ok(model.portalCooldown > 0);
  assert.equal(model.phase, GamePhase.FLYING);
  assert.equal(model.collectedStar, false);
});

test("steam acts only inside the drawn bounds and gate opens only after its switch", () => {
  const model = new GameModel(() => {}, LEVELS[4]);
  model.startFlight({ x: 0, y: 0 }, false, { x: 490, y: 300 }); stepPhysics(model);
  assert.ok(model.avatarVelocity.y > 0);
  model.startFlight({ x: 0, y: 0 }, false, { x: 600, y: 300 }); stepPhysics(model);
  assert.ok(model.avatarVelocity.y < 0);
  const gate = new GameModel(() => {}, LEVELS[5]);
  gate.startFlight({ x: 700, y: 0 }, false, { x: 863, y: 340 }); stepPhysics(gate);
  assert.ok(gate.avatarVelocity.x < 0);
  gate.startFlight({ x: 700, y: 0 }, false, { x: 863, y: 340 }); gate.objectState.doorbell = true; stepPhysics(gate);
  assert.ok(gate.avatarVelocity.x > 0);
});

test("water skip loses energy, caps skips, and a steep entry fails immediately", () => {
  const model = new GameModel(() => {}, LEVELS[7]);
  model.startFlight({ x: 700, y: 250 }, false, { x: 600, y: 474 });
  const before = magnitude(model.avatarVelocity); stepPhysics(model);
  assert.equal(model.waterSkips, 1);
  assert.ok(model.avatarVelocity.y < 0);
  assert.ok(magnitude(model.avatarVelocity) < before);
  model.waterSkips = 2; model.avatarPosition = { x: 700, y: 535 }; model.avatarVelocity.y = 300;
  stepPhysics(model); assert.equal(model.phase, GamePhase.FAILED);
  const steep = new GameModel(() => {}, LEVELS[7]);
  steep.startFlight({ x: 300, y: 900 }, false, { x: 600, y: 470 });
  for (let i = 0; i < 12 && steep.phase === GamePhase.FLYING; i++) steep.update(FIXED_STEP);
  assert.equal(steep.phase, GamePhase.FAILED);
  assert.equal(steep.waterSkips, 0);
});

test("hitting a goal fast is valid, but skipping its required interaction is not", () => {
  const direct = new GameModel();
  direct.startFlight({ x: 1450, y: 0 }, false, { x: 875, y: 465 }); stepPhysics(direct);
  assert.equal(direct.phase, GamePhase.SUCCEEDED);
  const gated = new GameModel(() => {}, LEVELS[5]);
  gated.startFlight({ x: 700, y: 0 }, false, { x: 1080, y: 460 }); stepPhysics(gated);
  assert.equal(gated.phase, GamePhase.FLYING);
  assert.equal(gated.objectiveMet, false);
});

test("personalities change expression not physics, unavailable modifiers are not suggested", () => {
  const first = new GameModel(), second = new GameModel();
  second.setPersonality(Personality.ZEN);
  launch(first); launch(second); finish(first); finish(second);
  assert.deepEqual(first.avatarPosition, second.avatarPosition);
  assert.notEqual(first.suggestedModifier, Modifier.STRONGER_FAN);
  const steam = new GameModel(() => {}, LEVELS[4]);
  assert.equal(steam.suggestedModifier, Modifier.STRONGER_FAN);
});

test("ordinary retry preserves hints, clears transient objects, and cannot run forever", () => {
  const model = new GameModel(() => {}, LEVELS[5]);
  model.revealHint(2);
  launch(model, { x: 150, y: 455 }); finish(model);
  assert.equal(model.phase, GamePhase.FAILED);
  assert.ok(model.flightTime < 6.1);
  model.resetLevel(false);
  assert.equal(model.hintStage, 2);
  assert.equal(model.statusText, model.activeHint.text);
  assert.equal(model.visited.size, 0);
  assert.equal(model.collectedStar, false);
  assert.equal(model.setLevel(LEVELS[0]), true);
  assert.equal(model.hintStage, 0);
  assert.equal(model.setLevel(null), false);
});
