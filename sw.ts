
/// <reference lib="WebWorker" />

export {}; // Mark as module

const sw = self as unknown as ServiceWorkerGlobalScope;

// 🔴 升级版本号，强制客户端更新缓存策略
const CACHE_NAME = 'ai-auto-intelligence-platform-cache-v8-optimized';

// 基础 App Shell
const urlsToCache = [
  '/',
  '/index.html',
  '/logo.svg',
];

// Install: Cache the app shell
sw.addEventListener('install', (event) => {
  sw.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache and caching app shell');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activate: Clean up old caches
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

// Fetch: Stale-While-Revalidate for HTML, Cache-First for Assets
sw.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. API 永远走网络
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/socket.io/')) {
    return;
  }

  // 2. 静态资源 (JS/CSS/Images)：激进缓存 (Cache First)
  // 只要是本