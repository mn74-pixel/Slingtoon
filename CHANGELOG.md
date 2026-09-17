# Changelog

## 0.27.0 — Zdjęcie robi miny

Pytanie brzmiało, czy wgrana twarz może zacząć robić śmieszne miny — bez kreskówki. Może, ale pierwsza wersja była atrapą i pomiar to pokazał.

### Co było nie tak z pierwszym podejściem

- mimika ruszała punktami twarzy o kilka pikseli w portrecie 512 px. Gra rysuje głowę w kwadracie **96 px**, więc te kilka pikseli zamieniało się w ułamek piksela. Zmierzone przy realnym rozmiarze głowy: **panika zmieniała 16% pikseli przy średniej różnicy 6,7 na 255** — czyli nic. Usta mają tam kilkanaście pikseli szerokości; sama geometria nie udźwignie miny w tej skali,
- **wyginanie nie potrafi stworzyć ciemności za wargami.** Rozsuwało usta i naciągało na szparę policzek, więc otwarte usta wyglądały jak zamknięte.

### Co robi mina teraz

Trzy warstwy zamiast jednej, każda mierzona po zmniejszeniu do 96 px:

- **mimika** — punkty twarzy ciągną piksele zdjęcia, amplitudy podniesione tam, gdzie pomiar pokazał, że nie widać,
- **poza** — cała głowa ściska się, rozciąga i przechyla, z obrotem wokół **brody**, nie wokół środka kadru, tak jak robi to animator. To ta warstwa przeżywa zmniejszenie: sylwetka o 10% niższa i 11% szersza czyta się natychmiast,
- **cień wnętrza ust** — wyliczany z tego, o ile opada szczęka, przycięty do głowy (`source-atop`), więc nigdy nie wypływa na tło.

Zmierzone po zmianie, przy głowie 96 px: najsłabsza mina zmienia **31,5%** pikseli zamiast 1,9%, najmocniejsza 68%. Wszystkie dwanaście min ruszają zdjęciem o co najmniej 2,5 px na ekranie — to jest próg, którego pilnuje test.

### Błędy znalezione po drodze

- **pasek podglądu min był pusty — razem z „SPOKÓJ”, czyli nietkniętym zdjęciem.** Przyczyną nie było wyginanie: pusty był sam wycinek. Zdjęcie testowe było rysunkiem, a segmentacja nie znajduje na rysunku człowieka — maska wracała pusta. Sprawdzone na wydanej wersji 0.26.0: **ten sam rysunek daje tam dokładnie taki sam pusty wycinek**, tylko nikt tego nie widział, bo podgląd ma szachownicę pod spodem i wygląda na wypełniony w 100%,
- **stąd prawdziwy błąd produktowy: gra mówiła „Gotowe: tło usunięte” i pozwalała zatwierdzić niewidzialną głowę.** Teraz portret raportuje swoje pokrycie, a pracownia twarzy odmawia zatwierdzenia pustego wycinka i mówi, co zrobić,
- **kołnierz dochodzący do dołu kadru zabijał przechylenia.** Strażnik kadru słusznie nie pozwalał obciąć kapelusza, więc kasował całą pozę: „podejrzliwy” spadał z 6,7 px do 0,6 px. Wycinek wjeżdża teraz o kilka procent do środka, jeśli dotyka krawędzi — niewidoczne, a miny odzyskują miejsce na ruch,
- **wypiek arkusza min trwał 640 ms.** Poza była rysowana jako drugie przejście po całym portrecie. Poza i wyginanie są oba afiniczne, więc składają się dokładnie — teraz to jedno przejście i **60 ms**,
- **strażnik kadru chronił przed niemożliwym.** Przycinanie samego wyginania nie odpalało się przy żadnej sile dostępnej z suwaka, a przy ciasnym kadrze kasowało mimikę do zera. Usunięte: pilnuje pozy, bo tylko poza naprawdę wychodzi poza kadr.

### Trzy pomiary, które mierzyły nie to co trzeba

Warte zapisania, bo każdy wyglądał na zielony:

- **jasność podglądu portretu: 100% nieprzezroczystych pikseli.** Pod portretem jest szachownica, więc ta liczba jest zawsze taka sama — także dla pustego wycinka,
- **przesunięcie samej mimiki.** „Podejrzliwy” rusza zdjęciem o 0,6 px i jest doskonale czytelny, bo niesie go przechylenie głowy. Próg musi mierzyć **całą** geometrię,
- **oszacowanie kadru liczone dwa razy z rzędu.** Test krzyczał, że kapelusz wychodzi poza kadr, choć się mieścił. Teraz sprawdza, gdzie naprawdę ląduje piksel — barycentrycznie, tak jak rysuje `warpTriangle`.

## 0.26.0 — Pracownia fizyki: wahadło, sprężyna i osiem nowych misji

### Naprawione: przeszkody stały za blisko siebie

- skalowanie misji do krótkiego strzału ściskało układ — **misja 16 miała dwa obiekty 69 px od siebie**, co czyta się jak jedna bryła zamiast dwóch decyzji; siedem misji było poniżej 110 px,
- teraz **układ ogranicza strzał, a nie tylko odwrotnie**: misja z trzema przeszkodami zarabia na dłuższy lot. Najciaśniejsza para w całej grze to 120 px, zero misji poniżej 110, a rozrzut dystansu przetrwał (436–1010 px).

### Dwie nowe mechaniki, obie uczą czegoś prawdziwego

- **WAHADŁO** — swinguje po łuku, nie przesuwa się sinusoidalnie. Zmierzone: okres rośnie z długością sznurka (2,48 s → 3,38 s → 4,28 s), a ciężarek stoi niemal w miejscu na skrajach (4 px/s) i pędzi na dole (do 553 px/s). Misja 84 daje **dwa wahadła o różnej długości obok siebie** — lekcja jest widoczna, nie opisana,
- **SPRĘŻYNA** — oddaje proporcjonalnie do tego, co dostanie. Zmierzone: przy wejściu 150 px/s oddaje **mniej** niż poduszka (83 vs 158), przy 900 px/s **znacznie więcej** (1530 vs 945). Jaki przylot, taki wystrzał,
- misja ucząca sprężyny dostała łagodniejszą charakterystykę, bo przy pełnej stromości wprowadzenie tolerowało celowanie ±6 px, czyli zamieniało lekcję w zgadywankę.

### Nowy rozdział: Szkolna pracownia fizyki (misje 81–88)

Osiem misji po finale kampanii, każda nazywa jedną rzecz prawdziwą o świecie i każe jej użyć: od salami na sznurku, przez „długi sznurek, krótki sznurek", po egzamin praktyczny ze wszystkiego naraz. Gra ma teraz **88 misji w 11 rozdziałach**.

### Błędy znalezione przy okazji

- **`scaleItem` nie skalował punktu zawieszenia wahadła.** Kolider liczy się z `pendulum.x`, więc wahadła w ogóle nie podążały za układem misji i zostawały na autorskiej pozycji,
- **wahadło w misji 84 przechodziło 1 px od celu** — zasłaniało cel w trakcie wymachu, co czyta się jak oszustwo gry. Doszedł test pilnujący 45 px prześwitu dla każdego wahadła,
- **narzędzie balansu wypisywało „Stored 72" na sztywno** długo po tym, jak kampania urosła. Teraz liczy,
- trzy testy zakładały 80 misji i 10 rozdziałów na sztywno; teraz liczą zamiast zakładać.

## 0.25.0 — Osiemdziesiąt różnych strzałów zamiast jednego powtórzonego

Pytanie brzmiało, czy nie dałoby się rozsunąć procy i celu. Pomiar pokazał coś gorszego niż brak miejsca.

### Co było nie tak

- **cele stały w 50-pikselowym oknie.** Mediana x=1070, ćwiartki 1030–1080; **77% misji miało długość lotu 850–950 px**. Osiemdziesiąt misji, jeden strzał powtórzony osiemdziesiąt razy,
- zmierzona **obwiednia trafienia w locie** (gdzie cel w ogóle da się trafić swobodnym lotem) pokazała, dlaczego akurat tam: przy x=1000 okno ma 118 px wysokości, przy x=700 aż **508 px**, a za x=1250 zapada się do kreski. Wszystkie cele siedziały w najciaśniejszym miejscu dostępnej przestrzeni,
- przesunięcie celu dalej w prawo, o które pytano, **pogorszyłoby sprawę** — wolne miejsce jest bliżej i w pionie, nie dalej.

### Co zrobiono

- **dystans i wysokość są dobierane osobno.** Dystans rotuje równomiernie, żeby plansza używała całej szerokości; wysokość niesie trudność, co potwierdza pomiar udziału wygrywających naciągów: cel nisko jest trudny na każdym dystansie (17,4% w średnim, 19,2% w długim), wysoko jest wybaczający (31,1% w krótkim),
- **układ misji skaluje się razem z celem** — skrzynka, która stała w jednej trzeciej lotu, nadal stoi w jednej trzeciej. Autorskie współrzędne opisują proporcje, nie piksele,
- **wynik: dystans 427–1010 px zamiast 717–927, wysokość celu 174–504 zamiast 350–455, 80 różnych pozycji celu na 80 misji** (wcześniej połowa dzieliła 50-pikselowe okno),
- wszystkie 72 mierzone trasy przeliczone od zera; 15 misji dostało dobrany kształt, wybrany przez narzędzie jako **najciaśniejszy, który nadal przechodzi**, a nie najwygodniejszy.

### Naprawiony błąd w narzędziu balansu

- siatka tolerancji liczyła nieparzystą liczbę kroków, więc przy tolerancji ±10 sprawdzała −10, −6, −2, +2, +6, +10 i **nigdy zera**. Misja mogła dostać zatwierdzoną tolerancję, której własna oś nie działa — dokładnie to wyszło na misji 54,
- liczba kroków jest teraz parzysta, więc każda tolerancja próbkuje własny środek.

### Trudność

| ćwiartka | przed | po |
|---|---|---|
| 1 | 24,3% | 26,4% |
| 2 | 21,7% | 21,2% |
| 3 | 19,6% | 22,3% |
| 4 | **14,9%** | **15,3%** |

Końcówka zachowała trudność. W ćwiartce 3 zostało wahnięcie 1,1 pkt, którego nie udało się usunąć — krzywa opada, ale nie idealnie monotonicznie.

## 0.24.0 — Sceny malują cały ekran, a dźwięk przestaje się powtarzać

### Boki: naprawione u źródła, nie zamalowane

Zgłoszenie brzmiało: „nie usunęło pasów". Było słuszne.

- **mierzyłem złą rzecz.** W 0.23.0 sprawdziłem jasność i pokazałem spadek z 51,5% do 9%. Ale pas nie bierze się z jasności — bierze się z tego, że margines był *tą samą sceną w innej skali i rozmytą*. Oko widzi skok skali i ostrości, nie tonu,
- **sceny malują teraz całą widoczną szerokość.** Niebo, morze, grunt i horyzont rozciągają się do krawędzi ekranu, więc nie ma drugiego obrazu, na którym cokolwiek mogłoby pęknąć,
- usunięto cały system zastępczego tła: kopia sceny w 1/8 rozdzielczości, jej pamięć podręczna i kompozycja marginesu — 70 z 80 misji maluje się przez `drawCampaignScene`, pozostałe 10 przez sceny w rendererze i **obie ścieżki** dostały to samo rozciąganie,
- **zmierzone na siedmiu misjach w proporcjach 2,70:1**: skok jasności na granicy świata max **4,5%** (było 51,5%, potem 9%), ubytek detalu max **4,6%**. Tym razem mierzę oba, bo pas tworzy każde z osobna,
- sprawdzone też przy 2:1 (margines zero — ścieżka w ogóle się nie uruchamia), na iPadzie 4:3 (160 px w pionie) i na ultrapanoramie (310 px na bok),
- w marginesie nadal żyje wyłącznie sceneria: przy 2:1 i na iPadzie tej przestrzeni nie ma w ogóle, więc nic, co gracz musi zobaczyć, nie może tam trafić.

### Dźwięk: nic, co słyszysz często, nie brzmi dwa razy tak samo

- **porażka, oba manewry w locie, zbieranie gwiazdki, podpowiedź i wszystkie siedem interakcji grały identycznie za każdym razem** — a porażkę słyszysz najczęściej, bo pudło jest stanem domyślnym (uderzenie i wystrzał wariację już miały),
- wariacja siedzi teraz w samym syntezatorze, więc dziedziczy ją wszystkie czternaście dźwięków zamiast czternastu miejsc wywołania: **±35 centów** wysokości i kilka milisekund rozrzutu w czasie, żeby warstwy nie zlewały się w ten sam metaliczny dzwon,
- **fanfara zwycięstwa to akord**, więc rozstrajanie nuty po nucie brzmiałoby jak pomyłka — cała figura transponuje się w jedną z sześciu tonacji, a interwały zostają nienaruszone,
- doszły testy, które to mierzą: że żaden powtarzany dźwięk nie ma tej samej wysokości dwa razy, że rozrzut mieści się między 20 a 150 centów (słyszalny, ale nie fałszywy) i że akord nigdy nie rozstraja się sam ze sobą — wszystkie trzy sprawdzone przez odtworzenie regresji.

## 0.23.0 — Scena sięga krawędzi ekranu

Zgłoszone przez właściciela: po bokach są szerokie ciemniejsze pasy, na których nic się nie dzieje.

- **powód był, ale nie usprawiedliwiał wyniku**: ekran szerszy niż 2:1 odsłania świat, którego sceny nie malują, a margines był wypełniany kopią sceny rozciągniętą na płasko i przyciemnioną o 58%; naprawiało to wcześniejszą płaską fioletową ramkę, ale zamieniało ćwierć ekranu w martwą strefę,
- **zmierzono, ile tej przestrzeni jest**: 26% szerokości na MacBooku Air, 33% na szerokim biurkowym ekranie, 7,6% na telefonie w poziomie i dokładnie 0% przy 2:1 oraz na iPadzie,
- margines dostaje teraz **powiększoną scenę przyciętą w pionie**, więc w bok wychodzi prawdziwa sceneria — palmy, korale, sznur z praniem ciągną się dalej, zamiast urywać się na granicy,
- odrzucono po obejrzeniu wariant z rozciąganiem skrajnej kolumny: każdy obiekt dotykający krawędzi sceny rozmazywał się w poziomą smugę,
- **winieta była drugą połową ramki** — rysowała się wyłącznie w obrębie 1280×640, więc przyciemnienie urywało się dokładnie na granicy świata; teraz obejmuje całe widoczne pole,
- **zmierzony skok jasności na granicy świata spadł z 51,5% do 9%**, czyli poniżej progu, przy którym margines czyta się jako osobny pas,
- w marginesie może żyć wyłącznie sceneria: skoro na iPadzie i przy 2:1 tej przestrzeni nie ma w ogóle, nic, co gracz musi zobaczyć, nie może tam trafić — cała rozgrywka zostaje w autorskim polu 1280×640,
- walidacja pilnuje skalowania „do pokrycia", lekkiego przyciemnienia i zasięgu winiety — sprawdzono przez odtworzenie ciemnego pasa.

## 0.22.1 — Lądowanie przestało wyglądać jak animacja interfejsu

Zgłoszone przez właściciela: kierunek dobry, ale wychodzi trochę sztucznie. Trzy rzeczy robiły tę sztuczność i każda została nazwana osobno:

- **tor był prostą ukośną linią** — pozioma i pionowa składowa dzieliły to samo wygładzenie, więc bohater sunął do celu jak element interfejsu; teraz tor się wygina, bohater wznosi się ponad krawędź (20 px ponad prostą) i wpada za nią,
- **dolot kończył się martwym stopem** — po dojściu do punktu pozycja zamarzała; teraz przylot ma ciężar: tłumione odbicie trzyma bohatera w ruchu jeszcze przez chwilę (przestrzelenie 12 px, wygaszane), tak jak każdą rzecz z masą,
- **wylądowany bohater był pomnikiem** — kołysanie na biegu jałowym działa tylko w fazie gotowości, więc po trafieniu nic się nie ruszało; teraz oddech i powolne kołysanie narastają w miarę wygasania odbicia, a bohater nigdy nie zastyga całkowicie,
- **lądowanie idealnie na środku za każdym razem** czytało się jak gotowiec; bohater zachowuje część kierunku, z którego przyleciał — zmierzone na ośmiu misjach: siedem różnych pozycji spoczynkowych,
- kurz przy krawędzi dostał własny, symetryczny wyrzut: dotychczasowy spawner startowy dmucha wyłącznie w lewo, co przy lądowaniu czytało się jak podmuch wiatru, a nie jak kontakt,
- walidacja pilnuje osobno łuku, odbicia, oddechu, kołysania, kurzu i odchylenia od środka — każdy z tych elementów samodzielnie odpowiada za jedną część „sztuczności".

## 0.22.0 — Bohater ląduje w celu, a jego twarz zostaje jego twarzą

- **bohater przestał przyklejać się do przedmiotów**: po trafieniu zostawał zamrożony w miejscu zderzenia, pod kątem lotu, przylepiony do boku telefonu czy loda — wyglądał jak sprite, który zgubił aktualizację,
- teraz **ląduje w celu**: przesuwa się na środek celu, prostuje z kąta lotu, lekko się ugina i zapada po klatkę piersiową, tak że nad krawędzią zostaje głowa i ramiona,
- ciało poniżej krawędzi jest przycinane, a nie zasłaniane przerysowanym celem — dzięki temu ta sama zasada działa dla wszystkich 27 rodzajów celów; sprawdzone na dwunastu (budzik, kubek, skarpeta, pilot, toster, krasnal, lód, kaczka, kanapka, parasol, boja, walizka),
- **usunięto gwiazdkę wiszącą obok głowy ze zdjęcia**. Wcześniejsza poprawka zsunęła ją z twarzy, ale zostawiła w powietrzu obok — czytało się to jak błąd rysowania, a nie jak charakter. Głowa ze zdjęcia nie dostaje teraz żadnego akcentu na wysokości twarzy; charakter niosą peleryna, odznaka na torsie i kok,
- **przy okazji wyszło to samo w trzech innych miejscach**: gwiazdki zwycięstwa rysowały się na włosach, kropla potu na skroni, a kreska porażki na brodzie. Wszystkie akcenty dla głowy ze zdjęcia są teraz rysowane poza kadrem portretu,
- test akcentów obejmuje **wszystkie dwanaście min**, a nie trzy wybrane — poprzednia wersja sprawdzała tylko nowe stany i przepuściła gwiazdki na włosach; doszła też asercja, że model nie może zwrócić miny, której test nie zna,
- napis o zwycięstwie podnosi się nad wylądowaną głowę zamiast lądować na twarzy: stały odstęp od celu nie wystarczał, bo portret sięga znacznie wyżej niż głowa rysowana.

## 0.21.0 — Seria: bieg o jeszcze jedną misję

- **nowy tryb Seria**: losowe misje, które już przeszedłeś, jedna po drugiej, ze wspólnym budżetem strzałów na cały bieg — każdy strzał kosztuje jeden, każde trafienie zwraca dwa,
- pierwszy projekt zakładał jeden strzał na misję i **został odrzucony po pomiarze**: strzał oddany bez znajomości trasy wygrywa około 20% razy (siatka z bilansu kampanii), więc taki bieg kończył się średnio po **0,25 misji** — to automat do gry, nie gra,
- budżet z premią wypłaca za umiejętność: przy 20% trafień bieg daje 1,5 misji, przy 30% — 3, przy 40% — 5,9, przy 49% — 11,6, przy 58% — 23,6; umiejętność zmienia wynik szesnastokrotnie i nie ma sufitu, a żaden bieg nie kończy się na zerze,
- **bieg nie dotyka postępu kampanii**: nie przyznaje medali, punktów, żetonów ani odblokowań — zapisuje wyłącznie własny rekord, co sprawdzono w przeglądarce (punkty, ukończone misje i odblokowania bez zmian po całym biegu),
- Seria losuje wyłącznie z misji już ukończonych i nigdy nie daje tej samej dwa razy pod rząd; odblokowuje się po trzech ukończonych misjach,
- budżet jest pokazany kropkami przy planszy, bo liczbę trzeba czytać kątem oka w trakcie strzału, a nie w panelu,
- naprawiono błąd układu: licznik był rysowany względem strony zamiast planszy i lądował na pasku górnym, zasłaniając wybór charakteru; na telefonie schodzi do wolnego dolnego rogu, bo odznaka celu zajmuje tam prawie całą szerokość,
- walidacja pilnuje budżetu, premii, limitu, braku powtórzeń i tego, że licznik siedzi wewnątrz planszy — sprawdzono, że wykrywa dokładnie tamten błąd układu.

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
