# Changelog

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
