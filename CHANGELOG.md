# Changelog

## 0.20.0 — Bohater wreszcie reaguje na to, co się dzieje

- **mimika odpowiada na świat, a nie na zegar lotu**: bohater zaciska oczy, gdy strefa zakazana jest na wyciągnięcie ręki, rozjaśnia się, gdy cel jest w zasięgu, i kręci mu się w głowie po drugim odbiciu w jednym locie,
- naprawiono błąd, przez który **połowa obsady była martwa emocjonalnie**: charakter przerywał obliczanie miny, więc Zen i Tough Guy pokazywali dwie miny na cały strzał, podczas gdy Drama Queen i Panic pokazywali cztery — a od 0.19 to właśnie Zen i Tough Guy kupuje się za gwiazdki, więc nagroda czyniła bohatera mniej żywym,
- charakter jest teraz zabarwieniem min spokojnych, nigdy wyciszeniem reakcji na zdarzenie; pomiar na wszystkich 80 misjach: Zen 2 → 5 min, Tough Guy 2 → 5,
- zmierzono, że nowe miny naprawdę się pojawiają — na 960 losowych strzałach `dizzy` wystąpiło w 40,5%, `hopeful` w 37,7%, a `bracing` w 51,4% strzałów na sześciu misjach, które w ogóle mają strefę zakazaną,
- akcenty dla głowy ze zdjęcia są rysowane **poza kadrem portretu**: iskierki, kółka i linie zagrożenia trzymają się z dala od twarzy, zamiast lądować na oku,
- doszedł test, którego wcześniej nie było: zapisuje każdy punkt rysowany przez akcenty i nie przepuszcza żadnego, który wchodzi w ramkę portretu — sprawdzono, że wykrywa dokładnie tę gwiazdkę na oku, którą trzeba było kiedyś usunąć ręcznie,
- `serene` przestał wyglądać jak okulary przeciwsłoneczne: dwa łuki dzieliły jedną ścieżkę i łączyły się w ciemny pasek.

## 0.19.0 — Gwiazdki wreszcie coś kupują

- **gwiazdki odblokowują charaktery**: Zen za 3, Panic za 9, Tough Guy za 18; wcześniej gwiazdka dawała tylko punkty, punkty dawały żetony podpowiedzi, a pętla zamykała się sama w sobie — gra nagradzała za to, że nie potrzebujesz pomocy,
- lista charakterów jest budowana z tabeli odblokowań, więc zamknięta pozycja **mówi cenę, zanim ją zapłacisz** („🔒 Zen · ★3"), a nie udaje, że jej nie ma,
- przekroczenie progu ogłasza się w locie, a wybrany charakter nigdy nie zostaje w stanie zablokowanym — po restarcie przygody lista wraca do Drama Queen,
- każdy charakter to inny zestaw manewrów w locie, więc odblokowanie realnie zmienia to, czym grasz, a nie kolor bohatera,
- **misja opanowana** — przejście, gwiazdka i trafienie z pierwszego strzału na tej samej misji — dostaje złoty kafelek, znacznik `✦ OPANOWANA` i licznik w mapie oraz w nagłówku rozdziału; rozdział z ośmioma opanowanymi misjami dostaje `✦` przy nazwie,
- naprawiono błąd, przez który złote oznaczenie było **niewidoczne**: reguła kafelka stała w arkuszu przed regułą bazową, więc przy równej specyficzności wygrywała baza i mistrzostwo nie zmieniało ani ramki, ani tła; podobnie `.mission-tile--mastered span` przegrywało remis z `.mission-tile span`,
- walidacja pilnuje teraz kolejności i specyficzności obu reguł oraz tego, że kafelek bieżącej misji nadal wygrywa ze złotem — nagroda, której nie widać, jest nagrodą pozorną.

## 0.18.0 — Restart przygody i koniec fioletowej ramki wokół planszy

- **restart całej przygody** w mapie misji, za dwustopniowym potwierdzeniem: przycisk odsłania ostrzeżenie mówiące dokładnie, co zniknie, i dopiero druga decyzja kasuje postęp,
- restart czyści zapis (również stare klucze 0.12 i 0.13), zeruje punkty, żetony, medale i odkryte podpowiedzi, po czym wraca na misję 1,
- naprawiono regresję z 0.16.1: odkąd plansza bierze wolną wysokość, na szerokim ekranie bywa szersza niż 2:1, a odsłonięty margines był wypełniany płaskim fioletowym gradientem, który ramkował grę jak błąd,
- margines pokazuje teraz rozciągniętą i przyciemnioną kopię sceny, więc pokój czyta się, jakby po prostu wychodził poza krawędzie ekranu,
- podkład jest cache'owany raz na misję w jednej ósmej rozdzielczości — powiększenie samo go rozmywa, więc efekt kosztuje jedno tanie rysowanie zamiast drugiej pełnej sceny na klatkę,
- renderer przyjmuje własną fabrykę powierzchni offscreen, dzięki czemu offline'owy render QA pokazuje dokładnie to, co widzi gracz.

## 0.17.0 — Widzisz, gdzie poleciał poprzedni strzał

- **ślad poprzedniej próby** zostaje na planszy podczas celowania: kropkowany tor i znacznik w miejscu, w którym lot się skończył; wcześniej ślad żył 0,75 s i znikał, więc każda powtórka była zgadywaniem na ślepo,
- ślad znika przy zmianie misji, trybu i przy świeżym wejściu na poziom, ale przeżywa retry — czyli dokładnie wtedy, kiedy jest potrzebny,
- **komunikat po pudle mówi, w którą stronę poprawić**: „Za krótko. Naciągnij wyraźnie mocniej", „Przeszedłeś tuż nad celem. Celuj odrobinę płasko" — zamiast trzech uniwersalnych zdań w stylu „spróbuj innego kąta",
- kierunek jest liczony z rzeczywistego punktu najbliższego zbliżenia do celu, a nie z miejsca, w którym lot się urwał,
- niespełniony warunek misji nadal ma pierwszeństwo nad poradą o celowaniu — najpierw dowiadujesz się, że trzeba przebić paczkę, a dopiero potem o naciągu.

## 0.16.1 — Nic nie wychodzi poza ekran, nic nie udaje przeszkody

- naprawiono przycinanie dolnej części strony: `.stage` miał sztywne `aspect-ratio: 2/1`, więc wysokość karty gry wynikała z szerokości okna i na laptopie przekraczała ekran — w pełnym ekranie na MacBooku Air ginęło 95 px, a w zwykłym oknie nawet 231 px,
- powłoka strony ma teraz dokładnie wysokość okna, a plansza bierze tę wysokość, która zostanie; kamera i tak jest crop-free, więc każdy kształt planszy pokazuje pełny świat 1280×640,
- w pełnym ekranie znika stopka i pomoc klawiaturowa — to nie jest treść gry i tylko zabierała wysokość,
- dekoracja rozdziału przestała udawać przeszkodę: sceneria ma teraz przygaszony kontur, a pełna czerń pozostaje zarezerwowana dla celów i rzeczywistych colliderów,
- podpis przy celu nie powtarza już polecenia dotyczącego obiektu stojącego w innym miejscu ekranu — mówi wyłącznie, czy cel jest zamknięty; pełne zdanie z zadaniem trafiło na płytkę nad planszą,
- usunięto nazwę rozdziału rysowaną na planszy: ta sama informacja jest w pasku nad grą, a na canvasie wchodziła na odznakę celu,
- tytuł misji może złamać się na dwie linie zamiast urywać się wielokropkiem,
- przycisk podpowiedzi mówi po ludzku („PODPOWIEDŹ 1/3 · 1 żeton"), a stan żetonów przeniesiono do dymka,
- aureola pod celem jest subtelniejsza, żeby nie było jej widać na gładkim niebie,
- walidacja pilnuje teraz, że sceneria nie pożycza konturu collidera, a powłoka nie może urosnąć ponad okno.

## 0.16.0 — Charakter to narzędzia, nie skórka

- dodano drugi manewr w locie: **KAMIEŃ** ścina tor w dół i hamuje część pędu do przodu, uzupełniając FIK, który lot wydłuża,
- KAMIEŃ działa wyłącznie dopóki bohater się wznosi — pomiar pokazał, że wersja bez tego ograniczenia ratowała trzy czwarte złych strzałów i czyniła celowanie bezcelowym,
- KAMIEŃ pojawia się od misji 17, na rafie, gdzie słabsza grawitacja czyni nagłe nurkowanie najbardziej czytelnym,
- **charakter przestał być kosmetyką**: każda z czterech osobowości ma własny zestaw manewrów — Drama Queen skacze najwyżej, Tough Guy leci najdalej w przód i najciężej nurkuje, Panic dostaje po dwa słabsze ładunki każdego manewru, Zen najmocniej wytraca pęd,
- lot swobodny i wystrzał pozostają identyczne dla wszystkich charakterów, więc zmiana bohatera może otworzyć nowe rozwiązanie, ale nigdy nie odbiera istniejącego; wszystkie 72 zmierzone trasy zachowują ważność,
- zmierzona wartość obu narzędzi: FIK ratuje 33% przegrywających naciągnięć, KAMIEŃ 43–62% zależnie od charakteru, oba w oknie około 0,5 s — to decyzja na czas, nie przycisk naprawiający każdy błąd,
- What If odtwarza teraz pełną sekwencję manewrów w kolejności i przywraca charakter, którym wykonano strzał,
- przyciski manewrów stoją w jednym rzędzie i nigdy nie dzielą koloru: miętowy podbija, fioletowy ścina; przycisk KAMIENIA gaśnie w chwili, gdy zaczynasz spadać,
- strzałka w dół obsługuje KAMIEŃ z klawiatury, spacja nadal FIK,
- przy zmianie charakteru gra mówi, co dokładnie dostałeś do ręki.

## 0.15.0 — Twoja twarz, prawdziwa krzywa trudności

- Face Studio ma dwa tryby głowy: domyślny **wycinek zdjęcia**, który usuwa tło i nie tyka samego zdjęcia, oraz dotychczasowy **TOON** przerysowujący twarz z 478 punktów,
- w trybie wycinka suwak ustawia wyłącznie grubość komiksowego konturu, a `0%` to naprawdę zero efektu; maska jest wyostrzana, więc tło zdjęcia nie przecieka na krawędziach,
- przełączenie trybu nie kasuje ustawienia drugiego, a nagłówek, opis i etap 3 w pasku postępu opisują faktycznie wybrany tryb,
- przycisk wyboru twarzy dostał czytelną ikonę (sylwetka głowy w ramce z plakietką `+`) zamiast nierozpoznawalnego glifu, a po ustawieniu twarzy pokazuje jej miniaturę,
- pole trafienia celu ma teraz krzywą: startuje z zapasem, a od misji 48 odpowiada rysunkowi obiektu, więc trzeba faktycznie do niego dolecieć,
- udział zwycięskich naciągnięć w całej przestrzeni celowania spadł z płaskich ~30% do 25% na początku i 15% w finałowych rozdziałach — trudność wreszcie rośnie,
- dwie nowe reguły: **ruchoma przeszkoda** jadąca po zaznaczonej linii (od misji 37) i **strefa zakazana** kończąca lot od dotknięcia (od misji 41), z własnym kolorem, kolcami i podpisem,
- dziewięć misji oddechu nie jest już dziewięcioma identycznymi planszami bez przeszkód — każda dostała jeden charakterystyczny obiekt swojego rozdziału,
- misja 76 przestała być drugą wersją misji 30; misje 13, 21, 29, 37, 41, 45, 53, 61, 69 i 77 mają nowe mechaniki i opisy,
- osiem misji rozdziału ma osiem różnych tł: inna godzina dnia, inny układ scenerii, inne gwiazdy — wcześniej cały rozdział wyglądał jak jedna plansza powtórzona ośmiokrotnie,
- puenta zwycięstwa nie jest już wyświetlana nad planszą przed strzałem; żart pojawia się tam, gdzie działa — w panelu wyniku,
- cel dostał subtelną aureolę odsuwającą dekoracje, a podpis celu omija grafikę obiektu zamiast collidera; szyld ratownika zniknął z wysokości rozgrywki,
- premia za strzał wygasa do czwartej próby (zamiast siódmej), a darmowa pomoc ratunkowa wchodzi po 5 próbach na początku i po 7 w końcowych rozdziałach,
- poprawiono błąd w narzędziu autorskim: pomiar tolerancji przeskakiwał narożniki pola dotyku i raportował tolerancję, której nigdy nie zweryfikował; skrypt wyklucza też gwiazdki wewnątrz stref zakazanych i pasa ruchu przeszkód,
- testy pilnują zmierzonej tolerancji każdej z 80 tras, obu nowych reguł fizyki i granic krzywej celu; zachowano deterministyczną fizykę 120 Hz, prywatność zdjęć i działanie offline.

## 0.14.0 — Dookoła absurdu w 80 misji

- rozszerzono kampanię z 8 do 80 ręcznie opisanych misji w 10 rozdziałach po 8 etapów,
- dodano plażę, rafę, zatopiony hotel, port, lunapark, kosmodrom, Księżyc, stację orbitalną i drogę powrotną do sypialni,
- wprowadzono prądy wodne i wentylacyjne, bąble wypornościowe, pola przyciągania, bramki wymagające dwóch przycisków oraz lokalną zmianę grawitacji i oporu,
- każda nowa misja ma zmierzoną zwycięską trasę bez obowiązkowego FIK-a, pole tolerancji dotyku i oddzielny osiągalny strzał po gwiazdkę,
- co piąta misja rozdziału jest lżejszą chwilą oddechu, a finały łączą wcześniej poznane reguły bez gwałtownego skoku trudności,
- mapa pokazuje po 8 misji, pozwala zmieniać rozdziały, podsumowuje ukończenia i gwiazdki oraz ma przycisk kontynuacji,
- zapis pamięta bieżącą misję; gracze, którzy ukończyli dawny poziom 8, automatycznie otrzymują dostęp do poziomu 9,
- nowe cele i tła są rysowane lokalnie jako lekka grafika wektorowa, a małe postacie w tle reagują na sukces i porażkę,
- zachowano wszystkie pierwsze 8 misji, lokalne Face Studio, deterministyczną fizykę 120 Hz, prywatność zdjęć i działanie offline.

## 0.13.0 — Kontrolowana katastrofa

- przebudowano osiem misji wokół ośmiu różnych zasad; usunięto trampoliny i ich stary kod,
- dodano niszczalną paczkę, parę portali, ukośną poduszkę, strumień pary, przycisk połączony z bramką, ruchomy cel i ograniczone ślizgi po wodzie,
- zastąpiono fizykę zależną od liczby klatek wspólnym solverem o stałym kroku 1/120 s; poprawiono kolizje wewnątrz prostokątów, kontakty oddalające się i szybkie trafienia w cel,
- każda misja ma zweryfikowaną trasę z tolerancją naciągnięcia oraz opcjonalną gwiazdkę osiągalną w zwycięskim strzale,
- od piątej misji dostępny jest jeden opcjonalny manewr FIK w locie; What If zapisuje i odtwarza jego czas,
- pełna zielona predykcja pojawia się tylko w rozgrzewce albo po włączeniu pełnej podpowiedzi; później widoczny jest krótki, neutralny łuk,
- odkryte podpowiedzi są trwałe i można je ukrywać; pomoc ratunkowa po pięciu próbach nie wymaga waluty,
- dodano mapę misji, trzy medale, ścieżkę powrotu po gwiazdkę i rekordy bez farmienia; stare punkty, żetony oraz odblokowania są migrowane,
- ONE MOVE dotyczy tylko rzeczywiście edytowalnej poduszki; kliknięcie bez przesunięcia i anulowanie gestu nie zużywają ruchu,
- zlikwidowano przeskok bohatera przy złapaniu krawędzi głowy; dodano klawiaturę, szybszy retry i odporność na powrót z uśpionej karty,
- dodano oddzielne dźwięki interakcji, limity cząsteczek/calloutów, throttling kontaktów i bezpieczne zwalnianie węzłów audio,
- rozdzielono fizykę, nagrody i renderer interakcji; zachowano lokalne portrety, paletę i crop-free viewport,
- dodano prompt projektowy oraz testy regresji i integrację całej kampanii przez handlery UI; status playtestu przeglądarkowego jest jawny w raporcie QA.

## 0.12.0 — Rooms, Outdoors & Rescue Tokens

- przebudowano poziomy 3–5 jako osobne pomieszczenia: pralnię, salon i kuchnię,
- dodano poziomy 6–8: ogród z krasnalem, park z gołębiem złodziejem i jezioro z kaczką piratem,
- nowe tła są proceduralne, spójne z paletą SlingToon i zachowują czytelny kontrast gameplayu,
- jezioro wprowadza własną fizykę: odbicie od tafli, boczny prąd i wodny feedback audio-wizualny,
- dodano trzy stopnie podpowiedzi: tekst, kierunek i pełną trajektorię,
- pierwsze poziomy uczą za darmo, a późniejsze podpowiedzi zużywają żetony zdobywane co 250 Punktów Sprytu,
- zapis postępu przechowuje odblokowane poziomy, punkty, żetony i najlepszy wynik każdej misji bez możliwości farmienia,
- każdy nowy cel dostał osobną animację, żarty, reakcje osobowości i krótką puentę dźwiękową,
- zweryfikowano zwycięski strzał w Quick Sling i One Move dla wszystkich ośmiu misji.

## 0.11.0 — Breakfast Chapter

- rozbudowano `Morning Mayhem` z jednej planszy do pięciu kolejno odblokowywanych misji,
- dodano nowe cele z osobną animacją, mimiką i komiksowym copy: kawę, uciekającą skarpetę, zaginiony pilot oraz zbuntowany toster,
- każda misja wprowadza nową kombinację znanych elementów: skrzynkę, podmuch wentylatora, wysoki łuk i finałowe połączenie przeszkód,
- zachowano lubianą paletę, a każda plansza otrzymała subtelny wash kolorystyczny i własny żart tła,
- wprowadzono trwałe odblokowywanie postępu i kompaktową nawigację między ukończonymi poziomami,
- po dwóch porażkach gra pokazuje adaptacyjną wskazówkę kierunku, ale nadal wymaga od gracza znalezienia dokładnego miętowego toru,
- dodano unikalne kwestie sukcesu i porażki dla czterech osobowości oraz krótkie dźwiękowe puenty zależne od celu,
- zweryfikowano prawdziwą drogę do zwycięstwa w Quick Sling i One Move dla każdej misji,
- krzywa trudności przechodzi od szerokiego okna wejścia w poziomie 1 do wymagającego, lecz uczciwego finału,
- podbito wersję zasobów oraz cache PWA.

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
