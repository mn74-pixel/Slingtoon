# SlingToon Web 0.29.0 — Release Manifest

Data: 18 września 2026. Format: HTML5 Canvas / PWA, statyczny hosting GitHub Pages.
Pakiet kandydujący 0.29.0. Publikacja wymaga osobnej zgody właściciela po obejrzeniu wersji roboczej.

## Zawartość

88 misji w 11 rozdziałach. Pierwsze osiem pozostaje bez zmian, a 72 dalsze prowadzą przez plażę, podwodne światy, port, lunapark i kosmos. Reguły obejmują prądy, wyporność, pola przyciągania, wieloprzyciskowe bramki, zmienną grawitację oraz dwie nowe: ruchomą przeszkodę i strefę zakazaną kończącą lot od dotknięcia. Mapa wyświetla rozdziały po osiem misji i wznawia aktualny etap.

Po trafieniu bohater ląduje w celu łukiem, z tłumionym odbiciem i lekkim odchyleniem w stronę nadlotu, po czym oddycha i kołysze się zamiast zastygnąć. Głowa ze zdjęcia nie dostaje żadnego akcentu na wysokości twarzy. Tryb Seria prowadzi przez losowe ukończone misje ze wspólnym budżetem strzałów i zapisuje własny rekord, nie zmieniając postępu kampanii. Mimika bohatera odpowiada na zdarzenia w locie: bliską strefę zakazaną, cel w zasięgu i serię odbić. Gwiazdki odblokowują charaktery (Zen ★3, Panic ★9, Tough Guy ★18), a każdy charakter to inny zestaw manewrów w locie. Misja z kompletem trzech medali jest oznaczona jako opanowana w mapie misji.

Kampania używa całej szerokości ekranu: najciaśniejsza para sąsiednich obiektów — z celem włącznie — to 165 px zamiast 40, misji kończących się przed 70% szerokości jest czternaście zamiast trzydziestu jeden, a cztery scenerie domowe, które nie miały nic za połową kadru, sięgają teraz prawej krawędzi.

Wgrane zdjęcie robi miny. Dwanaście min jest wypiekanych raz, przy zatwierdzaniu zdjęcia, z jego własnych pikseli: siatka trójkątów przeciągana punktami twarzy, poza całej głowy obracana wokół brody i cień wnętrza otwartych ust. Nic nie jest dorysowane i zdjęcie zostaje zdjęciem. Próg czytelności jest pilnowany testem przy realnym rozmiarze głowy w grze (96 px). Pusty wycinek nie da się już zatwierdzić.

Face Studio ma dwa tryby głowy: domyślny wycinek zdjęcia bez przerysowania oraz portret rysunkowy. W locie dostępne są dwa manewry — FIK w górę i KAMIEŃ w dół — a charakter bohatera decyduje o ich sile i liczbie ładunków. Zachowano duży lokalny portret, lokalne modele MediaPipe z weryfikacją sum kontrolnych, prywatność zdjęć, CSP, PWA i crop-free viewport. Nowe moduły fizyki, zapisu i renderowania interakcji są ujęte w cache aplikacji.

## Sprawdzenie

`npm run check`, `npm run build`, `npm run smoke`.

Szczegółowe wyniki i granice weryfikacji: [QA 0.16](docs/QA_0_16_PL.md).
Rendery plansz nie zastępują testu przeglądarki ani urządzenia. Pełny test dotykowy, dźwięku, instalacji i aktualizacji PWA pozostaje do wykonania przed uznaniem wersji za produkcyjnie sprawdzoną.

Playtest dotykowy potwierdzony na prawdziwym rozmiarze telefonu (hit-testing, nie tylko odczyt CSS): manewry FIK i KAMIEŃ mają 48-pikselowe cele dotyku i działają na `touchscreen.tap`, ślad poprzedniej próby jest czytelny na małym ekranie, a siedem misji o najciaśniejszej tolerancji (±5: 22, 35, 63, 67, 71, 75, 86) kończy się sukcesem swoją zmierzoną trasą i wygląda jak uczciwa łamigłówka. Po drodze znaleziony i naprawiony błąd: na najmniejszym prawdziwym telefonie (iPhone SE, pełny ekran) przycisk mapy misji był całkiem niekliknięty, a nazwa misji znikała ściśnięta do zera szerokości — oba potwierdzone testem trafień na żywej stronie, oba mają teraz strażnika w `scripts/validate.mjs`.

## Publikacja

Publikować po zgodzie właściciela do istniejącego repozytorium i GitHub Pages. Sprawdzić po wdrożeniu wersję `0.29.0`, mapę rozdziałów oraz aktualizację cache poprzedniej instalacji.

## Dalszy rozwój

Jakość wycinka twarzy na prawdziwych zdjęciach (ludzkich, nie testowych) wciąż czeka na realny playtest. Płatności, reklamy, chmura i multiplayer pozostają poza zakresem.
