/*
 * Service worker for Menú & Compra.
 *
 * - Pages: network first (always the latest version when there is signal),
 *   falling back to the cached app when offline or when the network is slow
 *   (handy inside the supermarket).
 * - /_next/static: cache first (file names change on every deploy).
 * - Icons, manifest: stale-while-revalidate.
 * - Mercadona product photos: cache first, limited size.
 * - /api: never cached.
 */

const VERSION = 'v4';
const SHELL_CACHE = `menu-compra-shell-${VERSION}`;
const STATIC_CACHE = `menu-compra-static-${VERSION}`;
const IMAGE_CACHE = 'menu-compra-images-v1';
const KEEP = [SHELL_CACHE, STATIC_CACHE, IMAGE_CACHE];

const SHELL_URLS = ['/', '/manifest.json', '/apple-touch-icon.png', '/icon-192.png', '/icon-512.png', '/favicon.png'];
const NETWORK_TIMEOUT_MS = 3500;
const MAX_IMAGES = 400;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_URLS.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => !KEEP.includes(key)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

function isRscRequest(request, url) {
  return request.headers.get('RSC') === '1' || url.searchParams.has('_rsc');
}

async function networkFirstPage(event) {
  const cache = await caches.open(SHELL_CACHE);
  const network = fetch(event.request).then((response) => {
    if (response.ok) {
      // The app is a single page: keep the latest copy under "/"
      event.waitUntil(cache.put('/', response.clone()));
    }
    return response;
  });

  const timeout = new Promise((resolve) => setTimeout(resolve, NETWORK_TIMEOUT_MS));
  try {
    const fast = await Promise.race([network, timeout]);
    // A server error (5xx) must not replace the app that works offline
    if (fast && fast.status < 500) return fast;
  } catch {
    // offline: fall through to the cache
  }
  const cached = await cache.match('/');
  if (cached) {
    event.waitUntil(network.catch(() => undefined));
    return cached;
  }
  return network;
}

async function cacheFirst(request, cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok || response.type === 'opaque') {
    await cache.put(request, response.clone());
    if (maxEntries) {
      const keys = await cache.keys();
      if (keys.length > maxEntries) {
        await Promise.all(keys.slice(0, keys.length - maxEntries).map((key) => cache.delete(key)));
      }
    }
  }
  return response;
}

async function staleWhileRevalidate(event) {
  const cache = await caches.open(SHELL_CACHE);
  const cached = await cache.match(event.request);
  const network = fetch(event.request)
    .then((response) => {
      if (response.ok) event.waitUntil(cache.put(event.request, response.clone()));
      return response;
    })
    .catch(() => cached);
  if (cached) {
    event.waitUntil(network);
    return cached;
  }
  return network;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith('/api/') || isRscRequest(request, url)) return;
    if (request.mode === 'navigate') {
      event.respondWith(networkFirstPage(event));
      return;
    }
    if (url.pathname.startsWith('/_next/static/')) {
      event.respondWith(cacheFirst(request, STATIC_CACHE));
      return;
    }
    if (url.pathname.startsWith('/_next/')) return;
    event.respondWith(staleWhileRevalidate(event));
    return;
  }

  if (url.hostname === 'prod-mercadona.imgix.net') {
    event.respondWith(cacheFirst(request, IMAGE_CACHE, MAX_IMAGES).catch(() => fetch(request)));
  }
});
