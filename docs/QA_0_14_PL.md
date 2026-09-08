# SlingToon 0.14 — kontrola kampanii 80 misji

## Kryteria przyjęcia

- 80 stabilnych identyfikatorów misji w 10 rozdziałach po 8 etapów.
- Każda misja ma zwycięski strzał bez obowiązkowego FIK-a.
- Podpowiadany naciąg wybacza co najmniej ±10 jednostek w całym badanym polu; większość misji wybacza ±12–20.
- Każda misja ma osobny, zwycięski strzał zbierający opcjonalną gwiazdkę.
- Zwykła podpowiedź nie zbiera gwiazdki przypadkiem.
- Wynik fizyki pozostaje identyczny przy aktualizacji 30, 60 i 120 Hz.
- Mapa pokazuje jeden rozdział naraz, zapisuje wybraną misję i odblokowuje poziom 9 po ukończeniu dawnego finału.

Dokładne wyniki pomiaru nowych poziomów znajdują się w `docs/campaign-balance-0.14.json`. Pomiar używa tego samego solvera co gra; skrypt `scripts/balance-campaign.mjs` nie jest wykonywany na urządzeniu gracza.

## Automatyczna kontrola

`npm run check` obejmuje walidację pakietu, składnię oraz 283 testy modelu, UI, postępu, audio, portretu i viewportu. `npm run build` oraz `npm run smoke` sprawdzają gotowy statyczny artefakt.

Rasterowy arkusz QA pokazuje stan początkowy i zwycięstwo we wszystkich 80 misjach oraz trzy proporcje mobilnego canvasu. Nadal potrzebny jest końcowy playtest dotykowy na fizycznym iPhonie przed publikacją.
