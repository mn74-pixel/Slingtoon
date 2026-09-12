# SlingToon 0.15 — krzywa trudności i wycinek twarzy

## Co miało się zmienić

Zgłoszenie właściciela: efekt rysunkowy sprawiał, że twarz nie przypominała oryginału; ikona wyboru twarzy była nieczytelna; 80 misji przechodziło się zbyt szybko, a część poziomów była zbyt podobna do wcześniejszych.

## Kryteria przyjęcia

- Domyślna głowa to wycinek zdjęcia: tło usunięte, piksele zdjęcia nietknięte. Suwak ustawiony na `0%` daje zero efektu.
- Krawędź wycinka nie przepuszcza tła zdjęcia (maska 256 px jest wyostrzana po przeskalowaniu).
- Tryb `TOON` zachowuje dotychczasowe przerysowanie z 478 punktów; przełączanie trybów nie kasuje ustawienia drugiego.
- Przycisk wyboru twarzy jest rozpoznawalny bez podpisu, a po ustawieniu twarzy pokazuje jej miniaturę.
- Każda z 80 misji ma zwycięski strzał bez obowiązkowego FIK-a i osobny strzał zbierający gwiazdkę.
- Podpowiadany naciąg wybacza co najmniej ±5 jednostek zweryfikowanych w narożnikach pola, nie tylko w jego wnętrzu.
- Pole trafienia celu nie jest większe od rysunku obiektu od misji 48 w górę.
- Ruchoma przeszkoda startuje z pozycji widocznej przed strzałem i pozostaje deterministyczna przy 30, 60 i 120 Hz.
- Strefa zakazana kończy lot od dotknięcia, nigdy nie jest obiektem wymaganym i zawsze ma podpis oraz własny komunikat porażki.

## Zmierzona trudność

Udział zwycięskich naciągnięć w całym badanym polu celowania (620 próbek na misję, ten sam solver co w grze):

| Misje | 0.14 | 0.15 |
| --- | --- | --- |
| 9–24 | 30,9% | 25,0% |
| 25–48 | 31,1% | 21,6% |
| 49–64 | 30,1% | 18,5% |
| 65–80 | 25,2% | 14,7% |
| całość | 29,5% | 20,1% |

Wcześniej krzywa była płaska — trudność nie rosła z postępem kampanii. Rozkład zmierzonej tolerancji tras: ±20 dla 12 misji, ±16 dla 15, ±12 dla 23, ±10 dla 10, ±8 dla 6, ±6 dla 4, ±5 dla 2.

Najwęższe okno (±5–6) mają misje 38, 44, 58, 72, 74 i 78 — to pierwsze kandydatki do playtestu dotykowego.

## Poprawiony błąd w narzędziu autorskim

`scripts/balance-campaign.mjs` mierzył tolerancję ze stałym krokiem 4 px, więc przy oknie ±5 badał przesunięcia −5, −1 i +3, nigdy nie sprawdzając narożników pola. Raportowana tolerancja mogła być więc taka, której trasa nie przetrwała. Pomiar chodzi teraz po siatce lądującej dokładnie na ±margin, a test regresji porównuje każdą z 80 tras z zapisaną w `docs/campaign-balance-0.15.json` wartością. Skrypt wyklucza też gwiazdki wewnątrz stref zakazanych i w pasie ruchu ruchomych przeszkód.

Raport pomiaru jest generowany od nowa przy każdym wydaniu, dlatego istnieje jeden aktualny plik, a nie osobny plik na wersję.

## Czytelność

- Puenta zwycięstwa nie jest już rysowana nad planszą przed strzałem; 71 misji straciło bąbel zdradzający zakończenie.
- Cel dostał aureolę odsuwającą dekorację rozdziału, a podpis celu omija grafikę obiektu, nie collider.
- Szyld ratownika zniknął z wysokości rozgrywki — dekoracyjny tekst konkurował z czytaniem planszy.
- Osiem misji rozdziału ma osiem różnych tł (godzina dnia, układ scenerii, gwiazdy). Wcześniej `variant` był wyliczany, ale użyty w jednym miejscu, więc cały rozdział wyglądał jak jedna plansza powtórzona ośmiokrotnie.

## Automatyczna kontrola

`npm run check` obejmuje walidację pakietu, składnię oraz 290 testów modelu, UI, postępu, audio, portretu i viewportu. `npm run build` i `npm run smoke` sprawdzają gotowy statyczny artefakt. Rasterowy arkusz QA pokazuje stan początkowy i zwycięstwo we wszystkich 80 misjach.

## Czego nie sprawdzono

Rendery plansz nie zastępują testu na urządzeniu. Do wykonania przed uznaniem wersji za produkcyjnie sprawdzoną:

- playtest dotykowy na fizycznym iPhonie, w tym nowa krzywa trudności odczuta ręką, a nie zmierzona solverem,
- Face Studio na prawdziwych zdjęciach: jakość wycinka przy włosach, okularach, kapeluszu i słabym świetle,
- czytelność miniatury twarzy w przycisku na małym ekranie,
- dźwięk, instalacja i aktualizacja cache PWA z poprzedniej instalacji 0.14.0.
