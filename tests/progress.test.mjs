import assert from "node:assert/strict";
import test from "node:test";
import { LEVELS } from "../src/levels.js";
import { PROGRESS_KEY, readProgress, hintOffer, purchaseHint, rewardSuccess } from "../src/progress.js";
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
  assert.equal(reward.score, 208); assert.equal(reward.gained, 48); assert.equal(reward.tokenGain, 1);
  assert.equal(p.score, 208); assert.equal(p.hintTokens, 3); assert.equal(p.medals[id], 7);
  assert.equal(rewardSuccess(p, { ...clean, attempts: 7 }).gained, 0);
});
