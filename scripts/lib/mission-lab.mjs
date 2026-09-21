// The mission laboratory: inventing a candidate mission, and judging it.
//
// The ask was a prototyping tool where missions arise by themselves. Nothing
// here decides what is good. Every judgement is made by the machinery that
// certifies the shipped campaign: the layout comes from campaign.js's own
// `mission()` (scaling, gap relaxation, reach growth), the route and its
// tolerance from route-search.mjs, the spacing from prop-art.js.
//
// The thresholds are measured off the shipped campaign, never invented. Two
// rules were tried and dropped because the campaign itself fails them:
// "obstacles must shrink the winning set" (props like portals and wind ENLARGE
// it) and "an obstacle you fly around must change what wins" (15 of 23
// authored ones change it by 0% — a gate's job is to make its switch matter,
// not to narrow the aim).
import { GameModel } from "../../src/game.js";
import { mission } from "../../src/campaign.js";
import { level } from "../../src/levels.js";
import { PROP_CLEARANCE, clearanceBetween, goalParts, propParts } from "../../src/prop-art.js";
import { starFor, widestRoute, winningPulls } from "./route-search.mjs";

// Seeded, so a run can be repeated exactly and a good mission found today can
// be found again tomorrow.
let state = 7;
export const seed = (value) => { state = (value >>> 0) || 1; };
const random = () => ((state = (state * 1664525 + 1013904223) >>> 0) / 4294967296);
const pick = (list) => list[Math.floor(random() * list.length)];
const between = (low, high) => low + random() * (high - low);
const step = (low, high, grain = 5) => Math.round(between(low, high) / grain) * grain;

// The authored coordinate space the campaign is written in: obstacles live
// between the sling and the goal, and `mission()` scales them to the shot.
const BAND = { near: [380, 560], mid: [560, 780], far: [780, 980] };
const bandX = (band) => step(...BAND[band]);

// Mission shapes, written the way a designer writes them: each one is a rule
// the flight has to answer, not a decoration. The builders mirror the private
// helpers in campaign.js; they are duplicated here on purpose, because this
// file invents layouts and campaign.js records authored ones.
const p = (x, y) => ({ x, y });
export const ARCHETYPES = [
  {
    id: "breakable", mechanic: "PRZEBIJ KARTON",
    clue: "Karton pęka raz. Za nim już nic nie zatrzyma lotu.",
    build: (band) => {
      const x = bandX(band), y = step(150, 260), height = step(320, 430);
      return [{ id: "carton", type: "breakable", x, y, width: 60, height, label: "OSTROŻNIE" }];
    },
  },
  {
    id: "portal", mechanic: "PORTAL",
    clue: "Miętowe wejście prowadzi do fioletowego wyjścia. Pęd zostaje z Tobą.",
    build: (band) => {
      const x = bandX(band), y = step(280, 430);
      const ex = Math.min(1000, x + step(180, 330)), ey = step(230, 400);
      return [{ id: "pipe", type: "portal", entry: p(x, y), exit: p(ex, ey), radius: 68, turn: 0 }];
    },
  },
  {
    id: "gate", mechanic: "PRZYCISK I BRAMKA",
    clue: "Bramka jest zamknięta, dopóki nie trafisz w przycisk.",
    build: (band) => {
      const buttonX = bandX(band), buttonY = step(300, 430);
      const gateX = Math.min(1010, buttonX + step(200, 320));
      return [
        { id: "bell", type: "switch", x: buttonX, y: buttonY, radius: 57, label: "DZYŃ!" },
        { id: "door", type: "gate", x: gateX, y: 130, width: 34, height: 456, switchId: "bell", label: "BRAMKA" },
      ];
    },
  },
  {
    id: "hazard", mechanic: "STREFA ZAKAZANA",
    clue: "Czerwona strefa kończy lot od dotknięcia. Poprowadź tor obok niej.",
    build: (band) => {
      const x = bandX(band), height = step(150, 260);
      return [{ id: "spikes", type: "hazard", x, y: 586 - height, width: step(70, 140), height, label: "NIE DOTYKAJ" }];
    },
  },
  {
    id: "ramp", mechanic: "KĄT = KIERUNEK",
    clue: "Opadnij na ukos. Kąt zrobi resztę.",
    build: (band) => {
      const ax = bandX(band), ay = step(430, 520);
      return [{ id: "slope", type: "cushion", a: p(ax, ay), b: p(ax + step(200, 330), ay + step(40, 110)), thickness: 16, label: "KĄT = KIERUNEK" }];
    },
  },
  {
    id: "spring", mechanic: "SPRĘŻYNA",
    clue: "Sprężyna oddaje tyle, ile dostanie. Mocniej w dół znaczy wyżej w górę.",
    build: (band) => {
      const ax = bandX(band), ay = step(470, 540);
      return [{ id: "pad", type: "spring", a: p(ax, ay), b: p(ax + step(150, 240), ay), thickness: 15, threshold: 180, base: .55, gain: 1.15, label: "SPRĘŻYNA" }];
    },
  },
  {
    id: "wind", mechanic: "PODMUCH",
    clue: "Strzałki pokazują wiatr. Przeleć przez niego, a poniesie Cię dalej.",
    build: (band) => {
      const x = bandX(band), y = step(150, 260);
      return [{ id: "gust", type: "steam", x, y, width: step(240, 360), height: step(280, 380),
        force: p(step(420, 720, 10), -step(260, 420, 10)), label: "PODMUCH →" }];
    },
  },
  {
    id: "moving-wall", mechanic: "RUCHOMA PRZESZKODA",
    clue: "Ściana wraca w to samo miejsce. Policz jej rytm.",
    build: (band) => {
      const x = bandX(band), y = step(200, 300);
      return [{ id: "shutter", type: "solid", x, y, width: 80, height: 586 - y - step(60, 160), label: "OMIŃ",
        motion: { axis: pick(["x", "y"]), amplitude: step(30, 60), speed: between(.7, 1.1) } }];
    },
  },
  {
    id: "pendulum", mechanic: "WAHADŁO",
    clue: "Wahadło wie, która godzina. Przeleć, kiedy odchodzi.",
    build: (band) => {
      const x = bandX(band), length = step(150, 280);
      return [{ id: "swing", type: "pendulum", x: x - 38, y: 110 + length - 38, width: 76, height: 76,
        pendulum: { x, y: 110, length, swing: between(.5, .8), speed: Math.sqrt(1050 / length), phase: between(0, 1) }, label: "WAHADŁO" }];
    },
  },
];

// A candidate: one or two rules, placed in different parts of the flight.
export function compose(index) {
  const slot = 9 + Math.floor(random() * 80);          // chapter, scene and goal size
  const pair = random() < 0.42;
  const first = pick(ARCHETYPES);
  const second = pair ? pick(ARCHETYPES.filter((a) => a.id !== first.id)) : null;
  const bands = pair ? (random() < 0.5 ? ["near", "far"] : ["mid", "far"]) : [pick(["near", "mid", "far"])];
  const parts = [first.build(bands[0]), ...(second ? [second.build(bands[1])] : [])];
  const interactions = parts.flat().map((item, i) => ({ ...item, id: `${item.id}-${i}` }));
  const shape = {
    reach: pick(["short", "mid", "long"]),
    height: pick(["low", "mid", "high"]),
  };
  const mechanic = second ? `${first.mechanic} + ${second.mechanic}` : first.mechanic;
  const clue = second ? `${first.clue} ${second.clue}` : first.clue;
  return {
    slot, shape, mechanic, clue, interactions,
    archetypes: second ? [first.id, second.id] : [first.id],
    name: `Prototyp ${String(index).padStart(3, "0")}`,
    authored: { x: step(900, 1080), y: step(360, 460) },
  };
}

// Spacing, measured on the drawings the renderer will really paint — the same
// question validate.mjs asks of the shipped campaign.
function worstClearance(built) {
  const groups = built.interactions.map((item) => ({ id: item.id, parts: propParts(item) })).filter((g) => g.parts.length);
  groups.push({ id: "goal", parts: goalParts(built.goal) });
  let worst = Infinity;
  for (let i = 0; i < groups.length; i += 1) {
    for (let j = i + 1; j < groups.length; j += 1) {
      const air = clearanceBetween(groups[i].parts, groups[j].parts);
      if (Number.isFinite(air)) worst = Math.min(worst, air);
    }
  }
  return worst;
}

export function judge(candidate) {
  const config = mission(
    candidate.slot, candidate.name, "suitcase", candidate.authored.x, candidate.authored.y,
    candidate.mechanic, candidate.clue, "Prototyp wylądował.", candidate.interactions,
    { route: null, shot: candidate.shape },
  );
  const built = level(config);

  // Measured on the shipped campaign: no authored portal drops the hero closer
  // than 184 px to the goal, and closer than that the pipe simply delivers the
  // win. The gap relaxation covers most of it — a portal box is 160 px wide, so
  // 30 px of air from the goal's artwork already leaves about 187 px between
  // centres — but not all of it: a portal authored PAST the goal is relaxed
  // away from the artwork while its exit stays near the target, and builds as
  // close as 126 px. That case is this rule's job.
  for (const item of built.interactions.filter((i) => i.type === "portal")) {
    const drop = Math.hypot(item.exit.x - built.goal.x, item.exit.y - built.goal.y);
    if (drop < 180) return { ok: false, why: `portal exit ${Math.round(drop)} px from the goal` };
  }

  const air = worstClearance(built);
  if (air < PROP_CLEARANCE - 0.5) return { ok: false, why: `objects ${Math.round(air)} px apart` };
  const leftmost = Math.min(built.goal.x, ...built.interactions.flatMap((item) => propParts(item).map((part) => part.left)));
  if (leftmost - built.anchor.x < 120) return { ok: false, why: "artwork boxes the sling in" };

  const model = new GameModel(() => {}, built);
  const { winners, total } = winningPulls(model);
  if (!winners.length) return { ok: false, why: "no winning route" };
  const { best, margin, ranked } = widestRoute(model, winners);
  if (!best) return { ok: false, why: "no forgiving route" };
  if (margin < 8) return { ok: false, why: `only ±${margin} px of aim` };

  const withRoute = level(mission(
    candidate.slot, candidate.name, "suitcase", candidate.authored.x, candidate.authored.y,
    candidate.mechanic, candidate.clue, "Prototyp wylądował.", candidate.interactions,
    { route: { pull: best.pull }, shot: candidate.shape },
  ));
  const chosen = starFor(withRoute, ranked, best);
  if (!chosen) return { ok: false, why: "no room for the optional star" };

  // A mission whose rule can be ignored is decoration. Every required object
  // has to be visited by the winning flight.
  const played = new GameModel(() => {}, withRoute);
  const shot = played.simulate(best.pull, 70);
  if (!shot.reachesGoal) return { ok: false, why: "the stored route stopped winning" };

  return {
    ok: true,
    mission: {
      name: candidate.name, slot: candidate.slot, archetypes: candidate.archetypes,
      mechanic: candidate.mechanic, clue: candidate.clue, shape: candidate.shape,
      authored: candidate.authored, interactions: candidate.interactions,
      route: { pull: best.pull, ...chosen }, margin,
      winningShare: Number((winners.length / total).toFixed(3)),
      clearance: Number.isFinite(air) ? Math.round(air) : null,
    },
  };
}

