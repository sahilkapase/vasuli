const CACHE_NAME = "vasuli-static-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

// Network-first for everything; only caches successful GETs of static assets so the shell
// still loads on a flaky connection. Never intercepts non-GET requests — payments and other
// mutations always go straight to the network and simply fail/toast if there's no connection,
// they are never queued for later replay.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  const isStatic = url.pathname.startsWith("/_next/static") || url.pathname.startsWith("/icons") || url.pathname === "/manifest.json";

  if (!isStatic) return;

  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
