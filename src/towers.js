// Chapter 12: towers.
//
// The rest of the campaign is "get the hero to the goal". This chapter is the
// other kind of slingshot game: the goal sits on top of a fort of wood, glass
// and stone (src/blocks.js), and the mission is won by bringing it down —
// broken, or knocked off onto the floor. Every fort is built from the same few
// pieces so a player learns the materials once: wood takes a beating, glass
// shatters, stone is heavy and barely notices.
//
// Each mission's hint pull is measured, not designed: scripts/balance-towers.mjs
// searches the same grid of pulls the campaign balancer does and stores the
// most forgiving shot that actually brings the target down.
import { TOWER_ROUTES } from "./tower-routes.js?v=0.51.1";

const FLOOR = 586;
// Vertical post standing on `base` (the floor or the top of something).
const post = (id, x, height, material = "wood", base = FLOOR, width = 22) => ({ id, material, x, y: base - height / 2, width, height });
// Horizontal beam whose underside rests at `base`.
const beam = (id, x, width, material = "wood", base = FLOOR, height = 22) => ({ id, material, x, y: base - height / 2, width, height });
const box = (id, x, size, material = "wood", base = FLOOR) => ({ id, material, x, y: base - size / 2, width: size, height: size });
const target = (x, base, size = 58) => ({ id: "target", material: "target", target: true, x, y: base - size / 2, width: size, height: size });

// A post-and-lintel storey: two posts and a beam across them. Returns the
// pieces and the height of its top.
function storey(prefix, x, span, height, base, postMaterial = "wood", beamMaterial = "wood") {
  const pieces = [
    post(`${prefix}-l`, x - span / 2, height, postMaterial, base),
    post(`${prefix}-r`, x + span / 2, height, postMaterial, base),
    beam(`${prefix}-top`, x, span + 40, beamMaterial, base - height),
  ];
  return { pieces, top: base - height - 22 };
}

function fort(...parts) { return parts.flat(); }

const MISSIONS = [
  {
    number: 89, name: "Wieża z patyczków", scene: "laundry",
    mechanic: "STRĄĆ CEL", clue: "Budzik stoi na dwóch patykach i desce. Wystarczy porządnie trafić w podporę.",
    win: ["BUDZIK W DÓŁ!", "Budzik spadł i dalej dzwoni. Z niższego piętra."],
    build: () => { const a = storey("s1", 960, 96, 110, FLOOR); return fort(a.pieces, target(960, a.top)); },
  },
  {
    number: 90, name: "Pałac ze szkła", scene: "fairground",
    mechanic: "SZKŁO PĘKA", clue: "Szkło nie lubi odwiedzin. Jeden mocny strzał w filar i pałac zostaje lustrem.",
    win: ["DZYŃ!", "Pałac kryształowy przeszedł w tryb konfetti."],
    build: () => {
      const a = storey("s1", 980, 100, 120, FLOOR, "glass", "wood");
      const b = storey("s2", 980, 80, 90, a.top, "glass", "glass");
      return fort(a.pieces, b.pieces, target(980, b.top));
    },
  },
  {
    number: 91, name: "Kamienny kapelusz", scene: "harbour",
    mechanic: "KAMIEŃ JEST CIĘŻKI", clue: "Kamienna płyta na górze jest ciężka. Wytrąć podporę, a ona zrobi resztę.",
    win: ["ŁUP!", "Kapelusz spadł. Głowa twierdzy też."],
    build: () => {
      const a = storey("s1", 950, 110, 140, FLOOR, "wood", "stone");
      return fort(a.pieces, target(950, a.top));
    },
  },
  {
    number: 92, name: "Mur przed wieżą", scene: "harbour",
    mechanic: "PRZERZUĆ MUR", clue: "Niski kamienny mur chroni wieżę. Łuk nad murem, potem prosto w budzik.",
    win: ["PRZEZ MUR!", "Mur stał dzielnie. Wieża stała za nim. Już nie stoi."],
    build: () => {
      const wall = [box("wall-a", 760, 60, "stone"), box("wall-b", 760, 60, "stone", FLOOR - 60)];
      const a = storey("s1", 1010, 80, 120, FLOOR);
      const b = storey("s2", 1010, 70, 100, a.top);
      return fort(wall, a.pieces, b.pieces, target(1010, b.top));
    },
  },
  {
    number: 93, name: "Domino w kapciach", scene: "living-room",
    mechanic: "REAKCJA ŁAŃCUCHOWA", clue: "Celuj prosto w budzik albo przewróć pierwszą deskę — domino zrobi resztę za Ciebie.",
    win: ["DOMINO!", "Pięć desek, jedna decyzja, zero odpowiedzialności."],
    build: () => {
      const planks = [760, 830, 900, 970].map((x, i) => post(`d${i + 1}`, x, 130 + i * 6, "wood", FLOOR, 18));
      const a = storey("s1", 1090, 70, 110, FLOOR);
      return fort(planks, a.pieces, target(1090, a.top));
    },
  },
  {
    number: 94, name: "Bunkier z dachem ze szkła", scene: "spaceport",
    mechanic: "Z GÓRY", clue: "Kamienne ściany, szklany dach. Boki tego nie poczują — wejdź od góry.",
    win: ["TRAFIENIE Z NIEBA!", "Dach był szklany. Był."],
    build: () => {
      const walls = [post("w-l", 800, 110, "stone", FLOOR, 30), post("w-r", 960, 110, "stone", FLOOR, 30)];
      const roof = beam("roof", 880, 220, "glass", FLOOR - 110, 20);
      const plinth = box("plinth", 880, 50, "wood");
      return fort(walls, roof, plinth, target(880, FLOOR - 50, 52));
    },
  },
  {
    number: 95, name: "Piramida z pudełek", scene: "fairground",
    mechanic: "WYBIJ PODSTAWĘ", clue: "Piramida trzyma się na dolnym rzędzie. Wybij jedno pudełko z dołu i patrz.",
    win: ["PIRAMIDA LEŻY!", "Faraon by się nie zgodził. Faraona nie było."],
    build: () => {
      const s = 56, row = (n, base, x0, mat) => Array.from({ length: n }, (_, i) => box(`r${base}-${i}`, x0 + i * s, s, mat, FLOOR - base * s));
      return fort(row(4, 0, 900, "wood"), row(3, 1, 928, "wood"), row(2, 2, 956, "glass"), target(984, FLOOR - 3 * s, 52));
    },
  },
  {
    number: 96, name: "Zamek budzika", scene: "park",
    mechanic: "FINAŁ WIEŻ", clue: "Dwa piętra, trzy materiały, jeden budzik. Szkło w środku jest najsłabszym ogniwem.",
    win: ["ZAMEK ZDOBYTY!", "Budzik kapituluje. Do jutra, 7:03."],
    build: () => {
      const a = storey("s1", 1000, 150, 110, FLOOR, "stone", "wood");
      const mid = [post("m-l", 975, 80, "glass", a.top), post("m-r", 1025, 80, "glass", a.top)];
      const b = beam("m-top", 1000, 120, "stone", a.top - 80);
      const towerL = [box("t-l1", 860, 50, "wood"), box("t-l2", 860, 50, "wood", FLOOR - 50)];
      return fort(a.pieces, mid, b, towerL, target(1000, a.top - 80 - 22));
    },
  },
];

export const TOWER_CHAPTER = Object.freeze({ id: "towers", name: "Wieże do góry nogami", subtitle: "Drewno, szkło, kamień i budzik na szczycie", scene: "harbour" });

export function towerMissions(chapterName) {
  return MISSIONS.map((m) => {
    const towers = m.build();
    const goal = towers.find((piece) => piece.target);
    const route = TOWER_ROUTES[m.number];
    const pull = route?.pull ?? { x: 55, y: 500 };
    return {
      id: `towers-${m.number}`, number: m.number, name: m.name, chapterId: "towers", chapter: chapterName.toUpperCase(),
      scene: m.scene, environment: { gravity: 1, drag: 0 }, background: null,
      mechanic: m.mechanic, title: m.name, clue: m.clue,
      direction: "Wieża przewraca się od podpór. Trafiony filar ciągnie za sobą wszystko, co na nim stoi.",
      pull, towers,
      // Shots a round: three, and four for the finale.
      shots: m.number === 96 ? 4 : 3,
      goal: { kind: "alarm", shape: "circle", x: goal.x, y: goal.y, radius: 44, scale: 1, displayScale: goal.width / 118 },
      star: route?.star ?? null, starPull: route?.starPull, interactions: [], required: [], requirement: "Strąć budzik z wieży.",
      editable: null, water: { enabled: false },
      visual: { accent: "#ffd35f", wash: "rgba(255,211,95,.015)", variant: (m.number - 89) % 4, companion: "harbour" },
      pacing: m.number === 89 ? "discovery" : m.number === 96 ? "finale" : "play",
      win: m.win, lose: "Wieża postała. Wieża się śmieje. Jeszcze raz.",
      freeStages: m.number === 89 ? 1 : 0,
    };
  });
}
