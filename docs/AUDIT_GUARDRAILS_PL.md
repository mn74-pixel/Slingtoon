# SlingToon — twarde ustalenia audytu

**Wersja:** 0.13

**Aktualizacja:** 7 września 2026 r. — gruntowna przebudowa rozgrywki na prośbę użytkownika; zachowano lokalne Face Studio i kierunek wizualny.

Ten dokument jest filtrem dla każdej kolejnej zmiany. Jeśli propozycja łamie poniższe zasady, nie trafia do głównej gałęzi bez jawnej decyzji produktowej.

Zmiana technologii z JUCE na HTML5 Canvas/PWA nie zmienia żadnej z poniższych zasad produktu.

## Rdzeń

1. Podstawowa pętla to `SLING → BANG → ŚMIECH → AGAIN`.
2. `QUICK SLING` jest trybem domyślnym i zaczyna się od razu od naciągania.
3. `ONE MOVE` jest specjalnym challenge’em, a nie obowiązkiem na każdym poziomie.
4. Sam lot trwa najwyżej 6 sekund; długość całej próby zależy od planowania gracza. Retry nie wymaga czekania na koniec animacji porażki.
5. Sterowanie siłą i kątem musi mieć rzeczywisty wpływ na wynik.
6. Każda misja uczy lub łączy odmienne interakcje. Żadnego obowiązkowego odbicia od tego samego rodzaju sprężyny w całej kampanii.
7. Opcjonalny FIK dodaje jedną decyzję podczas lotu; żadna misja nie może wymagać tego manewru do zwykłego przejścia.

## What If?

1. System zapisuje wektor strzału oraz położenie zmienianego obiektu.
2. Replay używa dokładnie tego samego zapisu wejścia.
   Obejmuje to również czas wykonania manewru FIK.
3. Jedna powtórka zmienia tylko jedną zasadę fizyki.
4. Zatwierdzone modyfikatory: `Stronger Fan`, `Low Gravity`, `Super Bouncy`, `Giant Head`.
5. What If nie może udawać zmiany samym tekstem; trajektoria lub kolizja muszą realnie się zmienić.

## Avatar

1. Zdjęcie twarzy jest opcjonalne i przetwarzane lokalnie.
2. Brak generatywnego AI w runtime i brak zależności serwerowej.
3. Osobowości `Drama Queen`, `Tough Guy`, `Panic`, `Zen` zmieniają ruch, strój, mimikę i komentarz — nie tylko etykietę w menu.
4. Twarz jest wzmacniaczem humoru i shareability, nie ratunkiem dla słabej mechaniki.
5. Fotografia nie trafia do avatara bezpośrednio: Face Studio tworzy lokalną wersję Cartoon, zachowując rozpoznawalność osoby.
6. Własna twarz zachowuje naturalne proporcje głowy; nie wolno wciskać jej w stałe koło ani obrys czaszki bazowego ludzika.
7. Polityka CSP blokuje połączenia runtime poza originem gry; lokalna analiza zdjęcia nie może uruchamiać telemetrii ani uploadu.

## Humor i grafika

1. Puenta ma być widoczna w obrazie: poza, kolizja, reakcja otoczenia albo absurdalna konsekwencja.
2. Tekst może wzmacniać żart, ale nie może być jego jedynym nośnikiem.
3. Cel i tor lotu pozostają czytelne mimo bogatej scenografii.
4. Mikrożarty nie mogą występować z jednakową intensywnością w każdej części sceny.
5. Wynik jest częścią kolorowej planszy; nie wracamy do pustej czarnej ramki.

## Zakres vertical slice

Nie dodajemy jeszcze:

- kont i logowania,
- chmury,
- rankingów,
- multiplayera,
- reklam,
- sklepu,
- ciężkiego LiveOps,
- generowania świata przez AI.

## Kryterium przyjęcia poziomu

Poziom może wejść do vertical slice, jeśli bez zdjęcia twarzy:

- wiadomo, co jest celem w ciągu pierwszej sekundy,
- pierwszy poziom pokazuje gest w grze i zachowuje szerokie, testowane okno sukcesu,
- strzał daje czytelny feedback,
- istnieje powód do natychmiastowego retry,
- rezultat zawiera puentę wizualną,
- interfejs nie spowalnia rozpoczęcia kolejnej próby.
