// Authored campaign layouts. Coordinates describe actual colliders, not decoration.
// Routes are measured offline with the same solver used by the game.
import { CAMPAIGN_ROUTES } from "./campaign-routes.js?v=0.37.0";
import { PROP_CLEARANCE, clearanceBetween, goalParts, propParts, spansVertically } from "./prop-art.js?v=0.37.0";

export const CHAPTERS = Object.freeze([
  { id: "home", name: "Domowy chaos", subtitle: "Od drzemki do pierwszej kaczki", scene: "bedroom" },
  { id: "beach", name: "Urlop bez instrukcji", subtitle: "Plaża, wiatr i bardzo podejrzany ratownik", scene: "beach" },
  { id: "reef", name: "Rafa dobrego humoru", subtitle: "Bąble unoszą. Ryby komentują.", scene: "reef", environment: { gravity: .32, drag: .18 } },
  { id: "wreck", name: "Hotel pod wodą", subtitle: "Widok na morze. Z każdej strony.", scene: "wreck", environment: { gravity: .38, drag: .14 } },
  { id: "harbour", name: "Port nieplanowany", subtitle: "Przesyłki, dźwigi i kapitan bez statku", scene: "harbour" },
  { id: "fairground", name: "Lunapark zamieszania", subtitle: "Wygrywasz pluszaka. Pluszak wygrywa Ciebie.", scene: "fairground" },
  { id: "spaceport", name: "Kosmodrom na wynos", subtitle: "Do startu brakuje tylko kanapki", scene: "spaceport" },
  { id: "moon", name: "Księżyc służbowo", subtitle: "Mały krok. Duży problem z hamowaniem.", scene: "moon", environment: { gravity: .28, drag: 0 } },
  { id: "station", name: "Orbita absurdu", subtitle: "Podłoga ma dziś wolne", scene: "station", environment: { gravity: .18, drag: .02 } },
  { id: "homebound", name: "Powrót pod kołdrę", subtitle: "Wszechświat odprowadza Cię do łóżka", scene: "comet", environment: { gravity: .4, drag: .025 } },
  { id: "lab", name: "Szkolna pracownia fizyki", subtitle: "Wahadło wie, która godzina. Sprężyna pamięta, jak mocno wszedłeś.", scene: "laundry" },
].map((chapter, index) => Object.freeze({ ...chapter, number: index + 1, first: index * 8 + 1, last: index * 8 + 8 })));

const p = (x, y) => ({ x, y });
const crate = (id, x, y = 190, height = 396, label = "OSTROŻNIE: ZAWARTOŚĆ") => ({ id, type: "breakable", x, y, width: 60, height, label });
const wall = (id, x, y, width = 80, height = 586 - y, label = "OMIŃ") => ({ id, type: "solid", x, y, width, height, label });
// Mission 30 asks for four rings and a treasure chest inside one flight, and at
// the standard 68 px radius that is 640 px of cream box in a 776 px corridor —
// it cannot be spaced, only stacked. A narrower pipe is the one lever that buys
// width without moving the puzzle.
const portal = (id, x, y, ex, ey, turn = 0, radius = 68) => ({ id, type: "portal", entry: p(x, y), exit: p(ex, ey), radius, turn });
const wind = (id, x, y, width, height, fx, fy, label = "PODMUCH") => ({ id, type: "steam", x, y, width, height, force: p(fx, fy), label });
const current = (id, x, y, width, height, fx, fy, label = "PRĄD") => ({ id, type: "current", x, y, width, height, force: p(fx, fy), drag: .12, label });
const bubble = (id, x, y, radius = 140, fy = -530) => ({ id, type: "bubble", x, y, radius, force: p(110, fy), drag: .22, label: "BĄBEL ↑" });
const button = (id, x, y, label = "DZYŃ!") => ({ id, type: "switch", x, y, radius: 57, label });
const gate = (id, x, switchId, y = 130, height = 456) => ({ id, type: "gate", x, y, width: 34, height, ...(Array.isArray(switchId) ? { switchIds: switchId } : { switchId }), label: "BRAMKA" });
const ramp = (id, ax, ay, bx, by, label = "KĄT = KIERUNEK") => ({ id, type: "cushion", a: p(ax, ay), b: p(bx, by), thickness: 16, label });
const water = (id, x = 440, width = 570, y = 510) => ({ id, type: "water", x, y, width, height: 615 - y, label: "ŚLIZG →" });
const planet = (id, x, y, radius = 220, strength = 900) => ({ id, type: "gravity", x, y, radius, coreRadius: 29, strength, label: "PRZYCIĄGANIE" });
const move = (axis, amplitude = 40, speed = .9) => ({ axis, amplitude, speed });
const hazard = (id, x, y, width, height, label = "NIE DOTYKAJ", failure = null) => ({ id, type: "hazard", x, y, width, height, label, ...(failure ? { failure } : {}) });
const moving = (item, axis, amplitude, speed) => ({ ...item, motion: move(axis, amplitude, speed) });
// Length decides the period, so a short rope keeps faster time than a long one —
// which is the whole reason two of them in one mission teach anything.
const pendulum = (id, x, y, length, swing = .85, phase = 0, label = "WAHADŁO") =>
  ({ id, type: "pendulum", x: x - 38, y: y + length - 38, width: 76, height: 76, pendulum: { x, y, length, swing, speed: Math.sqrt(1050 / length), phase }, label });
// Gives back what it is given: a soft landing barely answers, a fast one launches.
// `gain` is how sharply it repays. The mission that teaches the spring uses a
// gentle one, because a steep response turns the lesson into a guessing game —
// measured: at gain 1.15 the introduction only tolerated a +/-6 px aim.
const spring = (id, ax, ay, bx, by, gain = 1.15, label = "SPRĘŻYNA") =>
  ({ id, type: "spring", a: p(ax, ay), b: p(bx, by), thickness: 15, threshold: 180, base: .55, gain, label });

// The drawn goals reach about 56 px from their centre, so a 56 px collider is
// the honest value: the player has to actually reach the object instead of an
// invisible buffer around it. Early missions get a deliberate bonus on top and
// it shrinks away by mission 48; after that difficulty comes from layout and
// new rules, never from a smaller target. Openers and breathers keep a wider
// mouth so a rule is never taught through a pixel-perfect shot.
// Every one of the 80 goals used to sit in the tightest part of the space the
// sling can actually reach. Measured mid-air interception windows on a flat
// level (no obstacles), which is where a goal may be placed and still be hit:
//
//   x=700 -> 508 px tall    x=900 -> 153    x=1000 -> 118
//   x=1100 -> 227           x=1200 -> 165   x=1300 -> 71    x=1400 -> 25
//
// The shipped campaign put goals at x 890..1100 with a median of 1070, and 77%
// of missions flew 850-950 px. Eighty missions, one shot repeated. The room is
// not further right — past 1250 the window collapses to a line — it is CLOSER
// and VERTICAL, where a short high lob and a short flat skim are different
// problems with the same tools.
//
// A shot shape moves the goal; the mission's whole layout scales with it, so a
// crate sitting a third of the way along the old flight still sits a third of
// the way along the new one. The authored numbers keep describing the layout,
// not absolute pixels.
const ANCHOR_X = 173;

// Distance and height are chosen separately, because tying difficulty to
// distance alone pulled the whole campaign into the left half of the screen —
// visible immediately on a contact sheet, invisible in the tolerance numbers.
//
// Distance rotates evenly so every third mission is long, and the play area
// keeps using the full width. Height carries the difficulty, which the measured
// win-share supports: a low target is hard at any distance (mid-low 17.4%,
// long-low 19.2%) while a high one is forgiving (short-high 31.1%).
// Absolute target columns. The first version of these bands left a third of the
// screen empty: a short shot ended at x=655 of 1280, so the mission lived in the
// left half and the right half was wallpaper. The whole set moves right.
const REACH = { short: 790, mid: 985, long: 1105 };
// Past here the measured interception window falls below 120 px and aiming turns
// into guessing.
const MAX_REACH = 1000;

// One height table for every distance was wrong, and raising it proved it: the
// interception window narrows as the target moves away. Re-measured with the
// game's own solver, every free flight from the sling, sampled every 5 px:
//
//   x= 790  y  93..551      x=1040  y 261..551
//   x= 845  y 128..551      x=1095  y 299..551
//   x= 930  y 187..551      x=1150  y 343..551
//   x= 985  y 229..551      x=1205  y 390..551
//
// The long band sits at 1105 and not further. At 1150 the campaign still built,
// but two missions lost their optional star: a long shot spends most of the
// launch power, so there is only one way to fly it, and no second route left to
// hang a star on. Distance past that point buys wallpaper and costs a choice.
//
// A target at y=160 is a fine high shot at 790 and physically unreachable at
// 985. So each band carries its own heights, each one inside the window at that
// band's far edge (the column includes the ±55 px jitter) with room left for the
// ±34 px vertical jitter on top. A long shot still cannot be a high one.
const SHOT_GRID = Object.freeze({
  short: { high: 180, mid: 330, low: 480 },
  mid: { high: 300, mid: 410, low: 505 },
  long: { mid: 430, low: 515 },
});
const HEIGHT_ORDER = Object.freeze(["high", "mid", "low"]);

// The top of the interception envelope, measured with the game's own solver:
// the highest point a free flight from the sling still reaches at that column.
const REACH_FLOOR = Object.freeze([
  [735, 62], [790, 93], [845, 128], [930, 187], [985, 229],
  [1040, 261], [1095, 299], [1150, 343], [1205, 390], [1250, 431],
]);
export function reachFloor(x) {
  if (x <= REACH_FLOOR[0][0]) return REACH_FLOOR[0][1];
  for (let i = 1; i < REACH_FLOOR.length; i += 1) {
    const [x1, y1] = REACH_FLOOR[i];
    if (x > x1) continue;
    const [x0, y0] = REACH_FLOOR[i - 1];
    return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return REACH_FLOOR[REACH_FLOOR.length - 1][1];
}
// The distance mix shifts with the campaign as well as the height. A single
// shared cycle gave chapter 10 as many forgiving short lobs as chapter 1, which
// flattened the curve even though every late target sat low. Early chapters lean
// short, late chapters lean long, and every chapter still serves all three so no
// stretch of the game becomes one shot repeated.
const REACH_CYCLES = [
  ["short", "mid", "short", "long", "mid", "short", "mid", "long"],   // chapters 1-3
  ["mid", "long", "short", "mid", "long", "short", "long", "mid"],    // chapters 4-6
  ["long", "mid", "long", "short", "mid", "long", "mid", "long"],     // chapters 7-10
];

// Seven shapes shared by eighty missions would read as seven target spots, so
// each mission nudges its own within the shape. Deterministic: the same mission
// is always in the same place, run to run and device to device.
function jitter(number, span) {
  const noise = Math.sin(number * 12.9898) * 43758.5453;
  return (noise - Math.floor(noise) - 0.5) * 2 * span;
}

// Opener and breather sit below their chapter's baseline, the finale above it.
const LOCAL_STEP = [-1.1, 0, 0.4, 0.3, -1.3, 0.6, 0.9, 1.2];
function shotFor(number, override) {
  const chapter = Math.floor((number - 1) / 8), local = (number - 1) % 8;
  const cycle = REACH_CYCLES[chapter < 3 ? 0 : chapter < 5 ? 1 : 2];
  const reach = override?.reach ?? cycle[(local + chapter) % cycle.length];
  const band = SHOT_GRID[reach];
  const options = HEIGHT_ORDER.filter((name) => band[name] !== undefined);
  // Height climbs from forgiving to demanding across the campaign; a chapter's
  // opener and breather step back down it.
  const rank = Math.round((chapter / (CHAPTERS.length - 1)) * (options.length - 1) + LOCAL_STEP[local] * 0.6);
  const requested = override?.height ?? options[Math.max(0, Math.min(options.length - 1, rank))];
  // An override may ask for a height this distance does not have — a long high
  // shot does not exist — so it falls back to the nearest one that does.
  const height = band[requested] !== undefined ? requested : options[0];
  return {
    x: Math.round(REACH[reach] + jitter(number, 55)),
    y: Math.round(band[height] + jitter(number + 91, 34)),
  };
}

// Raised from 130 after looking at the renders rather than the numbers: 130 px
// on a 1280-wide world is two objects touching shoulders. Seventeen missions had
// a pair closer than that anyway, because this guard only ever looked at the
// interactions and never at the goal — mission 88 had an obstacle 40 px from the
// target it was supposed to guard.
const MIN_OBSTACLE_GAP = 165;
const itemCentre = (item) => item.entry ? item.entry.x : item.a ? (item.a.x + item.b.x) / 2 : item.pendulum ? item.pendulum.x : item.x + (item.width ?? 0) / 2;
function tightestGap(items) {
  const xs = items.map(itemCentre).sort((a, b) => a - b);
  let gap = Infinity;
  for (let i = 1; i < xs.length; i += 1) gap = Math.min(gap, xs[i] - xs[i - 1]);
  return gap;
}

// Moving one object sideways, keeping its parts together. A portal is two rings,
// a spring is two ends; shifting only the item's own x tore them apart.
function shiftItem(item, dx) {
  if (!dx) return item;
  const out = { ...item };
  if (typeof out.x === "number") out.x += dx;
  for (const key of ["entry", "exit", "a", "b", "pendulum"]) {
    if (out[key]) out[key] = { ...out[key], x: out[key].x + dx };
  }
  return out;
}

// Stretching the whole mission to pull one crowded pair apart was the wrong
// tool: nineteen missions ended up pinned against the far reach cap and the pair
// stayed crowded anyway, because there was nowhere further to go. The shot is a
// global decision; crowding is local. So the objects are nudged apart in place,
// right to left, with the goal standing still.
//
// Nothing is pushed closer than this to the sling — a hero boxed in by an
// obstacle at launch cannot read its own shot.
const SLING_CLEARANCE = 150;

// The first version of this compared one centre point per item and demanded
// 165 px between them. That is blind twice over. It could not see how wide a
// thing is, so a 136 px portal ring and a 130 px button were "165 apart" while
// their artwork overlapped; and it could not see an item's other parts at all,
// because `itemCentre` returned a portal's ENTRY and nothing else. Mission 70
// shipped with the DZYŃ! button 14 px from the exit ring it was drawn on top
// of, and the rule reported the nearest object as 337 px away.
//
// So the rule now works on the rectangles the renderer will really paint. An
// item may own several of them — a portal's two rings, a caption wider than the
// box under it — and they all move together, because a portal is one puzzle.
// Two items must leave PROP_CLEARANCE of air wherever their artwork shares a
// row of pixels; where it does not, they are free to sit in the same column.
function itemBounds(item, parts) {
  return {
    left: Math.min(...parts.map((part) => part.left)),
    right: Math.max(...parts.map((part) => part.right)),
  };
}

// How far left `mover` has to go to clear `fixed` — zero when nothing overlaps.
function overlapPush(moverParts, fixedParts, clearance) {
  let push = 0;
  for (const mover of moverParts) {
    for (const blocker of fixedParts) {
      if (!spansVertically(mover, blocker)) continue;
      // Only the neighbour on the right pushes: the sweep runs right to left,
      // so anything already placed is to this item's right.
      if (mover.right + clearance <= blocker.left) continue;
      if (mover.left >= blocker.right) continue;
      push = Math.max(push, mover.right + clearance - blocker.left);
    }
  }
  return push;
}

// The tightest air between two different items' artwork. Negative means their
// drawings overlap; a small positive number still reads as one lump.
function worstClearance(items, goal) {
  const groups = items.map((item) => propParts(item)).filter((parts) => parts.length);
  groups.push(goalParts(goal));
  let worst = Infinity;
  for (let i = 0; i < groups.length; i += 1) {
    for (let j = i + 1; j < groups.length; j += 1) {
      const air = clearanceBetween(groups[i], groups[j]);
      if (air < worst) worst = air;
    }
  }
  return worst;
}

// The largest square of artwork two different items share. Zero means the
// mission reads as separate objects; anything else is a lump.
function worstOverlap(items, goal) {
  const groups = items.map((item) => propParts(item)).filter((parts) => parts.length);
  groups.push(goalParts(goal));
  let worst = 0;
  for (let i = 0; i < groups.length; i += 1) {
    for (let j = i + 1; j < groups.length; j += 1) {
      for (const a of groups[i]) {
        for (const b of groups[j]) {
          const width = Math.min(a.right, b.right) - Math.max(a.left, b.left);
          const height = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
          if (width > 0 && height > 0) worst = Math.max(worst, width * height);
        }
      }
    }
  }
  return worst;
}

function relaxGaps(items, goal, clearance = PROP_CLEARANCE) {
  const drawn = items.map((item) => propParts(item));
  const order = items
    .map((item, index) => ({ index, parts: drawn[index] }))
    .filter((entry) => entry.parts.length > 0)
    .sort((a, b) => itemBounds(items[a.index], a.parts).right - itemBounds(items[b.index], b.parts).right);
  const shifted = [...items];
  const moved = new Map();
  const floor = ANCHOR_X + SLING_CLEARANCE;
  // Right to left: the goal stands still and everything else makes room.
  let placed = goalParts(goal);
  for (let i = order.length - 1; i >= 0; i -= 1) {
    const { index, parts } = order[i];
    const dx = -overlapPush(parts, placed, clearance);
    const bounds = itemBounds(items[index], parts);
    // Never pushed into the sling's lap, even if that leaves an overlap the
    // author has to solve by hand — silently stacking on the hero is worse.
    const limited = Math.max(dx, floor - bounds.left);
    const settled = parts.map((part) => ({ ...part, left: part.left + limited, right: part.right + limited }));
    moved.set(index, limited);
    placed = placed.concat(settled);
  }
  for (const [index, dx] of moved) if (dx) shifted[index] = shiftItem(shifted[index], dx);
  return shifted;
}

// Horizontal rescale of an authored layout around the sling.
const scaleX = (value, factor) => ANCHOR_X + (value - ANCHOR_X) * factor;
function scaleItem(item, factor) {
  const out = { ...item };
  if (typeof out.x === "number") out.x = scaleX(out.x, factor);
  if (typeof out.width === "number") out.width *= factor;
  if (out.entry) out.entry = { ...out.entry, x: scaleX(out.entry.x, factor) };
  if (out.exit) out.exit = { ...out.exit, x: scaleX(out.exit.x, factor) };
  if (out.a) out.a = { ...out.a, x: scaleX(out.a.x, factor) };
  if (out.b) out.b = { ...out.b, x: scaleX(out.b.x, factor) };
  // The pivot is where a pendulum actually lives — movedBody derives the body
  // from it and ignores the item's own x. Leaving it unscaled pinned every
  // pendulum to its authored spot while the rest of the mission moved away.
  if (out.pendulum) out.pendulum = { ...out.pendulum, x: scaleX(out.pendulum.x, factor) };
  if (out.force && out.motion?.axis === "x") out.motion = { ...out.motion, amplitude: out.motion.amplitude * factor };
  return out;
}

// Missions whose layout does not survive the rotation's shape. Each entry was
// chosen by running the offline balance tool over every shape and keeping the
// one with the most forgiving measured route, not by guessing.
// Missions the balance tool could not make forgiving on their generated shot.
// Each value is the longest flight that still passes, and among those the
// tightest — a rescued mission must not become the easy one. Eight entries were
// added when the campaign moved right: a longer flight spends more of the launch
// power, which leaves less room for both a forgiving window and a second route
// to hang the optional star on.
const SHOT_OVERRIDES = Object.freeze({ 12: { reach: "short", height: "low" }, 13: { reach: "mid", height: "mid" }, 16: { reach: "long", height: "low" }, 20: { reach: "mid", height: "high" }, 22: { reach: "long", height: "mid" }, 30: { reach: "long", height: "mid" }, 35: { reach: "long", height: "mid" }, 39: { reach: "mid", height: "mid" }, 45: { reach: "short", height: "low" }, 47: { reach: "mid", height: "mid" }, 56: { reach: "short", height: "high" }, 58: { reach: "mid", height: "high" }, 59: { reach: "long", height: "mid" }, 62: { reach: "mid", height: "high" }, 66: { reach: "long", height: "mid" }, 70: { reach: "long", height: "low" }, 72: { reach: "mid", height: "high" }, 74: { reach: "mid", height: "mid" }, 75: { reach: "short", height: "high" }, 76: { reach: "mid", height: "high" }, 86: { reach: "long", height: "mid" } });
const HONEST_GOAL_RADIUS = 56;
function goalRadius(number, local) {
  const base = Math.max(HONEST_GOAL_RADIUS, Math.round(84 - (number - 9) * 0.72));
  if (local === 0) return base + 12;
  if (local === 4) return base + 16;
  if (local === 7) return Math.max(HONEST_GOAL_RADIUS - 2, base - 4);
  return base;
}

function mission(number, name, kind, authoredX, authoredY, mechanic, clue, win, authoredInteractions, options = {}) {
  const chapter = CHAPTERS[Math.floor((number - 1) / 8)];
  const local = (number - 1) % 8;
  // The authored goal position describes the layout's proportions; the shot
  // shape decides where the mission actually sits in the sling's reach, and the
  // obstacles ride along so their place in the flight is unchanged.
  const shot = shotFor(number, SHOT_OVERRIDES[number]);
  // The shot may still have to grow, but only by as much as the artwork really
  // needs. Counting objects and multiplying by a fixed gap was the previous
  // answer and it measured the wrong thing twice: a count says nothing about
  // how wide a portal ring or a caption is, and the old gap was between centre
  // points anyway. So the layout is simply laid out and looked at — if the
  // drawings still overlap after being nudged apart, the flight grows a step
  // and the whole thing is tried again, up to the reach cap.
  const authoredReach = authoredX - ANCHOR_X;
  const radius = options.radius ?? goalRadius(number, local);
  const layoutFor = (reach) => {
    const at = Math.round(ANCHOR_X + Math.min(reach, MAX_REACH));
    // The height has to follow where the mission actually ended up, not the
    // band it asked for. When the spacing rule stretched a short shot out to
    // the reach cap, its "high" target stayed high — mission 56 sat at x=1173,
    // y=209, which no free flight reaches. It was solvable only through the
    // mission's own furniture, which is a trap dressed as a target. The clamp
    // keeps its own jitter, or every mission pushed to the cap lands on the
    // same pixel: five pairs once had byte-identical target positions.
    const height = Math.round(Math.max(shot.y, reachFloor(at) + 30 + Math.abs(jitter(number + 17, 34))));
    const target = { kind, shape: "circle", x: at, y: height, radius, scale: 1, motion: options.motion };
    const scale = (at - ANCHOR_X) / authoredReach;
    return { goal: target, factor: scale, interactions: relaxGaps(authoredInteractions.map((item) => scaleItem(item, scale)), target) };
  };
  let reach = Math.max(shot.x - ANCHOR_X, SLING_CLEARANCE);
  let layout = layoutFor(reach);
  while (worstClearance(layout.interactions, layout.goal) < PROP_CLEARANCE && reach < MAX_REACH) {
    reach = Math.min(reach + 40, MAX_REACH);
    layout = layoutFor(reach);
  }
  const { goal, factor, interactions } = layout;
  const { x, y } = goal;
  const route = CAMPAIGN_ROUTES[number];
  const required = options.required ?? interactions.filter((item) => !["solid", "gate", "hazard", "pendulum"].includes(item.type)).map((item) => item.id);
  const surface = interactions.find((item) => item.type === "water");
  const pull = route?.pull ?? p(55, 500);
  const angle = Math.atan2(pull.y - 455, 173 - pull.x) * 180 / Math.PI;
  const direction = angle > 40 ? "Pociągnij wyraźnie w dół i w lewo. Wyższy łuk daje czas na reakcję otoczenia."
    : angle > 18 ? "Pociągnij w lewo i trochę w dół. Poprowadź łuk przez oznaczone obiekty."
      : "Pociągnij przede wszystkim w lewo. Tutaj pomaga płaski tor, nie wysoki skok.";
  return {
    id: `${chapter.id}-${String(number).padStart(2, "0")}`, number, name,
    chapterId: chapter.id, chapter: chapter.name.toUpperCase(), scene: options.scene ?? chapter.scene,
    environment: options.environment ?? chapter.environment, background: options.background ?? null,
    mechanic, title: name, clue, direction, pull,
    goal,
    star: route?.star ?? p(scaleX(740, factor), 280), starPull: route?.starPull,
    interactions, required, requirement: options.requirement ?? "Najpierw odwiedź oznaczone obiekty. Cel czeka na zakończenie Twojej misji.",
    water: surface ? { ...surface, enabled: true } : { enabled: false },
    visual: { accent: ["#ffd35f", "#5ce1bd", "#ff6078", "#a28bff"][Math.floor((number - 1) / 8) % 4], gag: options.gag, gagX: options.gagX, gagY: options.gagY, wash: "rgba(92,225,189,.015)", variant: local, companion: options.companion ?? chapter.id },
    pacing: local === 0 ? "discovery" : local === 4 ? "breather" : local === 7 ? "finale" : "play",
    win: [options.tag ?? "ZAŁATWIONE!", win], lose: options.lose ?? "Plan był dobry. Lądowanie miało inne zdanie.",
    freeStages: local === 0 ? 1 : 0,
  };
}

export const EXTRA_LEVELS = [
  // 9–16: a forgiving holiday. Wind first, then familiar ideas in new combinations.
  mission(9, "Mewa zabrała śniadanie", "sandwich", 1050, 400, "WIATR W PLECY", "Strzałki pokazują wiatr. Przeleć przez niego, a poniesie Cię dalej.", "Mewa zamówiła na wynos. Wyniosło Ciebie.", [wind("breeze", 390, 180, 350, 360, 650, -350, "BRYZA →")]),
  mission(10, "Parawan z certyfikatem", "umbrella", 1050, 445, "PRZEBIJ I PRZELEĆ", "Papierowy parawan pęka. Kamień za nim trzeba ominąć górą.", "Zdobyto trzy centymetry plaży.", [crate("screen", 440, 185, 401, "TEREN PRYWATNY"), wall("rock", 750, 452, 95)]),
  mission(11, "Ratownik ma płetwy", "buoy", 1090, 430, "ŚLIZG I RUCHOMY CEL", "Zrób płaską kaczkę, a potem traf w kołyszące się koło ratunkowe.", "Ratownik uratował własną przerwę.", [water("lagoon", 435, 550)], { motion: move("y", 35, .85) }),
  mission(12, "Przebieralnia międzywymiarowa", "suitcase", 1085, 425, "PORTAL ZA PARAWANEM", "Wejście do przebieralni omija skałę. Ubranie dotrze osobnym lotem.", "Strój kąpielowy został w innym wymiarze.", [portal("changing", 440, 365, 830, 290), wall("rock", 660, 180, 90)]),
  mission(13, "Lody zanim się rozmyślą", "ice-cream", 930, 385, "LEŻAK JAK TRAMPOLINA", "Opadnij na ukośny leżak. Kąt zrobi resztę — to przerwa, nie egzamin.", "Lody wybrały podróż w towarzystwie.", [ramp("lounger", 430, 465, 770, 545, "LEŻAK = KIERUNEK")], { motion: move("x", 32, .8) }),
  mission(14, "Dzwonek do kapitana kaczki", "duck", 1080, 455, "WIATR I PRZYCISK", "Złap boczny wiatr i naciśnij dzwonek przed zamkniętym pomostem.", "Kapitan mówi, że to był kontrolowany kwak.", [wind("sail", 320, 185, 300, 365, 350, -380, "WIATR →"), button("bell", 690, 350), gate("pier", 900, "bell")]),
  mission(15, "Poczta butelkowa ekspres", "bottle", 1080, 450, "KARTON I ŚLIZG", "Najpierw przebij lekką paczkę, potem przesuń się płasko nad taflą.", "Wiadomość odczytano. Papier jest mokry.", [crate("post", 355, 270, 316, "LIST POLECONY"), water("sea", 520, 480)]),
  mission(16, "Ostatni autobus to ponton", "buoy", 1070, 430, "TUNEL I BRAMKA", "Skrót prowadzi przez przebieralnię. Po wyjściu zadzwoń do pontonu.", "Odjazd opóźniony przez falę entuzjazmu.", [portal("shortcut", 430, 390, 695, 300), button("boarding", 885, 350), gate("ramp", 985, "boarding", 160)], { tag: "REJS!" }),

  // 17–24: real drag and buoyancy. The first bubble is broad and easy to discover.
  mission(17, "Pierwszy oddech pod wodą", "fish", 1000, 335, "BĄBEL UNOSI", "W dużym bąblu zwalniasz i wypływasz w górę. Woda zmienia opór całego lotu.", "Ryba pyta, czy umiesz pływać służbowo.", [bubble("air", 580, 410, 175, -530)]),
  mission(18, "Prąd nie wymaga ładowarki", "shell", 1080, 380, "PODWODNY PRĄD", "Turkusowy pas płynie w prawo. Przeleć nim pod rafą.", "Rachunek za prąd płaci węgorz.", [current("stream", 380, 255, 425, 260, 650, -80), wall("coral", 780, 100, 85, 165, "RAFA")]),
  mission(19, "Muszla na dostawę", "shell", 1020, 420, "PRĄD I PACZKA", "Prąd dodaje pędu potrzebnego do przebicia paczki z muszlami.", "Muszla ma funkcję głośnomówiącą.", [current("flow", 300, 240, 310, 300, 620, -40), crate("shell-box", 755, 235, 351, "NIE POTRZĄSAĆ")]),
  mission(20, "Rurka z nieoczekiwanym wyjściem", "fish", 1050, 335, "PORTAL I BĄBEL", "Rura przenosi Cię pod bąbel. Pozwól mu unieść Cię do ryby.", "Hydraulik twierdzi, że wszystko odpływa.", [portal("pipe", 420, 410, 715, 435), bubble("lift", 835, 415, 135, -540)]),
  mission(21, "Przerwa na plankton", "sandwich", 965, 435, "SZEROKI BĄBEL", "Największy bąbel w rozdziale. Wpadnij w niego i pozwól mu pracować.", "Kanapka zażyczyła sobie wyjścia na ląd.", [bubble("plankton", 570, 400, 185, -455)], { motion: move("y", 25, .7) }),
  mission(22, "Dzwonek do ośmiornicy", "octopus", 1055, 365, "BĄBEL I ZAWÓR", "Bąbel unosi do przycisku. Ten otwiera przejście do ośmiornicy.", "Ośmiornica podała osiem dłoni naraz.", [bubble("airlift", 485, 395, 140, -450), button("valve", 760, 330), gate("door", 900, "valve")]),
  mission(23, "Dwa nurty, jedna godność", "bottle", 1060, 410, "DWA KIERUNKI PRĄDU", "Pierwszy nurt unosi, drugi przesuwa w prawo. Wybierz łagodny lot przez oba.", "Godność wypłynęła dwie minuty wcześniej.", [current("up", 340, 205, 230, 355, 220, -480, "W GÓRĘ ↑"), current("across", 650, 170, 255, 375, 700, 40, "W PRAWO →")]),
  mission(24, "Rybia recepcja", "octopus", 1080, 400, "PRZYCISK I SKRÓT", "Zadzwoń do recepcji, a potem skorzystaj z rury prowadzącej do hotelu.", "Pokój z widokiem. Niestety z zalaniem.", [button("check-in", 390, 410), portal("hotel-tube", 610, 410, 875, 325), gate("reception", 980, "check-in")], { tag: "MELDUNEK!" }),

  // 25–32: two-step puzzles, a quiet room, and a short hotel escape.
  mission(25, "Bagaż sam się wnosi", "suitcase", 1020, 330, "WINDA Z BĄBLA", "Szeroki bąbel działa jak winda. Wystrzel niżej i pozwól mu wykonać pracę.", "Walizka dostała większy pokój niż Ty.", [bubble("bellhop", 610, 390, 180, -560)]),
  mission(26, "Nie przeszkadzać. Naprawdę.", "bell", 1090, 430, "DWA DZWONKI", "Oba przyciski otwierają wspólne drzwi. Przeleć przez nie jednym łukiem.", "Obudzono wyłącznie kierownika hotelu.", [button("first", 440, 375), button("second", 725, 385), gate("suite", 900, ["first", "second"])]),
  mission(27, "Minibar uciekł rurą", "bottle", 1060, 435, "PACZKA I PORTAL", "Przebij plombę minibaru, a potem wskocz do rury.", "Do rachunku dopisano akrobatykę.", [crate("seal", 360, 195, 391, "MINIBAR"), portal("drain", 590, 400, 850, 335)]),
  mission(28, "Serwis pokojowy pod prąd", "sandwich", 1030, 345, "PRĄD I BĄBEL", "Prąd dostarcza do bąbla. Bąbel dostarcza śniadanie piętro wyżej.", "Śniadanie w łóżku. Łóżko w morzu.", [current("service", 300, 275, 280, 275, 580, -30), bubble("room-lift", 780, 380, 150, -520)]),
  mission(29, "Basen w basenie", "duck", 920, 450, "SPOKOJNY NURT", "Hotelowy nurt jest szeroki i łagodny. Wpłyń w niego i daj się ponieść.", "Kaczka odmówiła pracy w mokrych warunkach.", [current("pool-jet", 400, 300, 400, 255, 480, -90, "NURT →")], { motion: move("x", 42, .75) }),
  mission(30, "Schody nieczynne od 1912", "treasure", 1090, 380, "DWIE RURY", "Dwa oznaczone wejścia prowadzą na wyższe piętro. Pęd przechodzi razem z Tobą.", "Znaleziono schody. Nadal nieczynne.", [portal("stairs-a", 405, 415, 620, 360, 0, 54), portal("stairs-b", 820, 350, 990, 325, 0, 54)]),
  mission(31, "Ręcznik z zabezpieczeniem", "suitcase", 1070, 420, "ZAWÓR I PLOMBA", "Traf w zawór, potem przebij lekką plombę. Drzwi otworzą się po drodze.", "Ręcznik liczy teraz kilometry lotnicze.", [button("tap", 415, 380), crate("laundry", 680, 200, 386, "RĘCZNIKI"), gate("exit", 900, "tap")]),
  mission(32, "Wymeldowanie awaryjne", "submarine", 1080, 350, "BĄBEL, DZWONEK, WYJŚCIE", "Unieś się w bąblu, zadzwoń na pożegnanie i dopłyń do łodzi.", "Hotel poleca się przy następnym zatonięciu.", [bubble("goodbye", 470, 405, 150, -480), button("checkout", 760, 330), gate("airlock", 920, "checkout")], { tag: "WYMELDOWANY!" }),

  // 33–40: return to ordinary gravity. Relearn it on a large target, not a spike.
  mission(33, "Ziemia znowu ciągnie", "buoy", 970, 455, "ZNÓW NA LĄDZIE", "Na lądzie grawitacja jest mocniejsza. Pociągnij trochę bardziej w dół.", "Nogi zgłosiły powrót do obowiązków.", []),
  mission(34, "Paczka dla kapitana", "suitcase", 1080, 435, "DWA LEKKIE KARTONY", "Dwie paczki wytracają pęd. Dłuższy naciąg pomoże dostarczyć obie.", "Kapitan zamówił statek. Przyszły instrukcje.", [crate("parcel-a", 420, 180, 406, "CZĘŚĆ 1"), crate("parcel-b", 715, 230, 356, "CZĘŚĆ 2")]),
  mission(35, "Dźwig na kawę", "coffee", 1050, 290, "PODMUCH NAD ŁADUNKIEM", "Strumień z portowego wentylatora unosi ponad kontenerem.", "Operator dźwigu też zamówił cappuccino.", [wind("crane", 425, 130, 325, 430, 180, -1350, "W GÓRĘ ↑"), moving(wall("cargo", 800, 450, 105), "x", 60, .85)]),
  mission(36, "Odprawa bez kolejki", "ticket", 1070, 440, "DZWONEK PRZED TUNELEM", "Przycisk podnosi szlaban. Tunel skraca drogę przez magazyn.", "Urzędnik przybił pieczątkę na czole.", [button("customs", 410, 380), portal("warehouse", 600, 375, 850, 310), gate("barrier", 960, "customs")]),
  mission(37, "Ładunek wisi i wędruje", "duck", 920, 420, "RUCHOMA PRZESZKODA", "Nowość: ta paka jeździ w górę i w dół po zaznaczonej linii. Wystrzel, kiedy droga jest wolna.", "Dźwigowy twierdzi, że to Ty się ruszałeś.", [moving(wall("crane-load", 640, 270, 92, 140, "RUCHOMA"), "y", 80, .9)], { motion: move("y", 32, .8) }),
  mission(38, "Pokład jest pod kątem", "bell", 1065, 435, "ODBIJ I ZADZWOŃ", "Opadnij na ukośny ponton. Po odbiciu traf w dzwonek przed bramką.", "Zaokrętowano pasażera bez użycia schodów.", [{ ...ramp("pontoon", 405, 435, 780, 560), thickness: 21 }, { ...button("gong", 880, 405), radius: 72 }, gate("gangway", 990, "gong")]),
  mission(39, "Dostawa na drugi brzeg", "bottle", 1080, 420, "WIATR NAD WODĄ", "Wiatr pomaga rozpędzić niski lot przed ślizgiem. Nie wznoś się za wysoko.", "Butelka narzeka na transport bez korka.", [wind("harbour-wind", 255, 305, 260, 270, 440, -100, "BRYZA →"), water("channel", 535, 480)]),
  mission(40, "Prom do wesołego miasteczka", "ticket", 1070, 420, "PLOMBA, TUNEL, BILET", "Przebij plombę ładunku i skorzystaj z tunelu. Bilet kołysze się za wyjściem.", "Bilet ważny na jeden kontrolowany wypadek.", [crate("luggage", 350, 185, 401, "BAGAŻ"), portal("ferry", 575, 385, 825, 285)], { motion: move("x", 28, .85), tag: "REJS ZALICZONY!" }),

  // 41–48: timing is gentle and deterministic, with no waiting for a lucky cycle.
  mission(41, "Wata cukrowa parzy", "balloon", 975, 355, "STREFA ZAKAZANA", "Nowość: czerwona strefa kończy lot od samego dotknięcia. Przeleć nad nią, nie przez nią.", "Balon twierdzi, że to Ty się zerwałeś.", [hazard("candy-burner", 610, 415, 84, 171, "PARZY!", "Wata cukrowa przypaliła bohatera. Wyższy łuk mija strefę górą.")], { motion: move("y", 45, .9) }),
  mission(42, "Pluszak w przesyłce", "bear", 1055, 430, "PODMUCH I KARTON", "Wentylator pomaga przebić karton automatu. Pluszak kibicuje z drugiej strony.", "Pluszak wygrał człowieka. Cieszy się umiarkowanie.", [wind("fan", 320, 195, 320, 350, 380, -450, "DO NAGRODY →"), crate("machine", 800, 180, 406, "NAGRODA")]),
  mission(43, "Krzywe lustro skraca drogę", "ticket", 1070, 385, "PORTAL Z ZAKRĘTEM", "Lustro obraca kierunek lotu trochę w górę. Zachowuje jego prędkość.", "Lustro odmówiło prostowania bohatera.", [portal("mirror", 460, 390, 820, 330, -.25), moving(wall("booth", 650, 185, 95, 240), "y", 70, .95)]),
  mission(44, "Bilard z watą cukrową", "ice-cream", 1060, 430, "ODBIJ I PRZEBIJ", "Opadnij na poduchę, a po odbiciu przebij papierową kurtynę.", "Wata zyskała konsystencję przygody.", [ramp("pillow", 415, 435, 765, 555), crate("curtain", 850, 210, 376, "KURTYNA")]),
  mission(45, "Deser przez krzywe lustro", "ice-cream", 955, 440, "SPOKOJNY SKRÓT", "Lustro skraca drogę i nic więcej dziś nie przeszkadza. Wejdź w nie bez pośpiechu.", "Kontrola jakości zażądała drugiej porcji.", [portal("mirror-maze", 445, 400, 775, 335)]),
  mission(46, "Bilet dwuosobowy dla jednego", "bear", 1080, 440, "DWA PRZYCISKI", "Oba przyciski otwierają automat. Jeden łuk może załatwić całą formalność.", "Drugi bilet wystawiono na godność.", [button("ticket-a", 425, 350), button("ticket-b", 715, 355), gate("prize-door", 920, ["ticket-a", "ticket-b"])]),
  mission(47, "Balon przez serwis", "balloon", 1070, 300, "TUNEL I WENTYLATOR", "Wyjście lustra jest nisko. Wentylator podnosi do balonu.", "Balon wrócił, bo zapomniał portfela.", [portal("service-tube", 430, 385, 690, 410), wind("inflate", 730, 110, 230, 440, 60, -1400, "POMPUJ ↑")], { motion: move("x", 24, .7) }),
  mission(48, "Nagroda główna: bilet w kosmos", "rocket", 1080, 420, "PRZYCISK, PACZKA, START", "Uruchom automat i przebij opakowanie rakiety. Reklamacji nie przyjmują.", "Wygrałeś lot. Lądowanie dokupimy później.", [button("launch-ticket", 400, 350), hazard("sparks", 555, 428, 72, 158, "ISKRY!", "Automat sypie iskrami. Przeleć nad strefą, a nie przez nią."), crate("rocket-box", 690, 190, 396, "NAGRODA GŁÓWNA"), gate("exit", 925, "launch-ticket")], { tag: "WYGRANA!" }),

  // 49–56: runway, thrusters, cargo logistics. No mandatory mid-air button.
  mission(49, "Próba silnika suszarki", "helmet", 1000, 325, "SZEROKI PODMUCH", "Silnik działa jak znany wentylator. Przeleć przez szeroki strumień.", "Suszarka uzyskała licencję kosmiczną.", [wind("dryer", 420, 120, 330, 450, 120, -1250, "SILNIK ↑")]),
  mission(50, "Kanapka zatwierdzona do lotu", "sandwich", 1070, 440, "ODPRAWA I ŁADUNEK", "Naciśnij przycisk odprawy, potem przebij lekką plombę lunchboxu.", "Kanapka przeszła kontrolę. Ser ma paszport.", [button("security", 410, 365), crate("lunch", 685, 190, 396, "ŁADUNEK SPOŻYWCZY"), gate("checkpoint", 920, "security")]),
  mission(51, "Kosmonauta bocznym wejściem", "helmet", 1080, 420, "RURA I PLOMBA", "Serwisowa rura omija rakietę. Za wyjściem czeka karton ze skafandrem.", "Skafander ma kieszeń na zwolnienie lekarskie.", [portal("service", 425, 390, 765, 300), crate("suit", 915, 210, 376, "SKAFANDER")]),
  mission(52, "Dwa silniki, jeden pilot", "rocket", 1070, 340, "UNIEŚ I PRZESUŃ", "Pierwszy strumień unosi, drugi pomaga polecieć w prawo do rakiety.", "Pilot automatyczny poprosił o urlop.", [wind("lift", 360, 160, 245, 410, 140, -1050, "W GÓRĘ ↑"), wind("forward", 700, 140, 235, 410, 650, -280, "DO RAKIETY →")]),
  mission(53, "Kawa przed odliczaniem", "coffee", 950, 440, "RAMPA SERWISOWA", "Odbij się od rampy technicznej. Kawa ma jeszcze ziemską grawitację.", "Odliczanie wstrzymano do pierwszego łyku.", [ramp("service-ramp", 425, 450, 780, 545, "RAMPA = KIERUNEK")]),
  mission(54, "Dokumenty poleciały pierwsze", "ticket", 1080, 380, "DZWONEK I PODMUCH", "Przycisk otwiera właz. Silnik unosi do zgubionych dokumentów.", "Dokumenty osiągnęły wyższe wykształcenie.", [button("hatch", 410, 360), wind("exhaust", 570, 150, 255, 420, 220, -950, "CIĄG ↑"), gate("cargo-hatch", 940, "hatch")]),
  mission(55, "Pakowanie całego domu", "suitcase", 1080, 410, "DWIE PACZKI I WIATR", "Dwa lekkie kartony zabierają pęd. Wiatr między nimi pomoże go odzyskać.", "Zabrano wszystko. Łącznie z adresem.", [crate("box-one", 365, 190, 396, "NA WSZELKI WYPADEK"), wind("cargo-fan", 490, 180, 300, 370, 620, -400, "DO ŁADOWNI →"), crate("box-two", 860, 190, 396, "RESZTA DOMU")]),
  mission(56, "Start bez prawa jazdy", "rocket", 1090, 355, "PODMUCH DO ŚLUZY", "Przeleć przez ciąg silnika i naciśnij przycisk śluzy. Rakieta zabiera resztę.", "Houston, mamy pasażera w kapciach.", [wind("ignition", 385, 135, 330, 435, 240, -1000, "3… 2… ↑"), button("airlock-button", 810, 335), gate("airlock", 960, "airlock-button")], { tag: "START!" }),

  // 57–64: lower gravity introduced on its own; then one visible gravity well.
  mission(57, "Mały krok, długi lot", "flag", 1010, 415, "SŁABSZA GRAWITACJA", "Tutaj dłużej unosisz się w powietrzu. Płaski strzał wystarczy do flagi.", "Flaga melduje: kapcie wylądowały.", []),
  mission(58, "Ser przyciąga bardziej", "sandwich", 1050, 385, "POLE PRZYCIĄGANIA", "Okrąg pokazuje zasięg małego księżyca. Przeleć obok jego twardego środka.", "Księżyc zaprzecza, że jest z sera.", [planet("cheese", 600, 260, 225, 1000), hazard("moon-dust", 830, 442, 72, 144, "PYŁ!", "Pył księżycowy zatrzymał bohatera. Ominąć górą.")]),
  mission(59, "Poczta księżycowa", "suitcase", 1060, 420, "LEKKI LOT, CIĘŻKA PACZKA", "W słabszej grawitacji leć płasko przez paczkę i nad niskim kraterem.", "Przesyłka dotarła przed listonoszem.", [crate("moon-post", 460, 205, 381, "NIE WSTRZĄSAĆ"), moving(wall("crater", 790, 480, 100), "x", 55, .8)]),
  mission(60, "Skrót przez serwis księżyca", "satellite", 1090, 335, "PORTAL I MAŁA PLANETA", "Tunel wyprowadza obok pola przyciągania. Pozwól mu lekko zagiąć lot.", "Serwis przyjmuje księżyce tylko na gwarancji.", [portal("moon-tube", 415, 420, 740, 380), planet("small-moon", 900, 205, 225, 850)]),
  mission(61, "Piknik bez okruszków", "sandwich", 950, 410, "ŁAGODNE PRZYCIĄGANIE", "Mały księżyc delikatnie podciąga tor. Kanapka odpływa powoli — masz czas.", "Okruszki założyły własny układ planetarny.", [planet("picnic-moon", 620, 250, 240, 620)], { motion: move("y", 30, .7) }),
  mission(62, "Dzwonek do sąsiada z orbity", "alien", 1080, 370, "PRZYCIĄGANIE I PRZYCISK", "Łagodny zakręt przy planecie poprowadzi do przycisku przed domem sąsiada.", "Sąsiad pożyczył cukier. Odda za rok świetlny.", [planet("neighbour", 570, 230, 235, 850), button("doorbell", 805, 350), gate("moon-door", 950, "doorbell")]),
  mission(63, "Księżycowy magazyn", "helmet", 1080, 420, "PACZKA I SERWISOWY TUNEL", "Przebij plombę, a potem skorzystaj z tunelu. Płaski lot jest tu sprzymierzeńcem.", "Magazynier naliczył opłatę za brak ciężaru.", [crate("seal", 350, 195, 391, "SPRZĘT LEKKI"), portal("storage", 565, 415, 850, 330)]),
  mission(64, "Winda na orbitę", "satellite", 1080, 330, "DZWONEK I SILNIK", "Włącz śluzę, potem skorzystaj z łagodnego silnika. W kosmosie mała siła robi więcej.", "Winda zatrzymuje się tylko na żądanie planety.", [button("lift-button", 395, 410), wind("orbital-lift", 560, 180, 270, 380, 250, -320, "ORBITA ↑"), gate("lift-door", 935, "lift-button")], { tag: "ORBITA!" }),

  // 65–72: station ventilation and attraction. Broad lanes, never pixel gaps.
  mission(65, "Podłoga wzięła wolne", "helmet", 1010, 415, "PRAWIE NIEWAŻKOŚĆ", "Pociągnij przede wszystkim w lewo. Na stacji upadanie trwa dłużej.", "Podłoga wróci po długim weekendzie.", []),
  mission(66, "Wentylacja zamiast korytarza", "coffee", 1070, 350, "PRĄD WENTYLACJI", "Oznaczony strumień przesuwa w prawo i delikatnie unosi. Omija niski przewód.", "Kawa otrzymała status obiektu latającego.", [current("ventilation", 380, 210, 435, 340, 360, -120, "WENTYLACJA →"), moving(wall("duct", 825, 475, 90), "y", 55, .75)]),
  mission(67, "Dwa włazy, jedna dostawa", "suitcase", 1080, 400, "DWA PRZYCISKI W NIEWAŻKOŚCI", "Płaski lot przez oba przyciski otwiera drzwi ładowni.", "Za dostawę przyznano zero kilogramów premii.", [button("left-lock", 440, 380), button("right-lock", 735, 375), gate("cargo-lock", 930, ["left-lock", "right-lock"])]),
  mission(68, "Satelita ma przyciągający charakter", "satellite", 1080, 345, "PLANETA I WENTYLACJA", "Pole zakrzywia lot. Strumień za nim pomaga dopłynąć do satelity.", "Satelita prosi o trochę przestrzeni osobistej.", [planet("station-moon", 520, 230, 230, 900), current("air", 760, 195, 235, 330, 400, -30, "DO SATELITY →")]),
  mission(69, "Nie budzić kosmity", "alien", 950, 425, "CICHA WENTYLACJA", "Nocny obieg powietrza jest szeroki i cichy. Wpłyń w niego i złóż wizytę.", "Kosmita mówi przez sen po ziemsku: jeszcze pięć minut.", [current("night-air", 395, 265, 420, 275, 430, -110, "CICHY OBIEG →")], { motion: move("x", 35, .7) }),
  mission(70, "Pralnia skafandrów", "helmet", 1080, 425, "PORTAL I PRZYCISK", "Przejdź przez pralnię, po wyjściu naciśnij przycisk suszarni.", "Skafander skurczył się tylko o jedną galaktykę.", [portal("suit-washer", 420, 405, 740, 325), button("dry", 885, 370), gate("dryer-door", 985, "dry")]),
  mission(71, "Kanapka na orbicie", "sandwich", 1080, 340, "PLOMBA I GRAWITACJA", "Przebij folię lunchboxu. Pole małego księżyca lekko podciąga tor do kanapki.", "Ser obrał orbitę niezależną od pieczywa.", [crate("lunchbox", 365, 195, 391, "NIE OTWIERAĆ W PRÓŻNI"), planet("crumb-moon", 735, 210, 250, 900)]),
  mission(72, "Bilet powrotny trochę się oddalił", "ticket", 1090, 405, "DZWONEK, TUNEL, BILET", "Zadzwoń do śluzy i wskocz do skrótu. Bilet płynie już po drugiej stronie.", "Powrót opłacono punktami za absurd.", [button("departure", 390, 380), portal("home-route", 600, 400, 860, 320), gate("departure-lock", 985, "departure")], { motion: move("y", 22, .8), tag: "KIERUNEK: DOM!" }),

  // 73–80: a relaxed remix of learned rules, with a recognisable bedroom finale.
  mission(73, "Kometa robi za taksówkę", "rocket", 1025, 410, "TAKSÓWKA Z PODMUCHEM", "Szeroki ogon komety lekko pcha do przodu. Wsiądź spokojnym lotem.", "Taksometr nalicza kilometry świetlne.", [wind("comet-tail", 350, 230, 370, 330, 420, -160, "DO DOMU →")]),
  mission(74, "Pamiątki bez cła", "suitcase", 1080, 385, "PACZKA, WIATR, PAMIĄTKI", "Przebij karton pamiątek. Szeroki strumień za nim pomaga utrzymać lot.", "Pamiątka z Księżyca chce wrócić na Księżyc.", [crate("souvenirs", 370, 180, 406, "PAMIĄTKI"), wind("tailwind", 570, 190, 330, 370, 380, -380, "Z WIATREM →"), hazard("customs-beam", 900, 440, 70, 146, "KONTROLA!", "Skaner celny przechwycił pamiątki. Wyżej i dalej.")]),
  mission(75, "Objazd małej planety", "flag", 1080, 380, "DWA ŁAGODNE POLA", "Przeleć dolną stroną dwóch pól. Małe planety delikatnie podciągną tor.", "Planety pokłóciły się o pierwszeństwo.", [planet("moon-a", 450, 235, 205, 640), planet("moon-b", 820, 215, 215, 670)]),
  mission(76, "Powrót przez pas złomu", "alien", 1080, 405, "SKRÓT MIĘDZY ZŁOMEM", "Skrót wyprowadza przed pas złomu. Strefy nie da się przebić — można ją tylko ominąć.", "Nawigacja mówi: zawróć przy najbliższym wszechświecie.", [portal("side-route", 405, 410, 715, 345), hazard("debris", 870, 424, 74, 162, "ZŁOM!", "Kosmiczny złom przerwał lot. Poprowadź tor ponad pasem.")]),
  mission(77, "Ostatnia kawa w kosmosie", "coffee", 950, 435, "BĄBEL Z OGONA KOMETY", "Ostatni bąbel podróży. Szeroki, spokojny, bez niespodzianek.", "Kawa dopiła pasażera. Role się odwróciły.", [bubble("comet-bubble", 590, 395, 180, -420)], { motion: move("x", 30, .65) }),
  mission(78, "Ziemia prosi najpierw zadzwonić", "bell", 1080, 410, "PRZYCISK, PACZKA, POWRÓT", "Naciśnij dzwonek Ziemi, przebij opakowanie pamiątki i przeleć przez otwartą bramkę.", "Ziemia mówi: wytrzyj buty z pyłu księżycowego.", [button("earth-bell", 405, 390), hazard("re-entry", 530, 440, 70, 146, "GORĄCO!", "Osłona termiczna nie wybacza. Poprowadź tor ponad strefą."), crate("gift", 680, 190, 396, "DLA DOMOWNIKÓW"), gate("earth-door", 925, "earth-bell")]),
  mission(79, "Lądowanie w pralni", "sock", 1070, 425, "PORTAL Z POWROTEM", "Pralnia przywraca ziemską grawitację. Wejdź do rury, potem otwórz drzwiczki.", "Po całej podróży nadal brakuje jednej skarpetki.", [portal("home-washer", 440, 390, 700, 295), button("laundry-button", 895, 355), gate("washer-door", 995, "laundry-button")], { scene: "laundry", environment: { gravity: 1, drag: 0 } }),
  mission(80, "Jeszcze pięć minut. Tym razem serio.", "alarm", 1040, 440, "OSTATNI DZWONEK", "Zadzwoń do sypialni, potem wskocz do domowego skrótu. Budzik czeka od pierwszej misji.", "Budzik: gdzie byłeś przez te pięć minut?!", [button("home-bell", 405, 355), portal("pillow-tunnel", 615, 370, 835, 285), gate("bedroom-door", 950, "home-bell")], { scene: "bedroom", background: "assets/stage_morning_mayhem.svg", environment: { gravity: 1, drag: 0 }, radius: 62, tag: "DOBRANOC, WSZECHŚWIECIE!", gag: "DRZEMKA: 80 MISJI PÓŹNIEJ", gagX: 650, gagY: 90 }),
  // Chapter 11 is the school lab: every mission names one thing that is true
  // about the world and then makes you use it. The jokes carry the lesson, so
  // nobody has to read a paragraph to learn that a long rope keeps slow time.
  mission(81, "Pani od fizyki wiesza salami", "sandwich", 980, 380, "WAHADŁO: CZEKAJ NA MOMENT", "Salami wisi na sznurku i wraca zawsze w tym samym rytmie. Policz do trzech i przeleć, kiedy odpływa.", "Pierwsza lekcja: cierpliwość jest darmowa.", [pendulum("salami", 620, 120, 250, .8)], { scene: "laundry", tag: "ZDANE!" }),
  mission(82, "Trampolina pamięta wszystko", "coffee", 900, 300, "SPRĘŻYNA: JAKI PRZYLOT, TAKI WYSTRZAŁ", "Sprężyna oddaje tyle, ile jej dasz. Wejdź w nią miękko, a ledwie odpowie. Wejdź mocno, a wyrzuci Cię wysoko.", "Kawa na regale. Kubek nie pytał o zgodę.", [spring("board", 470, 520, 660, 520, .55)], { scene: "kitchen", tag: "WYSOKI LOT!" }),
  mission(83, "Salami kontra trampolina", "sock", 1000, 440, "WAHADŁO I SPRĘŻYNA", "Odbij się mocno, a potem przeczekaj wahadło. Kolejność ma znaczenie, bo sprężyna nie czeka.", "Skarpetka widziała wszystko i nic nie powie.", [spring("launch", 400, 540, 560, 540), pendulum("ham", 730, 130, 230, .75, 1.1)], { scene: "laundry" }),
  mission(84, "Długi sznurek, krótki sznurek", "bell", 1010, 350, "DŁUGOŚĆ DECYDUJE O RYTMIE", "Dwa wahadła, dwie różne długości. Krótsze wraca szybciej. Nie zgadujesz — możesz to policzyć.", "Dzwonek ogłasza koniec lekcji. Lekcja się nie zgadza.", [pendulum("short-rope", 455, 110, 150, .6), pendulum("long-rope", 800, 110, 300, .6, .6)], { scene: "living-room", tag: "RYTM ZŁAPANY!" }),
  mission(85, "Przerwa na kanapkę", "sandwich", 700, 300, "SPOKOJNY ODBIÓR", "Jedna sprężyna, żadnego pośpiechu. Sprawdź, jak mocne wejście daje jak wysoki wyskok.", "Kanapka skorzystała z przerwy wcześniej niż Ty.", [spring("break-pad", 400, 530, 580, 530, .6)], { scene: "garden", tag: "SMACZNEGO!" }),
  mission(86, "Eksperyment wymknął się spod kontroli", "toaster", 990, 460, "SPRĘŻYNA NAD STREFĄ", "Sprężyna wyrzuci Cię ponad gorącą płytę, ale tylko jeśli wejdziesz w nią z prędkością. Miękko znaczy prosto w kłopoty.", "Toster przyznaje się do współudziału.", [spring("hot-launch", 380, 545, 540, 545, 1.15), hazard("hotplate", 620, 470, 90, 116, "GORĄCE!", "Płyta grzewcza kończy eksperyment. Przeleć nad nią, nie przez nią.")], { scene: "kitchen" }),
  mission(87, "Dzwonek, wahadło, drzwi", "remote", 1005, 400, "PRZYCISK PRZED WAHADŁEM", "Zadzwoń, zanim wahadło zamknie drogę. Bramka otworzy się dopiero po sygnale.", "Pilot znaleziony. Pod wahadłem, oczywiście.", [button("lab-bell", 430, 400), pendulum("swinging-lamp", 700, 120, 220, .8, .4), gate("lab-door", 890, "lab-bell")], { scene: "living-room" }),
  mission(88, "Egzamin praktyczny", "alarm", 1010, 465, "WSZYSTKO NARAZ", "Sprężyna, potem wahadło, potem dzwonek i drzwi. Pracownia sprawdza, czy słuchałeś.", "Zaliczone. Pani od fizyki wraca do salami.", [spring("exam-pad", 360, 550, 500, 550), pendulum("exam-swing", 700, 115, 260, .85, .9), button("exam-bell", 870, 380), gate("exam-door", 960, "exam-bell")], { scene: "laundry", radius: 60, tag: "ZALICZONE!", gag: "PRACOWNIA FIZYCZNA", gagX: 380, gagY: 86 }),
];
