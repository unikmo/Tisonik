const CACHE = 'tisonik-shell-v8'
const SHELL = [
  '/',
  '/passenger-experience/',
  '/crew-recognition/',
  '/service-recovery/',
  '/engagement/',
  '/ancillary-revenue/',
  '/cruise-dashboard/',
  '/integration/',
  '/hotels/',
  '/pilot/',
  '/product-app/',
  '/imprint/',
  '/privacy/',
  '/terms/',
  '/cookies/',
  '/site.webmanifest',
  '/favicon.svg',
  '/media/hero-centered-black-crew-amara.jpg',
  '/media/cruise-candid-crew.jpg',
  '/media/cruise-diverse-passengers.jpg',
  '/media/cruise-family-recovery.jpg',
  '/media/cruise-inclusive-activity.jpg',
  '/media/cruise-family-experience.jpg'
]
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()))
})
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()))
})
self.addEventListener('fetch', event => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => {
      const copy = response.clone()
      caches.open(CACHE).then(cache => cache.put(request, copy))
      return response
    }).catch(async () => (await caches.match(request)) || (await caches.match('/'))))
    return
  }
  event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
    if (response.ok) {
      const copy = response.clone()
      caches.open(CACHE).then(cache => cache.put(request, copy))
    }
    return response
  })))
})
