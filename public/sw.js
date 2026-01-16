/**
 * Service Worker for FamilyLoad
 * Handles push notifications and offline caching
 */

const CACHE_NAME = "familyload-v1"
const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
]

// =============================================================================
// INSTALLATION
// =============================================================================

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS)
    })
  )
  // Activate immediately
  self.skipWaiting()
})

// =============================================================================
// ACTIVATION
// =============================================================================

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    })
  )
  // Take control of all pages immediately
  self.clients.claim()
})

// =============================================================================
// PUSH NOTIFICATIONS
// =============================================================================

self.addEventListener("push", (event) => {
  if (!event.data) return

  let data
  try {
    data = event.data.json()
  } catch {
    data = {
      title: "FamilyLoad",
      body: event.data.text(),
    }
  }

  const options = {
    body: data.body || "",
    icon: data.icon || "/icons/icon-192.png",
    badge: "/icons/icon-72.png",
    vibrate: [100, 50, 100],
    data: {
      url: data.url || "/dashboard",
      notificationId: data.id,
      ...data.data,
    },
    actions: data.actions || [
      { action: "open", title: "Ouvrir" },
      { action: "dismiss", title: "Fermer" },
    ],
    tag: data.tag || "default",
    renotify: data.renotify || false,
    requireInteraction: data.requireInteraction || false,
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "FamilyLoad", options)
  )
})

// =============================================================================
// NOTIFICATION CLICK
// =============================================================================

self.addEventListener("notificationclick", (event) => {
  event.notification.close()

  const action = event.action
  const notificationData = event.notification.data || {}
  const url = notificationData.url || "/dashboard"

  if (action === "dismiss") {
    return
  }

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Try to focus an existing window
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.navigate(url)
            return client.focus()
          }
        }
        // Open a new window if none exists
        if (clients.openWindow) {
          return clients.openWindow(url)
        }
      })
  )

  // Track notification click
  if (notificationData.notificationId) {
    fetch("/api/notifications/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "clicked",
        notificationId: notificationData.notificationId,
      }),
    }).catch(() => {
      // Ignore tracking errors
    })
  }
})

// =============================================================================
// NOTIFICATION CLOSE
// =============================================================================

self.addEventListener("notificationclose", (event) => {
  const notificationData = event.notification.data || {}

  // Track notification dismissal
  if (notificationData.notificationId) {
    fetch("/api/notifications/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "dismissed",
        notificationId: notificationData.notificationId,
      }),
    }).catch(() => {
      // Ignore tracking errors
    })
  }
})

// =============================================================================
// FETCH HANDLER (Network-first with cache fallback)
// =============================================================================

self.addEventListener("fetch", (event) => {
  // Skip non-GET requests
  if (event.request.method !== "GET") return

  // Skip API requests and external URLs
  const url = new URL(event.request.url)
  if (url.pathname.startsWith("/api/") || url.origin !== self.location.origin) {
    return
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone the response before caching
        const responseToCache = response.clone()
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache)
        })
        return response
      })
      .catch(() => {
        // Fallback to cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse
          }
          // Return offline page for navigation requests
          if (event.request.mode === "navigate") {
            return caches.match("/")
          }
          return new Response("Offline", { status: 503 })
        })
      })
  )
})

// =============================================================================
// BACKGROUND SYNC
// =============================================================================

self.addEventListener("sync", (event) => {
  if (event.tag === "sync-tasks") {
    event.waitUntil(syncTasks())
  }
})

async function syncTasks() {
  try {
    const response = await fetch("/api/v2/tasks/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    })
    return response.ok
  } catch {
    return false
  }
}

// =============================================================================
// PERIODIC BACKGROUND SYNC
// =============================================================================

self.addEventListener("periodicsync", (event) => {
  if (event.tag === "daily-reminder") {
    event.waitUntil(checkDailyReminder())
  }
})

async function checkDailyReminder() {
  try {
    const response = await fetch("/api/notifications/schedule?type=daily")
    return response.ok
  } catch {
    return false
  }
}

// =============================================================================
// MESSAGE HANDLER
// =============================================================================

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting()
  }

  if (event.data && event.data.type === "GET_VERSION") {
    event.ports[0].postMessage({ version: CACHE_NAME })
  }
})
