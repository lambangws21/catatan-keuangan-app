const CACHE_VERSION = "pwa-v1";
const APP_SHELL = [
  "/offline.html",
  "/manifest.webmanifest",
  "/pwa/icon-192.png",
  "/pwa/icon-512.png",
  "/pwa/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.map((k) => (k === CACHE_VERSION ? null : caches.delete(k))))
      )
      .then(() => self.clients.claim())
  );
});

const isNavigation = (req) => req.mode === "navigate";
const isStaticAsset = (url) =>
  url.pathname.startsWith("/_next/") ||
  url.pathname.startsWith("/images/") ||
  url.pathname.startsWith("/pwa/") ||
  /\.(?:png|jpg|jpeg|webp|gif|svg|ico|css|js|woff2|woff|ttf|mp3)$/.test(url.pathname);

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (isNavigation(req)) {
    event.respondWith(
      fetch(req).catch(() => caches.match("/offline.html"))
    );
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req)
          .then((res) => {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
            return res;
          })
          .catch(() => caches.match("/offline.html"));
      })
    );
  }
});
