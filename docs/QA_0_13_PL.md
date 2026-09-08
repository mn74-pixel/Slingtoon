# SlingToon 0.13 — wynik przebudowy i kontrola jakości

Raport testów wykonanych 7 września 2026, przed publikacją. Publikacja została zatwierdzona 8 września; poniższe wyniki opisują zakres kontroli lokalnej.

## Co sprawdzono

- `npm run check`: 64 testy, walidacja danych, prywatności zdjęć, sum modeli, cache i składni wszystkich 13 modułów.
- `npm run build` i `npm run smoke`: poprawny statyczny artefakt oraz odpowiedzi HTTP dla wszystkich nowych modułów.
- Osiem zwycięskich strzałów bez modyfikatorów i FIK-a. Każdy spełnia wymagane interakcje. Każda wskazówka ma tolerancję ±8 jednostek świata w obydwu osiach.
- Osiem osobnych, zwycięskich tras z opcjonalną gwiazdką.
- Dokładnie taki sam wynik, pozycja i czas symulacji przy 30, 60 oraz 120 aktualizacjach na sekundę.
- Pełny podgląd kończy się w rzeczywistym końcu lotu. Krótki późniejszy podgląd nie zdradza zwycięstwa. Oba rodzaje są buforowane.
- Test całej kampanii przez rzeczywisty moduł `main.js` i jego handlery: przeciąganie, kolejne misje, mapa, wyniki, nagrody, zakup/ukrywanie pomocy, FIK i ponowienie. Używa atrap DOM/Canvas, nie przeglądarki.
- Kolizje wewnątrz prostokątów i przy oddalaniu; niszczenie kartonu tylko raz; brak zderzeń na przestrzeni przeskoczonej portalem; ograniczone, tracące energię ślizgi; przycisk rzeczywiście otwiera bramkę.
- Modyfikowana powtórka odtwarza zapisany moment FIK-a. Zerowy lub anulowany ruch poduszki nie zużywa wyzwania.
- Migracja danych v1/v2, odporność na uszkodzony zapis, brak podwójnych opłat, ratunkowa pomoc bez żetonów i brak farmienia wyników.
- Nowe zdarzenia planują dźwięki, wyciszenie działa, a kontakty audio są ograniczone w czasie. To test generowania dźwięku, nie odsłuch.
- Wyrenderowano osiem pełnych zwycięskich lotów oraz plansze w proporcjach 844×390, 740×360 i 568×320. Sprawdzono obrazy kampanii, pralni, ogrodu i jeziora. Obiekty mieszczą się w kadrze; dekoracyjne podpisy przeniesiono, aby nie zasłaniały mechanik.
- Budżet efektów: najwyżej 140 cząsteczek i cztery komiksowe napisy. Przejście portalu przerywa smugę, więc nie powstaje linia przez cały teleportowany fragment.

## Pomiar szerokości rozwiązań

Kontrolna siatka: x=35…150, y=445…580, krok 5, razem 672 naciągnięcia na poziom. Bez FIK-a i modyfikatorów. Procent nie jest przewidywaną skutecznością ludzi; zawiera także powtarzające się po ograniczeniu długości naciągu wektory. Służy do porównania i wykrywania nadmiernie wąskich okien, nie do oceny „fun”.

| Misja | Zasada | Wygrane w siatce |
|---|---|---:|
| 1 | Strzał bezpośredni | 54,5% |
| 2 | Przebicie kartonu | 45,7% |
| 3 | Portal | 19,3% |
| 4 | Ukośna poduszka | 12,9% |
| 5 | Para — chwila oddechu | 35,1% |
| 6 | Przycisk i bramka | 26,3% |
| 7 | Ruchomy cel | 28,7% |
| 8 | Ślizg po wodzie | 25,6% |

Poduszkę poszerzono i przestrojono po wykryciu zbyt wąskiego okna. Wszystkie podane pełne podpowiedzi znajdują się wewnątrz bezpiecznego obszaru, nie na jego krawędzi. Zwiększanie trudności nie jest monotoniczne: po nauce kąta pojawia się bardziej swobodna misja z parą i wprowadzeniem FIK-a.

Próbny pomiar 800 pełnych predykcji: około 71 ms łącznie, średnio 0,089 ms na symulację w tym środowisku Node. To wynik laboratoryjny solvera, nie FPS gry ani pomiar telefonu.

## Jeszcze niezweryfikowane

Przeglądarka testowa odmówiła dostępu do lokalnego serwera (`ERR_BLOCKED_BY_CLIENT`). Nie obchodzono blokady i nie publikowano gry bez zgody właściciela. Nie wykonano pełnego playtestu nowej wersji w prawdziwej przeglądarce ani na iPhonie/Androidzie.

Przed uznaniem wydania za produkcyjnie sprawdzone:

1. Po publikacji sprawdzić Safari/Chrome: palec na brzegu dużej głowy, release poza planszą, drugi palec i przerwanie gestu.
2. Sprawdzić całą ramkę UI: mapa, wynik i FIK, safe areas, Dynamic Island, 568×320, obrót i fullscreen. Rendery Canvas nie potwierdzają układu CSS.
3. Odsłuchać różne interakcje, regulację głośności urządzenia i zachowanie po wyciszeniu/uśpieniu.
4. Sprawdzić rzeczywistą instalację, aktualizację 0.12→0.13 i start bez sieci, także po użyciu lokalnego Face Studio.
5. Dać grę 3–5 nowym osobom bez tłumaczenia. Obserwować, czy rozumieją portal i kąt poduszki, czy FIK ratuje zamiast przeszkadzać oraz czy dobrowolnie wracają po gwiazdkę.

Testy potwierdzają działanie i osiągalność rozwiązań. Wciągającej zabawy nie można uczciwie potwierdzić samymi testami automatycznymi.
