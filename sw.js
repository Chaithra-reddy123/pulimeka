/* Service worker — makes Puli Meka fully installable & offline. */
const CACHE = 'pulimeka-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon.svg',
  './src/board.js',
  './src/engine.js',
  './src/ai.js',
  './src/audio.js',
  './src/render.js',
  './src/scene.js',
  './src/game.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request)
        .then((resp) => {
          // cache same-origin successful responses for next time
          try {
            if (resp && resp.status === 200 && new URL(e.request.url).origin === location.origin) {
              const copy = resp.clone();
              caches.open(CACHE).then((c) => c.put(e.request, copy));
            }
          } catch (err) {}
          return resp;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});
