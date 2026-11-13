// Forts with several alarm clocks, fort points and one to three stars
// (src/physics.js scoreTowerStep, src/game.js towerRating, src/progress.js).
import test from "node:test";
import assert from "node:assert/strict";
import { GameModel, GamePhase, LEVELS, towerRating } from "../src/game.js";
import { BLOCK_POINTS, SPARED_SHOT_POINTS, TARGET_POINTS, scoreTowerStep, towerFallen } from "../src/physics.js";
import { MAX_MISSION_SCORE, readProgress, rewardSuccess } from "../src/progress.js";

const byNumber = (number) => LEVELS.find((level) => level.number === number);
const memory = (value) => ({ getItem: (key) => (key === "slingtoon-progress-v3" ? JSON.stringify(value) : null) });

test("a fort with two clocks is not won until both are down", () => {
  const model = new GameModel(() => {}, byNumber(97));
  const [a, b] = model.towerTargets;
  assert.ok(a && b, "mission 97 should carry two clocks");
  a.broken = true;
  assert.equal(towerFallen(model), false, "one clock down won the fort");
  b.y = model.world.groundY - b.height / 2;
  assert.equal(towerFallen(model), true);
});

test("each clock down and each broken block is paid once, with an event", () => {
  const events = [];
  const model = new GameModel((event) => events.push(event), byNumber(97));
  const [a] = model.towerTargets;
  const plank = model.world.bodies.find((body) => !body.target);
  model.world.breaks = [{ id: plank.id, x: plank.x, y: plank.y, material: plank.material, target: false }];
  a.broken = true;
  assert.equal(scoreTowerStep(model), false);
  model.world.breaks = [];
  assert.equal(scoreTowerStep(model), false, "the same clock was counted twice");
  assert.equal(model.towerPoints, BLOCK_POINTS[plank.material] + TARGET_POINTS);
  assert.deepEqual(events.map((event) => event.type).filter((type) => type !== "reset"), ["block-break", "target-down"]);
  // The goal moves on to the clock still standing.
  assert.notEqual(model.towerTarget, a);
});

test("a collapse after the round is decided is a show, not a score", () => {
  const model = new GameModel(() => {}, byNumber(97));
  model.phase = GamePhase.SUCCEEDED;
  const plank = model.world.bodies.find((body) => !body.target);
  model.world.breaks = [{ id: plank.id, x: plank.x, y: plank.y, material: plank.material, target: false }];
  for (const clock of model.towerTargets) clock.broken = true;
  scoreTowerStep(model);
  assert.equal(model.towerPoints, 0);
});

test("stars follow the measured thresholds, and every win is at least one", () => {
  for (const level of LEVELS.filter((item) => item.towers)) {
    const [two, three] = level.scoreStars;
    assert.ok(two >= level.towers.filter((block) => block.target).length * TARGET_POINTS, `mission ${level.number}: two stars for nothing`);
    assert.equal(towerRating(level, 0), 1);
    assert.equal(towerRating(level, two - 1), 1);
    assert.equal(towerRating(level, two), 2);
    assert.equal(towerRating(level, three), 3);
  }
});

test("a won fort scores its points plus every spared hero", () => {
  const level = byNumber(89);
  const model = new GameModel(() => {}, level);
  model.beginSling(model.anchor); model.dragSling(level.assistPull); model.releaseSling();
  for (let i = 0; i < 1300 && model.phase === GamePhase.FLYING; i += 1) model.update(1 / 120);
  assert.equal(model.phase, GamePhase.SUCCEEDED);
  assert.equal(model.towerScore, model.towerPoints + model.sparedShots * SPARED_SHOT_POINTS);
  assert.ok(model.towerPoints >= TARGET_POINTS);
  assert.equal(model.towerStars, towerRating(level, model.towerScore));
});

test("a fort record and its stars survive a reload", () => {
  const progress = readProgress(memory({}), LEVELS);
  const first = rewardSuccess(progress, { id: "towers-97", attempts: 1, star: false, mode: "quick", hintStage: 0, shotsUsed: 2, sparedShots: 1, fortScore: 21500, fortStars: 2 });
  assert.equal(first.fortRecord, true);
  const worse = rewardSuccess(progress, { id: "towers-97", attempts: 2, star: false, mode: "quick", hintStage: 0, shotsUsed: 3, sparedShots: 0, fortScore: 9000, fortStars: 1 });
  assert.equal(worse.fortRecord, false);
  const saved = JSON.parse(JSON.stringify({ ...progress, version: 3 }));
  const again = readProgress(memory(saved), LEVELS);
  assert.equal(again.fortScores["towers-97"], 21500);
  assert.equal(again.fortStars["towers-97"], 2);
});

test("a mission record is not cut down on reload, so it cannot pay out twice", () => {
  // 0.51.0 let a fort score up to 330 but a reload capped records at 240.
  const progress = readProgress(memory({}), LEVELS);
  const reward = rewardSuccess(progress, { id: "towers-96", attempts: 1, star: true, mode: "quick", hintStage: 0, shotsUsed: 1, sparedShots: 3 });
  assert.ok(reward.score > 240);
  const again = readProgress(memory({ ...progress, version: 3 }), LEVELS);
  assert.equal(again.bestScores["towers-96"], reward.score);
  assert.equal(rewardSuccess(again, { id: "towers-96", attempts: 1, star: true, mode: "quick", hintStage: 0, shotsUsed: 1, sparedShots: 3 }).gained, 0);
  assert.ok(MAX_MISSION_SCORE >= reward.score);
});
