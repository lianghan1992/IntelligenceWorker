/// <reference lib="WebWorker" />

export {}; // Mark as module

const sw = self as unknown as ServiceWorkerGlobalScope;

// This service worker is designed to uninstall itself and clear caches
// to complete the removal of PWA functionality.

sw.addEventListener('install', (event) => {
  // Force immediate activation
  sw.skipWaiting();
});

sw.addEventListener('activate', (event) => {
  // Claim clients immediately
  event.waitUntil(
    Promise.all([
      sw.clients.claim(),
      // Delete all caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            console.log('Deleting cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
      })
    ])
  );
});

// No fetch handler ensures network-only behavior if this SW is momentarily active
