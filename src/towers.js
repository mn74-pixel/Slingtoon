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
import { TOWER_ROUTES } from "./tower-routes.js?v=0.52.0";

const FLOOR = 586;
// Vertical post standing on `base` (the floor or the top of something).
const post = (id, x, height, material = "wood", base = FLOOR, width = 22) => ({ id, material, x, y: base - height / 2, width, height });
// Horizontal beam whose underside rests at `base`.
const beam = (id, x, width, material = "wood", base = FLOOR, height = 22) => ({ id, material, x, y: base - height / 2, width, height });
const box = (id, x, size, material = "wood", base = FLOOR) => ({ id, material, x, y: base - size / 2, width: size, height: size });
const target = (x, base, size = 58, id = "target") => ({ id, material: "target", target: true, x, y: base - size / 2, width: size, height: size });
// A second, third... alarm clock on the same fort. Each needs its own id.
const clock = (id, x, base, size = 50) => target(x, base, size, `target-${id}`);
// A short wooden plinth: an alarm clock standing on the floor would already
// count as knocked down, so clocks inside a fort stand on one of these.
const plinth = (id, x, base = FLOOR, size = 34, material = "wood") => box(`plinth-${id}`, x, size, material, base);

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


// Chapters 13-15: forts with several alarm clocks. The fort is won when every
// clock is down; each clock and each broken block is worth points, and the
// score earns one to three stars (thresholds measured by
// scripts/balance-towers.mjs).
const FORT_MISSIONS = [
  // Chapter 13: Budziki w stadzie — more than one clock.
  {
    number: 97, chapter: 1, name: "Dwa budziki, jedna deska", scene: "park",
    mechanic: "DWA CELE", clue: "Dwa budziki dzielą jedną deskę. Wytrąć podporę, a pojadą razem.",
    win: ["DWA Z GŁOWY!", "Dwa budziki, jeden lot. Ekonomia."],
    build: () => { const a = storey("s1", 960, 150, 100, FLOOR); return fort(a.pieces, clock("a", 925, a.top), clock("b", 995, a.top)); },
  },
  {
    number: 98, chapter: 1, name: "Bliźniacze wieże", scene: "harbour",
    mechanic: "DWIE WIEŻE", clue: "Dwie wieże, dwa budziki. Pierwszą wieżę możesz pchnąć na drugą.",
    win: ["BLIŹNIAKI LEŻĄ!", "Rodzeństwo pokłóciło się o to, kto pierwszy upadł."],
    build: () => {
      const a = storey("a1", 860, 70, 130, FLOOR), b = storey("b1", 1010, 70, 130, FLOOR);
      return fort(a.pieces, b.pieces, clock("a", 860, a.top), clock("b", 1010, b.top));
    },
  },
  {
    number: 99, chapter: 1, name: "Piętrowe łóżko", scene: "laundry",
    mechanic: "BUDZIK W ŚRODKU", clue: "Jeden budzik śpi na dole, drugi na górze. Dolny leży na podeście — zwal go z niego.",
    win: ["POBUDKA!", "Górne łóżko spadło na dolne. Klasyka."],
    build: () => {
      const a = storey("s1", 980, 120, 110, FLOOR), b = storey("s2", 980, 90, 90, a.top);
      return fort(a.pieces, plinth("in", 980), clock("in", 980, FLOOR - 34, 46), b.pieces, clock("top", 980, b.top));
    },
  },
  {
    number: 100, chapter: 1, name: "Szklany regał", scene: "fairground",
    mechanic: "SZKŁO PĘKA", clue: "Regał ze szkła, dwa budziki na półkach. Szkło nie wybacza.",
    win: ["REGAŁ W KAWAŁKACH!", "Instrukcja montażu mówiła: nie strzelać."],
    build: () => {
      const a = storey("s1", 970, 110, 100, FLOOR, "glass", "glass"), b = storey("s2", 970, 110, 100, a.top, "glass", "wood");
      return fort(a.pieces, plinth("a", 970, a.top, 30), clock("a", 970, a.top - 30, 44), b.pieces, clock("b", 970, b.top));
    },
  },
  {
    number: 101, chapter: 1, name: "Trzech na moście", scene: "beach",
    mechanic: "MOST", clue: "Trzy budziki na drewnianym moście. Most trzyma się na dwóch kamiennych słupkach.",
    win: ["MOST ZAMKNIĘTY!", "Remont mostu potrwa do jutra, 7:03."],
    build: () => {
      const pillar = (id, x) => [box(`${id}-1`, x, 50, "stone"), box(`${id}-2`, x, 50, "stone", FLOOR - 50)];
      const deck = beam("deck", 960, 260, "wood", FLOOR - 100);
      return fort(pillar("pl", 860), pillar("pr", 1060), deck, clock("a", 890, FLOOR - 122, 44), clock("b", 960, FLOOR - 122, 44), clock("c", 1030, FLOOR - 122, 44));
    },
  },
  {
    number: 102, chapter: 1, name: "Kamienny parasol", scene: "spaceport",
    mechanic: "POD DACHEM", clue: "Kamienna płyta osłania dwa budziki od góry. Wybij nogę parasola.",
    win: ["PARASOL ZŁOŻONY!", "Prognoza: zachmurzenie kamieniami."],
    build: () => {
      const a = storey("s1", 960, 170, 110, FLOOR, "wood", "stone");
      return fort(a.pieces, plinth("a", 925), plinth("b", 995), clock("a", 925, FLOOR - 34, 44), clock("b", 995, FLOOR - 34, 44), clock("top", 960, a.top));
    },
  },
  {
    number: 103, chapter: 1, name: "Domino z budzikami", scene: "living-room",
    mechanic: "DOMINO", clue: "Pchnij pierwszą deskę. Ostatnia wpadnie na stół z dwoma budzikami.",
    win: ["DOMINO!", "Pięć desek, dwa budziki, zero sprzątania."],
    build: () => {
      const planks = [740, 805, 870].map((x, i) => post(`d${i + 1}`, x, 120 + i * 8, "wood", FLOOR, 18));
      const a = storey("s1", 1010, 110, 100, FLOOR);
      return fort(planks, a.pieces, clock("a", 985, a.top, 44), clock("b", 1040, a.top, 44));
    },
  },
  {
    number: 104, chapter: 1, name: "Rodzinka na ławce", scene: "park",
    mechanic: "FINAŁ STADA", clue: "Trzy budziki siedzą na jednej ławce. Wytrąć nogę ławki, a zjadą całą rodziną.",
    win: ["CAŁA RODZINA!", "Rodzinny zjazd budzików zakończony przed czasem."],
    build: () => { const a = storey("s1", 960, 170, 100, FLOOR); return fort(a.pieces, clock("a", 905, a.top, 42), clock("b", 960, a.top, 42), clock("c", 1015, a.top, 42)); },
  },
  // Chapter 14: Majster od rozbiórki — materials and structures.
  {
    number: 105, chapter: 2, name: "Wszystko ze szkła", scene: "fairground",
    mechanic: "TRZY PIĘTRA SZKŁA", clue: "Trzy piętra szkła. Wystarczy jedno mocne pęknięcie u dołu.",
    win: ["DZYŃ DZYŃ DZYŃ!", "Szklana wieża przeszła w stan sypki."],
    build: () => {
      const a = storey("s1", 980, 90, 90, FLOOR, "glass", "glass"), b = storey("s2", 980, 80, 80, a.top, "glass", "glass"), c = storey("s3", 980, 70, 70, b.top, "glass", "wood");
      return fort(a.pieces, b.pieces, c.pieces, clock("top", 980, c.top));
    },
  },
  {
    number: 106, chapter: 2, name: "Kamienna stopa", scene: "harbour",
    mechanic: "MIESZANKA", clue: "Na dole kamień, wyżej drewno, na samej górze szkło. Celuj tam, gdzie słabo.",
    win: ["STOPA ZWICHNIĘTA!", "Kamień wytrzymał. Reszta nie musiała."],
    build: () => {
      const a = storey("s1", 980, 110, 90, FLOOR, "stone", "stone"), b = storey("s2", 980, 90, 90, a.top, "wood", "wood"), c = storey("s3", 980, 70, 70, b.top, "glass", "glass");
      return fort(a.pieces, b.pieces, clock("mid", 980, b.top, 44), c.pieces, clock("top", 980, c.top, 44));
    },
  },
  {
    number: 107, chapter: 2, name: "Drewniany płot", scene: "park",
    mechanic: "PRZEZ PŁOT", clue: "Płot z desek stoi przed wieżą. Przeskocz albo przebij.",
    win: ["PŁOT NIE POMÓGŁ!", "Sąsiedzi pytają, kto zapłaci za płot."],
    build: () => {
      const fence = [770, 800, 830].map((x, i) => post(`f${i + 1}`, x, 90, "wood", FLOOR, 16));
      const a = storey("s1", 1020, 100, 110, FLOOR), b = storey("s2", 1020, 80, 90, a.top);
      return fort(fence, a.pieces, clock("mid", 1020, a.top, 44), b.pieces, clock("top", 1020, b.top, 44));
    },
  },
  {
    number: 108, chapter: 2, name: "Kamienny dach", scene: "spaceport",
    mechanic: "CIĘŻKI DACH", clue: "Kamienny dach na drewnianych nogach. Jeden budzik na dachu, drugi pod nim na szklanym stołku.",
    win: ["DACH SIADŁ!", "Szklany stołek nie był gotowy na kamień."],
    build: () => {
      const a = storey("s1", 970, 140, 110, FLOOR, "wood", "stone");
      return fort(a.pieces, plinth("in", 970, FLOOR, 44, "glass"), clock("in", 970, FLOOR - 44, 44), clock("roof", 970, a.top, 44));
    },
  },
  {
    number: 109, chapter: 2, name: "Wieża z klocków", scene: "laundry",
    mechanic: "KOLUMNY", clue: "Dwie kolumny z klocków. Trafiona w środek składa się jak harmonijka.",
    win: ["KLOCKI DO PUDEŁKA!", "Sprzątanie zostawiamy dorosłym."],
    build: () => {
      const col = (id, x, mats) => mats.map((m, i) => box(`${id}${i}`, x, 50, m, FLOOR - i * 50));
      return fort(col("a", 900, ["stone", "wood", "glass", "wood"]), clock("a", 900, FLOOR - 200, 46),
        col("b", 1040, ["wood", "glass", "wood"]), clock("b", 1040, FLOOR - 150, 46));
    },
  },
  {
    number: 110, chapter: 2, name: "Ciężki dach", scene: "beach",
    mechanic: "KAMIEŃ NA SZKLE", clue: "Kamienny dach na szklanych nogach. Pęknij nogę, dach zrobi resztę.",
    win: ["DACH NA DÓŁ!", "Architekt prosił, żeby tego nie robić."],
    build: () => {
      const a = storey("s1", 980, 140, 110, FLOOR, "glass", "stone");
      return fort(a.pieces, plinth("in", 980, FLOOR, 40), clock("in", 980, FLOOR - 40, 44), clock("top", 980, a.top));
    },
  },
  {
    number: 111, chapter: 2, name: "Dwa domki", scene: "living-room",
    mechanic: "SĄSIEDZI", clue: "Domek z drewna i domek ze szkła. Szklany pęknie od byle czego — drewniany trzeba pchnąć.",
    win: ["OSIEDLE ZBURZONE!", "Wspólnota mieszkaniowa zbiera się na zebranie."],
    build: () => {
      const a = storey("a1", 860, 90, 110, FLOOR, "wood", "wood"), b = storey("b1", 1040, 90, 110, FLOOR, "glass", "glass");
      return fort(a.pieces, clock("a", 860, a.top), b.pieces, clock("b", 1040, b.top));
    },
  },
  {
    number: 112, chapter: 2, name: "Magazyn budzików", scene: "harbour",
    mechanic: "FINAŁ ROZBIÓRKI", clue: "Trzy piętra, trzy budziki. Dolne piętro jest z kamienia — nie tam.",
    win: ["MAGAZYN ZAMKNIĘTY!", "Inwentaryzacja: zero budzików na stanie."],
    build: () => {
      const a = storey("s1", 990, 180, 100, FLOOR, "stone", "wood"), b = storey("s2", 990, 180, 90, a.top, "wood", "wood"), c = storey("s3", 990, 90, 80, b.top, "glass", "glass");
      return fort(a.pieces, plinth("in", 990), clock("in", 990, FLOOR - 34, 44), b.pieces, clock("mid", 905, b.top, 40), c.pieces, clock("top", 990, c.top, 46));
    },
  },
  // Chapter 15: Twierdza Poranka — castles.
  {
    number: 113, chapter: 3, name: "Brama", scene: "park",
    mechanic: "BRAMA", clue: "Dwie kamienne baszty, drewniane nadproże. Budzik na bramie pilnuje przejścia.",
    win: ["BRAMA OTWARTA!", "Strażnik bramy poszedł na drzemkę."],
    build: () => {
      const tower = (id, x) => [box(`${id}1`, x, 50, "stone"), box(`${id}2`, x, 50, "stone", FLOOR - 50), box(`${id}3`, x, 50, "wood", FLOOR - 100)];
      const lintel = beam("lintel", 970, 200, "wood", FLOOR - 150);
      return fort(tower("l", 890), tower("r", 1050), lintel, clock("gate", 970, FLOOR - 172, 46));
    },
  },
  {
    number: 114, chapter: 3, name: "Mury obronne", scene: "harbour",
    mechanic: "MUR", clue: "Kamienny mur przed zamkiem. Łuk nad murem i prosto w środek.",
    win: ["MURY PADŁY!", "Zamek przechodzi na plan otwarty."],
    build: () => {
      const wall = [box("wall-a", 780, 54, "stone"), box("wall-b", 780, 54, "stone", FLOOR - 54), box("wall-c", 834, 54, "stone")];
      const a = storey("s1", 1030, 120, 110, FLOOR), b = storey("s2", 1030, 80, 80, a.top, "glass", "wood");
      return fort(wall, a.pieces, clock("mid", 1030, a.top, 44), b.pieces, clock("top", 1030, b.top, 44));
    },
  },
  {
    number: 115, chapter: 3, name: "Wieża strażnicza", scene: "beach",
    mechanic: "WYSOKO", clue: "Strażnik siedzi na wysokiej wieży, jego kolega w budce obok.",
    win: ["ZMIANA WARTY!", "Obaj strażnicy zgłosili się do lekarza."],
    build: () => {
      const a = storey("s1", 1010, 70, 110, FLOOR), b = storey("s2", 1010, 60, 100, a.top), c = storey("s3", 1010, 50, 80, b.top, "glass", "wood");
      const hut = storey("h1", 860, 70, 70, FLOOR, "glass", "wood");
      return fort(a.pieces, b.pieces, c.pieces, clock("top", 1010, c.top, 44), hut.pieces, clock("hut", 860, hut.top, 44));
    },
  },
  {
    number: 116, chapter: 3, name: "Zamek z kart", scene: "fairground",
    mechanic: "KARTY", clue: "Drewno, szkło, drewno, szkło. Zamek z kart nie lubi przeciągów.",
    win: ["ZAMEK Z KART!", "Talia potasowana. Na zawsze."],
    build: () => {
      const a = storey("s1", 960, 200, 90, FLOOR, "wood", "glass"), b = storey("s2", 960, 120, 80, a.top, "glass", "wood"), c = storey("s3", 960, 80, 70, b.top, "wood", "glass");
      return fort(a.pieces, clock("a", 960, a.top, 44), clock("b", 1056, a.top, 40), b.pieces, c.pieces, clock("c", 960, c.top, 44));
    },
  },
  {
    number: 117, chapter: 3, name: "Dwie baszty i most", scene: "park",
    mechanic: "BASZTY", clue: "Dwie baszty połączone mostem. Zwal jedną, a most pociągnie drugą.",
    win: ["MOST ZERWANY!", "Baszty nie odzywają się do siebie."],
    build: () => {
      const a = storey("a1", 860, 60, 140, FLOOR, "stone", "wood"), b = storey("b1", 1060, 60, 140, FLOOR, "stone", "wood");
      const bridge = beam("bridge", 960, 140, "wood", a.top);
      return fort(a.pieces, b.pieces, bridge, clock("a", 860, a.top, 44), clock("b", 1060, b.top, 44), clock("c", 960, a.top - 22, 40));
    },
  },
  {
    number: 118, chapter: 3, name: "Skarbiec", scene: "spaceport",
    mechanic: "SKARBIEC", clue: "Dwa budziki strzegą skarbca na szklanych stołkach. Kamienny strop spadnie, jeśli podetniesz nogę.",
    win: ["SKARBIEC OTWARTY!", "Skarb: dwa budziki. Rozczarowanie: ogromne."],
    build: () => {
      const a = storey("s1", 970, 160, 110, FLOOR, "wood", "stone");
      return fort(a.pieces, plinth("a", 935, FLOOR, 34, "glass"), plinth("b", 1005, FLOOR, 34, "glass"), clock("a", 935, FLOOR - 34, 42), clock("b", 1005, FLOOR - 34, 42));
    },
  },
  {
    number: 119, chapter: 3, name: "Cytadela", scene: "harbour",
    mechanic: "CYTADELA", clue: "Dwa budziki na murach, trzeci na szklanej wieżyczce. Wieżyczka spada na mury.",
    win: ["CYTADELA ZDOBYTA!", "Kronikarz notuje: o 7:03 wszystko się zawaliło."],
    build: () => {
      const a = storey("s1", 960, 160, 110, FLOOR), b = storey("s2", 960, 90, 90, a.top, "glass", "wood");
      return fort(a.pieces, clock("l", 880, a.top, 40), clock("r", 1040, a.top, 40), b.pieces, clock("top", 960, b.top, 44));
    },
  },
  {
    number: 120, chapter: 3, name: "Twierdza Poranka", scene: "park",
    mechanic: "WIELKI FINAŁ", clue: "Cztery budziki, jedna twierdza, cztery strzały. Ostatni poranek budzików.",
    win: ["TWIERDZA PADŁA!", "Od dziś budzisz się, kiedy chcesz. Prawie."],
    build: () => {
      const a = storey("s1", 970, 200, 100, FLOOR, "wood", "wood"), b = storey("s2", 970, 110, 90, a.top, "glass", "glass");
      return fort(a.pieces, plinth("in", 970, FLOOR, 34, "glass"), clock("in", 970, FLOOR - 34, 40), clock("l", 875, a.top, 40), clock("r", 1065, a.top, 40), b.pieces, clock("top", 970, b.top, 44));
    },
  },
];

export const TOWER_CHAPTER = Object.freeze({ id: "towers", name: "Wieże do góry nogami", subtitle: "Drewno, szkło, kamień i budzik na szczycie", scene: "harbour" });
// Chapter 12 first, then the three fort chapters, in campaign order.
export const TOWER_CHAPTERS = Object.freeze([
  TOWER_CHAPTER,
  Object.freeze({ id: "flock", name: "Budziki w stadzie", subtitle: "Jeden budzik to pech. Trzy to plan.", scene: "park" }),
  Object.freeze({ id: "demolition", name: "Majster od rozbiórki", subtitle: "Szkło pęka, drewno trzeszczy, kamień się obraża", scene: "harbour" }),
  Object.freeze({ id: "castle", name: "Twierdza Poranka", subtitle: "Ostatni bastion budzików. Ma mury.", scene: "park" }),
]);
// Shots a round: three, and four for a chapter finale with three or more clocks.
const shotsFor = (m) => m.shots ?? ([96, 104, 112, 119, 120].includes(m.number) ? 4 : 3);

export function towerMissions() {
  return [...MISSIONS.map((m) => ({ ...m, chapter: 0 })), ...FORT_MISSIONS].map((m) => {
    const chapterName = TOWER_CHAPTERS[m.chapter].name;
    const towers = m.build();
    const goal = towers.find((piece) => piece.target);
    const clocks = towers.filter((piece) => piece.target).length;
    const route = TOWER_ROUTES[m.number];
    const pull = route?.pull ?? { x: 55, y: 500 };
    return {
      id: `towers-${m.number}`, number: m.number, name: m.name, chapterId: TOWER_CHAPTERS[m.chapter].id, chapter: chapterName.toUpperCase(),
      scene: m.scene, environment: { gravity: 1, drag: 0 }, background: null,
      mechanic: m.mechanic, title: m.name, clue: m.clue,
      direction: "Wieża przewraca się od podpór. Trafiony filar ciągnie za sobą wszystko, co na nim stoi.",
      pull, towers,
      // The measured shots that win the fort, in order; one shot where one does.
      plan: route?.plan ?? [pull],
      shots: shotsFor(m),
      // Fort points for two and three stars; a win is always one.
      scoreStars: route?.scoreStars ?? null,
      goal: { kind: "alarm", shape: "circle", x: goal.x, y: goal.y, radius: 44, scale: 1, displayScale: goal.width / 118 },
      star: route?.star ?? null, starPull: route?.starPull, interactions: [], required: [], requirement: clocks > 1 ? `Strąć wszystkie budziki z fortu (${clocks}).` : "Strąć budzik z wieży.",
      editable: null, water: { enabled: false },
      visual: { accent: "#ffd35f", wash: "rgba(255,211,95,.015)", variant: (m.number - 89) % 4, companion: "harbour" },
      pacing: m.number === 89 ? "discovery" : m.number % 8 === 0 ? "finale" : "play",
      win: m.win, lose: "Wieża postała. Wieża się śmieje. Jeszcze raz.",
      freeStages: m.number === 89 ? 1 : 0,
    };
  });
}
