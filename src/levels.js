const freezePoint = ({ x, y }) => Object.freeze({ x, y });
const freezeRect = ({ x, y, width, height, enabled = true }) => Object.freeze({ x, y, width, height, enabled });

export const WORLD = Object.freeze({
  width: 1280,
  height: 640,
});

const morningMayhem = Object.freeze({
  id: "morning-mayhem",
  number: 1,
  name: "7:03",
  scene: "bedroom",
  background: "assets/stage_morning_mayhem.svg",
  mission: Object.freeze({
    kicker: "MISJA 01",
    title: "Ucisz budzik bez wstawania z łóżka",
    canvasLabel: "Złap bohatera, naciągnij procę i traf w budzik",
  }),
  result: Object.freeze({
    successTag: "SNOOZE!",
    successTitle: "Poranek oficjalnie przełożony.",
    failureTag: "FLOP!",
    failureTitle: "Budzik nadal rządzi sypialnią.",
  }),
  tutorial: Object.freeze({
    pull: freezePoint({ x: 70, y: 535 }),
    title: "Pociągnij w dół i w lewo",
    status: "Puść, gdy kropki prowadzą do budzika.",
  }),
  anchor: freezePoint({ x: 173, y: 455 }),
  groundY: 586,
  trampoline: Object.freeze({
    x: 575,
    y: 515,
    width: 156,
    height: 25,
    minX: 340,
    maxX: 660,
    enabled: true,
  }),
  // Level one teaches one verb: pull and release. The fan stays dormant in
  // the normal route, but can wake up as a real What If experiment.
  fan: freezeRect({ x: 720, y: 245, width: 165, height: 310, enabled: false }),
  crate: freezeRect({ x: 452, y: 442, width: 94, height: 144, enabled: false }),
  // The opening mission teaches the sling itself. The wall returns in later
  // levels, after the player has already learned the launch arc.
  wall: freezeRect({ x: 952, y: 427, width: 34, height: 159, enabled: false }),
  goal: Object.freeze({
    kind: "alarm",
    shape: "circle",
    x: 1127,
    y: 486,
    radius: 112,
    displayScale: 1.18,
  }),
});

export const LEVELS = Object.freeze([morningMayhem]);
export const DEFAULT_LEVEL = LEVELS[0];

export function getLevel(reference = 0) {
  if (typeof reference === "string") {
    return LEVELS.find((level) => level.id === reference) ?? DEFAULT_LEVEL;
  }
  return LEVELS[reference] ?? DEFAULT_LEVEL;
}
