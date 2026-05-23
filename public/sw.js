// CACHE_NAME = `upixel-v<package.json.version>` — atualizado automaticamente
// por scripts/bump-sw-cache.mjs (roda em `npm run build` via prebuild,
// e bumpa patch automaticamente em `npm run ship`).
//
// Convenção:
//   npm run ship         → bumpa patch (1.1.0 → 1.1.1) — deploys de rotina
//   npm run ship:minor   → bumpa minor (1.1.x → 1.2.0) — features
//   npm run ship:major   → bumpa major (1.x.x → 2.0.0) — breaking changes no SW
//
// Browser purga caches antigos no install do novo SW, evitando 404 em
// chunks lazy de versões anteriores após cada deploy.
const CACHE_NAME = 'upixel-v1.1.1';

const PRECACHE_URLS = [
  '/',
  '/offline.html',
  '/icon-192.png',
  '/icon-512.png',
];

// Install — precache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    })
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch — network first for navigations, cache first for assets
self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;
  if (!request.url.startsWith(self.location.origin)) return;
  if (request.url.includes('/functions/') || request.url.includes('/rest/') || request.url.includes('/auth/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match('/offline.html'))
    );
    return;
  }

  // JS/CSS: network-first com hashes únicos. Cache-first quebrava após deploy
  // porque chunks antigos (que ainda referenciavam hashes inexistentes) eram
  // servidos do cache, e novos chunks com hashes diferentes davam 404 quando
  // o HTML novo pedia. Network-first garante que o que está no server é o
  // que o browser usa; cache vira só fallback offline para imagens/fonts.
  if (request.url.match(/\.(js|css)$/)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request).then((c) => c ?? new Response('', { status: 504 })))
    );
    return;
  }

  // Imagens/fonts/etc: cache-first ainda faz sentido (são mais estáveis e
  // raramente quebram entre deploys).
  if (request.url.match(/\.(png|jpg|jpeg|svg|webp|woff2?|ttf|ico)$/)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        }).catch(() => new Response('', { status: 408 }));
      })
    );
    return;
  }
});

// ─── Push Notifications ───
self.addEventListener('push', (event) => {
  let data = { title: 'UPixel CRM', body: 'Nova notificação', icon: '/icon-192.png', badge: '/icon-192.png', tag: 'default', data: {} };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/icon-192.png',
    tag: data.tag || 'upixel-notification',
    renotify: true,
    requireInteraction: false,
    vibrate: [200, 100, 200],
    data: data.data,
    actions: [
      { action: 'open', title: 'Abrir' },
      { action: 'dismiss', title: 'Fechar' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const notifData = event.notification.data || {};
  let targetUrl = '/';

  if (notifData.type === 'new_message') {
    targetUrl = '/inbox';
  } else if (notifData.type === 'new_lead') {
    targetUrl = notifData.lead_id ? `/leads/${notifData.lead_id}` : '/crm';
  } else if (notifData.type === 'task_due') {
    targetUrl = '/tasks';
  } else if (notifData.type === 'stage_change') {
    targetUrl = notifData.lead_id ? `/leads/${notifData.lead_id}` : '/crm';
  }

  if (event.action === 'dismiss') return;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(targetUrl);
          return;
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});

// Listen for skip waiting message from client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
