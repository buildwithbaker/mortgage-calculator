/* Cache-first service worker.
   Bump CACHE on every asset change or clients keep the old copy forever. */
const CACHE = 'mortgage-calc-v3';

const PRECACHE = [
  './',
  'index.html',
  'css/styles.css',
  'css/mortgage-calculator.css',
  'css/app.css',
  'css/fonts/inter-latin-400-normal.woff2',
  'css/fonts/inter-latin-500-normal.woff2',
  'css/fonts/inter-latin-600-normal.woff2',
  'css/fonts/inter-latin-700-normal.woff2',
  'js/mortgage-calculator.js',
  'js/app.js',
  'manifest.webmanifest',
  'favicon.svg',
  'images/apple-touch-icon.png',
  'images/icon-192.png',
  'images/icon-512.png',
  'images/icon-maskable-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Navigations: cache-first on index, fall back to it when the network is gone.
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match('index.html')
        .then((cached) => cached || fetch(req).catch(() => caches.match('./')))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        // Only cache good same-origin responses.
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
        }
        return res;
      }).catch(() => caches.match('index.html'));
    })
  );
});
