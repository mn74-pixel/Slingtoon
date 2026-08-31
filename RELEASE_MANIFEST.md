# SlingToon Web 0.9.5 — Release Manifest

**Format:** statyczna gra HTML5 Canvas / PWA  
**Publikacja:** GitHub Pages  
**Data:** 29 sierpnia 2026 r.

## Zawartość

- modułowy kod JavaScript bez serwera aplikacyjnego,
- Face Studio 2 z lokalnym wykrywaniem 478 punktów twarzy,
- segmentacja głowy rozróżniająca włosy, skórę, tło, ubranie i akcesoria,
- portret wektorowy 512×512 z automatycznym kadrem twarzy niezależnym od odległości aparatu,
- lokalny runtime MediaPipe Tasks Vision 1.0.1 oraz dwa modele ML,
- responsywny interfejs edge-to-edge mieszczący całą grę w poziomym ekranie telefonu,
- automatyczna instrukcja uruchomienia jako aplikacji na iPhonie oraz aktywny przycisk pełnego ekranu,
- powiększona do 162% rysunkowa głowa z czytelną mimiką, bez zmiany pola kolizji,
- grafika SVG i ikony PNG,
- service worker i manifest instalacyjny,
- workflow walidacji i publikacji GitHub Pages,
- testy mechaniki oraz dokumentacja migracji.

## Zaliczone kontrole

- poprawność struktury PWA i kompletność cache offline,
- składnia wszystkich modułów JavaScript,
- Quick Sling i One Move,
- grywalna droga do zwycięstwa w obu trybach,
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
- render sceny bazowej i zwycięstwa do obrazu kontrolnego,
- czysty artefakt statyczny `dist/` oraz test jego serwowania po HTTP.

## Świadomie poza zakresem

- podpisana aplikacja App Store/Google Play,
- płatności i reklamy,
- Game Center/Play Games,
- konta, chmura i multiplayer,
- generatywne AI oraz przesyłanie zdjęcia poza urządzenie,
- końcowy sound design oraz haptics natywne.
