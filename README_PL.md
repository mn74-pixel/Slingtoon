# SlingToon Web 0.25.0 — 80 misji kontrolowanego chaosu

Samodzielna gra webowa przygotowana w tym samym modelu publikacji co Castle Conflict. Do uruchomienia i wdrożenia nie potrzeba JUCE, Projucera ani Xcode.

Kampania prowadzi przez 80 krótkich misji w 10 rozdziałach. Zaczyna się od domowego chaosu, a potem odwiedza plażę, rafę, zatopiony hotel, port, lunapark, kosmodrom, Księżyc i stację orbitalną. Finał wraca do budzika z pierwszej misji. Kolory, bohater i lokalne Face Studio pozostają.

Każda misja ma własny kształt strzału: dystans od 427 do 1010 px i wysokość celu od 174 do 504, dobierane osobno, więc krótki wysoki lob i długi płaski ślizg to zupełnie inne zadania. Pierwszych osiem misji pozostaje bez zmian. Dalsze etapy wprowadzają m.in. prądy, bąble wypornościowe, pola przyciągania, wielostopniowe bramki i różne wartości grawitacji. Każdy etap ma łatwą drogę do ukończenia i opcjonalną gwiazdkę.

![Kampania 80 misji — stan początkowy i zwycięstwo](docs/campaign-0.14.png)

[Prompt przebudowy](docs/PROMPT_PRZEBUDOWY_PL.md) · [Zakres wykonanych testów i pozostały playtest](docs/QA_0_16_PL.md)

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
- Kampania zawiera 80 kolejno odblokowywanych misji w 10 rozdziałach. Mapa pokazuje po osiem etapów, umożliwia zmianę rozdziału i wznowienie ostatnio wybranej misji.
- Jezioro pozwala na najwyżej dwa płaskie ślizgi z utratą energii; stromy lot kończy się zanurzeniem. Nie dodaje już magicznych kopnięć do przodu.
- Dwie reguły dochodzą w trakcie podróży. **Ruchoma przeszkoda** (od misji 37) jeździ po zaznaczonej linii i startuje z pozycji, którą widzisz przed strzałem, więc trasa pozostaje do wyliczenia. **Strefa zakazana** (od misji 41) jest jedynym obiektem, który kończy lot od samego dotknięcia — ma własny kolor, kolce i podpis.
- Trudność rośnie przez precyzję i układ, nie przez większą liczbę przeciwników. Cel zaczyna z zapasem, a od misji 48 jego pole trafienia odpowiada temu, co widać na ekranie: trzeba faktycznie dolecieć do obiektu. Pierwsza misja rozdziału i misja oddechu zawsze mają szerszy cel.
- Od piątej misji: `FIK!` w locie (przycisk, dotknięcie planszy lub spacja) podbija do góry i lekko do przodu. Od misji 17 dochodzi `KAMIEŃ!` (przycisk lub strzałka w dół), który ścina tor w dół i hamuje część pędu — działa tylko dopóki jeszcze się wznosisz, więc jest decyzją na czas, a nie przyciskiem naprawiającym każdy błąd. Wszystkie misje da się przejść także bez obu manewrów.
- Na ekranie szerszym niż 2:1 sceny malują całą widoczną szerokość: niebo, morze i grunt rozciągają się do krawędzi wyświetlacza, bez pasa i bez drugiej kopii obrazu. Rozgrywka zostaje w polu 1280×640, bo przy 2:1 i na iPadzie marginesu nie ma w ogóle.
- Dźwięki są syntezowane i lekko się różnią przy każdym powtórzeniu, więc nic nie brzmi dwa razy identycznie. Fanfara zwycięstwa transponuje się w całości, żeby akord nie rozstroił się sam ze sobą.
- Po trafieniu bohater ląduje w celu: wlatuje łukiem ponad krawędź, wpada za nią, ugina się pod własnym ciężarem i osiada po klatkę piersiową, tak że nad krawędzią zostaje głowa i ramiona. Potem oddycha i lekko się kołysze — nie zastyga.
- Głowa ze zdjęcia nigdy nie dostaje akcentu na wysokości twarzy. Gwiazdki, iskierki i krople rysują się poza kadrem portretu; charakter niosą peleryna, odznaka na torsie i kok.
- Seria to bieg o rekord: losowe misje, które już przeszedłeś, ze wspólnym budżetem strzałów na cały bieg. Strzał kosztuje jeden, trafienie zwraca dwa, a bieg kończy się, gdy budżet się wyczerpie. Seria nie zmienia postępu kampanii — zapisuje tylko własny rekord.
- Bohater reaguje na to, co dzieje się w locie: zaciska oczy przy strefie zakazanej, rozjaśnia się, gdy cel jest w zasięgu, i kręci mu się w głowie po serii odbić. Charakter zabarwia miny spokojne, ale nigdy nie wycisza reakcji na zdarzenie.
- Gwiazdki kupują charaktery: Zen kosztuje 3, Panic 9, Tough Guy 18. Zamknięta pozycja na liście podaje swoją cenę, więc wiesz, na co zbierasz, zanim zaczniesz.
- Charakter bohatera to zestaw manewrów, nie skórka. Drama Queen skacze najwyżej, Tough Guy leci najdalej w przód i najciężej nurkuje, Panic dostaje po dwa słabsze ładunki każdego manewru, Zen najmocniej wytraca pęd. Sam wystrzał i lot swobodny są identyczne dla wszystkich, dlatego zmiana charakteru może otworzyć nowe rozwiązanie, ale nigdy nie odbiera istniejącego.
- Klawiatura: spacja rozpoczyna celowanie, strzałki zmieniają naciąg, kolejna spacja wystrzeliwuje; `R` ponawia. Wyzwanie przestawienia poduszki obsługuje dotyk/mysz.
- Na dole mapy misji jest restart całej przygody. Wymaga dwóch decyzji: pierwszy przycisk odsłania ostrzeżenie mówiące dokładnie, co zniknie, i dopiero potwierdzenie kasuje postęp. Wracasz wtedy na misję 1 z wyzerowanymi punktami, żetonami i medalami.
- Kliknij licznik poziomów, aby otworzyć mapę. Gwiazdki są opcjonalne. Medale za przejście, gwiazdkę i pierwszy strzał kumulują się między podejściami. Komplet trzech medali na jednej misji oznacza ją jako opanowaną: kafelek robi się złoty, a mapa liczy opanowane misje osobno.
- Podpowiedzi mają trzy poziomy: żartobliwa wskazówka, kierunek oraz pełny duch toru. Pierwsze misje uczą za darmo, późniejsze zużywają żetony zdobywane za Punkty Sprytu.
- Odkrycia są zapamiętywane; pełny tor można pokazać lub ukryć bez ponownego płacenia. Darmowa pomoc ratunkowa wchodzi po 5 próbach w pierwszych rozdziałach i po 7 w końcowych — weteran ma więcej miejsca na własne rozwiązanie. Co 200 nowych punktów otrzymujesz żeton; powtórzenie tego samego rekordu nie daje kolejnych punktów.
- Wynik wcześniejszej wersji, żetony i odblokowane misje są zachowane. Nowe zagadki mają nowe rekordy. Przycisk „Zdobądź gwiazdkę / Popraw styl” lub wybranie misji na mapie rozpoczyna nowe podejście do rekordu.
- Po nieudanej próbie tor poprzedniego strzału zostaje na planszy jako kropkowany ślad ze znacznikiem w miejscu, w którym lot się skończył. Znika przy zmianie misji i trybu, ale przeżywa retry — poprawiasz strzał, który wciąż widzisz.
- Komunikat po pudle mówi, w którą stronę poprawić („Za krótko", „Przeszedłeś tuż nad celem"), licząc kierunek z rzeczywistego punktu najbliższego zbliżenia do celu. Niespełniony warunek misji nadal ma pierwszeństwo przed poradą o celowaniu.
- Po porażce `What If?` automatycznie powtarza ten sam zapisany strzał z jednym zmienionym prawem fizyki.
- Powtórka zachowuje także moment użycia FIK-a. Podgląd i rozgrywka korzystają z tego samego solvera 120 Hz, niezależnego od częstotliwości rysowania.
- Przycisk z sylwetką głowy w ramce otwiera Face Studio. Po ustawieniu twarzy przycisk pokazuje Twoją własną głowę, więc od razu widać, co jest wybrane.
- Face Studio ma dwa tryby. **ZDJĘCIE** to domyślny czysty wycinek: lokalny model segmentuje włosy, skórę i tło, usuwa tło, a samo zdjęcie zostaje nietknięte — twarz nadal przypomina oryginał. Suwak ustawia wyłącznie grubość komiksowego konturu, a `0%` oznacza zero efektu. **TOON** rysuje twarz od nowa z 478 punktów: wygląda komiksowo, ale mniej przypomina oryginał. Wybór trybu nie kasuje ustawienia drugiego. Plik nie jest wysyłany.
- Na telefonie gra jest przeznaczona do pozycji poziomej; kamera zawsze pokazuje cały pokój i odsłania dodatkową przestrzeń dla proporcji danego ekranu, zamiast przycinać górę albo rozciągać scenę.

## Testy

```bash
npm run check
npm run build
npm run smoke
```

Testy sprawdzają Quick Sling, One Move, zwycięską drogę i gwiazdkę we wszystkich 80 misjach, tolerancję naciągnięcia, wodne odbicie, wyporność, prądy, przyciąganie, stopniowe podpowiedzi, identyczny replay What If, naturalne proporcje twarzy, tryb wycinka zdjęcia, ruchome przeszkody, strefy zakazane, zmierzoną tolerancję każdej trasy oraz gotowy artefakt GitHub Pages.

## Struktura

- `src/game.js` — fizyka i reguły bez zależności od przeglądarkowego UI,
- `src/levels.js` — deklaratywne dane misji, geometrii, obiektów i celów,
- `src/campaign.js` — 72 dalsze misje i struktura 10 rozdziałów,
- `src/campaign-routes.js` — zmierzone trasy zwycięstwa oraz gwiazdek,
- `src/render.js` — Canvas, avatar, scena i VFX,
- `src/world-renderer.js` — lekkie tła podróży, nowe cele i postacie drugoplanowe,
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
