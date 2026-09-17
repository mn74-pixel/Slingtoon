import { CHAPTERS, EXTRA_LEVELS } from "./campaign.js?v=0.28.0";
export { CHAPTERS } from "./campaign.js?v=0.28.0";
const point = (x, y) => ({ x, y });
function freeze(value) {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
export const WORLD = freeze({ width: 1280, height: 640 });

function level(config) {
  const { number, title, mechanic, clue, direction, pull, win, lose, ...data } = config;
  const freeStages = config.freeStages ?? Math.max(0, 4 - number);
  return freeze({
    anchor: point(173, 455), groundY: 586, background: null,
    water: { enabled: false },
    chapterId: CHAPTERS[Math.floor((number - 1) / 8)].id,
    // KAMIEŃ arrives on the reef, where weak gravity makes a sudden drop the
    // most readable thing on screen.
    ...data, number, mechanic, airMove: number >= 5, diveMove: number >= 17,
    mission: { kicker: `MISJA ${String(number).padStart(2, "0")} · ${mechanic}`, title, canvasLabel: title },
    result: { successTag: win[0], successTitle: win[1], failureTag: "UPS!", failureTitle: lose },
    status: {
      ready: clue,
      aiming: "Kierunek wybierasz Ty. Konsekwencje bierze bohater.",
      flying: number >= 17
        ? "FIK podbija w górę. KAMIEŃ ścina tor w dół, ale tylko dopóki jeszcze się wznosisz."
        : number >= 5 ? "Masz jeden FIK! — przycisk lub spacja podbija w górę." : "Trzymaj kciuki. Możesz też trzymać kawę.",
    },
    speech: { succeeded: { dramaQueen: win[1], toughGuy: "DOKŁADNIE TAK PLANOWAŁEM.", panic: "CZY TO JUŻ BEZPIECZNE?!", zen: "CHAOS ODNALAZŁ RÓWNOWAGĘ." } },
    tutorial: number === 1 ? { pull, title: "Pociągnij w dół i w lewo", status: "Zielone kropki pomogą tylko na rozgrzewce." } : null,
    assistPull: point(pull.x, pull.y),
    hints: {
      // A veteran gets more room to work a puzzle out before the game steps in.
      policy: { freeStages, autoAfterAttempts: number <= 16 ? 3 : number <= 48 ? 4 : 5 },
      stages: [
        { title: "Zasada", text: clue, cost: 1 },
        { title: "Kierunek", text: direction, cost: 1 },
        { title: "Pełna trasa", text: "Duch pokazuje naciągnięcie i całą trasę. Manewr FIK nie jest potrzebny.", pull, cost: 2 },
      ],
    },
  });
}

export const LEVELS = freeze([
  level({
    id: "morning-mayhem", number: 1, chapter: "DOMOWY CHAOS", name: "Jeszcze pięć minut", scene: "bedroom",
    background: "assets/stage_morning_mayhem.svg", mechanic: "PROSTO DO CELU",
    title: "Ucisz budzik. Bez wstawania.", clue: "Pociągnij w lewo i lekko w dół. Puść — polecisz w drugą stronę.",
    direction: "Długi, łagodny łuk. Żadnych przeszkód, żadnych trampolin.", pull: point(55, 505),
    goal: { kind: "alarm", shape: "circle", x: 890, y: 465, radius: 112, scale: 1.05 },
    star: point(585, 230), interactions: [], required: [],
    visual: { accent: "#ffd35f", gag: "PLAN B: NIE ISTNIEJE", wash: "rgba(124,99,231,.02)" },
    win: ["DRZEMKA!", "Budzik złożył wypowiedzenie."], lose: "Poranek domaga się rewanżu.",
  }),
  level({
    id: "coffee-consequences", number: 2, chapter: "DOMOWY CHAOS", name: "Przesyłka ekspresowa", scene: "living-room", mechanic: "PRZEBIJ KARTON",
    title: "Przebij paczkę i dostarcz siebie do kawy", clue: "Karton pęka od mocnego uderzenia. Nie odbija Cię jak sprężyna.",
    direction: "Celuj przez środek paczki. Prędkość po przebiciu trochę spadnie.", pull: point(45, 510),
    goal: { kind: "coffee", shape: "circle", x: 1050, y: 455, radius: 94, scale: 1.02 },
    star: point(760, 360), required: ["parcel"], requirement: "Najpierw przebij paczkę — kawa czeka na dostawę!",
    interactions: [{ id: "parcel", type: "breakable", x: 545, y: 190, width: 72, height: 396, label: "NIE RZUCAĆ" }],
    visual: { accent: "#ff6078", gag: "KURIER: DOSTARCZONO OSOBIŚCIE", wash: "rgba(255,96,120,.025)" },
    win: ["EKSPRES!", "Dostawa z własnym kubkiem. I wstrząsem."], lose: "Przesyłka nie zmieściła się w awizo.",
  }),
  level({
    id: "sock-escape", number: 3, chapter: "DOMOWY CHAOS", name: "Gdzie druga skarpetka?", scene: "laundry", mechanic: "PORTALE",
    title: "Wskocz do pralki i złap uciekiniera", clue: "Miętowe wejście prowadzi do fioletowego wyjścia. Pęd zostaje z Tobą.",
    direction: "Traf w okrągłe drzwi po lewej. Nie musisz przelatywać całego pokoju.", pull: point(100, 495),
    goal: { kind: "sock", shape: "circle", x: 1080, y: 465, radius: 90, scale: 1.02 },
    star: point(940, 290), required: ["laundry-tunnel"], requirement: "Skarpetka uznaje tylko podróże przez pralkę.",
    interactions: [{ id: "laundry-tunnel", type: "portal", entry: point(455, 390), exit: point(845, 285), radius: 66 }],
    visual: { accent: "#5ce1bd", gag: "PROGRAM: ZNIKANIE 30°", wash: "rgba(92,225,189,.03)" },
    win: ["PARA!", "Pralka oddała skarpetkę. To precedens."], lose: "Pralka zaprzecza istnieniu drugiej skarpetki.",
  }),
  level({
    id: "remote-archaeology", number: 4, chapter: "DOMOWY CHAOS", name: "Kanapowy bilard", scene: "living-room", mechanic: "UKOŚNE ODBICIE",
    title: "Odbij się od poduszki i odzyskaj pilota", clue: "Ukośna poduszka zmienia kierunek. Liczy się kąt, nie magiczny kopniak.",
    direction: "Krótszy i bardziej pionowy naciąg pozwoli opaść na poduszkę. Potem kąt zrobi swoje.", pull: point(120, 525),
    goal: { kind: "remote", shape: "circle", x: 1070, y: 445, radius: 96, scale: 1.04 },
    star: point(875, 350), required: ["sofa"], requirement: "Pilot jest pod ochroną. Najpierw odbij się od poduszki!",
    interactions: [{ id: "sofa", type: "cushion", a: point(420, 440), b: point(780, 555), thickness: 16, label: "BILARD BEZ KIJÓW" }],
    editable: { id: "sofa", minOffset: -90, maxOffset: 100 },
    visual: { accent: "#a28bff", gag: "PILOT: TRYB UCIECZKI", wash: "rgba(124,99,231,.02)" },
    win: ["KLIK!", "Włączono kanał: katastrofy domowe."], lose: "Pilot udaje, że nie ma baterii.",
  }),
  level({
    id: "toast-apocalypse", number: 5, chapter: "DOMOWY CHAOS", name: "Al dente airlines", scene: "kitchen", mechanic: "PRĄD POWIETRZA",
    title: "Złap strumień pary i wyłącz toster", clue: "Miętowa para unosi Cię tak długo, jak jesteś w jej strumieniu.",
    direction: "Przeleć przez środek pary. Jeden FIK w locie może uratować za niski strzał.", pull: point(85, 505),
    goal: { kind: "toaster", shape: "circle", x: 1040, y: 300, radius: 88, scale: 1.03 },
    star: point(830, 180), required: ["pasta"], requirement: "Najpierw przeleć przez parę. To linie lotnicze makaronu.",
    interactions: [{ id: "pasta", type: "steam", x: 500, y: 140, width: 235, height: 425, force: point(90, -1500), label: "AL DENTE ↑" }],
    visual: { accent: "#ff6078", gag: "SZEF KUCHNI OPUŚCIŁ CZAT", wash: "rgba(255,96,120,.035)" },
    win: ["AL DENTE!", "Śniadanie z turbulencjami."], lose: "Toster prosi o dodatkowy pas startowy.",
  }),
  level({
    id: "gnome-emergency", number: 6, chapter: "WIELKIE WYJŚCIE", name: "Otwórz sezam. Łokciem.", scene: "garden", mechanic: "REAKCJA ŁAŃCUCHOWA",
    title: "Wciśnij przycisk, otwórz bramkę, obudź krasnala", clue: "Miętowy przycisk otwiera połączoną bramkę. Jedno trafienie, dwa skutki.",
    direction: "Poprowadź łuk przez przycisk. Potem otwarta bramka przestaje być przeszkodą.", pull: point(45, 510),
    goal: { kind: "gnome", shape: "circle", x: 1080, y: 460, radius: 85, scale: 1.02 },
    star: point(790, 260), required: ["doorbell"], requirement: "Krasnal prosi najpierw zadzwonić — traf w przycisk.",
    interactions: [{ id: "doorbell", type: "switch", x: 560, y: 350, radius: 53, label: "DZYŃ!" }, { id: "garden-gate", type: "gate", x: 895, y: 175, width: 38, height: 411, switchId: "doorbell", label: "NIE BUDZIĆ" }],
    visual: { accent: "#5ce1bd", gag: "KRASNAL NA ZDALNYM", wash: "rgba(92,225,189,.02)" },
    win: ["DZIEŃ DOBRY!", "Krasnal właśnie wziął urlop od ogrodu."], lose: "Bramka nie przyjmuje argumentów z główki.",
  }),
  level({
    id: "pigeon-protocol", number: 7, chapter: "WIELKIE WYJŚCIE", name: "Lody w ruchu", scene: "park", mechanic: "RUCHOMY CEL",
    title: "Przechwyć deser, zanim zrobi to gołąb", clue: "Lody krążą w stałym rytmie. Celuj tam, gdzie będą za chwilę.",
    direction: "Wyższy łuk ominie żywopłot. FIK pozwala spóźnić opadanie, nie zatrzyma celu.", pull: point(50, 535),
    goal: { kind: "ice-cream", shape: "circle", x: 1040, y: 370, radius: 78, scale: 0.97, motion: { axis: "y", amplitude: 80, speed: 1.5 } },
    star: point(800, 235), required: [],
    interactions: [{ id: "hedge", type: "solid", x: 680, y: 435, width: 100, height: 151, label: "ŻYWOPŁOT" }],
    visual: { accent: "#ffd35f", gag: "GOŁĄB: TO SĄ MOJE LODY", wash: "rgba(255,211,95,.02)" },
    win: ["MNIAM!", "Gołąb wystawił jedną gwiazdkę."], lose: "Lody nie czekają. Gołąb też nie.",
  }),
  level({
    id: "duck-rescue", number: 8, chapter: "WIELKIE WYJŚCIE", name: "Zrób kaczkę dla kaczki", scene: "lake", mechanic: "ŚLIZG PO WODZIE",
    title: "Zrób kaczkę na wodzie i uratuj prawdziwą", clue: "Płaski, szybki lot odbije się od tafli. Stromy — zanurkuje. Najwyżej dwa ślizgi.",
    direction: "Naciągnij głównie w lewo. Po dotknięciu wody możesz dodać FIK, by wzlecieć.", pull: point(40, 485),
    goal: { kind: "duck", shape: "circle", x: 1100, y: 455, radius: 87, scale: 0.84 },
    star: point(810, 390), required: ["lake"], requirement: "Najpierw zrób kaczkę na wodzie. Prawdziwa ocenia technikę.",
    interactions: [{ id: "lake", type: "water", x: 450, y: 510, width: 540, height: 105, label: "ZAKAZ CHODZENIA PO WODZIE" }],
    water: { x: 450, y: 510, width: 540, height: 105, enabled: true },
    visual: { accent: "#5ce1bd", gag: "RATOWNIK: KWAK", wash: "rgba(44,174,157,.02)" },
    win: ["KWAK!", "Kaczka uznała Cię za łódź."], lose: "Jezioro wybrało tryb prania ręcznego.",
  }),
  ...EXTRA_LEVELS.map(level),
]);

export const DEFAULT_LEVEL = LEVELS[0];
export function getLevel(idOrIndex) {
  return (typeof idOrIndex === "number" ? LEVELS[idOrIndex] : LEVELS.find((item) => item.id === idOrIndex)) ?? DEFAULT_LEVEL;
}
