/// <reference lib="WebWorker" />

export {}; // Mark as module

const sw = self as unknown as ServiceWorkerGlobalScope;

// 🔴 强制更新缓存版本
const CACHE_NAME = 'ai-auto-insight-cache-v8';

const urlsToCache = [
  '/',
  '/index.html',
  '/logo.svg',
];

// Install
sw.addEventListener('install', (event) => {
  sw.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

// Activate & Cleanup
sw.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      sw.clients.claim(),
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      })
    ])
  );
});

// Fetch Strategy: Network First for HTML, Cache First for Assets
sw.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/socket.io/')) return;

  if (request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          return response;
        })
        .catch(() => caches.match(request).then(res => res || Promise.reject('Offline')))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      return cachedResponse || fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
             const responseClone = networkResponse.clone();
             caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
        }
        return networkResponse;
      });
    })
  );
});