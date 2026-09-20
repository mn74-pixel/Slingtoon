// Which aim the shot is actually taken from.
//
// Every pointermove went straight into the aim, including the last one — the
// small slide a finger makes as it leaves the glass. Measured over 12 896
// winning aims on the real solver: a 1 px lift-off wobble loses 6% of them,
// 2 px loses 11%, 3 px loses 16%. The player held a winning aim and the game
// took a different one.
//
// This is not a dead zone. A dead zone would ignore small movements while
// aiming too, and the game cannot afford that: 14 of 88 missions have no spot
// more forgiving than ±8 world px of pull, and the two tightest are ±4 — about
// ±2 CSS px on a phone. Every pixel of aiming resolution has to survive.
//
// So nothing changes during the drag. Only at the moment of release does the
// aim rewind to the position the finger was holding just before it left, and
// only when the finger was in fact holding still. A deliberate sweep into the
// release is kept exactly as made.
//
// Coordinates are client (CSS) pixels, because the thresholds are about a
// finger, not about the world: the same world distance is a different physical
// movement on a phone and on a desktop.

// How far back to look for the aim the player was holding. Long enough to
// predate the wobble, short enough that a slow, deliberate last adjustment is
// still mostly kept.
export const SETTLE_WINDOW_MS = 55;
// Movement over that window above which this reads as a deliberate sweep
// rather than a wobble, and the live aim is kept.
export const SETTLE_TRAVEL_PX = 7;

// Keeps the trail short; nothing older than this can matter.
export const TRAIL_MS = 260;

export function trimAimTrail(trail, now, span = TRAIL_MS) {
  while (trail.length > 1 && now - trail[0].t > span) trail.shift();
  return trail;
}

// The aim to fire from, given everything the pointer did.
export function settledAim(trail, { window = SETTLE_WINDOW_MS, travel = SETTLE_TRAVEL_PX } = {}) {
  if (!Array.isArray(trail) || trail.length === 0) return null;
  const last = trail[trail.length - 1];
  let held = null;
  for (let i = trail.length - 1; i >= 0; i -= 1) {
    if (last.t - trail[i].t >= window) { held = trail[i]; break; }
  }
  // A drag shorter than the window has no "before" to rewind to.
  if (!held) return last;
  const moved = Math.hypot(last.x - held.x, last.y - held.y);
  return moved > travel ? last : held;
}
