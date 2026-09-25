const CACHE = 'peppos-academy-v5.4-unified-methods';
const APP_SHELL = ['/', '/src/styles.css', '/src/calculator.js', '/src/filter-calculator.js', '/src/manual-calculator.js', '/src/app.js', '/manifest.webmanifest', '/assets/peppos-coffee-academy.jpeg', '/icons/pepos-icon.svg', '/icons/pepos-icon-192.png', '/icons/pepos-icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('/')))
  );
});
