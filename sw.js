/* Cache-first service worker.
   Bump CACHE on every asset change or clients keep the old copy forever. */
const CACHE = 'mortgage-calc-v6';

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
      // cache: 'reload' skips the HTTP cache. GitHub Pages serves max-age=600, so a
      // plain addAll right after a deploy could store the old file under the new
      // CACHE name and keep it until the next bump.
      .then((cache) => cache.addAll(PRECACHE.map((u) => new Request(u, { cache: 'reload' }))))
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

  // Navigations. Only the app's own page gets the cached shell: index.html uses
  // relative asset paths, so served at a nested URL (/images/x.png, a typo) it
  // loaded no CSS or JS and its home link looped back into the same broken page.
  // Every other navigation goes to the network, so it gets the real file or the
  // real 404, and falls back to an exact cached copy only when offline.
  if (req.mode === 'navigate') {
    const scope = self.registration.scope;
    const page = url.origin + url.pathname;
    if (page === scope || page === scope + 'index.html') {
      event.respondWith(
        caches.match('index.html')
          .then((cached) => cached || fetch(req))
      );
    } else {
      event.respondWith(
        fetch(req).catch(() => caches.match(req).then((cached) => cached || Response.error()))
      );
    }
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      // Offline and not cached: fail like the network would. Answering with
      // index.html here handed an HTML page to an <img> or a stylesheet.
      return fetch(req).then((res) => {
        // Only cache good same-origin responses.
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
        }
        return res;
      }).catch(() => Response.error());
    })
  );
});
