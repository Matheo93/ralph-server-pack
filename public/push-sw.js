/**
 * Push Notification Service Worker
 * Handles incoming push notifications and user interactions
 */

// eslint-disable-next-line no-undef
self.addEventListener("install", (event) => {
  console.log("[Push SW] Installing...")
  // eslint-disable-next-line no-undef
  self.skipWaiting()
})

// eslint-disable-next-line no-undef
self.addEventListener("activate", (event) => {
  console.log("[Push SW] Activated")
  // eslint-disable-next-line no-undef
  event.waitUntil(self.clients.claim())
})

/**
 * Handle incoming push notifications
 */
// eslint-disable-next-line no-undef
self.addEventListener("push", (event) => {
  console.log("[Push SW] Push received")

  if (!event.data) {
    console.log("[Push SW] No data in push event")
    return
  }

  let payload
  try {
    payload = event.data.json()
  } catch {
    // If not JSON, treat as text
    payload = {
      title: "FamilyLoad",
      body: event.data.text(),
    }
  }

  const {
    title = "FamilyLoad",
    body = "",
    icon = "/icons/icon-192.png",
    badge = "/icons/icon-72.png",
    tag,
    data = {},
    requireInteraction = false,
    silent = false,
    actions = [],
  } = payload

  const options = {
    body,
    icon,
    badge,
    tag: tag || `notification-${Date.now()}`,
    data,
    requireInteraction,
    silent,
    actions,
    vibrate: silent ? [] : [200, 100, 200],
    timestamp: Date.now(),
  }

  // eslint-disable-next-line no-undef
  event.waitUntil(self.registration.showNotification(title, options))
})

/**
 * Handle notification click
 */
// eslint-disable-next-line no-undef
self.addEventListener("notificationclick", (event) => {
  console.log("[Push SW] Notification clicked:", event.action)

  event.notification.close()

  const data = event.notification.data || {}
  let targetUrl = data.link || "/"

  // Handle specific actions
  if (event.action === "view") {
    targetUrl = data.link || "/calendar"
  } else if (event.action === "dismiss") {
    // Just close, don't navigate
    return
  }

  // Navigate to the target URL
  event.waitUntil(
    // eslint-disable-next-line no-undef
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window/tab open
      for (const client of clientList) {
        if (client.url && client.url.includes(targetUrl)) {
          return client.focus()
        }
      }

      // Check if any window is open on the same origin
      for (const client of clientList) {
        if ("focus" in client && "navigate" in client) {
          return client.focus().then(() => client.navigate(targetUrl))
        }
      }

      // Open a new window
      // eslint-disable-next-line no-undef
      return self.clients.openWindow(targetUrl)
    })
  )
})

/**
 * Handle notification close (dismissed without clicking)
 */
// eslint-disable-next-line no-undef
self.addEventListener("notificationclose", (event) => {
  console.log("[Push SW] Notification closed")

  const data = event.notification.data || {}

  // Track dismissal if needed (optional analytics)
  if (data.type && data.eventId) {
    // Could send analytics event here
    console.log(`[Push SW] ${data.type} notification for ${data.eventId} dismissed`)
  }
})

/**
 * Handle push subscription change (browser may reassign)
 */
// eslint-disable-next-line no-undef
self.addEventListener("pushsubscriptionchange", (event) => {
  console.log("[Push SW] Subscription changed")

  event.waitUntil(
    // eslint-disable-next-line no-undef
    self.registration.pushManager
      .subscribe({
        userVisibleOnly: true,
        // Note: applicationServerKey will be provided by the browser
      })
      .then((subscription) => {
        // Re-register the new subscription with the server
        return fetch("/api/notifications/web-push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subscription: subscription.toJSON(),
            resubscribe: true,
          }),
        })
      })
      .catch((error) => {
        console.error("[Push SW] Failed to resubscribe:", error)
      })
  )
})

console.log("[Push SW] Service Worker loaded")
