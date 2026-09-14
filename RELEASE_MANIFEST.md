# SlingToon Web 0.17.0 — Release Manifest

Data: 8 września 2026. Format: HTML5 Canvas / PWA, statyczny hosting GitHub Pages.
Pakiet kandydujący 0.17.0. Publikacja wymaga osobnej zgody właściciela po obejrzeniu wersji roboczej.

## Zawartość

80 misji w 10 rozdziałach. Pierwsze osiem pozostaje bez zmian, a 72 dalsze prowadzą przez plażę, podwodne światy, port, lunapark i kosmos. Reguły obejmują prądy, wyporność, pola przyciągania, wieloprzyciskowe bramki, zmienną grawitację oraz dwie nowe: ruchomą przeszkodę i strefę zakazaną kończącą lot od dotknięcia. Mapa wyświetla rozdziały po osiem misji i wznawia aktualny etap.

Face Studio ma dwa tryby głowy: domyślny wycinek zdjęcia bez przerysowania oraz portret rysunkowy. W locie dostępne są dwa manewry — FIK w górę i KAMIEŃ w dół — a charakter bohatera decyduje o ich sile i liczbie ładunków. Zachowano duży lokalny portret, lokalne modele MediaPipe z weryfikacją sum kontrolnych, prywatność zdjęć, CSP, PWA i crop-free viewport. Nowe moduły fizyki, zapisu i renderowania interakcji są ujęte w cache aplikacji.

## Sprawdzenie

`npm run check`, `npm run build`, `npm run smoke`.

Szczegółowe wyniki i granice weryfikacji: [QA 0.16](docs/QA_0_16_PL.md).
Rendery plansz nie zastępują testu przeglądarki ani urządzenia. Pełny test dotykowy, dźwięku, instalacji i aktualizacji PWA pozostaje do wykonania przed uznaniem wersji za produkcyjnie sprawdzoną.

## Publikacja

Publikować po zgodzie właściciela do istniejącego repozytorium i GitHub Pages. Sprawdzić po wdrożeniu wersję `0.17.0`, mapę rozdziałów oraz aktualizację cache poprzedniej instalacji.

## Dalszy rozwój

Najpierw playtest dwóch manewrów w locie palcem na telefonie, czytelności śladu poprzedniej próby na małym ekranie, jakości wycinka twarzy na prawdziwych zdjęciach oraz misji 38, 44, 58, 72, 74 i 78, które mają najmniejsze zmierzone okno tolerancji (±5–6). Płatności, reklamy, chmura i multiplayer pozostają poza zakresem.
