/// <reference lib="WebWorker" />

export {}; // Mark as module

const sw = self as unknown as ServiceWorkerGlobalScope;

// 每次发版修改这里的版本号 (v1 -> v2 -> v3...)
const CACHE_NAME = 'ai-auto-intelligence-platform-cache-v3';

// Add assets that are absolutely essential for the app shell to work offline.
const urlsToCache = [
  '/',
  '/index.html',
  '/logo.svg',
  // Static assets from CDNs
  'https://cdn.tailwindcss.com',
  'https://cdn.bootcdn.net/ajax/libs/marked/13.0.1/marked.min.js',
];

// Install: Cache the app shell
sw.addEventListener('install', (event) => {
  // 强制立即接管，跳过等待
  sw.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache and caching app shell');
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('Failed to cache app shell:', error);
      })
  );
});

// Activate: Clean up old caches
sw.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    Promise.all([
      // 立即接管所有客户端页面
      sw.clients.claim(),
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheWhitelist.indexOf(cacheName) === -1) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
    ])
  );
});

// Fetch: Serve from cache or network
sw.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // For API calls and socket connections, always go to the network.
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/socket.io/')) {
    // For GET requests, try network first, then cache. For others (POST, PUT, etc.), only network.
    if (request.method !== 'GET') {
        event.respondWith(fetch(request));
        return;
    }
    
    event.respondWith(
        fetch(request).catch(() => {
            return caches.match(request).then(response => {
                return response || Promise.reject('Network error and no cache.');
            });
        })
    );
    return;
  }

  // Network First strategy for HTML to ensure updates are seen immediately
  if (request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, response.clone());
            return response;
          });
        })
        .catch(() => {
          return caches.match(request).then(response => {
             return response || Promise.reject('Offline and no cache.');
          });
        })
    );
    return;
  }

  // For other requests (assets), use Cache First, falling back to network
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request).then((networkResponse) => {
          // Cache the new response for future use
          if (networkResponse && networkResponse.status === 200 && request.method === 'GET') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(request, responseToCache);
              });
          }
          return networkResponse;
        }).catch(error => {
            // console.error('Fetch failed:', error);
            throw error;
        });
      })
  );
});