import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_LEVEL, GameModel, GameMode, GamePhase, LEVELS, Modifier, Personality } from "../src/game.js";

function advance(model, frames) {
  for (let frame = 0; frame < frames && model.phase === GamePhase.FLYING; frame += 1) {
    model.update(1 / 60);
  }
  return { ...model.avatarPosition };
}

function finish(model) {
  advance(model, 900);
}

function startShot(model, pullPoint) {
  assert.equal(model.beginSling(model.avatarPosition), true);
  model.dragSling(pullPoint);
  assert.equal(model.releaseSling(), true);
}

function startKnownFailure(model) {
  const candidates = [
    { x: 70, y: 530 },
    { x: 45, y: 495 },
    { x: 155, y: 455 },
    { x: 171, y: 350 },
  ];
  for (const pull of candidates) {
    model.resetLevel(true);
    startShot(model, pull);
    finish(model);
    if (model.phase === GamePhase.FAILED) return pull;
  }
  throw new Error("Test fixture did not produce a failed shot");
}

test("Quick Sling stores launch position and velocity", () => {
  const model = new GameModel();
  startShot(model, { x: 70, y: 530 });
  assert.equal(model.phase, GamePhase.FLYING);
  assert.ok(model.previousShot);
  assert.ok(Math.hypot(model.previousShot.launchVelocity.x, model.previousShot.launchVelocity.y) > 100);
  assert.notDeepEqual(model.previousShot.launchPosition, model.anchor);
  assert.equal(model.previousShot.levelId, DEFAULT_LEVEL.id);
});

test("large visual head keeps a forgiving touch target without changing collision radius", () => {
  const model = new GameModel();
  assert.ok(model.avatarGrabRadius > model.avatarRadius * 2.5);
  assert.equal(model.beginSling({ x: model.avatarPosition.x + 88, y: model.avatarPosition.y }), true);
  assert.equal(model.avatarRadius, 35);
});

test("level data drives geometry and supports future rectangular goals", () => {
  const level = {
    ...DEFAULT_LEVEL,
    id: "test-level",
    anchor: { x: 205, y: 430 },
    groundY: 580,
    trampoline: { ...DEFAULT_LEVEL.trampoline, x: 520, minX: 410, maxX: 590 },
    goal: { kind: "test", shape: "rect", x: 1010, y: 430, width: 90, height: 80 },
  };
  const model = new GameModel();
  assert.equal(model.setLevel(level), true);
  assert.deepEqual(model.avatarPosition, level.anchor);
  assert.equal(model.trampolineX, 520);
  assert.deepEqual(model.goalCentre, { x: 1055, y: 470 });

  model.avatarPosition = { x: 1020, y: 460 };
  model.avatarVelocity = { x: 10, y: 10 };
  assert.equal(model.goalReached(), true);
});

test("One Move requires one trampoline move before aiming", () => {
  const model = new GameModel();
  model.setMode(GameMode.ONE_MOVE);
  assert.equal(model.canAim(), false);
  const trampoline = model.trampolineBounds;
  assert.equal(model.beginTrampolineMove({ x: trampoline.x + 30, y: trampoline.y + 5 }), true);
  model.dragTrampoline({ x: 450, y: trampoline.y });
  assert.equal(model.endTrampolineMove(), true);
  assert.equal(model.moveUsed, true);
  assert.equal(model.canAim(), true);
});

test("Morning Mayhem has a verified winning shot in both modes", () => {
  const quick = new GameModel();
  assert.equal(quick.level.fan.enabled, false);
  assert.equal(quick.level.crate.enabled, false);
  assert.equal(quick.beginSling(quick.avatarPosition), true);
  quick.dragSling(quick.level.tutorial.pull);
  const prediction = quick.predictShot(24);
  assert.equal(prediction.reachesGoal, true);
  assert.ok(prediction.points.length > 10);
  assert.equal(quick.releaseSling(), true);
  finish(quick);
  assert.equal(quick.phase, GamePhase.SUCCEEDED);

  const oneMove = new GameModel();
  oneMove.setMode(GameMode.ONE_MOVE);
  const trampoline = oneMove.trampolineBounds;
  oneMove.beginTrampolineMove({ x: trampoline.x + 30, y: trampoline.y + 5 });
  oneMove.dragTrampoline({ x: 450, y: trampoline.y });
  oneMove.endTrampolineMove();
  startShot(oneMove, { x: 65, y: 520 });
  finish(oneMove);
  assert.equal(oneMove.phase, GamePhase.SUCCEEDED);
});

test("all eight missions have unique goals and a verified fair route", () => {
  assert.equal(LEVELS.length, 8);
  assert.equal(new Set(LEVELS.map((level) => level.id)).size, LEVELS.length);
  assert.equal(new Set(LEVELS.map((level) => level.goal.kind)).size, LEVELS.length);

  for (const level of LEVELS) {
    assert.ok(level.mission.title.length > 12);
    assert.ok(level.visual.gag.length > 8);
    assert.ok(level.speech.succeeded.dramaQueen);
    assert.ok(level.speech.failed.zen);

    for (const mode of [GameMode.QUICK, GameMode.ONE_MOVE]) {
      const model = new GameModel(() => {}, level);
      if (mode === GameMode.ONE_MOVE) {
        model.setMode(mode);
        const trampoline = model.trampolineBounds;
        const grip = { x: trampoline.x + 30, y: trampoline.y + 5 };
        assert.equal(model.beginTrampolineMove(grip), true);
        model.dragTrampoline(grip);
        assert.equal(model.endTrampolineMove(), true);
      }

      assert.equal(model.beginSling(model.avatarPosition), true);
      model.dragSling(level.assistPull);
      assert.equal(model.predictShot(24).reachesGoal, true, `${level.id} should preview a winning route`);
      assert.equal(model.releaseSling(), true);
      finish(model);
      assert.equal(model.phase, GamePhase.SUCCEEDED, `${level.id} should be beatable in ${mode}`);
    }
  }
});

test("hints reveal progressively and reset only with a fresh run", () => {
  const model = new GameModel(() => {}, LEVELS[3]);
  assert.equal(model.hintStage, 0);
  assert.equal(model.activeHint, null);
  assert.equal(model.revealHint(), true);
  assert.equal(model.hintStage, 1);
  assert.ok(model.activeHint.text.length > 12);
  model.resetLevel(false);
  assert.equal(model.hintStage, 1);
  model.resetLevel(true);
  assert.equal(model.hintStage, 0);
});

test("lake route uses the water surface as a real physics mechanic", () => {
  const lake = LEVELS.find((level) => level.scene === "lake");
  const impacts = [];
  const model = new GameModel((event) => {
    if (event.type === "impact") impacts.push(event.surface);
  }, lake);
  startShot(model, lake.assistPull);
  finish(model);
  assert.equal(model.phase, GamePhase.SUCCEEDED);
  assert.ok(impacts.includes("water"));
});

test("later missions form a deliberate difficulty curve", () => {
  const rates = LEVELS.map((level) => {
    let playable = 0;
    let wins = 0;
    for (let x = 35; x <= 165; x += 10) {
      for (let y = 350; y <= 580; y += 10) {
        const model = new GameModel(() => {}, level);
        if (!model.beginSling(model.avatarPosition)) continue;
        model.dragSling({ x, y });
        if (!model.releaseSling()) continue;
        finish(model);
        playable += 1;
        if (model.phase === GamePhase.SUCCEEDED) wins += 1;
      }
    }
    return wins / playable;
  });

  assert.ok(rates[0] > rates[1]);
  assert.ok(rates[1] > rates[2]);
  assert.ok(rates[2] > rates[3]);
  assert.ok(rates[3] > rates[4]);
  assert.ok(rates[4] >= 0.04, `final mission became unfair at ${(rates[4] * 100).toFixed(1)}%`);
  assert.ok(rates[5] > rates[4], "the outdoor chapter should open with a recovery level");
  assert.ok(rates[6] < rates[5], "the park should combine learned mechanics");
  assert.ok(rates[7] >= 0.06 && rates[7] <= 0.15, `lake finale should be fair but focused at ${(rates[7] * 100).toFixed(1)}%`);
});

test("Morning Mayhem keeps a forgiving beginner success window", () => {
  let testedShots = 0;
  let winningShots = 0;

  for (let x = 35; x <= 165; x += 10) {
    for (let y = 440; y <= 570; y += 10) {
      const model = new GameModel();
      assert.equal(model.beginSling(model.avatarPosition), true);
      model.dragSling({ x, y });
      // Points almost touching the anchor intentionally cancel instead of
      // launching, so they are not part of the playable shot sample.
      if (!model.releaseSling()) continue;
      finish(model);
      testedShots += 1;
      if (model.phase === GamePhase.SUCCEEDED) winningShots += 1;
    }
  }

  const successRate = winningShots / testedShots;
  assert.ok(successRate >= 0.34, `beginner success window regressed to ${(successRate * 100).toFixed(1)}%`);
});

test("What If repeats exactly the stored shot", () => {
  const model = new GameModel();
  startKnownFailure(model);
  const expectedVelocity = { ...model.previousShot.launchVelocity };
  const expectedPosition = { ...model.previousShot.launchPosition };
  assert.equal(model.replayWith(Modifier.LOW_GRAVITY), true);
  assert.deepEqual(model.avatarVelocity, expectedVelocity);
  assert.deepEqual(model.avatarPosition, expectedPosition);
  assert.equal(model.modifier, Modifier.LOW_GRAVITY);
});

test("What If modifiers change real physics, not only labels", () => {
  const gravity = new GameModel();
  const pull = startKnownFailure(gravity);
  gravity.resetLevel(true);
  startShot(gravity, pull);
  const normalGravity = advance(gravity, 48);
  finish(gravity);
  assert.equal(gravity.phase, GamePhase.FAILED);
  gravity.replayWith(Modifier.LOW_GRAVITY);
  const lowGravity = advance(gravity, 48);
  assert.ok(Math.abs(normalGravity.y - lowGravity.y) > 20);

  const fan = new GameModel();
  startKnownFailure(fan);
  fan.resetLevel(true);
  startShot(fan, { x: 55, y: 525 });
  const normalFan = advance(fan, 90);
  finish(fan);
  assert.equal(fan.phase, GamePhase.FAILED);
  fan.replayWith(Modifier.STRONGER_FAN);
  const strongerFan = advance(fan, 90);
  assert.ok(Math.abs(normalFan.y - strongerFan.y) > 80);

  const bounce = new GameModel();
  startKnownFailure(bounce);
  bounce.resetLevel(true);
  startShot(bounce, { x: 171, y: 350 });
  const normalBounce = advance(bounce, 42);
  finish(bounce);
  assert.equal(bounce.phase, GamePhase.FAILED);
  bounce.replayWith(Modifier.SUPER_BOUNCY);
  const superBounce = advance(bounce, 42);
  assert.ok(Math.abs(normalBounce.y - superBounce.y) > 28);

  const head = new GameModel();
  startKnownFailure(head);
  const normalRadius = head.avatarRadius;
  head.replayWith(Modifier.GIANT_HEAD);
  assert.ok(head.avatarRadius > normalRadius * 1.4);
});

test("Personalities produce different expressions and reaction copy", () => {
  const model = new GameModel();
  model.setPersonality(Personality.PANIC);
  assert.equal(model.expression, "nervous");
  startShot(model, { x: 70, y: 530 });
  assert.equal(model.expression, "panic");
  const panicCopy = model.speechText;
  model.setPersonality(Personality.ZEN);
  assert.equal(model.expression, "neutral");
  assert.notEqual(model.speechText, panicCopy);
});
