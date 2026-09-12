# SlingToon 0.16 — drugi manewr i charakter, który coś robi

## Co miało się zmienić

Decyzja właściciela po playteście 0.15: głowa zostaje w obecnej skali, charakter ma dostać realny wpływ na fizykę, a gra ma dostać drugą umiejętność w locie, bo jeden gest na 80 misji nudzi.

## Kryteria przyjęcia

- Drugi manewr jest realnym narzędziem, nie mocniejszym FIK-iem: ma odwrotne zastosowanie i własne okno czasowe.
- Wystrzał i lot swobodny są **identyczne** dla wszystkich czterech charakterów, co do piksela.
- Wszystkie 72 zmierzone trasy zachowują ważność, a każda z 80 misji nadal daje się przejść bez użycia jakiegokolwiek manewru.
- Żaden charakter nie odbiera rozwiązania — zmiana bohatera może tylko dodać opcję.
- What If odtwarza pełną sekwencję manewrów w kolejności i przywraca charakter, którym wykonano strzał.
- Manewry nigdy nie dzielą koloru, a przycisk gaśnie dokładnie wtedy, gdy manewr przestaje być dostępny.

## KAMIEŃ: dlaczego tylko na wznoszeniu

Pierwsza wersja była hamulcem — ścinała 65% pędu do przodu i dodawała spadanie. Pomiar na próbce misji (21, 28, 35, 42, 49, 56, 63, 70, 77) pokazał, że ratowała **62–77% wszystkich przegrywających naciągnięć**. To czyniło celowanie bezcelowym, czyli dokładnie odwrotnie do celu wydania.

Osłabienie samej siły nie pomogło (nadal 56–74%), bo problem nie leżał w liczbach: cel jest okręgiem, do którego można wpaść z góry z niemal dowolnego łuku, więc jakiekolwiek pchnięcie w dół prawie zawsze znajdowało działający moment. Rozwiązaniem było ograniczenie **okna**, nie siły. KAMIEŃ działa wyłącznie dopóki bohater się wznosi, więc jest decyzją podejmowaną wcześnie i konkuruje z FIK-iem o ten sam moment.

## Zmierzona wartość obu manewrów

Na przegrywających naciągnięciach z tej samej próbki, przy 30 możliwych momentach co 0,05 s:

| Charakter | FIK ratuje | okno FIK | KAMIEŃ ratuje | okno KAMIEŃ |
| --- | --- | --- | --- | --- |
| Drama Queen | 33% | 0,56 s | 54% | 0,55 s |
| Tough Guy | 33% | 0,53 s | 62% | 0,50 s |
| Panic | 32% | 0,53 s | 43% | 0,56 s |
| Zen | 33% | 0,55 s | 49% | 0,53 s |

Okno około pół sekundy oznacza, że żaden z manewrów nie jest przyciskiem „naciśnij kiedykolwiek". Tough Guy ratuje najwięcej KAMIENIEM, bo ma najcięższe nurkowanie — i płaci najsłabszym FIK-iem. Panic ratuje najmniej pojedynczym użyciem, ale ma po dwa ładunki każdego manewru.

Udział zwycięskich naciągnięć **bez** manewru to 24,9% i jest identyczny dla wszystkich czterech charakterów — to potwierdzenie, że charakter nie rusza lotu swobodnego.

## Charakter jako zestaw narzędzi

| Charakter | podbicie | pchnięcie w przód | spadanie | pozostały pęd | ładunki |
| --- | --- | --- | --- | --- | --- |
| Drama Queen | 325 | 40 | 285 | 88% | 1 |
| Tough Guy | 205 | 140 | 360 | 80% | 1 |
| Panic | 175 | 50 | 200 | 90% | 2 |
| Zen | 250 | 80 | 235 | 72% | 1 |

Walidacja pakietu wymaga, aby wszystkie cztery charaktery różniły się na każdym z czterech pokrętł — inaczej `npm run check` nie przechodzi. To zabezpieczenie przed powrotem do stanu, w którym wybór charakteru był kosmetyką.

## Automatyczna kontrola

`npm run check` obejmuje walidację pakietu, składnię oraz 294 testy. Nowe testy pilnują: identycznego lotu swobodnego dla wszystkich charakterów, odwrotnego działania obu manewrów, zamknięcia okna KAMIENIA na szczycie łuku, tego że odrzucony manewr nie zużywa ładunku, oraz odtworzenia trzech manewrów w kolejności przez What If.

## Czego nie sprawdzono

- Playtest dotykowy: czy okno pół sekundy jest wygodne palcem na telefonie, i czy przycisk gasnący w połowie lotu nie jest irytujący.
- Czy gracze w ogóle zauważą, że charakter zmienia narzędzia — opis pojawia się tylko w jednym toaście przy zmianie.
- Czy dwa przyciski manewrów mieszczą się czytelnie na najmniejszych ekranach w orientacji poziomej.
- Zbalansowanie Tough Guya: ratuje KAMIENIEM najwięcej z całej czwórki i może okazać się domyślnym wyborem.
