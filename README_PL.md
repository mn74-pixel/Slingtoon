# SlingToon Web 0.13.0 — Kontrolowana katastrofa

Samodzielna gra webowa przygotowana w tym samym modelu publikacji co Castle Conflict. Do uruchomienia i wdrożenia nie potrzeba JUCE, Projucera ani Xcode.

Przebudowa usuwa powtarzaną trampolinę: każda misja ma inną zasadę. Pierwszy poziom pozostaje prosty; późniejsze wprowadzają przebijanie kartonu, portale, ukośne odbicie, parę, przycisk i bramkę, ruchomy cel oraz ślizg po wodzie. Kolory, bohater i lokalne Face Studio pozostają.

![Osiem różnych mechanik](docs/campaign-0.13.png)

[Prompt przebudowy](docs/PROMPT_PRZEBUDOWY_PL.md) · [Zakres wykonanych testów i pozostały playtest](docs/QA_0_13_PL.md)

## Uruchomienie lokalne

W katalogu projektu wpisz:

```bash
npm run serve
```

Następnie otwórz `http://localhost:4173`.

Nie uruchamiaj gry przez dwukrotne kliknięcie `index.html`. Lokalny serwer jest potrzebny dla modułów JavaScript i testu trybu offline.

## Wgranie do GitHub

1. Utwórz puste repozytorium, np. `slingtoon`.
2. Wgraj **zawartość tego katalogu** do głównego katalogu repozytorium. `index.html` musi znajdować się w root.
3. Wejdź w `Settings → Pages`.
4. W `Build and deployment → Source` wybierz `Deploy from a branch`.
5. Ustaw `main` oraz `/(root)`, a następnie kliknij `Save`.
6. Po każdym nowym wgraniu plików poczekaj na zakończenie publikacji w karcie `Actions`.

Paczka zawiera również workflow dla pracy z Git, ale do prostego wgrywania plików przez stronę GitHub wystarcza publikacja z `main / (root)`.

Adres będzie miał postać:

`https://NAZWA-UZYTKOWNIKA.github.io/slingtoon/`

Wszystkie ścieżki są względne, więc projekt działa również jako repozytorium projektowe GitHub Pages.

## Instalacja na iPhonie/iPadzie

1. Otwórz adres gry w Safari.
2. Wybierz `Udostępnij`.
3. Wybierz `Do ekranu początkowego`.

Gra uruchamia się pełnoekranowo i po pierwszym wczytaniu działa offline. Face Studio pobiera lokalne modele dopiero przy pierwszym użyciu; po udanej analizie również są zapisywane w cache PWA.

Na współczesnym iPhonie SlingToon pokazuje jednorazowy przycisk `Graj pełny ekran`. Fullscreen API wymaga świadomego stuknięcia użytkownika, dlatego trybu nie wolno uruchomić samoczynnie przy samym ładowaniu adresu. Dodanie ikony do ekranu początkowego pozostaje wariantem zapasowym i uruchamia grę od razu w trybie aplikacji.

## Sterowanie

- `Quick Sling`: złap bohatera, naciągnij i puść.
- `One Move`: wyzwanie dostępne w misji z ukośną poduszką. Przesuń ją raz, następnie wystrzel. Samo dotknięcie i anulowanie gestu nie zużywają ruchu.
- Kampania zawiera osiem kolejno odblokowywanych misji w siedmiu wyraźnie różnych sceneriach: sypialni, pralni, salonie, kuchni, ogrodzie, parku i nad jeziorem.
- Jezioro pozwala na najwyżej dwa płaskie ślizgi z utratą energii; stromy lot kończy się zanurzeniem. Nie dodaje już magicznych kopnięć do przodu.
- Od piątej misji: jeden `FIK!` w locie (przycisk, dotknięcie planszy lub spacja) podbija do góry i lekko do przodu. Wszystkie misje da się przejść także bez niego.
- Klawiatura: spacja rozpoczyna celowanie, strzałki zmieniają naciąg, kolejna spacja wystrzeliwuje; `R` ponawia. Wyzwanie przestawienia poduszki obsługuje dotyk/mysz.
- Kliknij licznik poziomów, aby otworzyć mapę. Gwiazdki są opcjonalne. Medale za przejście, gwiazdkę i pierwszy strzał kumulują się między podejściami.
- Podpowiedzi mają trzy poziomy: żartobliwa wskazówka, kierunek oraz pełny duch toru. Pierwsze misje uczą za darmo, późniejsze zużywają żetony zdobywane za Punkty Sprytu.
- Odkrycia są zapamiętywane; pełny tor można pokazać lub ukryć bez ponownego płacenia. Po pięciu nieudanych próbach kolejne podpowiedzi są darmowe. Co 200 nowych punktów otrzymujesz żeton; powtórzenie tego samego rekordu nie daje kolejnych punktów.
- Wynik wcześniejszej wersji, żetony i odblokowane misje są zachowane. Nowe zagadki mają nowe rekordy. Przycisk „Zdobądź gwiazdkę / Popraw styl” lub wybranie misji na mapie rozpoczyna nowe podejście do rekordu.
- Po porażce `What If?` automatycznie powtarza ten sam zapisany strzał z jednym zmienionym prawem fizyki.
- Powtórka zachowuje także moment użycia FIK-a. Podgląd i rozgrywka korzystają z tego samego solvera 120 Hz, niezależnego od częstotliwości rysowania.
- Przycisk `☺` otwiera Face Studio 2. Wybierasz zdjęcie z przodu, a lokalny model wykrywa 478 punktów twarzy i osobno segmentuje włosy, skórę oraz tło. Następnie gra rysuje od nowa naturalny kształt twarzy, oczy, brwi, nos i usta, zachowując kolory osoby. Nie ma okrągłej maski ani stałej czaszki. Plik nie jest wysyłany.
- Na telefonie gra jest przeznaczona do pozycji poziomej; kamera zawsze pokazuje cały pokój i odsłania dodatkową przestrzeń dla proporcji danego ekranu, zamiast przycinać górę albo rozciągać scenę.

## Testy

```bash
npm run check
npm run build
npm run smoke
```

Testy sprawdzają Quick Sling, One Move, grywalną drogę przez wszystkie osiem misji, krzywą trudności obu mini-rozdziałów, wodne odbicie, stopniowe podpowiedzi, identyczny replay What If, realne działanie modyfikatorów, różnice między osobowościami, zachowanie naturalnych proporcji twarzy oraz serwowanie gotowego artefaktu GitHub Pages.

## Struktura

- `src/game.js` — fizyka i reguły bez zależności od przeglądarkowego UI,
- `src/levels.js` — deklaratywne dane misji, geometrii, obiektów i celów,
- `src/render.js` — Canvas, avatar, scena i VFX,
- `src/viewport.js` — adaptacyjna kamera oraz mapowanie dotyku bez kadrowania,
- `src/audio.js` — lokalny dźwięk proceduralny,
- `src/face-vision.js` — lokalne wykrywanie punktów twarzy i segmentacja głowy,
- `src/portrait.js` — rysowanie portretu wektorowego z naturalnych proporcji osoby,
- `src/face-studio.js` — wczytanie, obrót, analiza i podgląd wyszparowanej głowy,
- `src/main.js` — sterowanie i UI,
- `assets/` — edytowalne assety i ikony,
- `models/` oraz `vendor/mediapipe/` — lokalny runtime i modele komputerowego widzenia,
- `sw.js` — tryb offline,
- `.github/workflows/` — testy i publikacja GitHub Pages.

## Status

To grywalny vertical slice PWA. Nie jest jeszcze podpisanym plikiem dla App Store. Plan ewentualnego przejścia do warstwy natywnej znajduje się w `docs/MIGRATION_PLAN_PL.md`.
