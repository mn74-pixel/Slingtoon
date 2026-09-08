# SlingToon Web 0.13.0 — Release Manifest

Data: 7 września 2026. Format: HTML5 Canvas / PWA, statyczny hosting GitHub Pages.
Pakiet wydania 0.13.0. Publikacja pod istniejącym adresem zatwierdzona przez właściciela 8 września 2026.

## Zawartość

Osiem przebudowanych misji w siedmiu sceneriach. Osiem odmiennych zasad rozgrywki, wspólny solver 120 Hz, opcjonalny FIK, dokładny What If, mapa, gwiazdki, medale i trzystopniowa pomoc. Migracja zachowuje wcześniejsze punkty, żetony i odblokowania. Brak nowych zależności runtime, kont i usług.

Zachowano duży lokalny portret, lokalne modele MediaPipe z weryfikacją sum kontrolnych, prywatność zdjęć, CSP, PWA i crop-free viewport. Nowe moduły fizyki, zapisu i renderowania interakcji są ujęte w cache aplikacji.

## Sprawdzenie

`npm run check`, `npm run build`, `npm run smoke`.

Szczegółowe wyniki i granice weryfikacji: [QA 0.13](docs/QA_0_13_PL.md).
Rendery plansz nie zastępują testu przeglądarki ani urządzenia. Pełny test dotykowy, dźwięku, instalacji i aktualizacji PWA pozostaje do wykonania przed uznaniem wersji za produkcyjnie sprawdzoną.

## Publikacja

Publikować po zgodzie właściciela do istniejącego repozytorium i GitHub Pages. Nie tworzyć nowej strony ani nowych kont. Sprawdzić po wdrożeniu wersję `0.13.0` oraz aktualizację cache poprzedniej instalacji.

## Dalszy rozwój

Najpierw playtest różnorodności, zrozumiałości portali, poduszki i rytmu ruchomego celu. Dopiero następnie rozdziały: rakieta/kosmos/zanurzenie. Płatności, reklamy, chmura i multiplayer pozostają poza zakresem.
