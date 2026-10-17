/* Hauskredit – Service Worker
   Seite und Manifest: zuerst aus dem Netz (damit Updates sofort ankommen), offline aus dem Cache.
   Schriften und Icons: aus dem Cache.
   Bei Änderungen an Schriften oder Icons die VERSION erhöhen UND die Dateinamen ändern
   (z. B. icon-512-v3.png), sonst zeigen Android/Chrome oft weiter das alte Icon. */
const VERSION = "hauskredit-1.0.2";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192-v2.png",
  "./icons/icon-512-v2.png",
  "./icons/icon-maskable-512-v2.png",
  "./icons/apple-touch-icon-v2.png",
  "./icons/favicon-32-v2.png",
  "./fonts/ibm-plex-sans-latin-400-normal.woff2",
  "./fonts/ibm-plex-sans-latin-500-normal.woff2",
  "./fonts/ibm-plex-sans-latin-600-normal.woff2",
  "./fonts/ibm-plex-serif-latin-500-normal.woff2",
  "./fonts/ibm-plex-serif-latin-600-normal.woff2"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith("hauskredit-") && k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;

  const path = new URL(req.url).pathname;
  const fresh = req.mode === "navigate" || path.endsWith(".webmanifest");

  if (fresh && req.mode !== "navigate") {
    // Manifest immer frisch holen, damit Änderungen an Name/Icons ankommen
    event.respondWith(fetch(req, { cache: "no-cache" }).catch(() => caches.match(req, { ignoreSearch: true })));
    return;
  }

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req, { cache: "no-cache" })
        .then(res => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(VERSION).then(cache => cache.put("./index.html", copy));
          }
          return res;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(cache => cache.put(req, copy)); }
      return res;
    }))
  );
});
