const CACHE_NAME = 'gunpowder-golf-v27'
const urlsToCache = [
  '/gunpowder-golf/',
  '/gunpowder-golf/index.html'
]

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache')
        return cache.addAll(urlsToCache)
      })
      .catch((err) => {
        console.log('Cache install error:', err)
      })
  )
  // Activate immediately
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
  // Take control of all pages immediately
  self.clients.claim()
})

// Fetch event - network first, fall back to cache
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return
  }

  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return
  }

  // For API requests (Supabase), always use network
  if (event.request.url.includes('supabase')) {
    return
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Check if we received a valid response
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response
        }

        // Clone the response
        const responseToCache = response.clone()

        caches.open(CACHE_NAME)
          .then((cache) => {
            cache.put(event.request, responseToCache)
          })

        return response
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(event.request)
          .then((response) => {
            if (response) {
              return response
            }
            // If not in cache, return offline page for navigation
            if (event.request.mode === 'navigate') {
              return caches.match('/gunpowder-golf/index.html')
            }
          })
      })
  )
})

// Handle messages from the app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

// Handle incoming push notifications
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {}
  const title = data.title || 'Gunpowder Golf'
  const options = {
    body: data.body || '',
    icon: '/gunpowder-golf/golf-icon.svg',
    badge: '/gunpowder-golf/golf-icon.svg',
    data: { url: data.url || '/gunpowder-golf/' },
    tag: data.tag || 'default',
    renotify: !!data.tag
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

// Handle notification click — open/focus app
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/gunpowder-golf/'
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(windowClients => {
      const existing = windowClients.find(c => c.url.includes('/gunpowder-golf/'))
      if (existing) return existing.focus()
      return clients.openWindow(url)
    })
  )
})
