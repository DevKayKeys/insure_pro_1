/**
 * InsurePro – service worker
 * -------------------------------------------------------------
 * Caches the app shell so the installed mobile app opens and
 * works even with no connectivity.
 *
 * Strategy
 *   • App shell (HTML/CSS/JS/icons)  → cache-first, refreshed in background
 *   • Navigations                    → network-first with cached fallback
 *   • Cross-origin (fonts)           → passed through untouched
 */
'use strict';

const VERSION = 'insurepro-v1.0.0';
const STATIC_CACHE = `${VERSION}-static`;
const PAGE_CACHE = `${VERSION}-pages`;

const PRECACHE = [
  'index.html',
  'app.html',
  'signup.html',
  'login.html',
  'main.css',
  'script.js',
  'signup.js',
  'manifest.json',
  'images/icon-192.png',
  'images/icon-512.png',
  'images/icon-maskable-512.png',
  'images/apple-touch-icon.png'
];

const OFFLINE_PAGE = 'app.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !key.startsWith(VERSION))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Never intercept cross-origin requests (Google Fonts, etc.).
  if (url.origin !== self.location.origin) return;

  // Navigations: network first, fall back to cache, then the offline page.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(PAGE_CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const shell = await caches.match('index.html');
          return shell || Response.error();
        })
    );
    return;
  }

  // Static assets: cache first, refresh in the background.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);

      return cached || network;
    })
  );
});
