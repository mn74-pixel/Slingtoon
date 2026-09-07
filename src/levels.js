const point = (x, y) => Object.freeze({ x, y });
const rect = (x, y, width, height, enabled = true, label = "") =>
  Object.freeze({ x, y, width, height, enabled, label });
const trampoline = (x, options = {}) => Object.freeze({
  x,
  y: 515,
  width: 156,
  height: 25,
  minX: 340,
  maxX: 760,
  enabled: true,
  style: "trampoline",
  ...options,
});
const water = (options = {}) => Object.freeze({
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  bounce: 0.82,
  current: 0,
  enabled: false,
  ...options,
});
const hints = (stages, policy = {}) => Object.freeze({
  policy: Object.freeze({ freeStages: 0, autoAfterAttempts: 0, ...policy }),
  stages: Object.freeze(stages.map((stage) => Object.freeze({
    cost: 1,
    ...stage,
    pull: stage.pull ? point(stage.pull.x, stage.pull.y) : undefined,
  }))),
});

export const WORLD = Object.freeze({ width: 1280, height: 640 });

const shared = {
  anchor: point(173, 455),
  groundY: 586,
  water: water(),
};

function level(config) {
  return Object.freeze({
    ...shared,
    background: null,
    trampoline: trampoline(575),
    fan: rect(720, 245, 165, 310, false),
    crate: rect(452, 442, 94, 144, false),
    wall: rect(952, 427, 34, 159, false),
    ...config,
  });
}

const morningMayhem = level({
  id: "morning-mayhem",
  number: 1,
  chapter: "DOMOWY CHAOS",
  name: "7:03",
  scene: "bedroom",
  background: "assets/stage_morning_mayhem.svg",
  visual: Object.freeze({ wash: "rgba(124, 99, 231, 0.02)", accent: "#ffd35f", gag: "PLAN A: JESZCZE 5 MINUT" }),
  mission: Object.freeze({
    kicker: "MISJA 01 · ROZGRZEWKA",
    title: "Ucisz budzik bez wstawania z łóżka",
    canvasLabel: "Złap bohatera, naciągnij procę i traf w budzik",
  }),
  result: Object.freeze({
    successTag: "SNOOZE!",
    successTitle: "Poranek oficjalnie przełożony.",
    failureTag: "FLOP!",
    failureTitle: "Budzik nadal rządzi sypialnią.",
  }),
  status: Object.freeze({
    ready: "Złap bohatera. Budzik sam się nie uciszy.",
    aiming: "Zielony tor oznacza: godność prawie uratowana.",
    flying: "SLING → BANG → SNOOZE → AGAIN",
    succeeded: "SNOOZE! Poranek oficjalnie przełożony.",
    failed: "Budzik 1 : Ty 0. Fizyka prosi o rewanż.",
  }),
  speech: Object.freeze({
    succeeded: Object.freeze({ dramaQueen: "NATURALNY TALENT DO SPANIA!", toughGuy: "SNOOZE ZNEUTRALIZOWANY.", panic: "ŻYJĘ! I MOGĘ SPAĆ?!", zen: "PORANEK MOŻE POCZEKAĆ." }),
    failed: Object.freeze({ dramaQueen: "BUDZIK ZNISZCZYŁ MI KARIERĘ!", toughGuy: "SPRAWDZAŁEM PODŁOGĘ.", panic: "WIEDZIAŁEM, ŻE RANO JEST ŹLE!", zen: "BUDZIK TEŻ POTRZEBUJE CZASU." }),
  }),
  tutorial: Object.freeze({ pull: point(70, 535), title: "Pociągnij w dół i w lewo", status: "Puść, gdy kropki prowadzą do budzika." }),
  hints: hints([
    { title: "Proca działa odwrotnie", text: "Ciągnij w lewo, by polecieć w prawo.", cost: 0 },
    { title: "Dodaj trochę wysokości", text: "Pociągnij w dół i w lewo.", cost: 0 },
    { title: "Pełna trasa", text: "Duch pokazuje bezpieczne naciągnięcie.", pull: { x: 70, y: 535 }, cost: 0 },
  ], { freeStages: 3 }),
  assistPull: point(70, 535),
  trampoline: trampoline(575, { maxX: 660 }),
  goal: Object.freeze({ kind: "alarm", shape: "circle", x: 1127, y: 486, radius: 112, displayScale: 1.18 }),
});

const coffeeConsequences = level({
  id: "coffee-consequences",
  number: 2,
  chapter: "DOMOWY CHAOS",
  name: "KAWA",
  scene: "bedroom",
  background: "assets/stage_morning_mayhem.svg",
  visual: Object.freeze({ wash: "rgba(255, 176, 91, 0.08)", accent: "#ffb05b", gag: "OSOBOWOŚĆ: 2%" }),
  mission: Object.freeze({
    kicker: "MISJA 02 · PIERWSZE ODBICIE",
    title: "Uratuj kawę przed poniedziałkiem",
    canvasLabel: "Odbij bohatera od skrzynki albo trampoliny i traf w kubek kawy",
  }),
  result: Object.freeze({ successTag: "KOFEINA!", successTitle: "Osobowość załadowana w 12 procentach.", failureTag: "BEZKOF!", failureTitle: "To był człowiek bez aktualizacji." }),
  status: Object.freeze({
    ready: "Skrzynka jest przeszkodą. I kryzysem ego.",
    aiming: "Szukaj miętowego toru. Kawa nie lubi improwizacji.",
    flying: "DOSTAWA EKSPRESOWA. BARDZO EKSPRESOWA.",
    succeeded: "Kawa uratowana. Produktywność nadal niepewna.",
    failed: "Kubek czeka. Poniedziałek niestety też.",
  }),
  speech: Object.freeze({
    succeeded: Object.freeze({ dramaQueen: "CZUJĘ SMAK AMBICJI!", toughGuy: "CZARNA. BEZ PYTAŃ.", panic: "CZY TO JUŻ TACHYKARDIA?", zen: "ZIARNO ZNALAZŁO DROGĘ." }),
    failed: Object.freeze({ dramaQueen: "BEZ KAWY NIE GRAM TEJ SCENY!", toughGuy: "TO BYŁ DEKOF.", panic: "MONDAY IS COMING!", zen: "PUSTY KUBEK TEŻ JEST PEŁNY." }),
  }),
  hints: hints([
    { title: "Nie walcz ze skrzynką", text: "Wysoki łuk jest spokojniejszy niż poniedziałek.", cost: 0 },
    { title: "Tor nad przeszkodą", text: "Ciągnij mocno w dół i w lewo.", pull: { x: 45, y: 535 }, cost: 0 },
    { title: "Kofeinowy GPS", text: "Dokładna trasa jest widoczna na planszy.", pull: { x: 45, y: 535 } },
  ], { freeStages: 2 }),
  assistPull: point(45, 535),
  trampoline: trampoline(625, { minX: 390, maxX: 755 }),
  crate: rect(455, 501, 98, 85, true, "NIE OTWIERAĆ"),
  goal: Object.freeze({ kind: "coffee", shape: "circle", x: 1115, y: 440, radius: 105, displayScale: 1.12 }),
});

const sockEscape = level({
  id: "sock-escape",
  number: 3,
  chapter: "DOMOWY CHAOS",
  name: "PRALNIA",
  scene: "laundry",
  visual: Object.freeze({ wash: "rgba(92, 225, 189, 0.06)", accent: "#5ce1bd", gag: "PROGRAM: UCIECZKA 40°" }),
  mission: Object.freeze({
    kicker: "MISJA 03 · WIRÓWKA",
    title: "Zatrzymaj skarpetę przed karierą solową",
    canvasLabel: "Wykorzystaj podmuch suszarki w pralni i złap uciekającą skarpetę",
  }),
  result: Object.freeze({ successTag: "PARA!", successTitle: "Skarpetkowy duet znowu kompletny.", failureTag: "SOLO!", failureTitle: "Skarpeta podpisała kontrakt solowy." }),
  status: Object.freeze({
    ready: "Suszarka podnosi tor. Rachunek za prąd również.",
    aiming: "Podmuch jest częścią planu. Pralka nie przyjmuje reklamacji.",
    flying: "OPERACJA: NIEZGUBIONA SKARPETA.",
    succeeded: "Para odnaleziona. Pralka zachowuje prawo do milczenia.",
    failed: "Publiczność wiruje 1200 razy na minutę.",
  }),
  speech: Object.freeze({
    succeeded: Object.freeze({ dramaQueen: "DUET REAKTYWOWANY!", toughGuy: "CEL TEKSTYLNY ZABEZPIECZONY.", panic: "ONA MIAŁA OCZY! CHYBA.", zen: "KAŻDA SKARPETA WRACA DO PARY." }),
    failed: Object.freeze({ dramaQueen: "STRACIŁEM PARTNERA SCENICZNEGO!", toughGuy: "TAKTYCZNY ODLOT.", panic: "ONA LECI PO PASZPORT!", zen: "SAMOTNOŚĆ JEST TEŻ ROZMIAREM." }),
  }),
  hints: hints([
    { title: "Suszarka pomaga", text: "Wejdź w zielony podmuch. Tym razem wiatr jest po Twojej stronie.", cost: 0 },
    { title: "Niżej, ale mocniej", text: "Niski start pozwoli podmuchowi podnieść bohatera.", pull: { x: 45, y: 565 } },
    { title: "Skarpetkowy radar", text: "Pełny duch toru pokazuje drogę.", pull: { x: 45, y: 565 }, cost: 2 },
  ], { freeStages: 1, autoAfterAttempts: 2 }),
  assistPull: point(45, 565),
  trampoline: trampoline(535, { minX: 350, maxX: 690, style: "laundry-basket" }),
  fan: rect(700, 238, 165, 317),
  goal: Object.freeze({ kind: "sock", shape: "circle", x: 1102, y: 390, radius: 105, displayScale: 1.12 }),
});

const remoteArchaeology = level({
  id: "remote-archaeology",
  number: 4,
  chapter: "DOMOWY CHAOS",
  name: "SALON",
  scene: "living-room",
  visual: Object.freeze({ wash: "rgba(124, 99, 231, 0.06)", accent: "#a28bff", gag: "KANAPA POŁKNĘŁA 3,40 ZŁ" }),
  mission: Object.freeze({
    kicker: "MISJA 04 · ARCHEOLOGIA KANAPOWA",
    title: "Odkop pilota spod warstwy cywilizacji",
    canvasLabel: "Przeleć nad oparciem kanapy i traf w zaginiony pilot",
  }),
  result: Object.freeze({ successTag: "ZNALEZIONY!", successTitle: "Pilot wrócił. Baterie oczywiście nie.", failureTag: "404!", failureTitle: "Pilot nadal oficjalnie nie istnieje." }),
  status: Object.freeze({
    ready: "Kanapa mówi „nie”. Parabola mówi „potrzymaj popcorn”.",
    aiming: "Celuj wyżej. Pilot leży nisko moralnie, nie fizycznie.",
    flying: "NARODOWA EKSPEDYCJA PO PILOTA.",
    succeeded: "Kanał można zmienić. Sens programu pozostaje bez zmian.",
    failed: "Znaleziono kurz. Dużo kurzu. I jednego precla.",
  }),
  speech: Object.freeze({
    succeeded: Object.freeze({ dramaQueen: "MOGĘ ZNOWU PRZEWIJAĆ REKLAMY!", toughGuy: "PILOT ODBITY.", panic: "NIE NACISKAJ CZERWONEGO!", zen: "PILOT NIGDY NIE BYŁ ZGUBIONY." }),
    failed: Object.freeze({ dramaQueen: "ARCHEOLOGIA MNIE PRZERASTA!", toughGuy: "BRAK SYGNAŁU.", panic: "COŚ TAM ŻYJE POD KANAPĄ!", zen: "KANAŁ ZMIENI SIĘ SAM." }),
  }),
  hints: hints([
    { title: "Kanapa ma słaby punkt", text: "Nie przebijaj oparcia. Przerzuć nad nim swój autorytet." },
    { title: "Wysoki, krótki łuk", text: "Ciągnij bardziej do góry niż w lewo.", pull: { x: 110, y: 365 } },
    { title: "Pilot nadaje sygnał", text: "Dokładna trajektoria właśnie przestała być tajna.", pull: { x: 110, y: 365 }, cost: 2 },
  ]),
  assistPull: point(110, 365),
  trampoline: trampoline(650, { minX: 430, maxX: 790, style: "sofa-cushion" }),
  wall: rect(930, 382, 38, 204, true, "KANAPA"),
  goal: Object.freeze({ kind: "remote", shape: "circle", x: 1124, y: 500, radius: 82, displayScale: 1.1 }),
});

const toastApocalypse = level({
  id: "toast-apocalypse",
  number: 5,
  chapter: "DOMOWY CHAOS",
  name: "KUCHNIA",
  scene: "kitchen",
  visual: Object.freeze({ wash: "rgba(255, 96, 120, 0.06)", accent: "#ff6078", gag: "GAŚNICA CZY MASŁO?" }),
  mission: Object.freeze({
    kicker: "MISJA 05 · FINAŁ ŚNIADANIA",
    title: "Powstrzymaj apokalipsę tostową",
    canvasLabel: "Połącz odbicie, parę i wysoki łuk, aby trafić w zbuntowany toster",
  }),
  result: Object.freeze({ successTag: "CHRUP!", successTitle: "Śniadanie uratowane. Kuchnia potrzebuje terapii.", failureTag: "SPALONY!", failureTitle: "Tost przeszedł na ciemną stronę." }),
  status: Object.freeze({
    ready: "Toster zna Twoje ruchy. Zna też numer do straży.",
    aiming: "Połącz łuk i parę. Masło nie pokrywa strat.",
    flying: "BOSS FIGHT: SPRZĘT AGD ZA 89 ZŁ.",
    succeeded: "Domowy chaos ukończony. Śniadanie przeżyło.",
    failed: "Czujnik dymu rozpoczyna karierę wokalną.",
  }),
  speech: Object.freeze({
    succeeded: Object.freeze({ dramaQueen: "TOST BYŁ MOJĄ NAJWIĘKSZĄ ROLĄ!", toughGuy: "AGD SPACYFIKOWANE.", panic: "NIE PŁONIE! JA TROCHĘ TAK!", zen: "CHRUPKOŚĆ JEST STANEM UMYSŁU." }),
    failed: Object.freeze({ dramaQueen: "ZA DUŻO DYMNEJ MASZYNY!", toughGuy: "WĘGIEL TEŻ JEST ŚNIADANIEM.", panic: "GDZIE JEST GAŚNICA?!", zen: "TOST WRÓCIŁ DO NATURY." }),
  }),
  hints: hints([
    { title: "Kuchnia lubi kombinacje", text: "Odbicie daje wysokość, a para przedłuża lot." },
    { title: "Mocno i nisko", text: "Pozwól przeszkodom wykonać brudną robotę.", pull: { x: 120, y: 555 } },
    { title: "Przepis na sukces", text: "Dokładny tor ma zero kalorii.", pull: { x: 120, y: 555 }, cost: 2 },
  ]),
  assistPull: point(120, 555),
  trampoline: trampoline(610, { minX: 390, maxX: 760, style: "baking-tray" }),
  fan: rect(720, 235, 165, 320),
  crate: rect(448, 442, 98, 144, true, "MĄKA"),
  wall: rect(965, 420, 38, 166, true, "BLAT"),
  goal: Object.freeze({ kind: "toaster", shape: "circle", x: 1123, y: 420, radius: 95, displayScale: 1.08 }),
});

const gnomeEmergency = level({
  id: "gnome-emergency",
  number: 6,
  chapter: "WYJŚCIE BYŁO BŁĘDEM",
  name: "OGRÓD",
  scene: "garden",
  visual: Object.freeze({ wash: "rgba(92, 225, 189, 0.05)", accent: "#5ce1bd", gag: "TRAWNIK OCENIA PO CICHU" }),
  mission: Object.freeze({
    kicker: "MISJA 06 · ŚWIEŻE POWIETRZE",
    title: "Uratuj krasnala przed awansem na doniczkę",
    canvasLabel: "Użyj odbicia od worka ziemi i traf w ogrodowego krasnala",
  }),
  result: Object.freeze({ successTag: "GNOM!", successTitle: "Krasnal odzyskał stanowisko i zero szacunku.", failureTag: "GLEBA!", failureTitle: "Awans na doniczkę stał się bardzo realny." }),
  status: Object.freeze({
    ready: "Pierwszy plener. Powietrze świeże, decyzje nadal nie.",
    aiming: "Worek ziemi odbija. Ogrodnictwo weszło na złą drogę.",
    flying: "OPERACJA: OBRONA CERAMIKI.",
    succeeded: "Krasnal ocalony. Nadal patrzy podejrzanie.",
    failed: "Trafiono w naturę. Natura nie oddaje punktów.",
  }),
  speech: Object.freeze({
    succeeded: Object.freeze({ dramaQueen: "ZAGRAŁEM TO BARDZO OGRODOWO!", toughGuy: "GNOM ZABEZPIECZONY.", panic: "ON MRUGNĄŁ! WIDZIAŁEM!", zen: "CERAMIKA ZNÓW JEST CAŁA." }),
    failed: Object.freeze({ dramaQueen: "ZIEMIA ZJADŁA MOJĄ SCENĘ!", toughGuy: "TAKTYCZNE SADZENIE.", panic: "MAM MRÓWKĘ W KASKU!", zen: "TRAWA PRZYJMUJE WSZYSTKICH." }),
  }),
  hints: hints([
    { title: "Worek nie gryzie", text: "Odbij się od worka ziemi. Najwyżej wyrośnie Ci pewność siebie." },
    { title: "Średni, mocny łuk", text: "Zahacz o sprężysty worek.", pull: { x: 45, y: 545 } },
    { title: "Gnomowy namiar", text: "Dokładna trasa świeci miętowo.", pull: { x: 45, y: 545 }, cost: 2 },
  ]),
  assistPull: point(45, 545),
  trampoline: trampoline(575, { minX: 420, maxX: 700, style: "soil-bag" }),
  crate: rect(452, 488, 104, 98, true, "NARZĘDZIA"),
  goal: Object.freeze({ kind: "gnome", shape: "circle", x: 1110, y: 445, radius: 94, displayScale: 1.08 }),
});

const pigeonProtocol = level({
  id: "pigeon-protocol",
  number: 7,
  chapter: "WYJŚCIE BYŁO BŁĘDEM",
  name: "PARK",
  scene: "park",
  visual: Object.freeze({ wash: "rgba(162, 139, 255, 0.04)", accent: "#ffd35f", gag: "GOŁĄB MA PLAN. ZŁY PLAN." }),
  mission: Object.freeze({
    kicker: "MISJA 07 · WOJNA O WAFEL",
    title: "Odbierz loda gołębiowi podatkowemu",
    canvasLabel: "Wykorzystaj podmuch dmuchawy i ławkę, aby trafić w skradzionego loda",
  }),
  result: Object.freeze({ successTag: "WAFEL!", successTitle: "Lód odzyskany. Gołąb wystawił mandat.", failureTag: "GRUCH!", failureTitle: "Gołąb przejął park i podwójną śmietankę." }),
  status: Object.freeze({
    ready: "Dmuchawa działa. Gołąb też, ale bez licencji.",
    aiming: "Złap podmuch i omiń ławkę. Lód topi się teatralnie.",
    flying: "NIE KARMIĆ PTAKÓW BOHATEREM.",
    succeeded: "Deser uratowany. Sanepid nie został poinformowany.",
    failed: "Gołąb wygrał. Zachowuje się, jakby to był jego park.",
  }),
  speech: Object.freeze({
    succeeded: Object.freeze({ dramaQueen: "TEN WAFEL BYŁ PRZEZNACZENIEM!", toughGuy: "DESER ODBITY.", panic: "GOŁĄB ZNA MÓJ ADRES!", zen: "LÓD TOPNIEJE, SPOKÓJ ZOSTAJE." }),
    failed: Object.freeze({ dramaQueen: "ZOSTAŁEM POKONANY PRZEZ GRUCHANIE!", toughGuy: "PTAK MIAŁ PRZEWAGĘ.", panic: "ON WZYWA POSIŁKI!", zen: "OKRUCH WRACA DO GOŁĘBIA." }),
  }),
  hints: hints([
    { title: "Liście zdradzają wiatr", text: "Wejdź w podmuch dmuchawy, ale nie przytulaj ławki." },
    { title: "Niski start, wysoki finał", text: "Mocny dolny naciąg da dmuchawie czas.", pull: { x: 35, y: 530 } },
    { title: "Tajny plan gołębia", text: "Dokładny tor ujawniony.", pull: { x: 35, y: 530 }, cost: 2 },
  ]),
  assistPull: point(35, 530),
  trampoline: trampoline(540, { minX: 390, maxX: 690, style: "park-spring" }),
  fan: rect(705, 235, 168, 320),
  wall: rect(936, 448, 42, 138, true, "ŁAWKA"),
  goal: Object.freeze({ kind: "ice-cream", shape: "circle", x: 1112, y: 376, radius: 92, displayScale: 1.08 }),
});

const duckRescue = level({
  id: "duck-rescue",
  number: 8,
  chapter: "WYJŚCIE BYŁO BŁĘDEM",
  name: "JEZIORO",
  scene: "lake",
  visual: Object.freeze({ wash: "rgba(66, 185, 220, 0.05)", accent: "#5ce1bd", gag: "KACZKA NIE MA UPRAWNIEŃ" }),
  mission: Object.freeze({
    kicker: "MISJA 08 · WODOWANIE",
    title: "Odbij się od jeziora i zatrzymaj kaczkę pirata",
    canvasLabel: "Wykorzystaj sprężystą powierzchnię jeziora i prąd, aby trafić w kaczkę pirata",
  }),
  result: Object.freeze({ successTag: "PLUSK!", successTitle: "Kaczka oddała łup. Godności nie znaleziono.", failureTag: "BUL-BUL!", failureTitle: "Kaczka odpływa do wód międzynarodowych." }),
  status: Object.freeze({
    ready: "Woda odbija i niesie w prawo. Fizyka ma dziś urlop.",
    aiming: "Celuj w taflę przed kaczką. Nie pij jeziora po drodze.",
    flying: "PROCEDURA WODOWANIA: KRZYK, PLUSK, NADZIEJA.",
    succeeded: "Kaczka zatrzymana. Marynarka jeziorna dziękuje.",
    failed: "Woda mokra. Raport zakończony.",
  }),
  speech: Object.freeze({
    succeeded: Object.freeze({ dramaQueen: "MOJE WODOWANIE BYŁO POEZJĄ!", toughGuy: "PIRAT ROZBROJONY.", panic: "MAM GLONA! CZY ON MA IMIĘ?!", zen: "FALA ODDAŁA TO, CO ZABRAŁA." }),
    failed: Object.freeze({ dramaQueen: "NIE GRAM SCEN PODWODNYCH!", toughGuy: "KONTROLOWANY PLUSK.", panic: "JA NIE MAM SKRZELI!", zen: "DNO TEŻ JEST KIERUNKIEM." }),
  }),
  hints: hints([
    { title: "Tafla jest trampoliną", text: "Uderz w wodę z góry. Fala odbije Cię w stronę kaczki." },
    { title: "Najpierw w dół", text: "Płaski, szybki lot powinien dotknąć środka jeziora.", pull: { x: 35, y: 520 } },
    { title: "Hydrologiczny skrót", text: "Dokładny tor wypłynął na powierzchnię.", pull: { x: 35, y: 520 }, cost: 2 },
  ]),
  assistPull: point(35, 520),
  trampoline: trampoline(555, { width: 100, minX: 520, maxX: 845, style: "buoy" }),
  crate: rect(455, 462, 82, 124, true, "POMOST"),
  wall: rect(1030, 420, 32, 166, true, "TRZCINY"),
  water: water({ x: 515, y: 515, width: 560, height: 71, bounce: 0.86, current: 165, enabled: true }),
  goal: Object.freeze({ kind: "duck", shape: "circle", x: 1170, y: 330, radius: 65, displayScale: 0.96 }),
});

export const LEVELS = Object.freeze([
  morningMayhem,
  coffeeConsequences,
  sockEscape,
  remoteArchaeology,
  toastApocalypse,
  gnomeEmergency,
  pigeonProtocol,
  duckRescue,
]);
export const DEFAULT_LEVEL = LEVELS[0];

export function getLevel(reference = 0) {
  if (typeof reference === "string") return LEVELS.find((item) => item.id === reference) ?? DEFAULT_LEVEL;
  return LEVELS[reference] ?? DEFAULT_LEVEL;
}
