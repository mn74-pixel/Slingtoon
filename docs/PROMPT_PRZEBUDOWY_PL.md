# SlingToon — brief przebudowy 0.13: „Kontrolowana katastrofa”

Jesteś współtwórcą istniejącej gry SlingToon, nie generatorem nowego, niezwiązanego prototypu. Zachowaj procę, bohatera z lokalnie dodawaną twarzą, komiksowy kontur, fiolet, koral, miętę i złoto. Zachowaj prywatność zdjęć i działanie offline. Przebuduj to, co gracz robi, nie tylko dekorację.

## Problem do rozwiązania

Osiem scenerii opartych na tym samym odbiciu od trampoliny to jedna zagadka przebrana osiem razy. Stały zielony podgląd zwycięstwa rozwiązuje ją za gracza. Po strzale gracz czeka; nie ma dodatkowej decyzji ani ciekawego powodu do powrotu.

## Nowa pętla

Rozpoznaj zabawny problem → wybierz tor → wywołaj charakterystyczną reakcję otoczenia → opcjonalnie skoryguj lot jednym „FIK!” → obejrzyj krótką puentę → przejdź dalej lub wróć po trudniejsze trofeum. Porażka ma zapraszać do natychmiastowej poprawki, nie karać oczekiwaniem.

## Zakres pierwszej przebudowy

Osiem ręcznie projektowanych misji. Kolejno: bezpośredni strzał, przebicie kartonu, pralkowe portale, ukośna poduszka, podmuch pary, przycisk otwierający bramkę, ruchomy cel, ślizg po wodzie. Żadnej obowiązkowej trampoliny. Mechaniki zmieniają tor lub warunek sukcesu w rzeczywisty, odmienny sposób. Każda misja ma łatwą drogę do ukończenia i opcjonalną złotą gwiazdkę.

Pierwsza misja pozostaje wybaczająca. Pierwsze podpowiedzi są darmowe; późniejsze odsłaniają kolejno zasadę, kierunek i pełny tor. Zakup jest zapamiętany dla danej misji. Nie sprzedawaj drugi raz tego samego sekretu. Żetony pochodzą z poprawy rekordów, bez farmienia powtórzeń. Po serii porażek pomoc ratunkowa nie może wymagać waluty.

Od piątej misji gracz otrzymuje jeden wyraźnie opisany manewr w locie: przycisk lub spacja podbijają postać do góry i lekko do przodu. Nie wymagaj refleksu ani precyzji myszy do zwykłego przejścia. Manewr jest dodatkową możliwością ratunku lub zdobycia trofeum.

## Fizyka i architektura

Stały krok 1/120 s, wspólna symulacja dla gry, przewidywania i powtórek. Kolizje tylko przy zbliżaniu się do powierzchni. Poprawne wypychanie z wnętrza prostokąta. Żadnych ukrytych przyspieszeń od kartonu czy nieskończonego nabierania energii na wodzie. Portal zachowuje energię; para daje siłę w oznaczonym obszarze; karton pęka raz; przycisk otwiera powiązaną bramkę. Ruchomy cel ma przewidywalny cykl. Powtórka odtwarza także moment użycia manewru.

Oddziel fizykę, dane kampanii, stan gry, zapis nagród i rysowanie interakcji. Ogranicz liczbę cząsteczek i dźwięków. Buforuj trajektorie. Zachowaj istniejący system portretów i crop-free viewport; nie dopisuj zależności bez potrzeby.

## Czytelność, humor i feedback

Tło ma niższy kontrast niż obiekt interaktywny. Widoczny cel i jego wymaganie. Wyraźne sylwetki mechanik, nie przemalowane trampoliny. Karton: „NIE RZUCAĆ”; pralnia: „SKARPETKOWY TUNEL”; para: „AL DENTE”; ogród: „OTWÓRZ SEZAM”; kaczka: „ZAKAZ CHODZENIA PO WODZIE”. Krótkie gagi, nie ściany tekstu. Różne dźwięki portalu, kruszenia, przełącznika, wody i manewru. Małe drgnięcie przy kontakcie, mocniejsza celebracja sukcesu.

## Kryteria odbioru

- Każdą misję można ukończyć bez modyfikatorów i bez manewru.
- Każda wskazana interakcja jest osiągalna i faktycznie potrzebna tam, gdzie opisuje ją misja.
- Każdą opcjonalną gwiazdkę da się zebrać i ukończyć tę samą próbę.
- Identyczny strzał przy 30, 60 i 120 Hz daje ten sam wynik.
- Podgląd nie obiecuje zwycięstwa inaczej niż rzeczywista symulacja.
- Portale nie zapętlają, woda nie pompuje energii, zerowy ruch nie zużywa wyzwania.
- Ponowienie i reset odtwarzają obiekty; podpowiedzi i rekordy pozostają zapisane.
- Zwycięstwo nie wymaga zebrania gwiazdki. Nie ma monet z reklam, kont ani płatnych usług.
- Sprawdź UI, dźwięk, brak błędów, mobile i offline. Oddziel wyniki testów automatycznych od subiektywnego playtestu.

Pracuj BUILD → PLAY → ANALYZE → IMPROVE → SIMPLIFY. Nie deklaruj „wciągająca” na podstawie samego przejścia testów. Kolejny kierunek po playteście: rakieta, kosmos i zanurzenie, ale dopiero kiedy osiem różnych zagadek naprawdę działa.
