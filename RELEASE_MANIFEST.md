# SlingToon Web 0.14.0 — Release Manifest

Data: 8 września 2026. Format: HTML5 Canvas / PWA, statyczny hosting GitHub Pages.
Pakiet kandydujący 0.14.0. Publikacja wymaga osobnej zgody właściciela po obejrzeniu wersji roboczej.

## Zawartość

80 misji w 10 rozdziałach. Pierwsze osiem pozostaje bez zmian, a 72 dalsze prowadzą przez plażę, podwodne światy, port, lunapark i kosmos. Nowe reguły obejmują prądy, wyporność, pola przyciągania, wieloprzyciskowe bramki oraz zmienną grawitację. Mapa wyświetla rozdziały po osiem misji i wznawia aktualny etap.

Zachowano duży lokalny portret, lokalne modele MediaPipe z weryfikacją sum kontrolnych, prywatność zdjęć, CSP, PWA i crop-free viewport. Nowe moduły fizyki, zapisu i renderowania interakcji są ujęte w cache aplikacji.

## Sprawdzenie

`npm run check`, `npm run build`, `npm run smoke`.

Szczegółowe wyniki i granice weryfikacji: [QA 0.14](docs/QA_0_14_PL.md).
Rendery plansz nie zastępują testu przeglądarki ani urządzenia. Pełny test dotykowy, dźwięku, instalacji i aktualizacji PWA pozostaje do wykonania przed uznaniem wersji za produkcyjnie sprawdzoną.

## Publikacja

Publikować po zgodzie właściciela do istniejącego repozytorium i GitHub Pages. Sprawdzić po wdrożeniu wersję `0.14.0`, mapę rozdziałów oraz aktualizację cache poprzedniej instalacji.

## Dalszy rozwój

Najpierw playtest tempa rozdziałów, czytelności bąbli i pól przyciągania oraz misji 22, 38, 44, 62 i 75, które mają najmniejsze zmierzone okno tolerancji ±10. Płatności, reklamy, chmura i multiplayer pozostają poza zakresem.
