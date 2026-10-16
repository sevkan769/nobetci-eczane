/* Nöbetçi Eczane — service worker
   Uygulama kabuğu: cache-first (hızlı, offline çalışır)
   Veri (JSON): network-first, çevrimdışıysa cache'den düşer */

const SÜRÜM = 'v3'
const KABUK = `kabuk-${SÜRÜM}`
const VERİ = `veri-${SÜRÜM}`

const KABUK_DOSYALARI = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
]

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(KABUK).then((c) => c.addAll(KABUK_DOSYALARI)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== KABUK && k !== VERİ).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  if (e.request.method !== 'GET' || url.origin !== location.origin) return

  // ---- veri dosyaları: önce ağ, olmazsa cache ----
  if (url.pathname.startsWith('/data/')) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const copy = res.clone()
          caches.open(VERİ).then((c) => c.put(e.request, copy))
          return res
        })
        .catch(() => caches.match(e.request).then((r) => r || new Response('{}', { headers: { 'Content-Type': 'application/json' } })))
    )
    return
  }

  // ---- navigasyon: ağ önce, düşerse ana sayfa ----
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).catch(() => caches.match('/index.html')))
    return
  }

  // ---- diğer statikler: cache önce ----
  e.respondWith(
    caches.match(e.request).then(
      (hit) =>
        hit ||
        fetch(e.request).then((res) => {
          if (res.ok) {
            const copy = res.clone()
            caches.open(KABUK).then((c) => c.put(e.request, copy))
          }
          return res
        })
    )
  )
})
