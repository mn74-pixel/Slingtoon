const CACHE_NAME = "slingtoon-web-0.38.0";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css?v=0.38.0",
  "./manifest.webmanifest?v=0.38.0",
  "./src/main.js?v=0.38.0",
  "./src/game.js?v=0.38.0",
  "./src/levels.js?v=0.38.0",
  "./src/campaign.js?v=0.38.0",
  "./src/campaign-routes.js?v=0.38.0",
  "./src/physics.js?v=0.38.0",
  "./src/prop-art.js?v=0.38.0",
  "./src/sling-art.js?v=0.38.0",
  "./src/aim-settle.js?v=0.38.0",
  "./src/progress.js?v=0.38.0",
  "./src/streak.js?v=0.38.0",
  "./src/interactions-renderer.js?v=0.38.0",
  "./src/world-renderer.js?v=0.38.0",
  "./src/render.js?v=0.38.0",
  "./src/viewport.js?v=0.38.0",
  "./src/audio.js?v=0.38.0",
  "./src/face-studio.js?v=0.38.0",
  "./src/face-mimic.js?v=0.38.0",
  "./src/face-vision.js?v=0.38.0",
  "./src/portrait.js?v=0.38.0",
  "./assets/logo_slingtoon.svg",
  "./assets/stage_morning_mayhem.svg",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/icon-maskable-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("slingtoon-web-") && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (!response.ok) return response;
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match("./index.html")))
    );
    return;
  }

  const url = new URL(event.request.url);
  const updateSensitive =
    event.request.destination === "script" ||
    event.request.destination === "style" ||
    url.pathname.endsWith(".webmanifest");

  if (updateSensitive) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (!response.ok) return response;
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type === "opaque") return response;
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      });
    })
  );
});
