// ─────────────────────────────────────────────────────────────────────────────
// Tranquilo — Service Worker
//
// Caching strategy by resource type:
//   /_next/static/**   → Cache-first (immutable — filename includes content hash)
//   /icons/**          → Cache-first (long-lived static assets)
//   /manifest.json     → Network-first (so manifest updates propagate)
//   / (navigation)     → Network-first, fall back to cached shell
//   everything else    → Network-first, fall back to cache
// ─────────────────────────────────────────────────────────────────────────────

const CACHE_NAME = 'tranquilo-v2'

// Pre-cache the app shell so the app opens offline from the first install.
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
]

// ── Lifecycle ──────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

// ── Fetch ──────────────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event

  // Only handle GET requests from our own origin.
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Next.js immutable static chunks → cache-first forever.
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request))
    return
  }

  // Icons → cache-first (long-lived).
  if (url.pathname.startsWith('/icons/')) {
    event.respondWith(cacheFirst(request))
    return
  }

  // Everything else (HTML, manifest, API routes) → network-first.
  event.respondWith(networkFirst(request))
})

// ── Strategies ─────────────────────────────────────────────────────────────

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached

  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    // No cache hit and no network — nothing we can do.
    return new Response('', { status: 503, statusText: 'Offline' })
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached

    // Navigation requests fall back to the cached root so the app shell loads.
    if (request.mode === 'navigate') {
      const root = await caches.match('/')
      if (root) return root
    }

    return new Response('', { status: 503, statusText: 'Offline' })
  }
}
