# SlingToon Web 0.11.0 — Release Manifest

**Format:** statyczna gra HTML5 Canvas / PWA  
**Publikacja:** GitHub Pages  
**Data:** 2 września 2026 r.

## Zawartość

- modułowy kod JavaScript bez serwera aplikacyjnego,
- Face Studio 2 z lokalnym wykrywaniem 478 punktów twarzy,
- segmentacja głowy rozróżniająca włosy, skórę, tło, ubranie i akcesoria,
- portret wektorowy 512×512 z automatycznym kadrem twarzy niezależnym od odległości aparatu,
- lokalny runtime MediaPipe Tasks Vision 1.0.1 oraz dwa modele ML,
- responsywny interfejs edge-to-edge z kamerą pokazującą cały świat bez przycięcia i deformacji,
- jednorazowy ekran startowy z bezpośrednim przyciskiem pełnego ekranu oraz instrukcją zapasową dla starszego Safari,
- rozszerzony kadr pokoju w trybie pełnoekranowym dzięki połączeniu górnych pasków w jeden rząd,
- powiększona do 192% rysunkowa głowa z czytelną mimiką i większym polem chwytu, bez zmiany pola kolizji,
- deklaratywny rdzeń poziomów oddzielający geometrię, cele i teksty misji od modelu fizyki,
- przyjazny onboarding pierwszego poziomu z jednym uczonym czasownikiem, szerszym oknem sukcesu i predykcją opartą na prawdziwej fizyce,
- pięciopoziomowy rozdział śniadaniowy z odblokowywanym postępem, nawigacją i rosnącą trudnością,
- pięć humorystycznych, proceduralnie rysowanych celów oraz osobne reakcje czterech osobowości,
- adaptacyjna podpowiedź po dwóch porażkach i dźwiękowe puenty zależne od celu,
- grafika SVG i ikony PNG,
- service worker i manifest instalacyjny,
- workflow walidacji i publikacji GitHub Pages,
- testy mechaniki oraz dokumentacja migracji.

## Zaliczone kontrole

- poprawność struktury PWA i kompletność cache offline,
- składnia wszystkich modułów JavaScript,
- Quick Sling i One Move,
- grywalna droga do zwycięstwa w obu trybach,
- grywalna droga do zwycięstwa dla każdego z pięciu poziomów,
- malejące okno sukcesu na kolejnych etapach oraz uczciwa dolna granica finału,
- co najmniej 34% zwycięskich strzałów w kontrolnej siatce wejść pierwszego poziomu,
- dokładny replay zapisanego strzału,
- rzeczywista zmiana fizyki dla wszystkich czterech What If,
- różne ekspresje i komentarze osobowości,
- obsługa zdjęć z aparatu i obrót o 90 stopni,
- mobilny przepływ Face Studio: otwarcie edytora, wybór i ponowny wybór zdjęcia,
- widoczny podgląd wyszparowanej głowy oraz portretu przed zatwierdzeniem,
- zachowanie wąskiej geometrii twarzy bez wymuszania koła,
- wykluczenie ubrania z maski głowy i wykorzystanie faktycznego konturu włosów,
- brak stałej czaszki i brak okrągłego clippingu w rendererze avatara,
- zgodność sum kontrolnych obu lokalnych modeli,
- wersjonowanie zasobów i cache zapobiegające uruchamianiu starej wersji po publikacji,
- mapowanie dotyku przez odwrotną transformację adaptacyjnej kamery na szerokich i wysokich ekranach,
- render sceny bazowej i zwycięstwa do obrazu kontrolnego,
- czysty artefakt statyczny `dist/` oraz test jego serwowania po HTTP.

## Świadomie poza zakresem

- podpisana aplikacja App Store/Google Play,
- płatności i reklamy,
- Game Center/Play Games,
- konta, chmura i multiplayer,
- generatywne AI oraz przesyłanie zdjęcia poza urządzenie,
- końcowy sound design oraz haptics natywne.
