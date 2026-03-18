const CACHE_NAME = "tabi-v1";

// On install, cache the app shell
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll([
        "/tabi-no-kotoba/",
        "/tabi-no-kotoba/index.html",
        "/tabi-no-kotoba/booking.html",
        "/tabi-no-kotoba/manifest.json",
        "/tabi-no-kotoba/icon-192.svg",
        "/tabi-no-kotoba/icon-512.svg",
      ])
    )
  );
});

// On activate, clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first strategy for HTML/JS, cache-first for fonts/assets
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET and cross-origin requests (except Google Fonts)
  if (event.request.method !== "GET") return;
  const isFont = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (!url.hostname.includes("github.io") && !isFont && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") return;

  if (isFont) {
    // Cache-first for fonts (they rarely change)
    event.respondWith(
      caches.match(event.request).then((cached) =>
        cached || fetch(event.request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
      )
    );
  } else {
    // Network-first for app files (get latest, fall back to cache)
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  }
});
