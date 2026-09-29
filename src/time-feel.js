// The flight never had a pulse.
//
// Every impact looked the same as every other: a shake, a puff, a word. The
// moment the hero clipped the toaster and the moment they grazed the goal by
// four pixels played back at exactly the same speed, so neither one landed.
//
// This is the clock the game is watched through. It does two things and
// nothing else:
//
//   * HIT-STOP. A hard collision freezes the picture for 35-85 ms. The screen
//     keeps shaking while it is frozen, which is what makes the hit read as a
//     hit rather than as a stutter.
//   * THE LAST BREATH. The first time a flight comes inside a couple of goal
//     radii, the world slows to a third of speed for a third of a second —
//     once per flight, never twice. That is the "so close" beat, and it is
//     what sends a player back for one more try.
//
// The one rule this file may not break: the physics must not notice. The
// solver is a fixed 1/120 accumulator, so scaling the real seconds handed to
// `model.update` changes only HOW FAST the same steps arrive, never which
// steps run or in what order. tests/time-feel.test.mjs flies a real mission
// through a hit-stop and a slow-motion and asserts it lands on exactly the
// same pixel as a flight stepped flat out — the same invariant
// tests/physics-invariants.mjs already proves across 30/60/120 Hz.

// Below this a bump is just a bump: a scrape along a cushion must not punch
// the clock, or every board would stutter its way to the goal.
export const HIT_STOP_SPEED = 240;
export const HIT_STOP_MIN = 0.035;
export const HIT_STOP_MAX = 0.085;
export const HIT_STOP_RANGE = 420;

export const SLOW_MO_SECONDS = 0.34;
export const SLOW_MO_SCALE = 0.32;
// In goal radii. 2.6 is about a third of a second of flight at campaign
// speeds: long enough to see the miss coming, short enough not to drag.
export const SLOW_MO_REACH = 2.6;

export function createTimeFeel() {
  return { stop: 0, slow: 0, slowSpent: false, closest: Infinity };
}

// Every launch, reset and level change starts a fresh flight, so the one
// slow-motion this flight is allowed comes back.
export function armTimeFeel(feel) {
  feel.stop = 0;
  feel.slow = 0;
  feel.slowSpent = false;
  feel.closest = Infinity;
  return feel;
}

export function punchTimeFeel(feel, speed) {
  if (!Number.isFinite(speed) || speed <= HIT_STOP_SPEED) return 0;
  const weight = Math.min(1, (speed - HIT_STOP_SPEED) / HIT_STOP_RANGE);
  const stop = HIT_STOP_MIN + weight * (HIT_STOP_MAX - HIT_STOP_MIN);
  feel.stop = Math.max(feel.stop, stop);
  return stop;
}

export function approachTimeFeel(feel, distance, radius) {
  if (feel.slowSpent || !Number.isFinite(distance) || !(radius > 0)) return false;
  // Only on the way IN. A hero leaving the goal behind after a bounce has
  // already had their moment.
  const closing = distance < feel.closest;
  feel.closest = Math.min(feel.closest, distance);
  if (!closing || distance > radius * SLOW_MO_REACH) return false;
  feel.slow = SLOW_MO_SECONDS;
  feel.slowSpent = true;
  return true;
}

// The clocks run on real seconds — a frozen picture still has to thaw.
export function timeScale(feel, realSeconds) {
  const elapsed = Math.max(0, realSeconds);
  feel.stop = Math.max(0, feel.stop - elapsed);
  feel.slow = Math.max(0, feel.slow - elapsed);
  if (feel.stop > 0) return 0;
  return feel.slow > 0 ? SLOW_MO_SCALE : 1;
}
