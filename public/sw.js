const STATIC_CACHE = 'tranquilo-static-v1'
const DYNAMIC_CACHE = 'tranquilo-dynamic-v1'
const ASSET_CACHE = 'tranquilo-assets-v1'

const urlsToCache = [
  '/',
  '/manifest.json',
  '/icons/icon-192-verde.png',
  '/icons/icon-512-verde.png'
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
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
          // Keep only our current caches, delete old ones
          if (![STATIC_CACHE, DYNAMIC_CACHE, ASSET_CACHE].includes(cacheName)) {
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
  const url = new URL(event.request.url)

  // STRATEGY 1: API calls (Supabase, external APIs)
  // Network-first, never cache to prevent stale data
  if (url.hostname.includes('supabase.co') ||
      url.pathname.includes('/api/') ||
      event.request.method !== 'GET') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // If offline, return cached version if available
          return caches.match(event.request)
            .then(res => res || new Response('Offline - API unavailable', { status: 503 }))
        })
    )
    return
  }

  // STRATEGY 2: Static assets (JS, CSS, images)
  // Cache-first: use cache if available, update in background
  if (event.request.destination === 'script' ||
      event.request.destination === 'style' ||
      event.request.destination === 'image' ||
      event.request.destination === 'font') {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse
        }
        return fetch(event.request).then((response) => {
          if (!response || response.status !== 200) {
            return response
          }
          const responseToCache = response.clone()
          caches.open(ASSET_CACHE).then((cache) => {
            cache.put(event.request, responseToCache)
          })
          return response
        })
      }).catch(() => {
        return new Response('Asset unavailable', { status: 503 })
      })
    )
    return
  }

  // STRATEGY 3: HTML and navigation requests
  // Network-first: try network first, fallback to cache
  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200) {
            return response
          }
          const responseToCache = response.clone()
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(event.request, responseToCache)
          })
          return response
        })
        .catch(() => {
          return caches.match(event.request)
            .then(res => res || new Response('Offline - page unavailable', { status: 503 }))
        })
    )
    return
  }

  // STRATEGY 4: Everything else (data URLs, etc.)
  // Network-first with cache fallback
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (!response || response.status !== 200) {
          return response
        }
        const responseToCache = response.clone()
        caches.open(DYNAMIC_CACHE).then((cache) => {
          cache.put(event.request, responseToCache)
        })
        return response
      })
      .catch(() => {
        return caches.match(event.request)
          .then(res => res || new Response('Offline', { status: 503 }))
      })
  )
})
