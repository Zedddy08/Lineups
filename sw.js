// Network-first for EVERYTHING, cache is a pure offline fallback.
//
// v3 used cache-first for the app shell (index.html/style.css/app.js) —
// that's the standard PWA pattern, but it actively bit us: this app is
// being iterated on rapidly, and a browser that already had an old shell
// cached would keep serving that OLD JavaScript against the NEW data
// shape indefinitely, since cache-first never re-checks the network once
// something's cached. Old app.js code (pre error-handling fix, expecting
// a data shape from when there were only 5 lineups) crashing against the
// new 80-lineup data is almost certainly what caused the "stuck on
// loading spinner forever, worked fine when there were few lineups" bug
// report — and it happened INSIDE the old cached JS, before any of the
// v3 error-handling fixes (which only exist in the NEW app.js) could
// ever run. Network-first eliminates this whole class of bug: as long as
// there's connectivity, the browser always gets today's real files.
// Offline behavior degrades to whatever was cached on the last successful
// load, same as before.
const CACHE_NAME = "lineups-v4";
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
      // Per-asset, not cache.addAll() (all-or-nothing — one missing file
      // would silently fail the whole install and strand an old worker).
      Promise.allSettled(CORE_ASSETS.map((url) => cache.add(url)))
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))))
      // Take control of already-open pages immediately, don't wait for
      // the next full navigation — this is what actually lets an already
      //-stuck page recover as soon as the new worker activates.
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(event.request, copy));
        return res;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || fetchFailedResponse()))
  );
});

// event.respondWith() must always resolve to a real Response — resolving
// to undefined (which caches.match() returns on a cache miss) makes the
// PAGE's own fetch() throw with nothing to catch it, which is exactly
// what left the app stuck on an infinite spinner with zero recovery path.
function fetchFailedResponse() {
  return new Response("", { status: 503, statusText: "Service Unavailable (offline, not cached)" });
}
