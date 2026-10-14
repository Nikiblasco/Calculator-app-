const CACHE_NAME = "calculator-v2";
const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./keypad.js",
  "./graph-ui.js",
  "./graph-draw.js",
  "./graph-engine.js",
  "./manifest.json"
];

// Install event: cache all core static assets and skip waiting immediately
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting();
});

// Activate event: clean up old caches and claim clients immediately
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event: Network-first strategy for automatic updates when online, falling back to cache offline
self.addEventListener("fetch", event => {
  // Skip non-GET requests
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        // If online fetch succeeds, clone and update the cache dynamically
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // If offline (or network fails), fallback to the cache
        return caches.match(event.request);
      })
  );
});