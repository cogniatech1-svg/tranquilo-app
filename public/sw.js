// ─────────────────────────────────────────────────────────────────────────────
// Tranquilo — Service Worker
// Strategy:
//   • App shell (HTML, icons, manifest) → Cache-first, refresh in background
//   • Next.js static chunks (/_next/static/) → Cache-first forever (immutable)
//   • Everything else same-origin GET → Network-first, fall back to cache
// ─────────────────────────────────────────────────────────────────────────────

const SHELL_CACHE  = 'tranquilo-shell-v1'
const STATIC_CACHE = 'tranquilo-static-v1'
const RUNTIME_CACHE = 'tranquilo-runtime-v1'

const SHELL_URLS = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

// ── Message: allow page to trigger update ─────────────────────────────────────
self.addEventListener('message', e => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting()
})

// ── Install: precache app shell ───────────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(SHELL_CACHE)
      .then(c => c.addAll(SHELL_URLS))
      .then(() => self.skipWaiting())
  )
})

// ── Activate: purge old caches ────────────────────────────────────────────────
self.addEventListener('activate', e => {
  const keep = new Set([SHELL_CACHE, STATIC_CACHE, RUNTIME_CACHE])
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => !keep.has(k)).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return

  const url = new URL(e.request.url)
  if (url.origin !== self.location.origin) return

  // Next.js immutable static assets — cache forever
  if (url.pathname.startsWith('/_next/static/')) {
    e.respondWith(cacheFirst(e.request, STATIC_CACHE))
    return
  }

  // App shell files — cache-first, refresh in background
  if (SHELL_URLS.includes(url.pathname)) {
    e.respondWith(staleWhileRevalidate(e.request, SHELL_CACHE))
    return
  }

  // Everything else — network-first, fall back to cache then offline page
  e.respondWith(networkFirst(e.request, RUNTIME_CACHE))
})

// ── Strategies ────────────────────────────────────────────────────────────────

async function cacheFirst(req, cacheName) {
  const cached = await caches.match(req)
  if (cached) return cached
  try {
    const res = await fetch(req)
    if (res.ok) {
      const cache = await caches.open(cacheName)
      cache.put(req, res.clone())
    }
    return res
  } catch {
    return new Response('Offline', { status: 503 })
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const cache  = await caches.open(cacheName)
  const cached = await cache.match(req)
  const fetchPromise = fetch(req).then(res => {
    if (res.ok) cache.put(req, res.clone())
    return res
  }).catch(() => null)
  return cached || await fetchPromise || new Response('Offline', { status: 503 })
}

async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName)
  try {
    const res = await fetch(req)
    if (res.ok) cache.put(req, res.clone())
    return res
  } catch {
    const cached = await cache.match(req)
    if (cached) return cached
    // Last resort: return cached root for navigation requests
    if (req.mode === 'navigate') {
      const root = await caches.match('/')
      if (root) return root
    }
    return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } })
  }
}
