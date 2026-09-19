// How much room each interaction actually takes on screen.
//
// The campaign's spacing rule used to place objects by a single centre point:
// `item.entry.x` for a portal, the midpoint for a cushion, `item.x` for a box.
// One point per item, whatever the item really looked like. So a portal's exit
// ring — 136 px of cream box, hundreds of pixels away from its entry — was
// invisible to the rule. Mission 70 shipped with the DZYŃ! button 14 px from
// the exit portal's centre, drawn straight on top of it, while the rule
// believed the nearest object was 337 px away.
//
// This module is the missing half: the rectangles the renderer will really
// paint. Parts of one item move together — a portal is one puzzle, not two
// props to be spread apart — but every part is seen by the layout.
//
// The numbers below mirror `interactions-renderer.js`. They are kept honest by
// tests/prop-art.test.mjs, which records every coordinate the renderer touches
// and fails if any of them falls outside the box declared here.

// Air between two different items' artwork. Under this they read as one lump,
// which is what "ściśnięte" means when a player says it.
export const PROP_CLEARANCE = 30;

// Force fields are backdrops with things inside them on purpose: a bubble
// holds the hero, a gravity well holds a switch. They never count as crowding.
export const FIELD_TYPES = Object.freeze(["bubble", "gravity", "current", "steam"]);

// `label()` in the renderer: a rounded box, text width plus 24, 28 tall,
// centred on the anchor. The layout has to stay a pure data step with no
// canvas, so the captions it can meet are measured once and pinned by
// tests/prop-art.test.mjs against real font metrics.
//
// A guessed character width was the first attempt and it under-measured
// BRAMKA and WAHADŁO by 16% — the one direction that quietly hands the space
// back and leaves things touching again.
const LABEL_WIDTHS = Object.freeze({
  "OMIŃ ↑|13": 44, "RUCHOMA ↔|13": 84, "RUCHOMA ↕|13": 77.5, "BRAMKA|13": 57.8,
  "PRZEBIJ →|13": 71.5, "WEJŚCIE|13": 58.5, "WYJŚCIE|13": 58.5,
  "KĄT = KIERUNEK|13": 109.4, "SPRĘŻYNA ↑|13": 80.4, "WAHADŁO|13": 67.2,
  "OTWARTE ✓|16": 96.4, "DZYŃ!|16": 48.9, "NIE DOTYKAJ|13": 87.4,
  "CEL ZAMKNIĘTY|11": 89, "TRAF TUTAJ|11": 67,
});
// Mission-authored captions vary, so they fall back to the widest character
// the campaign actually uses (0.738 of the font size, in "NAGRODA"), rounded up.
const WIDEST_CHARACTER = 0.75;
const textWidth = (text, size) => LABEL_WIDTHS[`${text}|${size}`] ?? (text ?? "").length * size * WIDEST_CHARACTER;
const labelBox = (text, x, y, size = 13) => {
  const width = textWidth(text, size) + 24;
  return { left: x - width / 2, right: x + width / 2, top: y - 14, bottom: y + 14 };
};

const rect = (left, top, right, bottom) => ({ left, top, right, bottom });

// Every rectangle one item paints, in world coordinates, at rest.
export function propParts(item) {
  if (FIELD_TYPES.includes(item.type)) return [];
  const spreadX = item.motion?.axis === "x" ? item.motion.amplitude : 0;
  const spreadY = item.motion?.axis === "y" ? item.motion.amplitude : 0;
  const parts = [];
  const add = (left, top, right, bottom) => parts.push(rect(left - spreadX, top - spreadY, right + spreadX, bottom + spreadY));
  const addLabel = (text, x, y, size) => {
    const box = labelBox(text, x, y, size);
    add(box.left, box.top, box.right, box.bottom);
  };

  if (item.type === "hazard") {
    // The spikes stick 15 px past both long edges.
    add(item.x - 15, item.y, item.x + item.width + 15, item.y + item.height);
    addLabel(item.label ?? "NIE DOTYKAJ", item.x + item.width / 2, item.y - 24);
  } else if (item.type === "solid") {
    add(item.x, item.y, item.x + item.width, item.y + item.height);
    addLabel(item.motion ? (item.motion.axis === "x" ? "RUCHOMA ↔" : "RUCHOMA ↕") : "OMIŃ ↑", item.x + item.width / 2, item.y - 22);
  } else if (item.type === "gate") {
    add(item.x, item.y, item.x + item.width, item.y + item.height);
    addLabel("BRAMKA", item.x + item.width / 2, item.y - 22);
  } else if (item.type === "breakable") {
    add(item.x, item.y, item.x + item.width, item.y + item.height);
    addLabel("PRZEBIJ →", item.x + item.width / 2, item.y - 22);
  } else if (item.type === "portal") {
    for (const [ring, text] of [[item.entry, "WEJŚCIE"], [item.exit, "WYJŚCIE"]]) {
      add(ring.x - item.radius - 12, ring.y - item.radius - 22, ring.x + item.radius + 12, ring.y + item.radius + 10);
      addLabel(text, ring.x, ring.y - item.radius - 40);
    }
  } else if (item.type === "cushion" || item.type === "spring") {
    const thickness = item.thickness ?? 14;
    add(Math.min(item.a.x, item.b.x) - thickness, Math.min(item.a.y, item.b.y) - thickness * 1.5,
      Math.max(item.a.x, item.b.x) + thickness, Math.max(item.a.y, item.b.y) + thickness * 1.5);
    addLabel(item.type === "spring" ? "SPRĘŻYNA ↑" : "KĄT = KIERUNEK",
      (item.a.x + item.b.x) / 2, Math.min(item.a.y, item.b.y) - (item.type === "spring" ? 38 : 33));
  } else if (item.type === "pendulum") {
    // The swept arc is the prop: a rope that passes through something is the
    // same mistake as a box drawn on top of it, only it happens mid-flight.
    const reach = item.pendulum.length * Math.sin(item.pendulum.swing) + item.width / 2;
    add(item.pendulum.x - Math.max(reach, 26), item.pendulum.y - 12,
      item.pendulum.x + Math.max(reach, 26), item.pendulum.y + item.pendulum.length + item.height / 2);
    addLabel("WAHADŁO", item.pendulum.x, item.pendulum.y - 30);
  } else if (item.type === "switch") {
    // The DZYŃ! caption sits on the button and is wider than it.
    const radius = item.radius + 8;
    add(item.x - radius, item.y - radius, item.x + radius, item.y + radius);
    addLabel("OTWARTE ✓", item.x, item.y, 16);
  } else {
    const radius = item.radius ?? 30;
    add(item.x - radius, item.y - radius, item.x + radius, item.y + radius);
  }
  return parts;
}

// The goal's artwork, which is drawn from its own atlas and is bigger than the
// hit circle on every small target.
export function goalParts(goal) {
  const art = Math.max(goal.radius, 74);
  const lift = art + 28;
  const caption = labelBox("CEL ZAMKNIĘTY", goal.x, goal.y - lift, 11);
  return [
    rect(goal.x - art, goal.y - art, goal.x + art, goal.y + art),
    rect(caption.left, caption.top, caption.right, caption.bottom),
  ];
}

// The optional gold star is not placed by the layout sweep at all — the
// authoring tool drops it onto a point of a real alternate flight path. So it
// needs the full two-dimensional distance: a sweep that only spreads things
// sideways says nothing about a badge dropped from above.
//
// It was checked by an older rule that knew four of the nine interaction types
// and asked a portal for its ring radius, so it never saw the cream box, the
// WEJŚCIE caption or a pendulum's rope. In 25 of 60 missions the star was drawn
// on top of something; on mission 88 the rope ran straight through it.
export const STAR_RADIUS = 27; // outer points at 25, under a 4 px outline

// Less air than two obstacles need — the star is small and the only gold thing
// on screen — but enough that it never touches artwork. Measured: at 16 px
// every mission still finds a spot; the star reads as a prize, not a sticker.
export const STAR_CLEARANCE = 16;

export const starParts = (star) => [rect(star.x - STAR_RADIUS, star.y - STAR_RADIUS, star.x + STAR_RADIUS, star.y + STAR_RADIUS)];

// Distance between two rectangles in both axes at once: 0 when they touch,
// negative by the shallower overlap when they cross.
export function gapBetween(a, b) {
  const dx = a.right <= b.left ? b.left - a.right
    : b.right <= a.left ? a.left - b.right
    : -Math.min(a.right - b.left, b.right - a.left);
  const dy = a.bottom <= b.top ? b.top - a.bottom
    : b.bottom <= a.top ? a.top - b.bottom
    : -Math.min(a.bottom - b.top, b.bottom - a.top);
  if (dx >= 0 && dy >= 0) return Math.hypot(dx, dy);
  return dx >= 0 ? dx : dy >= 0 ? dy : Math.max(dx, dy);
}

// Every rectangle a mission paints that the star has to stay clear of.
export const missionParts = (level) =>
  level.interactions.flatMap((item) => propParts(item).map((part) => ({ id: item.id ?? item.type, part })))
    .concat(goalParts(level.goal).map((part) => ({ id: "goal", part })));

// How close the star comes to the nearest artwork, and to what.
export function starClearance(star, level) {
  const [badge] = starParts(star);
  let worst = Infinity, who = null;
  for (const { id, part } of missionParts(level)) {
    const air = gapBetween(badge, part);
    if (air < worst) { worst = air; who = id; }
  }
  return { air: worst, against: who };
}

export const spansVertically = (a, b) => a.top < b.bottom && b.top < a.bottom;
export const horizontalGap = (a, b) => (a.right <= b.left ? b.left - a.right : a.left - b.right);

// How much air is left between two items' artwork. Rectangles that never share
// a row of pixels cannot crowd each other, however close their x ranges are.
export function clearanceBetween(partsA, partsB) {
  let worst = Infinity;
  for (const a of partsA) {
    for (const b of partsB) {
      if (!spansVertically(a, b)) continue;
      worst = Math.min(worst, horizontalGap(a, b));
    }
  }
  return worst;
}
