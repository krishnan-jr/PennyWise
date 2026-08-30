const CACHE_NAME = 'pennywise-pwa-v4';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json?v=1.0.2',
  './css/styles.css?v=1.0.2',
  './js/storage.js?v=1.0.2',
  './js/settings.js?v=1.0.2',
  './js/income.js?v=1.0.2',
  './js/expenses.js?v=1.0.2',
  './js/events.js?v=1.0.2',
  './js/dashboard.js?v=1.0.2',
  './js/app.js?v=1.0.2',
  './icons/icon.svg?v=1.0.2',
  './icons/icon-192.png?v=1.0.2',
  './icons/icon-512.png?v=1.0.2',
  './icons/apple-touch-icon.png?v=1.0.2'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch in background to update cache (stale-while-revalidate)
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      });
    }).catch(() => caches.match('./index.html'))
  );
});
