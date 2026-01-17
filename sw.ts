/// <reference lib="WebWorker" />

export {}; // Mark as module

const sw = self as unknown as ServiceWorkerGlobalScope;

// 🔴 关键修改：升级版本号 (v6 -> v7)，这将强制浏览器重新安装 Service Worker 并触发清理逻辑
const CACHE_NAME = 'ai-auto-intelligence-platform-cache-v7';

// 🔴 关键修改：只缓存本地文件，移除所有外部 CDN 链接，防止网络卡顿导致安装失败
const urlsToCache = [
  '/',
  '/index.html',
  '/logo.svg',
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
      // 清理旧版本的缓存
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

  // API 和 Socket 请求：永远走网络，不走缓存
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/socket.io/')) {
    return;
  }

  // HTML 文档：网络优先 (Network First)，确保拿到最新 index.html
  if (request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          return caches.match(request).then(response => {
             return response || Promise.reject('Offline and no cache.');
          });
        })
    );
    return;
  }

  // 静态资源 (JS/CSS/Images)：缓存优先 (Cache First)
  // 因为构建出来的文件名带有哈希，所以可以放心缓存
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
          return networkResponse;
        });
      })
  );
});