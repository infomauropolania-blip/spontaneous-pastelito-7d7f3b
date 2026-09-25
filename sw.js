const CACHE = 'peppos-academy-v5.8-access-control';
const APP_SHELL = ['/src/styles.css', '/src/calculator.js', '/src/filter-calculator.js', '/src/manual-calculator.js', '/src/machine-guides.js', '/src/access.bundle.js', '/src/app.js', '/manifest.webmanifest', '/assets/peppos-coffee-academy.jpeg', '/icons/pepos-icon.svg', '/icons/pepos-icon-192.png', '/icons/pepos-icon-512.png'];

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
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/') || url.pathname.startsWith('/.netlify/')) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request));
    return;
  }
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
