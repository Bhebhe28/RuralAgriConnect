const CACHE_NAME = 'ruragriconnect-v4';
const OFFLINE_URL = '/offline.html';

// Assets to cache on install
const PRECACHE_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
];

// Install — cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch strategy:
// - API calls: network first, fall back to cache
// - Static assets: cache first, fall back to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and chrome-extension requests
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') return;

  // API requests — network first, cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful API responses
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) =>
            cached || new Response(JSON.stringify({ error: 'Offline — showing cached data', offline: true }),
              { headers: { 'Content-Type': 'application/json' } })
          )
        )
    );
    return;
  }

  // Static assets — cache first
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(OFFLINE_URL));
    })
  );
});

// Background sync — send queued requests when back online
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-queue') {
    event.waitUntil(processSyncQueue());
  }
});

async function processSyncQueue() {
  try {
    const allClients = await self.clients.matchAll();
    allClients.forEach(client => client.postMessage({ type: 'TRIGGER_SYNC' }));
  } catch (e) {
    console.log('Background sync trigger failed:', e);
  }
}

// Message handler — receive sync data from the app and cache it
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'CACHE_SYNC_DATA') {
    const { advisories = [], alerts = [] } = event.data;

    // Store in IndexedDB-like cache via CacheStorage as JSON blobs
    caches.open(CACHE_NAME).then((cache) => {
      if (advisories.length > 0) {
        cache.put(
          new Request('/api/advisories'),
          new Response(JSON.stringify(advisories), {
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }
      if (alerts.length > 0) {
        cache.put(
          new Request('/api/weather'),
          new Response(JSON.stringify(alerts), {
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }
    });

    // Show a notification for any new critical alerts
    const criticalAlerts = alerts.filter(a => a.severity === 'critical');
    if (criticalAlerts.length > 0 && self.Notification && self.Notification.permission === 'granted') {
      criticalAlerts.slice(0, 3).forEach(alert => {
        self.registration.showNotification('🚨 Critical Farm Alert', {
          body: alert.message,
          icon: '/manifest.json',
          badge: '/manifest.json',
          tag: `alert-${alert.id}`,
          renotify: false,
          data: { url: '/notifications' },
        });
      });
    }
  }

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Notification click — open the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find(c => c.url.includes(targetUrl));
      if (existing) return existing.focus();
      return self.clients.openWindow(targetUrl);
    })
  );
});
