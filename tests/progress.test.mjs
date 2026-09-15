import assert from "node:assert/strict";
import test from "node:test";
import { LEVELS } from "../src/levels.js";
import { CHARACTER_UNLOCKS, PROGRESS_KEY, characterLock, countMastered, countStars, isMastered, readProgress, hintOffer, purchaseHint, rewardSuccess } from "../src/progress.js";
const storage = (values = {}) => ({ getItem: (key) => values[key] ?? null });
const empty = () => readProgress(storage(), LEVELS);

test("migrate earned score, tokens and level unlocks, but start fresh records for rebuilt puzzles", () => {
  const p = readProgress(storage({ "slingtoon-progress-v2": JSON.stringify({ version: 2, highestUnlockedLevel: 7, score: 1225, hintTokens: 4, bestScores: { "morning-mayhem": 225 } }) }), LEVELS);
  assert.equal(p.score, 1225); assert.equal(p.hintTokens, 4); assert.equal(p.highestUnlockedLevel, 7);
  assert.deepEqual(p.bestScores, {});
  assert.equal(readProgress(storage({ "slingtoon-progress-v1": "4" }), LEVELS).highestUnlockedLevel, 4);
});
test("malformed or unavailable storage and non-finite values cannot block play", () => {
  assert.deepEqual(readProgress({ getItem: () => { throw new Error("blocked"); } }, LEVELS), empty());
  assert.deepEqual(readProgress(storage({ [PROGRESS_KEY]: "{oops" }), LEVELS), empty());
  const p = readProgress(storage({ [PROGRESS_KEY]: '{"version":3,"score":1e999,"hintTokens":-4,"highestUnlockedLevel":4.7,"hints":{"morning-mayhem":99}}' }), LEVELS);
  assert.equal(p.score, 0); assert.equal(p.hintTokens, 0); assert.equal(p.highestUnlockedLevel, 4); assert.equal(p.hints[LEVELS[0].id], 3);
});
test("a 0.13 player who completed mission 8 resumes with mission 9 unlocked", () => {
  const legacy = { version: 3, highestUnlockedLevel: 7, score: 800, medals: { "duck-rescue": 1 } };
  const p = readProgress(storage({ [PROGRESS_KEY]: JSON.stringify(legacy) }), LEVELS);
  assert.equal(p.highestUnlockedLevel, 8);
  assert.equal(p.resumeLevelId, LEVELS[8].id);
});
test("paid discoveries persist, cannot be bought twice and never overdraft tokens", () => {
  const p = empty(), level = LEVELS[4];
  assert.equal(purchaseHint(p, level, 0).ok, true);
  assert.equal(p.hintTokens, 1);
  const restored = readProgress(storage({ [PROGRESS_KEY]: JSON.stringify(p) }), LEVELS);
  assert.equal(hintOffer(restored, level).stage, 2);
  assert.equal(purchaseHint(restored, level, 0).ok, true);
  assert.equal(purchaseHint(restored, level, 0).ok, false);
  assert.equal(restored.hintTokens, 0);
  assert.equal(purchaseHint(restored, level, 5).ok, true);
  assert.equal(restored.hints[level.id], 3);
  assert.equal(purchaseHint(restored, level, 5).ok, false);
});
test("three free tutorial stages taper away and rescue help prevents a token softlock", () => {
  const p = empty(); p.hintTokens = 0;
  for (let i = 0; i < 3; i++) assert.equal(purchaseHint(p, LEVELS[0], 0).ok, true);
  assert.equal(hintOffer(p, LEVELS[3]).cost, 1);
  assert.equal(hintOffer(p, LEVELS[7], 5).cost, 0);
  assert.equal(hintOffer(p, LEVELS[7], 5).rescue, true);
});
test("only improved records add points; medals accumulate across runs without token farming", () => {
  const p = empty(), id = LEVELS[0].id;
  const clean = { id, attempts: 1, star: false, mode: "quickSling", hintStage: 0 };
  assert.equal(rewardSuccess(p, clean).score, 160);
  assert.equal(rewardSuccess(p, clean).gained, 0);
  const reward = rewardSuccess(p, { ...clean, star: true, attempts: 2 });
  assert.equal(reward.score, 200); assert.equal(reward.gained, 40); assert.equal(reward.tokenGain, 1);
  assert.equal(p.score, 200); assert.equal(p.hintTokens, 3); assert.equal(p.medals[id], 7);
  assert.equal(rewardSuccess(p, { ...clean, attempts: 7 }).gained, 0);
});
test("the shot bonus is spent by the fourth attempt, but a hard mission still pays the base", () => {
  const id = LEVELS[0].id;
  const scoreAfter = (attempts) => rewardSuccess(empty(), { id, attempts, star: false, mode: "quickSling", hintStage: 0 }).score;
  assert.deepEqual([1, 2, 3, 4, 9].map(scoreAfter), [160, 140, 120, 100, 100]);
});
test("later chapters wait longer before stepping in with help", () => {
  const p = empty();
  assert.equal(LEVELS[0].hints.policy.autoAfterAttempts, 3);
  assert.equal(LEVELS[59].hints.policy.autoAfterAttempts, 5);
  assert.equal(hintOffer(p, LEVELS[0], 5).rescue, true);
  assert.equal(hintOffer(p, LEVELS[59], 5).rescue, false);
  assert.equal(hintOffer(p, LEVELS[59], 7).rescue, true);
});

test("stars buy characters, and the price is stated before it is paid", () => {
  const p = empty();
  assert.equal(countStars(p, LEVELS), 0);
  assert.equal(characterLock("dramaQueen", 0).locked, false, "the starting character is never gated");
  assert.equal(characterLock("zen", 0).locked, true);
  assert.equal(characterLock("zen", 0).missing, 3);
  assert.equal(characterLock("zen", 3).locked, false);
  assert.equal(characterLock("toughGuy", 17).missing, 1);
  assert.equal(characterLock("toughGuy", 18).locked, false);
  assert.equal(characterLock("nieistniejacy", 999).locked, true, "an unknown character stays locked");

  // Every unlock must be reachable, and thresholds have to rise.
  const prices = CHARACTER_UNLOCKS.map((unlock) => unlock.stars);
  assert.deepEqual(prices, [...prices].sort((a, b) => a - b));
  assert.ok(prices.at(-1) < LEVELS.length, "the last character costs fewer stars than the campaign holds");
});

test("collecting a star moves the unlock counter", () => {
  const p = empty();
  rewardSuccess(p, { id: LEVELS[0].id, attempts: 1, star: true, mode: "quickSling", hintStage: 0 });
  rewardSuccess(p, { id: LEVELS[1].id, attempts: 3, star: true, mode: "quickSling", hintStage: 0 });
  rewardSuccess(p, { id: LEVELS[2].id, attempts: 3, star: false, mode: "quickSling", hintStage: 0 });
  assert.equal(countStars(p, LEVELS), 2, "only starred missions count");
  assert.equal(characterLock("zen", countStars(p, LEVELS)).missing, 1);
});

test("mastery needs all three medals on the same mission", () => {
  const p = empty(), id = LEVELS[0].id;
  rewardSuccess(p, { id, attempts: 2, star: true, mode: "quickSling", hintStage: 0 });
  assert.equal(isMastered(p.medals[id]), false, "a star without a first-shot is not mastery");
  assert.equal(countMastered(p, LEVELS), 0);
  rewardSuccess(p, { id, attempts: 1, star: true, mode: "quickSling", hintStage: 0 });
  assert.equal(isMastered(p.medals[id]), true, "medals accumulate across attempts");
  assert.equal(countMastered(p, LEVELS), 1);
});
