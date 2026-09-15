import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { DEFAULT_LEVEL, FLIGHT_STYLES, GameModel, GameMode, GamePhase, LEVELS, Modifier, Personality } from "../src/game.js";
import { FIXED_STEP, describeMiss, magnitude, movedBody, rectContact, resolveContact, stepPhysics } from "../src/physics.js";

// The authoring tool measures how far each hint route may be nudged and still
// win. Guarding the shipped number keeps a layout edit from silently widening
// or breaking the difficulty curve.
const MEASURED_MARGINS = new Map(
  JSON.parse(readFileSync(new URL("../docs/campaign-balance.json", import.meta.url), "utf8"))
    .map((entry) => [entry.number, entry.margin]),
);
const routeMargin = (level) => MEASURED_MARGINS.get(level.number) ?? 8;

function launch(model, pull = model.level.assistPull) {
  assert.equal(model.beginSling(model.avatarPosition), true);
  model.dragSling(pull);
  assert.equal(model.releaseSling(), true);
}
function finish(model, hz = 60) {
  for (let frame = 0; frame < hz * 8 && model.phase === GamePhase.FLYING; frame++) model.update(1 / hz);
  assert.notEqual(model.phase, GamePhase.FLYING);
}
const originalStarShots = [{ x: 120, y: 550 }, { x: 65, y: 525 }, { x: 105, y: 510 }, { x: 135, y: 565 }, { x: 130, y: 530 }, { x: 55, y: 550 }, { x: 65, y: 550 }, { x: 110, y: 520 }];

test("80 authored missions, stable progress IDs and immutable level data", () => {
  assert.equal(LEVELS.length, 80);
  assert.equal(new Set(LEVELS.map((l) => l.id)).size, 80);
  assert.equal(new Set(LEVELS.slice(0, 8).map((l) => l.mechanic)).size, 8);
  assert.equal(new Set(LEVELS.map((l) => l.chapterId)).size, 10);
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
    const margin = routeMargin(level);
    assert.ok(margin >= 5, `mission ${level.number} hint route is too tight to aim at`);
    for (const dx of [-margin, 0, margin]) for (const dy of [-margin, 0, margin]) {
      assert.equal(model.simulate({ x: level.assistPull.x + dx, y: level.assistPull.y + dy }).reachesGoal, true, `hint tolerance ${dx},${dy}`);
    }
  });
  test(`mission ${level.number}: optional star can be collected in a successful shot`, () => {
    const model = new GameModel(() => {}, level);
    launch(model, originalStarShots[level.number - 1] ?? level.starPull); finish(model);
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

test("FIK spends a charge, is absent from early lessons and replays at its recorded time", () => {
  const early = new GameModel(); launch(early);
  assert.equal(early.useAirMove(), false, "the first missions teach the sling alone");
  const model = new GameModel(() => {}, LEVELS[5]);
  const style = model.flightStyle;
  launch(model, { x: 150, y: 465 });
  model.update(.1);
  const velocity = { ...model.avatarVelocity };
  assert.equal(model.useAirMove(), true);
  assert.equal(model.avatarVelocity.x, velocity.x + style.push);
  assert.equal(model.avatarVelocity.y, velocity.y - style.lift);
  assert.equal(model.useAirMove(), false, "one charge for this character");
  const saved = structuredClone(model.previousShot);
  assert.equal(saved.moves.length, 1);
  finish(model); assert.equal(model.phase, GamePhase.FAILED);
  assert.equal(model.replayWith(Modifier.LOW_GRAVITY), true);
  const control = new GameModel(() => {}, model.level);
  control.startFlight(saved.launchVelocity, false, saved.launchPosition);
  control.modifier = Modifier.LOW_GRAVITY;
  for (let i = 0; i < 200 && control.phase === GamePhase.FLYING; i++) {
    if (control.flightTime + 1e-8 >= saved.moves[0].at) control.useAirMove();
    control.update(FIXED_STEP); model.update(FIXED_STEP);
    assert.deepEqual(model.avatarPosition, control.avatarPosition);
  }
  assert.deepEqual(model.previousShot, saved);
  model.resetLevel(false); assert.equal(model.airMoveUsed, false);
});

test("KAMIEŃ is the opposite correction to FIK and arrives only once it is taught", () => {
  const beforeReef = new GameModel(() => {}, LEVELS[5]);
  launch(beforeReef);
  assert.equal(beforeReef.useDiveMove(), false, "mission 6 has not met the drop yet");

  const model = new GameModel(() => {}, LEVELS[16]);
  assert.equal(model.level.diveMove, true);
  const style = model.flightStyle;
  launch(model);
  model.update(.1);
  const velocity = { ...model.avatarVelocity };
  assert.equal(model.useDiveMove(), true);
  assert.equal(model.avatarVelocity.x, velocity.x * style.brake);
  assert.equal(model.avatarVelocity.y, velocity.y + style.drop);
  assert.ok(style.brake < 1 && style.drop > 0, "the drop brakes forward pace and adds fall");
  assert.equal(model.useDiveMove(), false);
  assert.equal(model.diveMoveUsed, true);
  assert.equal(model.airMoveUsed, false, "the two moves are counted apart");
});

test("character changes the in-flight toolkit and nothing about the free flight", () => {
  const kits = Object.values(Personality).map((personality) => {
    const model = new GameModel(() => {}, LEVELS[16]);
    model.setPersonality(personality);
    launch(model);
    for (let i = 0; i < 30; i++) model.update(FIXED_STEP);
    return { personality, position: { ...model.avatarPosition }, style: model.flightStyle, charges: model.airMovesLeft };
  });
  for (const kit of kits.slice(1)) {
    assert.deepEqual(kit.position, kits[0].position, `${kit.personality} must not bend the free flight`);
  }
  const lifts = kits.map((kit) => kit.style.lift);
  assert.equal(new Set(lifts).size, lifts.length, "every character lifts differently");
  assert.equal(kits.find((kit) => kit.personality === Personality.PANIC).charges, 2, "Panic trades power for a second correction");
  assert.equal(kits.find((kit) => kit.personality === Personality.TOUGH_GUY).charges, 1);
  const tough = FLIGHT_STYLES[Personality.TOUGH_GUY], drama = FLIGHT_STYLES[Personality.DRAMA_QUEEN];
  assert.ok(drama.lift > tough.lift && tough.push > drama.push, "Drama Queen goes up, Tough Guy goes forward");
  assert.ok(FLIGHT_STYLES[Personality.ZEN].brake < tough.brake, "Zen kills the most forward pace");
});

test("What If replays both moves in order and restores the character that made the shot", () => {
  const model = new GameModel(() => {}, LEVELS[16]);
  model.setPersonality(Personality.PANIC);
  // A pull that loses even after all three corrections, so What If has a real
  // failure to replay. Re-chosen when the campaign's shot shapes moved the
  // goals: the old pull started winning, which quietly hollowed the test out.
  launch(model, { x: 35, y: 440 });
  model.update(.08); assert.equal(model.useAirMove(), true);
  model.update(.08); assert.equal(model.useDiveMove(), true);
  model.update(.08); assert.equal(model.useAirMove(), true, "Panic has a second charge");
  const saved = structuredClone(model.previousShot);
  assert.deepEqual(saved.moves.map((move) => move.kind), ["air", "dive", "air"]);
  finish(model);
  assert.equal(model.phase, GamePhase.FAILED);

  model.setPersonality(Personality.ZEN);
  assert.equal(model.replayWith(Modifier.GIANT_HEAD), true);
  assert.equal(model.personality, Personality.PANIC, "the replay restores the recorded toolkit");
  const control = new GameModel(() => {}, model.level);
  control.setPersonality(Personality.PANIC);
  control.startFlight(saved.launchVelocity, false, saved.launchPosition);
  control.modifier = Modifier.GIANT_HEAD;
  let cursor = 0;
  for (let i = 0; i < 400 && control.phase === GamePhase.FLYING; i++) {
    while (cursor < saved.moves.length && control.flightTime + 1e-8 >= saved.moves[cursor].at) {
      const move = saved.moves[cursor++];
      if (move.kind === "dive") control.useDiveMove(); else control.useAirMove();
    }
    control.update(FIXED_STEP); model.update(FIXED_STEP);
    assert.deepEqual(model.avatarPosition, control.avatarPosition);
  }
  assert.deepEqual(model.previousShot, saved, "a replay never rewrites the recipe");
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

test("underwater lift, directional current and gravity well alter real trajectories", () => {
  const bubbleLevel = LEVELS[16], bubble = bubbleLevel.interactions.find((item) => item.type === "bubble");
  const lifted = new GameModel(() => {}, bubbleLevel);
  lifted.startFlight({ x: 0, y: 0 }, false, { x: bubble.x, y: bubble.y }); stepPhysics(lifted);
  assert.ok(lifted.avatarVelocity.y < 0);
  assert.ok(lifted.visited.has(bubble.id));

  const currentLevel = LEVELS[17], current = currentLevel.interactions.find((item) => item.type === "current");
  const carried = new GameModel(() => {}, currentLevel);
  carried.startFlight({ x: 0, y: 0 }, false, { x: current.x + 30, y: current.y + 30 }); stepPhysics(carried);
  assert.ok(carried.avatarVelocity.x > 0);
  assert.ok(carried.visited.has(current.id));

  const gravityLevel = LEVELS[57], gravity = gravityLevel.interactions.find((item) => item.type === "gravity");
  const attracted = new GameModel(() => {}, gravityLevel);
  attracted.startFlight({ x: 0, y: 0 }, false, { x: gravity.x + 100, y: gravity.y }); stepPhysics(attracted);
  assert.ok(attracted.avatarVelocity.x < 0);
  assert.ok(attracted.visited.has(gravity.id));
});

test("a gate linked to two switches remains solid until both are active", () => {
  const level = LEVELS[25], door = level.interactions.find((item) => item.switchIds);
  const hit = (active = []) => {
    const model = new GameModel(() => {}, level);
    model.startFlight({ x: 700, y: 0 }, false, { x: door.x - 34, y: 340 });
    for (const id of active) model.objectState[id] = true;
    stepPhysics(model); return model.avatarVelocity.x;
  };
  assert.ok(hit() < 0);
  assert.ok(hit([door.switchIds[0]]) < 0);
  assert.ok(hit(door.switchIds) > 0);
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

test("a moving obstacle rests at its drawn position and then sweeps its marked line", () => {
  const still = { id: "a", type: "solid", x: 600, y: 300, width: 80, height: 120 };
  const mover = { ...still, motion: { axis: "y", amplitude: 80, speed: 0.9 } };
  assert.strictEqual(movedBody(still, 1.4), still, "a still obstacle allocates nothing");
  assert.equal(movedBody(mover, 0).y, 300, "the shot starts against the obstacle the player was shown");
  const swept = movedBody(mover, Math.PI / 2 / 0.9).y;
  assert.equal(Math.round(swept), 380);
  assert.equal(movedBody({ ...mover, motion: { axis: "x", amplitude: 60, speed: 0.9 } }, 0).x, 600);
});

test("a hazard ends the flight on touch and never becomes a required objective", () => {
  const hazards = LEVELS.filter((level) => level.interactions.some((item) => item.type === "hazard"));
  assert.ok(hazards.length >= 5, "the danger rule is used across the late campaign");
  for (const level of hazards) {
    const zone = level.interactions.find((item) => item.type === "hazard");
    assert.ok(!level.required.includes(zone.id));
    assert.ok(zone.label && zone.failure, "danger has to explain itself in words the player reads");

    const model = new GameModel(() => {}, level);
    model.startFlight({ x: 0, y: 0 }, true, { x: zone.x + zone.width / 2, y: zone.y + zone.height / 2 });
    model.update(FIXED_STEP);
    assert.equal(model.phase, GamePhase.FAILED, `mission ${level.number} hazard should end the flight`);
    assert.equal(model.failureReason, zone.failure);
  }
});

test("the goal collider matches the drawn object instead of an invisible buffer", () => {
  const late = LEVELS.filter((level) => level.number >= 49);
  assert.ok(late.every((level) => level.goal.radius <= 72), "late goals stay near the honest contact edge");
  assert.ok(late.every((level) => level.goal.radius >= 54), "no goal shrinks below what the art shows");
  const openers = LEVELS.filter((level) => level.number > 8 && (level.number - 1) % 8 === 0);
  assert.ok(openers.every((level) => level.goal.radius > 60), "a new rule is never taught on a pinpoint target");
});

test("KAMIEŃ is a commitment during the climb, not a rescue on the way down", () => {
  const model = new GameModel(() => {}, LEVELS[16]);
  launch(model);
  assert.ok(model.avatarVelocity.y < 0, "the shot starts by rising");
  assert.equal(model.canDive, true);

  for (let step = 0; step < 900 && model.avatarVelocity.y < 0; step += 1) model.update(FIXED_STEP);
  assert.ok(model.avatarVelocity.y >= 0, "the hero is now falling");
  assert.equal(model.canDive, false, "the window closes at the top of the arc");
  assert.equal(model.useDiveMove(), false);
  assert.equal(model.diveMoveUsed, false, "a refused move never spends a charge");
  assert.ok(model.airMovesLeft > 0, "FIK stays available for the fall");
});

test("a miss names the direction to correct instead of shrugging", () => {
  const model = new GameModel(() => {}, LEVELS[9]);
  const goal = model.goalCentre;
  const advice = (point, gap) => {
    model.closestGoalPoint = point;
    model.closestGoal = gap;
    return describeMiss(model);
  };

  assert.match(advice({ x: goal.x - 300, y: goal.y }, 260), /Za krótko/);
  assert.match(advice({ x: goal.x + 300, y: goal.y }, 260), /Za daleko/);
  assert.match(advice({ x: goal.x, y: goal.y - 300 }, 260), /Za wysoko/);
  assert.match(advice({ x: goal.x, y: goal.y + 300 }, 260), /Za nisko/);
  // A near miss asks for a nudge, not a rethink.
  assert.match(advice({ x: goal.x - 40, y: goal.y }, 30), /odrobinę/);
  assert.match(advice({ x: goal.x + 40, y: goal.y }, 30), /odrobinę/);

  model.closestGoalPoint = null;
  assert.match(describeMiss(model), /daleko od celu/);
});

test("an unmet objective still outranks any aiming advice", () => {
  const model = new GameModel(() => {}, LEVELS[9]);
  model.closestGoalPoint = { x: model.goalCentre.x - 400, y: model.goalCentre.y };
  model.closestGoal = 20;
  assert.equal(model.objectiveMet, false);
  assert.equal(describeMiss(model), model.level.requirement);
});

test("the closest approach is recorded where the shot actually came nearest", () => {
  const model = new GameModel(() => {}, LEVELS[9]);
  launch(model, { x: 120, y: 500 });
  finish(model);
  assert.equal(model.phase, GamePhase.FAILED);
  assert.ok(model.closestGoalPoint, "a finished flight always has a nearest point");
  assert.ok(model.closestGoal < Infinity);
  assert.match(model.failureReason, /Za krótko|Za daleko|Za wysoko|Za nisko|odrobinę|Najpierw/);
  model.resetLevel(false);
  assert.equal(model.closestGoalPoint, null, "a retry starts measuring again");
});

test("the hero reacts to what is happening, and no character is left emotionally dead", () => {
  // Personality used to short-circuit the expression getter, so Zen and Tough
  // Guy showed two faces across a whole shot while the other two showed four.
  // Since stars now buy those characters, the reward made the hero less alive.
  const variety = (personality) => {
    const seen = new Set();
    for (const level of LEVELS) {
      const model = new GameModel(() => {}, level);
      model.setPersonality(personality);
      model.beginSling({ x: 173, y: 455 });
      model.dragSling(level.assistPull);
      seen.add(model.expression);
      model.releaseSling();
      for (let step = 0; step < 500 && model.phase === GamePhase.FLYING; step += 1) {
        model.update(1 / 60);
        seen.add(model.expression);
      }
      seen.add(model.expression);
    }
    return seen;
  };
  for (const personality of ["dramaQueen", "toughGuy", "panic", "zen"]) {
    const seen = variety(personality);
    assert.ok(seen.size >= 5, `${personality} only ever shows ${seen.size} expressions: ${[...seen].join(", ")}`);
    // Reacting to the world is not optional for any character.
    for (const reaction of ["bracing", "hopeful", "impact"]) {
      assert.ok(seen.has(reaction), `${personality} never shows "${reaction}"`);
    }
  }
});

test("danger outranks hope, and both outrank idle flight flavour", () => {
  const level = LEVELS.find((entry) => (entry.interactions ?? []).some((item) => item.type === "hazard"));
  const model = new GameModel(() => {}, level);
  model.beginSling({ x: 173, y: 455 });
  model.dragSling(level.assistPull);
  model.releaseSling();
  model.flightTime = 2; // Old code would call this "panic" regardless of the world.
  model.hazardGap = 10;
  model.goalGap = 10;
  assert.equal(model.expression, "bracing", "a hazard at arm's length is the story, not the goal");
  model.hazardGap = Infinity;
  assert.equal(model.expression, "hopeful");
  model.goalGap = Infinity;
  assert.equal(model.expression, "panic", "with nothing near, flight flavour returns");
  model.impactFlash = 0.1;
  assert.equal(model.expression, "impact", "a hit that just landed always wins");
});

test("the campaign asks for many different shots, not one shot eighty times", () => {
  // The shipped campaign put every goal at x 890..1100 with a median of 1070,
  // and 77% of missions flew 850-950 px. Eighty missions, one shot repeated.
  const distances = LEVELS.map((level) => level.goal.x - level.anchor.x);
  const heights = LEVELS.map((level) => level.goal.y);
  const spread = Math.max(...distances) - Math.min(...distances);
  assert.ok(spread >= 450, `flight length only spans ${spread} px; the campaign is one shot again`);
  assert.ok(Math.max(...heights) - Math.min(...heights) >= 250, "every goal sits at the same height");

  // No band of 150 px may hold more than half the campaign.
  const bands = new Map();
  for (const d of distances) {
    const key = Math.floor(d / 150);
    bands.set(key, (bands.get(key) ?? 0) + 1);
  }
  const biggest = Math.max(...bands.values());
  assert.ok(biggest <= LEVELS.length / 2, `${biggest} of ${LEVELS.length} missions share one 150 px band`);
  assert.ok(bands.size >= 4, `flight lengths only fall into ${bands.size} bands`);

  // Seven shapes across eighty missions would read as seven target spots.
  const spots = new Set(LEVELS.map((level) => `${level.goal.x},${level.goal.y}`));
  assert.equal(spots.size, LEVELS.length, "two missions share the exact same target position");
});

test("no goal is placed where the sling cannot reach it", () => {
  // Measured mid-air interception windows on a flat level: at x=1130 the
  // trajectory family spans roughly y 303..529, and past 1250 it is a line. A
  // goal outside that envelope would need the level's furniture to be solvable
  // at all, which is how the campaign ended up pinned just past free flight.
  for (const level of LEVELS) {
    const reach = level.goal.x - level.anchor.x;
    assert.ok(reach <= 1060, `mission ${level.number} sits ${reach} px out, past the reachable envelope`);
    if (level.goal.x > 1050) {
      assert.ok(level.goal.y >= 280, `mission ${level.number} is long AND high, which no trajectory reaches`);
    }
  }
});
