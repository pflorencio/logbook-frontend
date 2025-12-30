/* Logbook Cashier PWA — v1 (cache shell only, online-first) */

const CACHE_NAME = "logbook-cashier-shell-v1";

// Keep this list SMALL to avoid caching stale app bundles.
const SHELL_ASSETS = [
  "/",
  "/login",
  "/index.html",
  "/manifest.webmanifest"
];

// Install: cache only the shell routes/assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

// Activate: cleanup old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => (key !== CACHE_NAME ? caches.delete(key) : null)))
    )
  );
  self.clients.claim();
});

// Fetch strategy:
// - For API calls (and anything not GET): always go network
// - For GET navigation requests: network-first, fallback to cached shell
// - For other GET requests: just network (keep it simple and safe)
self.addEventListener("fetch", (event) => {
  const req = event.request;

  if (req.method !== "GET") return;

  const url = new URL(req.url);

  if (url.pathname.startsWith("/api") || url.hostname.includes("onrender.com")) {
    return;
  }

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match("/index.html"))
    );
    return;
  }
});

