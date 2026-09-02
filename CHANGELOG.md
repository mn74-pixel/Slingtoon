# Changelog

## 0.10.0 — Crop-Free Camera + Level Core

- przebudowano pierwszy poziom jako właściwy onboarding: usunięto skrzynkę, wentylator i wysoką ścianę, pozostawiając procę, bezpieczną trampolinę oraz czytelny cel,
- powiększono budzik wraz z uczciwie pokazanym obszarem trafienia i dodano animowaną podpowiedź pierwszego gestu,
- predykcja toru używa teraz prawdziwej fizyki poziomu; prawidłowy tor zmienia kolor na miętowy i pokazuje komunikat `PUŚĆ!`,
- uśpiony wentylator wraca wyłącznie w eksperymencie `What If: silniejszy wentylator`, więc modyfikator nadal realnie zmienia fizykę,
- szerokość okna sukcesu w reprezentatywnej siatce naciągnięć wzrosła z około 7% do około 37% i jest chroniona testem regresji,
- zastąpiono kadrowanie `cover` adaptacyjną kamerą, która zawsze pokazuje cały świat 1280×640,
- szerszy ekran odsłania dodatkową przestrzeń po bokach, a wyższy — nad i pod sceną; grafika nie jest rozciągana,
- współrzędne dotyku korzystają z odwrotnej transformacji kamery, więc proca i trampolina pozostają precyzyjne na każdym aspect ratio,
- kamera reaguje na zmianę pełnego ekranu, obrót urządzenia, `visualViewport` Safari i faktyczny rozmiar planszy,
- powiększono własną rysunkową głowę z 162% do 192% i zwiększono jej wizualny lift,
- rozszerzono niezależny od fizyki obszar chwytu, aby całą dużą głowę można było wygodnie złapać palcem,
- geometrię, copy, tło i cel Morning Mayhem przeniesiono do deklaratywnego modułu poziomów,
- model obsługuje cele kołowe, prostokątne i strefowe oraz opcjonalne obiekty, co stanowi działający fundament kolejnych misji,
- dodano testy kamery, mapowania dotyku, danych poziomu i dużego obszaru chwytu oraz podbito cache PWA.

## 0.9.6 — One-Tap Fullscreen + Expanded Room

- ekran startowy na iPhonie ma teraz bezpośredni przycisk `Graj pełny ekran`, który wywołuje Fullscreen API w ramach wymaganego gestu użytkownika,
- pozostawiono instrukcję dodania do ekranu początkowego jako wariant zapasowy dla urządzeń, które odrzucą Fullscreen API,
- w aktywnym trybie pełnoekranowym pasek misji i kontrolki zajmują wspólny, pojedynczy rząd,
- canvas otrzymuje całą wysokość ekranu, dzięki czemu górny fragment pokoju nie jest już agresywnie przycinany,
- dolny pasek respektuje bezpieczny obszar wskaźnika Home,
- podbito cache PWA, aby iPhone pobrał nowy układ i sterowanie pełnym ekranem.

## 0.9.5 — iPhone Fullscreen Onboarding + Expressive Head

- na iPhonie używanym w Safari gra automatycznie pokazuje jednorazową, konkretną instrukcję uruchomienia bez pasków przeglądarki,
- przycisk pełnego ekranu pozostaje widoczny i delikatnie pulsuje, dopóki gra nie działa jako aplikacja,
- manifest preferuje pełny ekran, z bezpiecznym trybem `standalone` jako wariantem zapasowym,
- rysunkowa głowa rośnie z 140% do 162% rozmiaru bazowego i jest wyżej osadzona, aby oczy, usta oraz reakcje były czytelne na telefonie,
- większa głowa pozostaje wyłącznie zmianą wizualną; pole kolizji i fizyka są bez zmian,
- podbito cache PWA, aby Safari pobrało nowy renderer i przepływ pełnoekranowy.

## 0.9.4 — Automatic Face Framing

- automatyczny zoom opiera się na punktach owalu twarzy, więc dalsze zdjęcie daje taki sam rozmiar Cartoon jak selfie,
- zmniejszono sztuczny zapas dawnej „czaszki”; kadr rozszerza się tylko wtedy, gdy segmentacja rzeczywiście wykryje włosy,
- skrajne piksele maski włosów są liczone percentylami, aby pojedynczy błąd segmentacji nie pomniejszał twarzy,
- Face Studio pokazuje etap `AUTO ZOOM` i zapisuje informację o wypełnieniu kadru,
- podbito cache PWA, aby iPhone pobrał nowy algorytm portretu.

## 0.9.3 — Fullscreen Game + Larger Face

- dodano przycisk pełnego ekranu: korzysta z Fullscreen API tam, gdzie jest dostępne, a na iPhonie pokazuje krótką instrukcję uruchomienia gry jako aplikacji,
- gra rozpoznaje tryb aplikacji z ekranu początkowego i sygnalizuje aktywny pełny ekran,
- na niskich ekranach poziomych plansza dochodzi do obu krawędzi, a teksty i przyciski pozostają wewnątrz bezpiecznych stref iPhone'a,
- zwiększono rysunkową głowę z 120% do 140% rozmiaru bazowego i lekko ją uniesiono,
- podbito cache PWA, aby Safari pobrało nowy układ i renderer.

## 0.9.2 — Larger Readable Face

- powiększono własną rysunkową głowę o 20%, aby oczy, brwi i usta były czytelne na telefonie,
- uniesiono portret nieznacznie, dzięki czemu większa głowa naturalnie łączy się z tułowiem,
- razem z twarzą skalują się komiksowe reakcje, bez zmiany fizyki ani pola kolizji postaci,
- podbito cache PWA, aby Safari pobrało nowy renderer zamiast wersji 0.9.1.

## 0.9.1 — Full-Width iPhone Landscape

- usunięto height-derived skalowanie, które przy widocznych paskach Safari zmieniało grę w małą kartę na środku ekranu,
- na bardzo szerokim, niskim ekranie karta wykorzystuje całą bezpieczną szerokość telefonu,
- pasek misji i dolna instrukcja są nakładane na planszę zamiast zabierać jej wysokość,
- scena zachowuje proporcje 2:1 i kadruje jedynie górną, nieinteraktywną część pokoju,
- współrzędne dotyku uwzględniają kadr `cover`, więc proca, trampolina i przyciski reagują w prawidłowych miejscach,
- podbito cache PWA, aby Safari nie zatrzymywało wadliwego układu 0.9.0.

## 0.9.0 — Head Cutout + Vector Portrait

- usunięto odrzucony filtr zdjęcia oraz okrągłą maskę czaszki,
- dodano lokalne MediaPipe Face Landmarker z mapą 478 punktów twarzy,
- dodano lokalną segmentację rozróżniającą włosy, skórę twarzy, tło, ubranie i akcesoria,
- iOS Safari używa celowo delegata CPU, aby uniknąć pomieszania klas maski występującego w trybie GPU,
- portret jest rysowany od nowa z naturalnej geometrii osoby: osobno sylwetka włosów, owal, oczy, tęczówki, brwi, nos i usta,
- zachowano kolory skóry i włosów pobrane ze zdjęcia, ale fotografia nie jest nakładana na postać,
- customowa głowa ma przezroczyste tło i zachowuje własne proporcje; renderer nie rysuje pod nią stałej czaszki,
- dodano widoczny podgląd maski `głowa + włosy` oraz rysunkowego rezultatu przed zatwierdzeniem,
- modele i runtime są dostarczone w paczce i po pierwszym użyciu trafiają do cache PWA,
- dodano testy dla wąskiej twarzy, granic głowy, kategorii maski i integralności modeli.

## 0.8.0 — Local Cartoon Face

- dodano lokalny proces przekształcania fotografii w twarz komiksową,
- filtr łączy wieloprzebiegowe wygładzenie, ograniczenie palety, grading kolorów oraz kontury typu ink,
- Face Studio pokazuje okrągły podgląd rezultatu jeszcze przed zatwierdzeniem,
- dodano suwak siły efektu Cartoon z domyślnym ustawieniem 78%,
- ostateczny avatar używa przetworzonego obrazu 512×512, a nie zwykłej fotografii,
- wszystkie obliczenia pozostają na urządzeniu; nie dodano serwera ani generatywnego AI,
- dodano testy zachowania kanału alpha, realnej zmiany obrazu, konturów i budżetu wydajności,
- podbito wersję cache PWA, aby urządzenia nie uruchamiały starego Face Studio.

## 0.7.0 — Mobile Fit + Safari Face Studio

- dopasowano całą planszę, pasek misji i sterowanie do jednego poziomego ekranu telefonu,
- dodano osobny zwarty układ dla niskich viewportów Safari z uwzględnieniem bezpiecznych krawędzi i dynamicznego paska adresu,
- Face Studio otwiera się teraz od razu po stuknięciu ikony twarzy, przed wyborem zdjęcia,
- dodano wyraźny przycisk `Wybierz zdjęcie`, pusty ekran startowy i możliwość ponownego wskazania tego samego pliku,
- wczytywanie zdjęć używa oszczędniejszego Blob URL z awaryjnym Data URL dla starszego Safari,
- błędne zdjęcie nie zamyka już edytora, lecz pozostawia czytelny komunikat i możliwość ponownego wyboru,
- podbito wersję cache oraz dodano wersjonowane adresy CSS/JS, aby iPhone nie uruchamiał starego interfejsu 0.5,
- uproszczono instrukcję publikacji przez `main / (root)`, zgodną z aktualnym ustawieniem repozytorium.

## 0.6.0 — Face Studio

- zastąpiono automatyczne, środkowe kadrowanie pełnym lokalnym edytorem twarzy,
- dodano przesuwanie zdjęcia palcem lub myszą, pinch-to-zoom, suwak i obrót o 90°,
- poprawiono obsługę zdjęć z aparatu, formatów z pustym MIME oraz komunikaty błędów,
- usunięto stałe cartoonowe oczy i usta nakładane na prawdziwą twarz,
- reakcje avatara są teraz rysowane wokół zdjęcia, dzięki czemu twarz pozostaje czytelna,
- dodano możliwość ponownej edycji, wymiany i usunięcia zdjęcia w tej samej sesji,
- rozszerzono cache offline, walidację i testy o Face Studio.

## 0.5.0 — GitHub PWA

- usunięto zależność od JUCE, Projucera i Xcode podczas testów,
- przepisano model fizyki do niezależnego modułu JavaScript,
- dodano renderer HTML5 Canvas z wektorową sceną Morning Mayhem,
- zachowano Quick Sling, One Move, cztery osobowości i lokalne zdjęcie twarzy,
- What If powtarza pozycję, wektor i ustawienie trampoliny z poprzedniego strzału,
- dodano proceduralne dźwięki, impact callouts, trail, camera shake i confetti,
- dodano manifest PWA, tryb offline oraz instalację na ekranie początkowym,
- dodano walidację, sześć testów modelu i automatyczną publikację GitHub Pages,
- przygotowano jawny plan późniejszego opakowania natywnego lub migracji do Godota.

## 0.4.0 — JUCE Pro Art

- źródłowa wersja scenografii, kierunku graficznego i modelu użyta jako podstawa migracji.
