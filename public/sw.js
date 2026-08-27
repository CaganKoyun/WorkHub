/**
 * WorkHub service worker — v0.1
 *
 * Strategy summary:
 *  • Precache the shell (index.html + manifest + icons) at install so the
 *    app opens offline.
 *  • Runtime cache for /assets/* (Vite hashed bundles) → cache-first,
 *    since hashed filenames are immutable.
 *  • Fonts + images from same-origin → stale-while-revalidate.
 *  • Supabase and any other cross-origin/API traffic → passthrough (never
 *    cached), so RLS + live data never get served stale.
 *  • Navigation requests → network-first with cached index.html fallback.
 *
 * Bump SW_VERSION to invalidate old caches on deploy.
 */

const SW_VERSION = 'wh-sw-v1';
const SHELL_CACHE = `${SW_VERSION}-shell`;
const RUNTIME_CACHE = `${SW_VERSION}-runtime`;

const SHELL_URLS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
  '/favicon.ico',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((c) => c.addAll(SHELL_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((k) => !k.startsWith(SW_VERSION))
          .map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

function isNavigationRequest(req) {
  return req.mode === 'navigate' || (req.method === 'GET' && req.headers.get('accept')?.includes('text/html'));
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Cross-origin (Supabase, etc.) → passthrough. Never touch it.
  if (url.origin !== self.location.origin) return;

  // Navigation → network-first, fall back to cached shell.
  if (isNavigationRequest(req)) {
    event.respondWith(
      fetch(req)
        .catch(() => caches.match('/index.html').then((r) => r || Response.error()))
    );
    return;
  }

  // Hashed asset bundles → cache-first (immutable by URL).
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).then((res) => {
        const clone = res.clone();
        caches.open(RUNTIME_CACHE).then((c) => c.put(req, clone)).catch(() => {});
        return res;
      }))
    );
    return;
  }

  // Icons, favicon, misc same-origin GET → stale-while-revalidate.
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req).then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(RUNTIME_CACHE).then((c) => c.put(req, clone)).catch(() => {});
        }
        return res;
      }).catch(() => cached || Response.error());
      return cached || fetchPromise;
    })
  );
});

// Web Push — v2 backend wire-up sonra gelecek; şimdilik minimal handler.
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let data;
  try { data = event.data.json(); } catch { data = { title: 'WorkHub', body: event.data.text() }; }
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'WorkHub', {
      body: data.body,
      icon: '/icons/icon-192.svg',
      badge: '/icons/icon-192.svg',
      data: { url: data.url ?? '/inbox' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/inbox';
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((all) => {
      const hit = all.find((w) => w.url.endsWith(url));
      if (hit) return hit.focus();
      return self.clients.openWindow(url);
    })
  );
});
