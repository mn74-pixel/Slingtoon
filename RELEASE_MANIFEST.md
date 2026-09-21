# SlingToon Web 0.38.0 — Release Manifest

Data: 19 września 2026. Format: HTML5 Canvas / PWA, statyczny hosting GitHub Pages.
Pakiet kandydujący 0.38.0. Publikacja wymaga osobnej zgody właściciela po obejrzeniu wersji roboczej.

## Zawartość

88 misji w 11 rozdziałach. Pierwsze osiem pozostaje bez zmian, a 72 dalsze prowadzą przez plażę, podwodne światy, port, lunapark i kosmos. Reguły obejmują prądy, wyporność, pola przyciągania, wieloprzyciskowe bramki, zmienną grawitację oraz dwie nowe: ruchomą przeszkodę i strefę zakazaną kończącą lot od dotknięcia. Mapa wyświetla rozdziały po osiem misji i wznawia aktualny etap.

Po trafieniu bohater ląduje w celu łukiem, z tłumionym odbiciem i lekkim odchyleniem w stronę nadlotu, po czym oddycha i kołysze się zamiast zastygnąć. Głowa ze zdjęcia nie dostaje żadnego akcentu na wysokości twarzy. Tryb Seria prowadzi przez losowe ukończone misje ze wspólnym budżetem strzałów i zapisuje własny rekord, nie zmieniając postępu kampanii. Mimika bohatera odpowiada na zdarzenia w locie: bliską strefę zakazaną, cel w zasięgu i serię odbić. Gwiazdki odblokowują charaktery (Zen ★3, Panic ★9, Tough Guy ★18), a każdy charakter to inny zestaw manewrów w locie. Misja z kompletem trzech medali jest oznaczona jako opanowana w mapie misji.

Rozstawienie obiektów liczone jest na prostokątach, które renderer naprawdę maluje (`src/prop-art.js`), nie na jednym punkcie środkowym na obiekt. Poprzednia reguła nie widziała ani szerokości rzeczy, ani drugiej części obiektu złożonego — portal zgłaszał tylko swoje wejście — przez co szesnaście misji miało rysunki nachodzące na siebie. Teraz w całej grze jest zero nachodzeń i minimum 30 px powietrza, przy zachowanym rozrzucie długości lotu.

Opcjonalna gwiazdka odpowiada przed tym samym opisem rysunków, w obu osiach. Poprzednia reguła znała cztery z dziewięciu typów obiektów i mierzyła portal promieniem pierścienia, więc w 25 misjach złoty znaczek był narysowany na scenografii — w jednej przechodziła przez niego lina wahadła. Gwiazdka jest zbierana w promieniu od linii lotu, więc narzędzie może ją odsunąć w bok o kilkadziesiąt pikseli i potwierdzić symulacją, że wciąż da się ją zdobyć.

Proca trzyma bohatera skórzanym rzemykiem za siedzenie, nie za twarz — gumy kończyły się na `avatarPosition`, czyli na karku, i na wgranym zdjęciu biegły od czoła do ust. Czystej twarzy pilnuje kolejność warstw: wszystko, co mogłoby przeciąć bohatera, rysowane jest przed nim, a po nim wyłącznie przednia klapka rzemyka. Sama proca stoi między bohaterem a celem, z obiema końcówkami po stronie wystrzału, a w spoczynku bohater odchyla się w gumę, więc jej nie zasłania: z 26% widocznej procy (ze zdjęciem) zrobiło się 82%. Punkt, z którego liczony jest wystrzał, nie zmienił się.

Na niskim, szerokim oknie pasek misji i pasek statusu przenoszą się do kolumn obok sceny: wcześniej stały nad i pod nią, zabierały 208 px wysokości, a skala liczona z wysokości kurczyła grę do 61% szerokości płótna — reszta była scenografią. Scena zatrzymuje się na proporcjach świata 2:1, więc nadmiar szerokości idzie do interfejsu, nie na malowaną ścianę. Na oknie 2000×815 gra jest o 28% większa i wypełnia 94% płótna; telefony i ekrany 16:9 zostają bez zmian. Tła rysowane z plików SVG rozciągają teraz swoje krawędzie na odsłonięty margines, więc nie kończą się ostrym szwem.

Gdy bohater opuszcza kadr — 34% strzałów mija prawą krawędź świata, 16% wylatuje nad górną — przy tej krawędzi pojawia się jego twarz ze strzałką wskazującą kierunek lotu, malejąca z odległością. Widoczność liczona jest z rzeczywistego viewportu, więc na szerokim ekranie odsłonięty pas świata nadal liczy się jako widoczny. Dymek z tekstem, dociskany do kadru, ustępuje wtedy znacznikowi.

Strzał jest oddawany z celowania, które gracz trzymał, a nie z ruchu palca schodzącego ze szkła: to drgnięcie o 2 px CSS traciło 11% wygrywających celowań (przy 3 px — 16%), a gra ma 14 misji bez miejsca wygodniejszego niż ±8 px naciągu. W trakcie przeciągania nie filtrujemy niczego — świadomy gest do samego puszczenia zostaje wzięty tak, jak go wykonano.

Misje można prototypować generatorem (`npm run generate`, `docs/MISSION_GENERATOR_PL.md`). Nie jest to edytor — nikt nie stawia pudełek ręcznie i gracz go nie widzi. Generator wymyśla układ i sam próbuje go złamać tą samą maszynerią, która certyfikuje wydaną kampanię: układ z `mission()`, trasa i tolerancja ze wspólnego `route-search.mjs`, odstępy z `prop-art.js`, gwiazdka z dowodem przez symulację. Progi pochodzą z pomiarów kampanii; dwie kandydujące reguły odpadły, bo odrzucałyby misje napisane ręcznie. Wynik trafia do `docs/generated-missions.json` do przeglądu — nic nie wchodzi do kampanii automatycznie.

Kampania używa całej szerokości ekranu: najciaśniejsza para sąsiednich obiektów — z celem włącznie — to 165 px zamiast 40, misji kończących się przed 70% szerokości jest czternaście zamiast trzydziestu jeden, a cztery scenerie domowe, które nie miały nic za połową kadru, sięgają teraz prawej krawędzi.

Wgrane zdjęcie robi miny. Dwanaście min jest wypiekanych raz, przy zatwierdzaniu zdjęcia, z jego własnych pikseli: siatka trójkątów przeciągana punktami twarzy, poza całej głowy obracana wokół brody i cień wnętrza otwartych ust. Nic nie jest dorysowane i zdjęcie zostaje zdjęciem. Próg czytelności jest pilnowany testem przy realnym rozmiarze głowy w grze (96 px). Pusty wycinek nie da się już zatwierdzić.

Face Studio ma dwa tryby głowy: domyślny wycinek zdjęcia bez przerysowania oraz portret rysunkowy. W locie dostępne są dwa manewry — FIK w górę i KAMIEŃ w dół — a charakter bohatera decyduje o ich sile i liczbie ładunków. Zachowano duży lokalny portret, lokalne modele MediaPipe z weryfikacją sum kontrolnych, prywatność zdjęć, CSP, PWA i crop-free viewport. Nowe moduły fizyki, zapisu i renderowania interakcji są ujęte w cache aplikacji.

## Sprawdzenie

`npm run check`, `npm run build`, `npm run smoke`.

Szczegółowe wyniki i granice weryfikacji: [QA 0.16](docs/QA_0_16_PL.md).
Rendery plansz nie zastępują testu przeglądarki ani urządzenia. Pełny test dotykowy, dźwięku, instalacji i aktualizacji PWA pozostaje do wykonania przed uznaniem wersji za produkcyjnie sprawdzoną.

Playtest dotykowy potwierdzony na prawdziwym rozmiarze telefonu (hit-testing, nie tylko odczyt CSS): manewry FIK i KAMIEŃ mają 48-pikselowe cele dotyku i działają na `touchscreen.tap`, ślad poprzedniej próby jest czytelny na małym ekranie, a siedem misji o najciaśniejszej tolerancji (±5: 22, 35, 63, 67, 71, 75, 86) kończy się sukcesem swoją zmierzoną trasą i wygląda jak uczciwa łamigłówka. Po drodze znaleziony i naprawiony błąd: na najmniejszym prawdziwym telefonie (iPhone SE, pełny ekran) przycisk mapy misji był całkiem niekliknięty, a nazwa misji znikała ściśnięta do zera szerokości — oba potwierdzone testem trafień na żywej stronie, oba mają teraz strażnika w `scripts/validate.mjs`.

Cel reaguje na uderzenie w pobliżu — prawdziwa odległość do celu razy siła uderzenia, z zanikiem, zamiast reguły `event.x > 1010`, która nigdy nie działała dla budzika z misji 1 (stoi przy x=890) i działała po niewłaściwej stronie dla misji 5. Efekt objął teraz wszystkie 88 misji, nie tylko pierwsze osiem ręcznie rysowanych obiektów.

## Publikacja

Publikować po zgodzie właściciela do istniejącego repozytorium i GitHub Pages. Sprawdzić po wdrożeniu wersję `0.38.0`, mapę rozdziałów oraz aktualizację cache poprzedniej instalacji.

## Dalszy rozwój

Jakość wycinka twarzy na prawdziwych zdjęciach (ludzkich, nie testowych) wciąż czeka na realny playtest. Płatności, reklamy, chmura i multiplayer pozostają poza zakresem.
