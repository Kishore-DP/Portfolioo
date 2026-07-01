// Cache-first for the heavy static assets (models/audio/certs/images) so repeat visits are
// near-instant and the market still loads offline; network-first for the HTML shell so anyone
// online always gets the latest deployed version instead of getting stuck on a stale cache.
const CACHE_NAME = 'kdp-portfolio-v1';
const APP_SHELL = ['./', './index.html', './manifest.json', './favicon.png', './favicon-32.png', './favicon-192.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;   // leave cross-origin (three.js CDN, etc.) alone

  if (req.mode === 'navigate' || url.pathname.endsWith('index.html')) {
    event.respondWith(
      fetch(req).then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
        return res;
      }).catch(() => caches.match(req).then(cached => cached || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res => {
      if (res.ok) { const clone = res.clone(); caches.open(CACHE_NAME).then(cache => cache.put(req, clone)); }
      return res;
    }).catch(() => cached))
  );
});
