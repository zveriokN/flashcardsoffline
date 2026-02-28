const CACHE_NAME = 'flashcards-cache-v6'; // ← увеличивай номер при каждом обновлении

// В GitHub Pages сайт живёт в /<repo>/, поэтому берём base из scope:
const BASE = new URL(self.registration.scope).pathname.replace(/\/$/, '') + '/';

const FILES_TO_CACHE = [
  BASE,
  BASE + 'index.html',
  BASE + 'style.css',
  BASE + 'script.js',
  BASE + 'service-worker.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Кэшируем по одному, чтобы одна ошибка не ломала весь install
      await Promise.all(
        FILES_TO_CACHE.map(async (url) => {
          try {
            const resp = await fetch(url, { cache: 'no-cache' });
            if (resp.ok) await cache.put(url, resp);
          } catch (e) {
            // игнорируем, чтобы установка SW не падала
          }
        })
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Для навигации (index.html) — сначала кэш, потом сеть
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match(BASE + 'index.html').then((cached) => {
        return cached || fetch(req).catch(() => cached);
      })
    );
    return;
  }

  // Для своих файлов — cache-first
  if (req.method === 'GET' && req.url.startsWith(self.location.origin)) {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req))
    );
  }
});
