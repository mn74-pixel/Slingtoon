// Seria is a shot budget for a whole run, not one shot per mission. The design
// exists because measurement rejected the simpler one: a blind shot wins about
// 20% of the time, so one-shot runs averaged a quarter of a mission.
import test from "node:test";
import assert from "node:assert/strict";
import { LEVELS } from "../src/levels.js";
import { readProgress, recordStreak } from "../src/progress.js";
import {
  STREAK_MAX_SHOTS, STREAK_MIN_POOL, STREAK_REFUND, STREAK_START_SHOTS,
  canStartStreak, clearStreakMission, createStreakRun, drawStreakMission, spendStreakShot, streakPool,
} from "../src/streak.js";

const fresh = () => readProgress({ getItem: () => null }, LEVELS);
const cleared = (count) => {
  const progress = fresh();
  for (let i = 0; i < count; i += 1) progress.medals[LEVELS[i].id] = 1;
  return progress;
};
// Deterministic, so a run is reproducible.
const seeded = (seed) => () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;

test("a streak only draws on missions the player has actually beaten", () => {
  const progress = cleared(5);
  assert.equal(streakPool(progress, LEVELS).length, 5);
  assert.ok(streakPool(progress, LEVELS).every((level) => progress.medals[level.id] & 1));
  assert.equal(canStartStreak(cleared(0), LEVELS).ok, false);
  assert.equal(canStartStreak(cleared(0), LEVELS).missing, STREAK_MIN_POOL);
  assert.equal(canStartStreak(cleared(STREAK_MIN_POOL), LEVELS).ok, true);
  assert.equal(createStreakRun(cleared(STREAK_MIN_POOL - 1), LEVELS), null, "too small a pool starts nothing");
});

test("a first-try clear gains ground, a three-shot clear loses it, and the budget is capped", () => {
  const run = createStreakRun(cleared(8), LEVELS, seeded(7));
  assert.equal(run.shots, STREAK_START_SHOTS);
  drawStreakMission(run);

  spendStreakShot(run);
  clearStreakMission(run);
  assert.equal(run.shots, STREAK_START_SHOTS - 1 + STREAK_REFUND, "one shot in, two back: net +1");
  assert.equal(run.cleared, 1);

  const before = run.shots;
  for (let i = 0; i < 3; i += 1) spendStreakShot(run);
  clearStreakMission(run);
  assert.equal(run.shots, before - 3 + STREAK_REFUND, "three shots in, two back: net -1");

  for (let i = 0; i < 40; i += 1) clearStreakMission(run);
  assert.equal(run.shots, STREAK_MAX_SHOTS, "the budget cannot be banked without limit");
});

test("the run ends exactly when the budget runs out, and cannot go negative", () => {
  const run = createStreakRun(cleared(8), LEVELS, seeded(3));
  drawStreakMission(run);
  for (let i = 0; i < STREAK_START_SHOTS; i += 1) {
    assert.equal(run.over, false, `the run must survive shot ${i + 1}`);
    spendStreakShot(run);
  }
  assert.equal(run.over, true);
  assert.equal(run.shots, 0);
  spendStreakShot(run);
  assert.equal(run.shots, 0, "a finished run stops spending");
  clearStreakMission(run);
  assert.equal(run.cleared, 0, "a finished run cannot score");
});

test("the same mission never comes up twice running", () => {
  const run = createStreakRun(cleared(6), LEVELS, seeded(11));
  let previous = drawStreakMission(run).id;
  for (let i = 0; i < 200; i += 1) {
    const next = drawStreakMission(run).id;
    assert.notEqual(next, previous, "a repeat reads as the game glitching");
    previous = next;
  }
});

test("a single cleared mission still draws rather than dead-locking", () => {
  const progress = fresh();
  for (let i = 0; i < STREAK_MIN_POOL; i += 1) progress.medals[LEVELS[i].id] = 1;
  const run = createStreakRun(progress, LEVELS, seeded(5));
  run.pool = run.pool.slice(0, 1); // A pool of one has no alternative to offer.
  assert.ok(drawStreakMission(run), "drawing must still return a mission");
});

test("the budget rewards skill instead of ending every run immediately", () => {
  // The rejected one-shot design averaged 0.25 missions. This asserts the
  // replacement actually pays skill back, using the measured per-shot rates.
  const play = (winRate, trials = 4000) => {
    const random = seeded(99);
    let total = 0;
    for (let t = 0; t < trials; t += 1) {
      const run = createStreakRun(cleared(12), LEVELS, random);
      while (!run.over) {
        drawStreakMission(run);
        let won = false;
        while (!run.over && !won) {
          spendStreakShot(run);
          if (random() < winRate) won = true;
        }
        if (won) clearStreakMission(run);
      }
      total += run.cleared;
    }
    return total / trials;
  };
  const blind = play(0.2), good = play(0.4), expert = play(0.58);
  assert.ok(blind >= 1, `a blind run should still deliver a mission or so, got ${blind.toFixed(2)}`);
  assert.ok(good > blind * 2, `skill must pay: 40% gave ${good.toFixed(2)} against ${blind.toFixed(2)}`);
  assert.ok(expert > good * 2, `and keep paying: 58% gave ${expert.toFixed(2)} against ${good.toFixed(2)}`);
});

test("only a better run replaces the record", () => {
  const progress = fresh();
  assert.equal(progress.bestStreak, 0);
  assert.deepEqual(recordStreak(progress, 4), { best: 4, record: true });
  assert.deepEqual(recordStreak(progress, 2), { best: 4, record: false });
  assert.deepEqual(recordStreak(progress, 4), { best: 4, record: false }, "equalling is not beating");
  assert.deepEqual(recordStreak(progress, 9), { best: 9, record: true });
  const restored = readProgress({ getItem: () => JSON.stringify(progress) }, LEVELS);
  assert.equal(restored.bestStreak, 9, "the record survives a reload");
});
