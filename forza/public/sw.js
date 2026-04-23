// FORZA — Service Worker v1.2 (Protocolo Maestro v3.1)
// Estrategia: Stale-While-Revalidate + Push Notifications

const CACHE_NAME = 'forza-v1';
const OFFLINE_URL = '/index.html';

// ── PRECACHE generado por vite-plugin-pwa ────────────────────
const WB_MANIFEST = self.__WB_MANIFEST

// ── INSTALL: Pre-cache de la estructura base ─────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll([
        OFFLINE_URL,
        '/',
        '/manifest.json',
        '/icons/icon-192.png',
        '/icons/favicon.ico'
      ]);
    })
  );
  self.skipWaiting();
});

// ── ACTIVATE: Limpieza de caches antiguos ─────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );
  self.clients.claim();
});

// ── FETCH: Estrategia Híbrida ─────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.origin !== location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cachedResponse => {
      const fetchPromise = fetch(request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          const cacheCopy = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, cacheCopy));
        }
        return networkResponse;
      }).catch(() => {
        if (request.destination === 'image') return caches.match('/icons/icon-192.png');
      });

      return cachedResponse || fetchPromise;
    })
  );
});

// ── PUSH NOTIFICATIONS ────────────────────────────────────────
self.addEventListener('push', event => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'FORZA', body: '¡Es hora de entrenar! 💪' };
  }

  const title = data.title || 'FORZA';
  const options = {
    body: data.body || 'Tu rutina te espera.',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/workout' },
    actions: [
      { action: 'open',    title: 'Entrenar ahora' },
      { action: 'dismiss', title: 'Más tarde' }
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ── NOTIFICATION CLICK ────────────────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'dismiss') return;
  const targetUrl = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (const client of windowClients) {
        if (client.url.includes(location.origin) && 'focus' in client) {
          return client.focus().then(() => client.navigate(targetUrl));
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});