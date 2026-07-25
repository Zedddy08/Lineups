// Minimal offline cache. Bump CACHE_NAME when app files change so old
// clients don't get stuck on stale cached content.
const CACHE_NAME = "lineups-v3";
const CORE_ASSETS = [
  "./",
  "index.html",
  "style.css",
  "app.js",
  "manifest.json",
  "data/lineups.json",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "images/maps/dust2.webp",
  "images/maps/inferno.webp",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // Per-asset, not cache.addAll() — addAll is all-or-nothing, so a
      // single missing/renamed file (easy to hit mid-iteration, or if this
      // list ever drifts from what's actually on disk) would silently fail
      // the ENTIRE install and leave the OLD service worker in permanent
      // control forever, serving stale/broken files with no way to recover
      // short of the user manually clearing site data. This is almost
      // certainly what caused the "stuck on loading spinner forever" bug —
      // fixed here, but the real safety net is app.js's own error handling
      // (loadData has a timeout, route() has a try/catch) so a service
      // worker problem can never fully brick the app again either way.
      Promise.allSettled(CORE_ASSETS.map((url) => cache.add(url)))
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Network-first for the data file so lineup updates show up without
  // needing a hard refresh; cache-first for everything else (static shell).
  if (event.request.url.includes("data/lineups.json")) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(event.request, copy));
          return res;
        })
        .catch(() =>
          caches.match(event.request).then((cached) => cached || fetchFailedResponse())
        )
    );
    return;
  }
  event.respondWith(
    caches
      .match(event.request)
      .then((cached) => cached || fetch(event.request))
      .catch(() => fetchFailedResponse())
  );
});

// event.respondWith() must always resolve to a real Response — resolving
// to undefined (which caches.match() returns on a cache miss) makes the
// PAGE's own fetch() throw, which is exactly what left the app stuck on
// an infinite spinner with no way to recover. A real (if unsuccessful)
// Response lets the page's own error handling actually run.
function fetchFailedResponse() {
  return new Response("", { status: 503, statusText: "Service Unavailable (offline, not cached)" });
}
