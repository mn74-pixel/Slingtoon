// Several shots a round on the tower chapter (src/game.js startFlight,
// finishAttempt, prepareNextShot). A round must keep the fort as the last shot
// left it, end in failure only once the last hero is spent, count as one
// attempt however many shots it takes, preview the next shot against the
// damaged fort, and reward the heroes it did not need.
import test from "node:test";
import assert from "node:assert/strict";
import { GameModel, GamePhase, LEVELS } from "../src/game.js";
import { rewardSuccess, SPARED_SHOT_BONUS } from "../src/progress.js";

const towers = LEVELS.filter((level) => level.towers);
const byNumber = (number) => LEVELS.find((level) => level.number === number);
const shoot = (model, pull) => {
  model.beginSling(model.anchor);
  model.dragSling(pull);
  model.releaseSling();
  for (let step = 0; step < 1300 && model.phase === GamePhase.FLYING; step += 1) model.update(1 / 120);
};
const settle = (model, frames = 400) => {
  for (let frame = 0; frame < frames && model.phase !== GamePhase.SUCCEEDED; frame += 1) model.update(1 / 60);
};
const snapshot = (world) => world.bodies.map((body) => [body.x.toFixed(3), body.y.toFixed(3), body.angle.toFixed(4), body.broken, body.health.toFixed(2)].join());
const freshProgress = () => ({ bestScores: {}, medals: {}, score: 0, hintTokens: 0 });
// A shot that knocks pieces off the fort without bringing the target down.
const DENT = { 89: { x: 110, y: 545 }, 95: { x: 40, y: 485 } };

test("towers get several shots a round, every other mission gets one", () => {
  for (const level of towers) {
    assert.equal(level.shots, [96, 104, 112, 119, 120].includes(level.number) ? 4 : 3, `mission ${level.number}`);
    assert.equal(new GameModel(() => {}, level).shotsLeft, level.shots);
  }
  for (const level of LEVELS.filter((item) => !item.towers)) assert.equal(new GameModel(() => {}, level).shotsPerRound, 1);
});

test("a shot that leaves the target standing hands the sling to the next hero", () => {
  const events = [];
  const model = new GameModel((event) => events.push(event), byNumber(89));
  shoot(model, DENT[89]);
  assert.equal(model.phase, GamePhase.READY, "a round with heroes left ended in failure");
  assert.equal(model.shotsLeft, 2);
  assert.deepEqual(model.avatarPosition, model.anchor, "the next hero is not in the sling");
  assert.ok(!events.some((event) => event.type === "failure"));
  const next = events.find((event) => event.type === "next-shot");
  assert.deepEqual([next.shot, next.of, next.left], [2, 3, 2]);
});

test("the fort keeps every crack and fallen block between shots of a round", () => {
  const model = new GameModel(() => {}, byNumber(89));
  shoot(model, DENT[89]);
  settle(model);
  const dented = snapshot(model.world);
  const untouched = snapshot(new GameModel(() => {}, byNumber(89)).world);
  assert.notDeepEqual(dented, untouched, "the first shot did nothing to test with");
  model.beginSling(model.anchor);
  model.dragSling({ x: 150, y: 470 }); // a lob that falls short of the fort
  model.releaseSling();
  const world = model.world;
  // The launch itself must not rebuild the fort.
  assert.deepEqual(snapshot(world), dented, "the second shot flew at a rebuilt tower");
});

test("the same dent twice brings down a fort one dent cannot", () => {
  const level = byNumber(95);
  const once = new GameModel(() => {}, level);
  shoot(once, DENT[95]);
  settle(once);
  assert.notEqual(once.phase, GamePhase.SUCCEEDED, "one dent was already enough");
  shoot(once, DENT[95]);
  settle(once);
  assert.equal(once.phase, GamePhase.SUCCEEDED, "damage did not carry over to the second shot");
  assert.equal(once.attempts, 1, "a round counted as more than one attempt");
  assert.equal(once.sparedShots, 1);
});

test("a round ends in failure only when its last hero is spent", () => {
  const level = byNumber(89);
  const events = [];
  const model = new GameModel((event) => events.push(event.type), level);
  for (let shot = 1; shot <= level.shots; shot += 1) {
    shoot(model, { x: 150, y: 470 });
    settle(model);
    const expected = shot < level.shots ? GamePhase.READY : GamePhase.FAILED;
    assert.equal(model.phase, expected, `after shot ${shot}`);
  }
  assert.equal(events.filter((type) => type === "failure").length, 1);
  assert.equal(events.filter((type) => type === "next-shot").length, level.shots - 1);
  assert.equal(model.attempts, 1);
  // Retry: the next pull starts a new round at an intact fort.
  model.resetLevel(false);
  shoot(model, { x: 150, y: 470 });
  assert.equal(model.attempts, 2);
  assert.equal(model.shotsLeft, level.shots - 1);
  assert.deepEqual(snapshot(model.world).map((row) => row.split(",").slice(3).join()), snapshot(new GameModel(() => {}, level).world).map((row) => row.split(",").slice(3).join()));
});

test("a restart gives the whole round back", () => {
  const model = new GameModel(() => {}, byNumber(89));
  shoot(model, DENT[89]);
  model.resetLevel(true);
  assert.equal(model.shotsLeft, 3);
  assert.equal(model.roundInProgress, false);
  assert.deepEqual(snapshot(model.world), snapshot(new GameModel(() => {}, byNumber(89)).world));
});

test("the aiming preview flies at the fort as it stands now", () => {
  const level = byNumber(95);
  const model = new GameModel(() => {}, level);
  shoot(model, DENT[95]);
  settle(model);
  const before = snapshot(model.world);
  model.beginSling(model.anchor);
  const preview = model.simulate(DENT[95]);
  assert.equal(preview.reachesGoal, true, "the preview ignored the damage the first shot did");
  assert.deepEqual(snapshot(model.world), before, "previewing a shot moved the real fort");
  const fresh = new GameModel(() => {}, level);
  fresh.beginSling(fresh.anchor);
  assert.equal(fresh.simulate(DENT[95]).reachesGoal, false, "the fresh fort falls to one dent after all");
});

test("a shot round replays the same way twice", () => {
  const run = () => {
    const model = new GameModel(() => {}, byNumber(95));
    shoot(model, DENT[95]);
    settle(model);
    shoot(model, DENT[95]);
    settle(model);
    return [model.phase, snapshot(model.world)];
  };
  assert.deepEqual(run(), run());
});

test("tower missions have no What If replay", () => {
  const model = new GameModel(() => {}, byNumber(89));
  for (let shot = 0; shot < 3; shot += 1) { shoot(model, { x: 150, y: 470 }); settle(model); }
  assert.equal(model.phase, GamePhase.FAILED);
  assert.equal(model.replayWith("lowGravity"), false);
});

test("heroes left by the sling are worth points, and precision is the first hero", () => {
  const spared = rewardSuccess(freshProgress(), { id: "t", attempts: 1, star: false, mode: "quick", hintStage: 0, shotsUsed: 2, sparedShots: 1 });
  const none = rewardSuccess(freshProgress(), { id: "t", attempts: 1, star: false, mode: "quick", hintStage: 0, shotsUsed: 3, sparedShots: 0 });
  assert.equal(spared.score - none.score, SPARED_SHOT_BONUS);
  assert.equal(spared.precision, false, "two heroes counted as a precise shot");
  const single = rewardSuccess(freshProgress(), { id: "t", attempts: 1, star: false, mode: "quick", hintStage: 0, shotsUsed: 1, sparedShots: 2 });
  assert.equal(single.precision, true);
  // Flight missions score exactly as before.
  const flight = rewardSuccess(freshProgress(), { id: "f", attempts: 1, star: true, mode: "quick", hintStage: 0 });
  assert.deepEqual([flight.score, flight.precision], [220, true]);
});
