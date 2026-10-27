const CACHE = 'peppos-academy-startup-20261027-1';
const APP_SHELL = ['/src/styles.css?v=startup-20261027-1', '/src/calculator.js?v=startup-20261027-1', '/src/filter-calculator.js?v=startup-20261027-1', '/src/manual-calculator.js?v=startup-20261027-1', '/src/machine-guides.js?v=startup-20261027-1', '/src/access.bundle.js?v=startup-20261027-1', '/src/app.js?v=startup-20261027-1', '/manifest.webmanifest', '/assets/peppos-coffee-academy.jpeg', '/icons/pepos-icon.svg', '/icons/academy-20261027-1/apple-touch-icon-152.png', '/icons/academy-20261027-1/apple-touch-icon-167.png', '/icons/academy-20261027-1/apple-touch-icon-180.png', '/icons/academy-20261027-1/icon-1024.png', '/icons/academy-20261027-1/icon-128.png', '/icons/academy-20261027-1/icon-144.png', '/icons/academy-20261027-1/icon-152.png', '/icons/academy-20261027-1/icon-192.png', '/icons/academy-20261027-1/icon-256.png', '/icons/academy-20261027-1/icon-384.png', '/icons/academy-20261027-1/icon-512.png', '/icons/academy-20261027-1/icon-72.png', '/icons/academy-20261027-1/icon-96.png', '/icons/academy-20261027-1/icon-maskable-192.png', '/icons/academy-20261027-1/icon-maskable-512.png'];

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
  // Only release-versioned public assets use the fast local path. Session and
  // membership requests always bypass this worker and reach the server.
  if ((url.searchParams.get('v') === 'startup-20261027-1' && APP_SHELL.includes(url.pathname + url.search))
      || url.pathname.startsWith('/icons/academy-20261027-1/')) {
    event.respondWith(caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(event.request);
      if (cached) return cached;
      const response = await fetch(event.request);
      if (response.ok) await cache.put(event.request, response.clone());
      return response;
    }));
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
