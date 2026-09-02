const freezePoint = ({ x, y }) => Object.freeze({ x, y });
const freezeRect = ({ x, y, width, height, enabled = true }) => Object.freeze({ x, y, width, height, enabled });
const freezeTrampoline = ({ x, y = 515, width = 156, height = 25, minX = 340, maxX = 760, enabled = true }) =>
  Object.freeze({ x, y, width, height, minX, maxX, enabled });

export const WORLD = Object.freeze({ width: 1280, height: 640 });

const shared = Object.freeze({
  background: "assets/stage_morning_mayhem.svg",
  anchor: freezePoint({ x: 173, y: 455 }),
  groundY: 586,
});

const morningMayhem = Object.freeze({
  ...shared,
  id: "morning-mayhem",
  number: 1,
  name: "7:03",
  scene: "bedroom",
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
  tutorial: Object.freeze({ pull: freezePoint({ x: 70, y: 535 }), title: "Pociągnij w dół i w lewo", status: "Puść, gdy kropki prowadzą do budzika." }),
  assistPull: freezePoint({ x: 70, y: 535 }),
  trampoline: freezeTrampoline({ x: 575, maxX: 660 }),
  fan: freezeRect({ x: 720, y: 245, width: 165, height: 310, enabled: false }),
  crate: freezeRect({ x: 452, y: 442, width: 94, height: 144, enabled: false }),
  wall: freezeRect({ x: 952, y: 427, width: 34, height: 159, enabled: false }),
  goal: Object.freeze({ kind: "alarm", shape: "circle", x: 1127, y: 486, radius: 112, displayScale: 1.18 }),
});

const coffeeConsequences = Object.freeze({
  ...shared,
  id: "coffee-consequences",
  number: 2,
  name: "COFFEE",
  scene: "bedroom",
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
  assistPull: freezePoint({ x: 45, y: 535 }),
  trampoline: freezeTrampoline({ x: 625, minX: 390, maxX: 755 }),
  fan: freezeRect({ x: 730, y: 245, width: 165, height: 310, enabled: false }),
  crate: freezeRect({ x: 455, y: 501, width: 98, height: 85 }),
  wall: freezeRect({ x: 955, y: 427, width: 34, height: 159, enabled: false }),
  goal: Object.freeze({ kind: "coffee", shape: "circle", x: 1115, y: 440, radius: 105, displayScale: 1.12 }),
});

const sockEscape = Object.freeze({
  ...shared,
  id: "sock-escape",
  number: 3,
  name: "SOCK",
  scene: "bedroom",
  visual: Object.freeze({ wash: "rgba(92, 225, 189, 0.09)", accent: "#5ce1bd", gag: "SKARPETA WYBRAŁA WOLNOŚĆ" }),
  mission: Object.freeze({
    kicker: "MISJA 03 · WIATR",
    title: "Zatrzymaj skarpetę przed karierą solową",
    canvasLabel: "Wykorzystaj podmuch wentylatora i złap uciekającą skarpetę",
  }),
  result: Object.freeze({ successTag: "PARA!", successTitle: "Skarpetkowy duet znowu kompletny.", failureTag: "SOLO!", failureTitle: "Skarpeta podpisała kontrakt solowy." }),
  status: Object.freeze({
    ready: "Wentylator podnosi tor. Fryzurę również.",
    aiming: "Wiatr jest częścią planu. To nie brzmi dobrze, ale działa.",
    flying: "OPERACJA: NIEZGUBIONA SKARPETA.",
    succeeded: "Para odnaleziona. Pralka nie skomentowała sprawy.",
    failed: "Skarpeta odlatuje. Publiczność szaleje umiarkowanie.",
  }),
  speech: Object.freeze({
    succeeded: Object.freeze({ dramaQueen: "DUET REAKTYWOWANY!", toughGuy: "CEL TEKSTYLNY ZABEZPIECZONY.", panic: "ONA MIAŁA OCZY! CHYBA.", zen: "KAŻDA SKARPETA WRACA DO PARY." }),
    failed: Object.freeze({ dramaQueen: "STRACIŁEM PARTNERA SCENICZNEGO!", toughGuy: "TAKTYCZNY ODLOT.", panic: "ONA LECI PO PASZPORT!", zen: "SAMOTNOŚĆ JEST TEŻ ROZMIAREM." }),
  }),
  assistPull: freezePoint({ x: 45, y: 565 }),
  trampoline: freezeTrampoline({ x: 535, minX: 350, maxX: 690 }),
  fan: freezeRect({ x: 700, y: 238, width: 165, height: 317 }),
  crate: freezeRect({ x: 460, y: 442, width: 94, height: 144, enabled: false }),
  wall: freezeRect({ x: 960, y: 427, width: 34, height: 159, enabled: false }),
  goal: Object.freeze({ kind: "sock", shape: "circle", x: 1102, y: 390, radius: 105, displayScale: 1.12 }),
});

const remoteArchaeology = Object.freeze({
  ...shared,
  id: "remote-archaeology",
  number: 4,
  name: "REMOTE",
  scene: "bedroom",
  visual: Object.freeze({ wash: "rgba(124, 99, 231, 0.09)", accent: "#a28bff", gag: "OSTATNIO WIDZIANY: 2024" }),
  mission: Object.freeze({
    kicker: "MISJA 04 · WYSOKI ŁUK",
    title: "Odkop pilota spod warstwy cywilizacji",
    canvasLabel: "Przeleć nad przeszkodą i traf w zaginiony pilot",
  }),
  result: Object.freeze({ successTag: "ZNALEZIONY!", successTitle: "Pilot wrócił. Baterie oczywiście nie.", failureTag: "404!", failureTitle: "Pilot nadal oficjalnie nie istnieje." }),
  status: Object.freeze({
    ready: "Ściana mówi „nie”. Parabola mówi „patrz na mnie”.",
    aiming: "Celuj wyżej. Pilot leży nisko moralnie, nie fizycznie.",
    flying: "NARODOWA EKSPEDYCJA PO PILOTA.",
    succeeded: "Kanał można zmienić. Sens programu pozostaje bez zmian.",
    failed: "Znaleziono kurz. Dużo kurzu.",
  }),
  speech: Object.freeze({
    succeeded: Object.freeze({ dramaQueen: "MOGĘ ZNOWU PRZEWIJAĆ REKLAMY!", toughGuy: "PILOT ODBITY.", panic: "NIE NACISKAJ CZERWONEGO!", zen: "PILOT NIGDY NIE BYŁ ZGUBIONY." }),
    failed: Object.freeze({ dramaQueen: "ARCHEOLOGIA MNIE PRZERASTA!", toughGuy: "BRAK SYGNAŁU.", panic: "COŚ TAM ŻYJE POD KANAPĄ!", zen: "KANAŁ ZMIENI SIĘ SAM." }),
  }),
  assistPull: freezePoint({ x: 110, y: 365 }),
  trampoline: freezeTrampoline({ x: 650, minX: 430, maxX: 790 }),
  fan: freezeRect({ x: 720, y: 245, width: 165, height: 310, enabled: false }),
  crate: freezeRect({ x: 450, y: 442, width: 98, height: 144, enabled: false }),
  wall: freezeRect({ x: 930, y: 382, width: 38, height: 204 }),
  goal: Object.freeze({ kind: "remote", shape: "circle", x: 1124, y: 500, radius: 82, displayScale: 1.1 }),
});

const toastApocalypse = Object.freeze({
  ...shared,
  id: "toast-apocalypse",
  number: 5,
  name: "TOAST",
  scene: "bedroom",
  visual: Object.freeze({ wash: "rgba(255, 96, 120, 0.10)", accent: "#ff6078", gag: "POZIOM OPIECZENIA: PRAWNY" }),
  mission: Object.freeze({
    kicker: "MISJA 05 · FINAŁ ŚNIADANIA",
    title: "Powstrzymaj apokalipsę tostową",
    canvasLabel: "Połącz odbicie, wiatr i wysoki łuk, aby trafić w zbuntowany toster",
  }),
  result: Object.freeze({ successTag: "CHRUP!", successTitle: "Śniadanie uratowane. Kuchnia potrzebuje terapii.", failureTag: "SPALONY!", failureTitle: "Tost przeszedł na ciemną stronę." }),
  status: Object.freeze({
    ready: "To już finał. Toster zna wszystkie Twoje ruchy.",
    aiming: "Połącz łuk i podmuch. Masło nie pokrywa strat.",
    flying: "BOSS FIGHT: SPRZĘT AGD ZA 89 ZŁ.",
    succeeded: "Pierwszy rozdział ukończony. Śniadanie przeżyło.",
    failed: "Czujnik dymu rozpoczyna karierę wokalną.",
  }),
  speech: Object.freeze({
    succeeded: Object.freeze({ dramaQueen: "TOST BYŁ MOJĄ NAJWIĘKSZĄ ROLĄ!", toughGuy: "AGD SPACYFIKOWANE.", panic: "NIE PŁONIE! JA TROCHĘ TAK!", zen: "CHRUPKOŚĆ JEST STANEM UMYSŁU." }),
    failed: Object.freeze({ dramaQueen: "ZA DUŻO DYMNEJ MASZYNY!", toughGuy: "WĘGIEL TEŻ JEST ŚNIADANIEM.", panic: "GDZIE JEST GAŚNICA?!", zen: "TOST WRÓCIŁ DO NATURY." }),
  }),
  assistPull: freezePoint({ x: 120, y: 555 }),
  trampoline: freezeTrampoline({ x: 610, minX: 390, maxX: 760 }),
  fan: freezeRect({ x: 720, y: 235, width: 165, height: 320 }),
  crate: freezeRect({ x: 448, y: 442, width: 98, height: 144 }),
  wall: freezeRect({ x: 965, y: 420, width: 38, height: 166 }),
  goal: Object.freeze({ kind: "toaster", shape: "circle", x: 1123, y: 420, radius: 95, displayScale: 1.08 }),
});

export const LEVELS = Object.freeze([morningMayhem, coffeeConsequences, sockEscape, remoteArchaeology, toastApocalypse]);
export const DEFAULT_LEVEL = LEVELS[0];

export function getLevel(reference = 0) {
  if (typeof reference === "string") return LEVELS.find((level) => level.id === reference) ?? DEFAULT_LEVEL;
  return LEVELS[reference] ?? DEFAULT_LEVEL;
}
