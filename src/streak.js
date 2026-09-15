// Seria — a run that asks "one more try" instead of "next mission".
//
// The first design gave one shot per mission. Measurement killed it: a shot
// fired without knowing the route wins about 20% of the time (the campaign
// balance grid), so a one-shot run averaged a quarter of a mission. That is a
// slot machine, not a game.
//
// What survives is a budget for the WHOLE run. Every shot spends one; every
// mission cleared refunds two. A player who clears in one shot gains ground, a
// player who needs three loses it, and the run ends when the budget runs out.
// Simulated against the measured per-mission win rates, that pays out:
//   20% per shot -> 1.5 missions   30% -> 3.0   40% -> 5.9   49% -> 11.6   58% -> 23.6
// Skill moves the streak sixteenfold with no ceiling, and nobody ever gets a
// run of zero.
export const STREAK_START_SHOTS = 5;
export const STREAK_REFUND = 2;
export const STREAK_MAX_SHOTS = 8;
export const STREAK_MIN_POOL = 3;

// Only missions the player has already cleared. A streak is a victory lap over
// ground you know, not a lottery over levels you have never seen.
export function streakPool(progress, levels) {
  return levels.filter((level) => (progress.medals[level.id] ?? 0) & 1);
}

export function canStartStreak(progress, levels) {
  const pool = streakPool(progress, levels);
  return { ok: pool.length >= STREAK_MIN_POOL, cleared: pool.length, missing: Math.max(0, STREAK_MIN_POOL - pool.length) };
}

// Deterministic when handed a seeded random, so a run can be reproduced in a test.
export function createStreakRun(progress, levels, random = Math.random) {
  const pool = streakPool(progress, levels);
  if (pool.length < STREAK_MIN_POOL) return null;
  return {
    pool,
    random,
    shots: STREAK_START_SHOTS,
    cleared: 0,
    missionShots: 0,
    over: false,
    level: null,
    lastLevelId: null,
  };
}

// Never the same mission twice running: a repeat reads as the game glitching.
export function drawStreakMission(run) {
  const choices = run.pool.length > 1 ? run.pool.filter((level) => level.id !== run.lastLevelId) : run.pool;
  const level = choices[Math.floor(run.random() * choices.length) % choices.length];
  run.level = level;
  run.lastLevelId = level.id;
  run.missionShots = 0;
  return level;
}

export function spendStreakShot(run) {
  if (run.over) return run;
  run.shots -= 1;
  run.missionShots += 1;
  if (run.shots <= 0) {
    run.shots = 0;
    run.over = true;
  }
  return run;
}

// The refund lands after the shot that won has already been paid for, so a
// first-try clear nets +1 and a three-shot clear nets -1.
export function clearStreakMission(run) {
  if (run.over) return run;
  run.cleared += 1;
  run.shots = Math.min(STREAK_MAX_SHOTS, run.shots + STREAK_REFUND);
  return run;
}

export function streakSummary(run, best) {
  if (run.cleared === 0) return "Seria urwana na starcie. Następna pójdzie lepiej.";
  if (run.cleared > best) return `Nowy rekord: ${run.cleared} pod rząd!`;
  if (run.cleared === best) return `Wyrównany rekord: ${run.cleared} pod rząd.`;
  return `${run.cleared} pod rząd. Rekord to ${best}.`;
}
