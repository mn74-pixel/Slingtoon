# Generator misji

Narzędzie do prototypowania. **Nie jest edytorem**: nikt nie stawia tu pudełek ręcznie i gracz nigdy go nie widzi. Generator wymyśla misję, a potem próbuje ją złamać — zostają tylko te, które przeżyją.

```bash
npm run generate -- --count=12 --tries=260 --seed=21
npm run generate:render -- /tmp/slingtoon-generated      # arkusz podglądowy
```

Wynik trafia do `docs/generated-missions.json`. **Nic nie wchodzi do kampanii automatycznie** — promocja jest ręczna.

## Czym generator NIE jest

Nie ma tu własnego pojęcia „dobrej misji". Każdy osąd wykonuje ta sama maszyneria, która certyfikuje wydaną kampanię:

- **układ** — `mission()` z `src/campaign.js`: skalowanie do kształtu strzału, rozsuwanie rysunków, dorastanie zasięgu;
- **trasa i tolerancja** — `scripts/lib/route-search.mjs`, wyciągnięte z balansera, więc balanser i generator mierzą jednym przyrządem;
- **odstępy** — `propParts` / `goalParts` z `src/prop-art.js`, czyli prostokąty, które renderer naprawdę maluje;
- **gwiazdka** — `starFor`, z dowodem przez symulację: trasa gwiazdki ją zbiera, a trasa łatwa — nie.

Generator z własną, łagodniejszą definicją „przejdzie" produkowałby misje, których gra nie potrafi dotrzymać.

## Progi są mierzone, nie wymyślone

Każdy próg pochodzi z pomiaru wydanej kampanii. Dwie reguły **odpadły**, bo sama kampania ich nie spełnia:

| reguła | dlaczego odpadła |
|---|---|
| „przeszkody muszą zmniejszać zbiór wygrywających naciągów" | portale, wiatr i sprężyny go **powiększają** — mediana 74%, ale dziewiąty decyl 168% |
| „przeszkoda, którą się omija, musi zmieniać to, co wygrywa" | **15 z 23** ręcznie zaprojektowanych zmienia zbiór o 0% — zadaniem bramki jest uzasadnić przycisk, nie zwęzić celowanie |

Co zostało:

- **tolerancja ≥ ±8 px** naciągu (kampania schodzi do ±5, ale prototyp ma być wygodniejszy niż jej najtrudniejsze misje);
- **≥ 30 px powietrza** między rysunkami (`PROP_CLEARANCE`);
- **≥ 120 px** od procy do najbliższego rysunku;
- **wyjście portalu ≥ 180 px od celu** — zmierzone: żaden portal w kampanii nie wypuszcza bohatera bliżej niż 184 px. Rozsuwanie rysunków załatwia większość przypadków, ale **nie** portal umieszczony za celem: taki buduje się 126 px od niego i przechodzi wszystkie reguły odstępu. To jest zadanie tej bramki.

## Jak czytać wynik

```
Prototyp 035  ±20 px aim · 11.3% of pulls win · 30 px air · hazard
```

- **±20 px aim** — najszerszy zmierzony margines naciągu, przy którym trasa nadal wygrywa;
- **11.3% of pulls win** — udział wygrywających naciągów w całej siatce. Misja, którą wygrywa prawie wszystko, niczego nie uczy; taka, którą prawie nic — jest loterią. Lista jest sortowana wokół 12%;
- **30 px air** — najmniejszy odstęp między rysunkami.

## Następny krok

Generator nie pisze gagów, nie układa kolejności nauczania i nie wie, że rozdział ma temat. To robimy razem: on daje układ i dowód, że da się go przejść, my dajemy powód, żeby chcieć.
