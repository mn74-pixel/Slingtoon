// Finding a forgiving route through a mission, and a readable spot for its
// optional star.
//
// This was the inside of scripts/balance-campaign.mjs. It is a module now
// because the mission generator has to judge a mission it just invented by
// exactly the same measurements that certify the shipped campaign — a
// generator with its own, kinder definition of "solvable" would quietly
// produce missions the game cannot honour.
import { GameModel } from "../../src/game.js";
import { segmentDistance } from "../../src/physics.js";
import { STAR_CLEARANCE, starClearance } from "../../src/prop-art.js";

export const pointDistance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const distanceToPath = (point, points) =>
  Math.min(...points.slice(1).map((to, i) => segmentDistance(points[i], to, point)));

// The tolerances the campaign ships, widest first.
export const TOLERANCE_LADDER = Object.freeze([20, 16, 12, 10, 8, 6, 5]);

// Every pull that wins and keeps the whole flight on screen.
export function winningPulls(model) {
  const winners = [], seen = new Set();
  let total = 0;
  for (let x = 35; x <= 150; x += 5) for (let y = 440; y <= 565; y += 5) {
    const pull = model.clampedSlingPoint({ x, y });
    const key = `${pull.x.toFixed(1)}:${pull.y.toFixed(1)}`;
    if (seen.has(key)) continue;
    seen.add(key); total += 1;
    const shot = model.simulate(pull, 70);
    if (shot.reachesGoal && shot.points.every((p) => p.y > 70 && p.x > 15 && p.x < 1320)) winners.push({ pull: { x, y }, shot });
  }
  return { winners, total };
}

// A fixed 4 px stride skipped the far corners of the box, so a reported
// tolerance could be one the route never actually survived. The step count must
// be EVEN, or the grid straddles the centre and never samples it: at margin 10
// an odd 5 steps checked -10,-6,-2,+2,+6,+10 and skipped 0. The game's own
// check tries {-margin, 0, +margin} on both axes, so those nine points have to
// be in the grid this signs off on.
export function tolerates(model, pull, margin) {
  const steps = 2 * Math.max(1, Math.ceil(margin / 4));
  for (let ix = 0; ix <= steps; ix += 1) for (let iy = 0; iy <= steps; iy += 1) {
    const dx = -margin + (margin * 2 * ix) / steps;
    const dy = -margin + (margin * 2 * iy) / steps;
    if (!model.simulate({ x: pull.x + dx, y: pull.y + dy }, 1).reachesGoal) return false;
  }
  return true;
}

// The widest window that still works is the one we ship. Modest pull lengths
// are preferred over edge-of-screen solutions.
//
// The order matters beyond this function: the star search walks the same list
// and keeps the first of any equally scored spots. When this sorted a private
// copy, leaving the caller's list in grid order, three missions moved their
// star — same rules, different tie. So the order is returned, not hidden.
export function widestRoute(model, winners) {
  const ranked = winners.slice().sort((a, b) =>
    Math.abs(pointDistance(a.pull, model.anchor) - 110) - Math.abs(pointDistance(b.pull, model.anchor) - 110));
  for (const margin of TOLERANCE_LADDER) {
    const best = ranked.find((entry) => tolerates(model, entry.pull, margin));
    if (best) return { best, margin, ranked };
  }
  return { best: null, margin: 0, ranked };
}

// The star is collected within `avatarRadius + 19` of the flight line, so it
// does not have to sit exactly on a path point — it can step aside into clean
// air and still be won.
const SPOT_OFFSETS = [0, 14, 26, 36];
function* nearbySpots(point) {
  for (const reach of SPOT_OFFSETS) {
    if (!reach) { yield point; continue; }
    for (let i = 0; i < 8; i += 1) {
      const angle = (i * Math.PI) / 4;
      yield { x: point.x + Math.cos(angle) * reach, y: point.y + Math.sin(angle) * reach };
    }
  }
}

export function starIsReadable(point, level) {
  // The readable band follows the campaign's reach. It used to stop at x=1090,
  // which was fine while targets sat at 1130; once they moved out to 1150 the
  // star candidates all fell outside it and two missions reported "no room" for
  // a star that was simply off the end of the ruler.
  if (point.x < 340 || point.x > 1215 || point.y < 115 || point.y > 480) return false;
  return starClearance(point, level).air >= STAR_CLEARANCE;
}

// A real alternate route with a star away from the ordinary hint route.
export function starFor(level, winners, best) {
  let choice = null;
  for (const candidate of winners) {
    if (pointDistance(candidate.pull, best.pull) < 15) continue;
    for (const point of candidate.shot.points) {
      for (const spot of nearbySpots(point)) {
        if (!starIsReadable(spot, level)) continue;
        const distance = distanceToPath(spot, best.shot.points);
        if (distance < 63) continue;
        // Air first, then distance from the easy route.
        const score = Math.min(starClearance(spot, level).air, 60) * 1.5
          + Math.min(distance, 130) - Math.abs(spot.x - 650) * .07;
        if (!choice || score > choice.score) choice = { point: spot, pull: candidate.pull, score };
      }
    }
  }
  if (!choice) return null;
  const star = { x: Math.round(choice.point.x), y: Math.round(choice.point.y) };
  // The proof that it is collectible, and that the easy route does not collect
  // it by accident, is the simulation — not the geometry.
  const model = new GameModel(() => {}, { ...level, star });
  if (!model.simulate(choice.pull).star || model.simulate(best.pull).star) return null;
  return { star, starPull: choice.pull };
}
