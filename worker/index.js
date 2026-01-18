/**
 * Custom Service Worker - FamilyLoad PWA
 * This file is injected into the generated service worker by next-pwa
 * Handles: SKIP_WAITING, offline fallback, push notifications, background sync, IndexedDB cache
 */

// ============================================================================
// Constants
// ============================================================================

const CACHE_VERSION = "v1"
const OFFLINE_CACHE = `offline-fallback-${CACHE_VERSION}`
const DYNAMIC_CACHE = `familyload-dynamic-${CACHE_VERSION}`
const SYNC_CACHE = "familyload-sync-queue"
const IDB_NAME = "familyload-offline"
const IDB_VERSION = 1

// Critical assets to precache during install
const OFFLINE_ASSETS = [
  "/offline.html",
  "/icons/icon-192.png",
  "/icons/icon-72.png",
  "/manifest.json",
]

// ============================================================================
// IndexedDB Helper
// ============================================================================

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, IDB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = event.target.result

      // Store for cached API responses
      if (!db.objectStoreNames.contains("api-cache")) {
        const apiStore = db.createObjectStore("api-cache", { keyPath: "url" })
        apiStore.createIndex("timestamp", "timestamp", { unique: false })
        apiStore.createIndex("type", "type", { unique: false })
      }

      // Store for offline tasks
      if (!db.objectStoreNames.contains("offline-tasks")) {
        const taskStore = db.createObjectStore("offline-tasks", { keyPath: "id" })
        taskStore.createIndex("household_id", "household_id", { unique: false })
        taskStore.createIndex("synced", "synced", { unique: false })
      }

      // Store for sync queue
      if (!db.objectStoreNames.contains("sync-queue")) {
        const syncStore = db.createObjectStore("sync-queue", { keyPath: "id", autoIncrement: true })
        syncStore.createIndex("timestamp", "timestamp", { unique: false })
        syncStore.createIndex("operation", "operation", { unique: false })
      }

      // Store for user data
      if (!db.objectStoreNames.contains("user-data")) {
        db.createObjectStore("user-data", { keyPath: "key" })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function cacheApiResponse(url, data, type = "general") {
  try {
    const db = await openDatabase()
    const tx = db.transaction("api-cache", "readwrite")
    const store = tx.objectStore("api-cache")

    await store.put({
      url,
      data,
      type,
      timestamp: Date.now(),
    })

    db.close()
  } catch (error) {
    console.error("[SW] Failed to cache API response:", error)
  }
}

async function getCachedApiResponse(url) {
  try {
    const db = await openDatabase()
    const tx = db.transaction("api-cache", "readonly")
    const store = tx.objectStore("api-cache")

    return new Promise((resolve, reject) => {
      const request = store.get(url)
      request.onsuccess = () => {
        db.close()
        resolve(request.result)
      }
      request.onerror = () => {
        db.close()
        reject(request.error)
      }
    })
  } catch (error) {
    console.error("[SW] Failed to get cached API response:", error)
    return null
  }
}

async function saveOfflineTask(task) {
  try {
    const db = await openDatabase()
    const tx = db.transaction("offline-tasks", "readwrite")
    const store = tx.objectStore("offline-tasks")

    await store.put({
      ...task,
      id: task.id || `offline_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      synced: false,
      created_offline: true,
      timestamp: Date.now(),
    })

    db.close()
    return true
  } catch (error) {
    console.error("[SW] Failed to save offline task:", error)
    return false
  }
}

async function getOfflineTasks() {
  try {
    const db = await openDatabase()
    const tx = db.transaction("offline-tasks", "readonly")
    const store = tx.objectStore("offline-tasks")

    return new Promise((resolve, reject) => {
      const request = store.getAll()
      request.onsuccess = () => {
        db.close()
        resolve(request.result)
      }
      request.onerror = () => {
        db.close()
        reject(request.error)
      }
    })
  } catch (error) {
    console.error("[SW] Failed to get offline tasks:", error)
    return []
  }
}

async function markTaskSynced(taskId) {
  try {
    const db = await openDatabase()
    const tx = db.transaction("offline-tasks", "readwrite")
    const store = tx.objectStore("offline-tasks")

    const task = await new Promise((resolve, reject) => {
      const request = store.get(taskId)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })

    if (task) {
      task.synced = true
      await store.put(task)
    }

    db.close()
  } catch (error) {
    console.error("[SW] Failed to mark task as synced:", error)
  }
}

async function addToSyncQueue(operation, entity, data) {
  try {
    const db = await openDatabase()
    const tx = db.transaction("sync-queue", "readwrite")
    const store = tx.objectStore("sync-queue")

    await store.add({
      operation,
      entity,
      data,
      timestamp: Date.now(),
      retries: 0,
    })

    db.close()
  } catch (error) {
    console.error("[SW] Failed to add to sync queue:", error)
  }
}

async function getSyncQueue() {
  try {
    const db = await openDatabase()
    const tx = db.transaction("sync-queue", "readonly")
    const store = tx.objectStore("sync-queue")

    return new Promise((resolve, reject) => {
      const request = store.getAll()
      request.onsuccess = () => {
        db.close()
        resolve(request.result)
      }
      request.onerror = () => {
        db.close()
        reject(request.error)
      }
    })
  } catch (error) {
    console.error("[SW] Failed to get sync queue:", error)
    return []
  }
}

async function removeFromSyncQueue(id) {
  try {
    const db = await openDatabase()
    const tx = db.transaction("sync-queue", "readwrite")
    const store = tx.objectStore("sync-queue")

    await store.delete(id)
    db.close()
  } catch (error) {
    console.error("[SW] Failed to remove from sync queue:", error)
  }
}

async function clearOldCache(maxAge = 7 * 24 * 60 * 60 * 1000) {
  try {
    const db = await openDatabase()
    const tx = db.transaction("api-cache", "readwrite")
    const store = tx.objectStore("api-cache")
    const index = store.index("timestamp")
    const cutoff = Date.now() - maxAge

    const range = IDBKeyRange.upperBound(cutoff)
    const cursor = index.openCursor(range)

    cursor.onsuccess = (event) => {
      const result = event.target.result
      if (result) {
        store.delete(result.primaryKey)
        result.continue()
      }
    }

    db.close()
  } catch (error) {
    console.error("[SW] Failed to clear old cache:", error)
  }
}

// ============================================================================
// SKIP_WAITING Message Handler
// ============================================================================

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting()
  }

  // Handle cache clear request
  if (event.data && event.data.type === "CLEAR_CACHE") {
    caches.keys().then((names) => {
      names.forEach((name) => caches.delete(name))
    })
    clearOldCache(0) // Clear all IndexedDB cache
  }

  // Handle offline task save from main thread
  if (event.data && event.data.type === "SAVE_OFFLINE_TASK") {
    saveOfflineTask(event.data.task).then((success) => {
      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage({ success })
      }
    })
  }

  // Handle get offline tasks request
  if (event.data && event.data.type === "GET_OFFLINE_TASKS") {
    getOfflineTasks().then((tasks) => {
      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage({ tasks })
      }
    })
  }
})

// ============================================================================
// Push Notification Handler
// ============================================================================

self.addEventListener("push", (event) => {
  if (!event.data) return

  try {
    const data = event.data.json()

    const options = {
      body: data.body || "Vous avez une nouvelle notification",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-72.png",
      vibrate: [100, 50, 100],
      tag: data.tag || "familyload-notification",
      renotify: true,
      requireInteraction: data.requireInteraction || false,
      data: {
        url: data.url || "/dashboard",
        ...data.data,
      },
      actions: data.actions || [
        {
          action: "view",
          title: "Voir",
        },
        {
          action: "dismiss",
          title: "Ignorer",
        },
      ],
    }

    event.waitUntil(
      self.registration.showNotification(data.title || "FamilyLoad", options)
    )
  } catch {
    // Fallback for text-only push
    const text = event.data.text()
    event.waitUntil(
      self.registration.showNotification("FamilyLoad", {
        body: text,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-72.png",
      })
    )
  }
})

// ============================================================================
// Notification Click Handler
// ============================================================================

self.addEventListener("notificationclick", (event) => {
  event.notification.close()

  const url = event.notification.data?.url || "/dashboard"

  if (event.action === "dismiss") {
    return
  }

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // If a window is already open, focus it and navigate
        for (const client of clientList) {
          if ("focus" in client) {
            return client.focus().then((focusedClient) => {
              if ("navigate" in focusedClient) {
                return focusedClient.navigate(url)
              }
            })
          }
        }

        // Otherwise open a new window
        if (clients.openWindow) {
          return clients.openWindow(url)
        }
      })
  )
})

// ============================================================================
// Background Sync Handler
// ============================================================================

self.addEventListener("sync", (event) => {
  if (event.tag === "background-sync") {
    event.waitUntil(processSyncQueue())
  }

  if (event.tag === "sync-offline-tasks") {
    event.waitUntil(syncOfflineTasks())
  }
})

async function processSyncQueue() {
  try {
    const queue = await getSyncQueue()

    for (const item of queue) {
      try {
        let response
        const baseUrl = self.location.origin

        switch (item.operation) {
          case "create":
            response = await fetch(`${baseUrl}/api/v2/${item.entity}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(item.data),
              credentials: "include",
            })
            break

          case "update":
            response = await fetch(`${baseUrl}/api/v2/${item.entity}/${item.data.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(item.data),
              credentials: "include",
            })
            break

          case "delete":
            response = await fetch(`${baseUrl}/api/v2/${item.entity}/${item.data.id}`, {
              method: "DELETE",
              credentials: "include",
            })
            break
        }

        if (response && response.ok) {
          await removeFromSyncQueue(item.id)

          // Notify clients of successful sync
          const allClients = await clients.matchAll()
          allClients.forEach((client) => {
            client.postMessage({
              type: "SYNC_COMPLETE",
              item,
            })
          })
        }
      } catch {
        // Keep in queue for next sync attempt
        console.error("[SW] Sync failed for item:", item.id)
      }
    }
  } catch (error) {
    console.error("[SW] Sync queue processing failed:", error)
  }
}

async function syncOfflineTasks() {
  try {
    const tasks = await getOfflineTasks()
    const unsyncedTasks = tasks.filter((t) => !t.synced)

    for (const task of unsyncedTasks) {
      try {
        const response = await fetch(`${self.location.origin}/api/v2/tasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: task.title,
            description: task.description,
            priority: task.priority,
            category: task.category,
            due_date: task.due_date,
            household_id: task.household_id,
          }),
          credentials: "include",
        })

        if (response.ok) {
          const serverData = await response.json()
          await markTaskSynced(task.id)

          // Notify clients
          const allClients = await clients.matchAll()
          for (const client of allClients) {
            client.postMessage({
              type: "TASK_SYNCED",
              offlineId: task.id,
              serverData,
            })
          }
        }
      } catch {
        console.error("[SW] Failed to sync task:", task.id)
      }
    }
  } catch (error) {
    console.error("[SW] Offline task sync failed:", error)
  }
}

// ============================================================================
// Periodic Background Sync
// ============================================================================

self.addEventListener("periodicsync", (event) => {
  if (event.tag === "periodic-sync") {
    event.waitUntil(periodicSync())
  }

  if (event.tag === "refresh-data") {
    event.waitUntil(refreshCriticalData())
  }
})

async function periodicSync() {
  await processSyncQueue()
  await syncOfflineTasks()
  await refreshCriticalData()
}

async function refreshCriticalData() {
  try {
    const criticalUrls = [
      "/api/v2/tasks?limit=50",
      "/api/v2/household",
    ]

    for (const url of criticalUrls) {
      try {
        const response = await fetch(`${self.location.origin}${url}`, {
          credentials: "include",
        })

        if (response.ok) {
          const data = await response.json()
          await cacheApiResponse(url, data, "critical")
        }
      } catch {
        // Continue with next URL
      }
    }

    // Clear old cache entries
    await clearOldCache()
  } catch {
    // Silent fail for periodic sync
  }
}

// ============================================================================
// Install Event - Precache offline page
// ============================================================================

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(OFFLINE_CACHE).then((cache) => {
      return cache.addAll(OFFLINE_ASSETS)
    })
  )
})

// ============================================================================
// Activate Event - Cleanup old caches
// ============================================================================

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              // Delete old offline fallback caches
              if (name.startsWith("offline-fallback-") && name !== OFFLINE_CACHE) {
                return true
              }
              // Delete old dynamic caches
              if (name.startsWith("familyload-dynamic-") && name !== DYNAMIC_CACHE) {
                return true
              }
              return false
            })
            .map((name) => caches.delete(name))
        )
      }),
      // Take control of all clients immediately
      self.clients.claim(),
    ])
  )
})

// ============================================================================
// Fetch Event - Network First with Offline Fallback
// ============================================================================

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url)

  // Skip non-GET requests (handled by sync queue)
  if (event.request.method !== "GET") {
    // For POST/PATCH/DELETE, if offline, queue for later sync
    if (!navigator.onLine && event.request.method !== "GET") {
      event.respondWith(handleOfflineMutation(event.request))
    }
    return
  }

  // Handle API requests
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(handleApiRequest(event.request))
    return
  }

  // Handle navigation requests
  if (event.request.mode === "navigate") {
    event.respondWith(handleNavigationRequest(event.request))
    return
  }

  // Let next-pwa/workbox handle other requests
})

async function handleApiRequest(request) {
  const url = new URL(request.url)

  try {
    // Try network first
    const response = await fetch(request)

    if (response.ok) {
      // Cache successful API responses in IndexedDB
      const data = await response.clone().json()
      await cacheApiResponse(url.pathname + url.search, data, "api")
    }

    return response
  } catch {
    // Network failed, try IndexedDB cache
    const cached = await getCachedApiResponse(url.pathname + url.search)

    if (cached) {
      return new Response(JSON.stringify(cached.data), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Cache-Status": "offline",
          "X-Cache-Timestamp": cached.timestamp.toString(),
        },
      })
    }

    // No cache available
    return new Response(
      JSON.stringify({
        error: "Offline",
        message: "Vous êtes hors ligne et ces données ne sont pas en cache.",
        offline: true,
      }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }
    )
  }
}

async function handleNavigationRequest(request) {
  try {
    // Try network first
    const response = await fetch(request)
    return response
  } catch {
    // Network failed, try cache
    const cache = await caches.open(DYNAMIC_CACHE)
    const cachedResponse = await cache.match(request)

    if (cachedResponse) {
      return cachedResponse
    }

    // Fallback to offline page
    const offlineCache = await caches.open(OFFLINE_CACHE)
    const offlinePage = await offlineCache.match("/offline.html")

    if (offlinePage) {
      return offlinePage
    }

    // Ultimate fallback
    return new Response(
      `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Hors ligne - FamilyLoad</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f8fafc; }
    .container { text-align: center; padding: 2rem; }
    h1 { color: #1e293b; margin-bottom: 1rem; }
    p { color: #64748b; margin-bottom: 1.5rem; }
    button { background: #3b82f6; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; cursor: pointer; font-size: 1rem; }
    button:hover { background: #2563eb; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Vous êtes hors ligne</h1>
    <p>Vérifiez votre connexion internet et réessayez.</p>
    <button onclick="window.location.reload()">Réessayer</button>
  </div>
</body>
</html>`,
      {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }
    )
  }
}

async function handleOfflineMutation(request) {
  try {
    const body = await request.clone().json()
    const url = new URL(request.url)

    // Determine entity type from URL
    const pathParts = url.pathname.split("/").filter(Boolean)
    const entity = pathParts[pathParts.length - 1]

    // Add to sync queue
    await addToSyncQueue(
      request.method === "POST" ? "create" : request.method === "DELETE" ? "delete" : "update",
      entity,
      body
    )

    // Request background sync
    if ("sync" in self.registration) {
      await self.registration.sync.register("background-sync")
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Opération enregistrée. Elle sera synchronisée dès que vous serez en ligne.",
        queued: true,
      }),
      {
        status: 202,
        headers: { "Content-Type": "application/json" },
      }
    )
  } catch {
    return new Response(
      JSON.stringify({
        error: "Offline",
        message: "Impossible d'enregistrer l'opération hors ligne.",
      }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }
    )
  }
}
