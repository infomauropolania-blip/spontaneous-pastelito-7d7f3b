const CACHE = 'peppos-academy-plans-20261027-3';
const APP_SHELL = ['/src/styles.css', '/src/calculator.js', '/src/filter-calculator.js', '/src/manual-calculator.js', '/src/machine-guides.js', '/src/access.bundle.js', '/src/app.js', '/manifest.webmanifest', '/assets/peppos-coffee-academy.jpeg', '/icons/pepos-icon.svg', '/icons/academy-20261027-1/apple-touch-icon-152.png', '/icons/academy-20261027-1/apple-touch-icon-167.png', '/icons/academy-20261027-1/apple-touch-icon-180.png', '/icons/academy-20261027-1/icon-1024.png', '/icons/academy-20261027-1/icon-128.png', '/icons/academy-20261027-1/icon-144.png', '/icons/academy-20261027-1/icon-152.png', '/icons/academy-20261027-1/icon-192.png', '/icons/academy-20261027-1/icon-256.png', '/icons/academy-20261027-1/icon-384.png', '/icons/academy-20261027-1/icon-512.png', '/icons/academy-20261027-1/icon-72.png', '/icons/academy-20261027-1/icon-96.png', '/icons/academy-20261027-1/icon-maskable-192.png', '/icons/academy-20261027-1/icon-maskable-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('peppos-academy-') && key !== CACHE).map((key) => caches.delete(key)))));
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
