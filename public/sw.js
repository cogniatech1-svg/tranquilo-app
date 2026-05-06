const CACHE_NAME = 'tranquilo-v' + Date.now()
const urlsToCache = [
  '/',
  '/manifest.json',
  '/icons/icon-192-verde.png',
  '/icons/icon-512-verde.png'
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache)
    })
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName)
          }
          return Promise.resolve()
        })
      )
    })
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response || new Response('Error', { status: 500 })
        }
        const responseToCache = response.clone()
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache)
        })
        return response
      }).catch(() => {
        if (cachedResponse) {
          return cachedResponse
        }
        return new Response('Offline', { status: 503 })
      })
    }).catch(() => {
      return new Response('Service Worker Error', { status: 500 })
    })
  )
})
