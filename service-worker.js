// ============================================================
// SOLID MECHANICS TOOLKIT — Service Worker
// Progressive Web App — Offline First Strategy
// ============================================================

const CACHE_NAME   = 'sm-toolkit-v1.2';
const STATIC_CACHE = 'sm-static-v1.2';
const API_CACHE    = 'sm-api-v1.2';

// ─── FILES TO CACHE ON INSTALL ───────────────────────────────────────────────
const PRECACHE_URLS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  // CDN resources (cached at runtime)
];

// CDN resources to cache at runtime
const CDN_HOSTS = [
  'cdnjs.cloudflare.com',
  'cdn.plot.ly',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
];

// ─── INSTALL ─────────────────────────────────────────────────────────────────
self.addEventListener('install', event => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('[SW] Pre-caching core files');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => {
        console.log('[SW] Install complete');
        return self.skipWaiting();
      })
      .catch(err => console.warn('[SW] Pre-cache failed:', err))
  );
});

// ─── ACTIVATE ────────────────────────────────────────────────────────────────
self.addEventListener('activate', event => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => name !== STATIC_CACHE && name !== API_CACHE && name !== CACHE_NAME)
            .map(name => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Activated — claiming clients');
        return self.clients.claim();
      })
  );
});

// ─── FETCH STRATEGY ──────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin analytics requests
  if (request.method !== 'GET') return;
  if (url.pathname.includes('script.google.com')) return;

  // CDN resources: Cache First
  if (CDN_HOSTS.some(host => url.hostname.includes(host))) {
    event.respondWith(cacheFirst(request, CACHE_NAME));
    return;
  }

  // Google Fonts: Cache First (long-lived)
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(cacheFirst(request, CACHE_NAME));
    return;
  }

  // Local assets: Cache First with Network Fallback
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirstWithFallback(request));
    return;
  }

  // Everything else: Network First
  event.respondWith(networkFirst(request));
});

// ─── CACHING STRATEGIES ───────────────────────────────────────────────────────

// Cache First: Return from cache; if miss, fetch from network and cache
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      const cache = await caches.open(cacheName || CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    return offlineFallback(request);
  }
}

// Cache First with Stale-While-Revalidate for local assets
async function cacheFirstWithFallback(request) {
  const cached = await caches.match(request);
  if (cached) {
    // Revalidate in background
    fetchAndCache(request, STATIC_CACHE).catch(() => {});
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    return offlineFallback(request);
  }
}

// Network First: Try network; fall back to cache
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    return cached || offlineFallback(request);
  }
}

async function fetchAndCache(request, cacheName) {
  const response = await fetch(request);
  if (response && response.status === 200) {
    const cache = await caches.open(cacheName);
    await cache.put(request, response.clone());
  }
  return response;
}

// ─── OFFLINE FALLBACK ─────────────────────────────────────────────────────────
async function offlineFallback(request) {
  // For HTML pages, return the main index
  if (request.destination === 'document') {
    const cached = await caches.match('./index.html');
    if (cached) return cached;
  }

  // Generic offline response
  return new Response(
    JSON.stringify({ error: 'Offline', message: 'No network connection. Please check your internet.' }),
    { status: 503, headers: { 'Content-Type': 'application/json' } }
  );
}

// ─── BACKGROUND SYNC (for analytics when offline) ────────────────────────────
self.addEventListener('sync', event => {
  if (event.tag === 'analytics-sync') {
    event.waitUntil(syncAnalytics());
  }
});

async function syncAnalytics() {
  // Placeholder: retrieve queued analytics from IndexedDB and POST to GAS
  console.log('[SW] Background sync: analytics');
}

// ─── PUSH NOTIFICATIONS (future) ─────────────────────────────────────────────
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Solid Mechanics Toolkit';
  const options = {
    body: data.body || 'New content available!',
    icon: './icons/icon-192.png',
    badge: './icons/icon-72.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || './' }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url || './')
  );
});

console.log('[SW] Service Worker loaded — Solid Mechanics Toolkit v1.2');
