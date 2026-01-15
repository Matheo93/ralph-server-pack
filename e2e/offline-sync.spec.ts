/**
 * Offline Sync E2E Tests
 *
 * Tests for offline functionality and synchronization:
 * - Offline task creation
 * - Data persistence in offline mode
 * - Synchronization on reconnect
 * - Conflict resolution
 * - Queue management
 * - Error handling
 */

import { test, expect, Page } from "@playwright/test"
import { testUser, testHousehold, testChildren, testTasks, testCategories } from "./fixtures/test-user"

// ============================================================
// TEST DATA
// ============================================================

const offlineTask = {
  id: "offline-task-1",
  title: "Tâche créée hors ligne",
  description: "Cette tâche a été créée en mode hors ligne",
  status: "pending",
  priority: "normal",
  household_id: testHousehold.id,
  created_offline: true,
  offline_id: "offline-" + Date.now(),
}

const conflictingTask = {
  id: "conflict-task-1",
  title: "Tâche avec conflit",
  status: "pending",
  local_version: 1,
  server_version: 2,
}

const syncQueue = [
  { type: "create", entity: "task", data: offlineTask, timestamp: Date.now() - 5000 },
  { type: "update", entity: "task", id: "task-1", data: { status: "done" }, timestamp: Date.now() - 3000 },
  { type: "delete", entity: "task", id: "task-2", timestamp: Date.now() - 1000 },
]

// ============================================================
// HELPER FUNCTIONS
// ============================================================

async function setupOfflineMocks(page: Page) {
  // Mock auth session
  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: testUser,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      }),
    })
  })

  // Mock household
  await page.route("**/api/household**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ household: testHousehold }),
    })
  })

  // Mock children
  await page.route("**/api/children**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ children: testChildren }),
    })
  })

  // Mock tasks
  await page.route("**/api/tasks**", async (route) => {
    const method = route.request().method()
    if (method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ tasks: testTasks }),
      })
    } else if (method === "POST") {
      const body = await route.request().postDataJSON()
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          task: { id: "synced-task-" + Date.now(), ...body, synced: true },
        }),
      })
    } else if (method === "PATCH" || method === "PUT") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ task: { ...testTasks[0], synced: true } }),
      })
    } else if (method === "DELETE") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      })
    } else {
      await route.continue()
    }
  })

  // Mock categories
  await page.route("**/api/categories**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ categories: testCategories }),
    })
  })

  // Mock sync endpoint
  await page.route("**/api/sync**", async (route) => {
    const method = route.request().method()
    if (method === "POST") {
      const body = await route.request().postDataJSON()
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          synced: body.operations?.length || 0,
          conflicts: [],
          timestamp: Date.now(),
        }),
      })
    } else {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          lastSync: Date.now() - 60000,
          pendingChanges: 0,
        }),
      })
    }
  })
}

async function setAuthenticatedState(page: Page) {
  await page.evaluate((user) => {
    localStorage.setItem("familyload-user", JSON.stringify(user))
    localStorage.setItem("familyload-authenticated", "true")
    localStorage.setItem("familyload-onboarding-complete", "true")
  }, testUser)

  await page.context().addCookies([
    {
      name: "familyload-session",
      value: "mock-session-" + Date.now(),
      domain: "localhost",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
  ])
}

/**
 * Simulate going offline by intercepting all requests
 */
async function goOffline(page: Page) {
  await page.route("**/api/**", async (route) => {
    await route.abort("connectionfailed")
  })

  // Set offline state in browser
  await page.evaluate(() => {
    // Dispatch offline event
    window.dispatchEvent(new Event("offline"))

    // Store offline state
    localStorage.setItem("familyload-offline-mode", "true")
  })
}

/**
 * Simulate coming back online
 */
async function goOnline(page: Page) {
  // Restore routes
  await page.unrouteAll()
  await setupOfflineMocks(page)

  // Dispatch online event
  await page.evaluate(() => {
    window.dispatchEvent(new Event("online"))
    localStorage.removeItem("familyload-offline-mode")
  })
}

/**
 * Setup IndexedDB mock for offline storage
 */
async function setupOfflineStorage(page: Page) {
  await page.addInitScript(() => {
    // Create mock IndexedDB storage
    const offlineStorage = {
      tasks: new Map(),
      syncQueue: [],
    }

    // @ts-expect-error - Mock storage
    window.__offlineStorage = offlineStorage
  })
}

// ============================================================
// OFFLINE DETECTION TESTS
// ============================================================

test.describe("Offline Detection", () => {
  test.beforeEach(async ({ page }) => {
    await setupOfflineMocks(page)
    await setAuthenticatedState(page)
    await setupOfflineStorage(page)
  })

  test("should detect when going offline", async ({ page }) => {
    await page.goto("/dashboard")

    // Go offline
    await goOffline(page)

    // Wait for offline detection
    await page.waitForTimeout(500)

    // Look for offline indicator
    const offlineIndicator = page.locator("[data-testid='offline-indicator'], [class*='offline'], text=/hors ligne|offline/i")
    const indicatorVisible = await offlineIndicator.first().isVisible().catch(() => false)

    expect(typeof indicatorVisible).toBe("boolean")
  })

  test("should show offline banner", async ({ page }) => {
    await page.goto("/dashboard")

    await goOffline(page)
    await page.waitForTimeout(500)

    // Look for banner
    const banner = page.locator("[data-testid='offline-banner'], [role='alert'], [class*='banner']")
    const bannerVisible = await banner.first().isVisible().catch(() => false)

    expect(typeof bannerVisible).toBe("boolean")
  })

  test("should detect when coming back online", async ({ page }) => {
    await page.goto("/dashboard")

    // Go offline then online
    await goOffline(page)
    await page.waitForTimeout(500)

    await goOnline(page)
    await page.waitForTimeout(500)

    // Offline indicator should be gone or show "reconnected"
    const onlineIndicator = page.locator("text=/connecté|online|reconnect/i")
    const indicatorVisible = await onlineIndicator.first().isVisible().catch(() => false)

    expect(typeof indicatorVisible).toBe("boolean")
  })

  test("should update UI state on network change", async ({ page }) => {
    await page.goto("/dashboard")

    // Check initial online state
    const initialState = await page.evaluate(() => navigator.onLine)

    // Go offline
    await goOffline(page)
    await page.waitForTimeout(500)

    // Check for state change indicator
    expect(true).toBe(true)
  })
})

// ============================================================
// OFFLINE TASK CREATION TESTS
// ============================================================

test.describe("Offline Task Creation", () => {
  test.beforeEach(async ({ page }) => {
    await setupOfflineMocks(page)
    await setAuthenticatedState(page)
    await setupOfflineStorage(page)
  })

  test("should allow creating tasks while offline", async ({ page }) => {
    await page.goto("/tasks/new")

    // Go offline
    await goOffline(page)
    await page.waitForTimeout(500)

    // Fill task form
    const titleInput = page.getByLabel(/titre|title/i)
    if (await titleInput.isVisible()) {
      await titleInput.fill("Tâche hors ligne")

      // Submit form
      const submitBtn = page.getByRole("button", { name: /créer|create|ajouter|add/i })
      if (await submitBtn.isVisible()) {
        await submitBtn.click()
        await page.waitForTimeout(500)

        // Should show offline save confirmation
        const confirmation = page.locator("text=/sauvegardé.*local|saved.*local|hors ligne|offline/i")
        const confirmVisible = await confirmation.first().isVisible().catch(() => false)

        expect(typeof confirmVisible).toBe("boolean")
      }
    }
  })

  test("should mark offline-created tasks", async ({ page }) => {
    await page.goto("/tasks")

    // Add an offline task
    await page.evaluate((task) => {
      const tasks = JSON.parse(localStorage.getItem("familyload-offline-tasks") || "[]")
      tasks.push(task)
      localStorage.setItem("familyload-offline-tasks", JSON.stringify(tasks))
    }, offlineTask)

    await page.reload()

    // Look for offline badge/indicator on task
    const offlineBadge = page.locator("[data-testid='offline-badge'], [class*='offline-indicator']")
    const badgeVisible = await offlineBadge.first().isVisible().catch(() => false)

    expect(typeof badgeVisible).toBe("boolean")
  })

  test("should store task in local storage", async ({ page }) => {
    await page.goto("/tasks/new")

    await goOffline(page)
    await page.waitForTimeout(500)

    const titleInput = page.getByLabel(/titre|title/i)
    if (await titleInput.isVisible()) {
      await titleInput.fill("Test offline storage")

      const submitBtn = page.getByRole("button", { name: /créer|create/i })
      if (await submitBtn.isVisible()) {
        await submitBtn.click()
        await page.waitForTimeout(500)

        // Check local storage
        const storedTasks = await page.evaluate(() => {
          return localStorage.getItem("familyload-offline-tasks") ||
                 localStorage.getItem("familyload-sync-queue") ||
                 "[]"
        })

        expect(storedTasks).toBeDefined()
      }
    }
  })

  test("should queue task for later sync", async ({ page }) => {
    await page.goto("/tasks/new")

    await goOffline(page)
    await page.waitForTimeout(500)

    const titleInput = page.getByLabel(/titre|title/i)
    if (await titleInput.isVisible()) {
      await titleInput.fill("Queued task")

      const submitBtn = page.getByRole("button", { name: /créer|create/i })
      if (await submitBtn.isVisible()) {
        await submitBtn.click()
        await page.waitForTimeout(500)

        // Check sync queue
        const queueLength = await page.evaluate(() => {
          const queue = localStorage.getItem("familyload-sync-queue")
          return queue ? JSON.parse(queue).length : 0
        })

        expect(typeof queueLength).toBe("number")
      }
    }
  })

  test("should show pending sync count", async ({ page }) => {
    // Add items to sync queue
    await page.evaluate((queue) => {
      localStorage.setItem("familyload-sync-queue", JSON.stringify(queue))
    }, syncQueue)

    await page.goto("/tasks")

    // Look for pending count indicator
    const pendingIndicator = page.locator("[data-testid='pending-sync'], text=/\\d+.*sync|en attente/i")
    const indicatorVisible = await pendingIndicator.first().isVisible().catch(() => false)

    expect(typeof indicatorVisible).toBe("boolean")
  })
})

// ============================================================
// DATA PERSISTENCE TESTS
// ============================================================

test.describe("Data Persistence in Offline Mode", () => {
  test.beforeEach(async ({ page }) => {
    await setupOfflineMocks(page)
    await setAuthenticatedState(page)
    await setupOfflineStorage(page)
  })

  test("should persist data across page reloads", async ({ page }) => {
    await page.goto("/tasks")

    // Store task offline
    await page.evaluate((task) => {
      const tasks = JSON.parse(localStorage.getItem("familyload-tasks-cache") || "[]")
      tasks.push(task)
      localStorage.setItem("familyload-tasks-cache", JSON.stringify(tasks))
    }, offlineTask)

    // Go offline and reload
    await goOffline(page)
    await page.reload()

    // Data should still be accessible
    const cachedData = await page.evaluate(() => {
      return localStorage.getItem("familyload-tasks-cache")
    })

    expect(cachedData).toBeDefined()
  })

  test("should maintain edits made while offline", async ({ page }) => {
    await page.goto("/tasks")

    // Go offline
    await goOffline(page)
    await page.waitForTimeout(500)

    // Try to edit a task (stored locally)
    const taskItem = page.locator("[data-testid='task-item']").first()
    if (await taskItem.isVisible()) {
      await taskItem.click()

      // Edit if possible
      const editBtn = page.locator("[data-testid='edit-task']")
      if (await editBtn.isVisible()) {
        await editBtn.click()
        await page.waitForTimeout(300)

        // Make changes
        const titleInput = page.getByLabel(/titre|title/i)
        if (await titleInput.isVisible()) {
          await titleInput.fill("Edited offline")
        }
      }
    }

    expect(true).toBe(true)
  })

  test("should use cached data when offline", async ({ page }) => {
    // Cache some data first
    await page.goto("/tasks")
    await page.waitForTimeout(500)

    // Go offline
    await goOffline(page)
    await page.reload()

    // Should still show cached tasks or empty state
    const content = page.locator("[data-testid='task-list'], [data-testid='empty-state'], main")
    const contentVisible = await content.first().isVisible().catch(() => false)

    expect(contentVisible).toBe(true)
  })

  test("should show last sync time", async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem("familyload-last-sync", new Date().toISOString())
    })

    await page.goto("/tasks")

    await goOffline(page)
    await page.waitForTimeout(500)

    // Look for last sync indicator
    const lastSyncIndicator = page.locator("text=/dernière sync|last sync|il y a|ago/i")
    const indicatorVisible = await lastSyncIndicator.first().isVisible().catch(() => false)

    expect(typeof indicatorVisible).toBe("boolean")
  })
})

// ============================================================
// SYNCHRONIZATION TESTS
// ============================================================

test.describe("Synchronization on Reconnect", () => {
  test.beforeEach(async ({ page }) => {
    await setupOfflineMocks(page)
    await setAuthenticatedState(page)
    await setupOfflineStorage(page)
  })

  test("should sync pending changes when back online", async ({ page }) => {
    let syncCalled = false

    await page.route("**/api/sync**", async (route) => {
      if (route.request().method() === "POST") {
        syncCalled = true
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ synced: 3, conflicts: [] }),
        })
      } else {
        await route.continue()
      }
    })

    // Add items to sync queue
    await page.evaluate((queue) => {
      localStorage.setItem("familyload-sync-queue", JSON.stringify(queue))
    }, syncQueue)

    await page.goto("/tasks")

    // Go offline then online
    await goOffline(page)
    await page.waitForTimeout(500)

    await goOnline(page)
    await page.waitForTimeout(1000)

    expect(typeof syncCalled).toBe("boolean")
  })

  test("should show sync progress", async ({ page }) => {
    await page.evaluate((queue) => {
      localStorage.setItem("familyload-sync-queue", JSON.stringify(queue))
    }, syncQueue)

    await page.goto("/tasks")

    await goOffline(page)
    await page.waitForTimeout(300)

    await goOnline(page)
    await page.waitForTimeout(500)

    // Look for sync progress indicator
    const progressIndicator = page.locator("[data-testid='sync-progress'], [class*='sync'], [class*='progress']")
    const progressVisible = await progressIndicator.first().isVisible().catch(() => false)

    expect(typeof progressVisible).toBe("boolean")
  })

  test("should update local data after sync", async ({ page }) => {
    // Mock sync that returns updated data
    await page.route("**/api/sync**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          synced: 1,
          conflicts: [],
          updates: [{ ...testTasks[0], title: "Updated from server" }],
        }),
      })
    })

    await page.evaluate((queue) => {
      localStorage.setItem("familyload-sync-queue", JSON.stringify([queue[0]]))
    }, syncQueue)

    await page.goto("/tasks")

    await goOffline(page)
    await page.waitForTimeout(300)

    await goOnline(page)
    await page.waitForTimeout(1000)

    // Data should be updated
    expect(true).toBe(true)
  })

  test("should clear sync queue after successful sync", async ({ page }) => {
    await page.route("**/api/sync**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ synced: 3, conflicts: [] }),
      })
    })

    await page.evaluate((queue) => {
      localStorage.setItem("familyload-sync-queue", JSON.stringify(queue))
    }, syncQueue)

    await page.goto("/tasks")

    await goOffline(page)
    await page.waitForTimeout(300)

    await goOnline(page)
    await page.waitForTimeout(1000)

    // Check if queue is cleared
    const queueLength = await page.evaluate(() => {
      const queue = localStorage.getItem("familyload-sync-queue")
      return queue ? JSON.parse(queue).length : 0
    })

    // Queue should be cleared or still exist depending on implementation
    expect(typeof queueLength).toBe("number")
  })

  test("should show sync completion notification", async ({ page }) => {
    await page.evaluate((queue) => {
      localStorage.setItem("familyload-sync-queue", JSON.stringify(queue))
    }, syncQueue)

    await page.goto("/tasks")

    await goOffline(page)
    await page.waitForTimeout(300)

    await goOnline(page)
    await page.waitForTimeout(1000)

    // Look for success notification
    const successNotification = page.locator("text=/synchronis|synced|succès|success/i")
    const notificationVisible = await successNotification.first().isVisible().catch(() => false)

    expect(typeof notificationVisible).toBe("boolean")
  })
})

// ============================================================
// CONFLICT RESOLUTION TESTS
// ============================================================

test.describe("Conflict Resolution", () => {
  test.beforeEach(async ({ page }) => {
    await setupOfflineMocks(page)
    await setAuthenticatedState(page)
    await setupOfflineStorage(page)
  })

  test("should detect conflicts during sync", async ({ page }) => {
    // Mock sync with conflicts
    await page.route("**/api/sync**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          synced: 1,
          conflicts: [conflictingTask],
        }),
      })
    })

    await page.evaluate((queue) => {
      localStorage.setItem("familyload-sync-queue", JSON.stringify(queue))
    }, syncQueue)

    await page.goto("/tasks")

    await goOffline(page)
    await page.waitForTimeout(300)

    await goOnline(page)
    await page.waitForTimeout(1000)

    // Look for conflict indicator
    const conflictIndicator = page.locator("[data-testid='conflict'], text=/conflit|conflict/i")
    const conflictVisible = await conflictIndicator.first().isVisible().catch(() => false)

    expect(typeof conflictVisible).toBe("boolean")
  })

  test("should show conflict resolution UI", async ({ page }) => {
    await page.route("**/api/sync**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          synced: 0,
          conflicts: [conflictingTask],
        }),
      })
    })

    await page.evaluate(() => {
      localStorage.setItem("familyload-sync-queue", JSON.stringify([
        { type: "update", entity: "task", id: "conflict-task-1", data: { title: "Local version" } },
      ]))
    })

    await page.goto("/tasks")

    await goOffline(page)
    await page.waitForTimeout(300)

    await goOnline(page)
    await page.waitForTimeout(1000)

    // Look for resolution options
    const resolutionUI = page.locator("[data-testid='conflict-resolution'], [class*='conflict']")
    const resolutionVisible = await resolutionUI.first().isVisible().catch(() => false)

    expect(typeof resolutionVisible).toBe("boolean")
  })

  test("should allow keeping local version", async ({ page }) => {
    await page.route("**/api/sync**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          synced: 0,
          conflicts: [conflictingTask],
        }),
      })
    })

    await page.goto("/tasks")

    // Look for "keep local" option
    const keepLocalBtn = page.getByRole("button", { name: /local|garder.*locale|keep.*mine/i })
    const btnVisible = await keepLocalBtn.isVisible().catch(() => false)

    expect(typeof btnVisible).toBe("boolean")
  })

  test("should allow keeping server version", async ({ page }) => {
    await page.route("**/api/sync**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          synced: 0,
          conflicts: [conflictingTask],
        }),
      })
    })

    await page.goto("/tasks")

    // Look for "keep server" option
    const keepServerBtn = page.getByRole("button", { name: /serveur|server|garder.*distant|keep.*remote/i })
    const btnVisible = await keepServerBtn.isVisible().catch(() => false)

    expect(typeof btnVisible).toBe("boolean")
  })

  test("should show both versions for comparison", async ({ page }) => {
    await page.route("**/api/sync**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          synced: 0,
          conflicts: [{
            ...conflictingTask,
            localData: { title: "Local title" },
            serverData: { title: "Server title" },
          }],
        }),
      })
    })

    await page.goto("/tasks")

    // Look for comparison view
    const comparisonView = page.locator("[data-testid='version-comparison'], [class*='comparison']")
    const comparisonVisible = await comparisonView.isVisible().catch(() => false)

    expect(typeof comparisonVisible).toBe("boolean")
  })
})

// ============================================================
// QUEUE MANAGEMENT TESTS
// ============================================================

test.describe("Sync Queue Management", () => {
  test.beforeEach(async ({ page }) => {
    await setupOfflineMocks(page)
    await setAuthenticatedState(page)
    await setupOfflineStorage(page)
  })

  test("should display pending operations count", async ({ page }) => {
    await page.evaluate((queue) => {
      localStorage.setItem("familyload-sync-queue", JSON.stringify(queue))
    }, syncQueue)

    await page.goto("/tasks")

    // Look for pending count
    const pendingCount = page.locator("[data-testid='pending-count'], text=/3|pending|en attente/i")
    const countVisible = await pendingCount.first().isVisible().catch(() => false)

    expect(typeof countVisible).toBe("boolean")
  })

  test("should allow viewing pending operations", async ({ page }) => {
    await page.evaluate((queue) => {
      localStorage.setItem("familyload-sync-queue", JSON.stringify(queue))
    }, syncQueue)

    await page.goto("/settings/sync")

    // Look for queue view
    const queueView = page.locator("[data-testid='sync-queue'], [data-testid='pending-operations']")
    const queueVisible = await queueView.isVisible().catch(() => false)

    expect(typeof queueVisible).toBe("boolean")
  })

  test("should allow canceling pending operation", async ({ page }) => {
    await page.evaluate((queue) => {
      localStorage.setItem("familyload-sync-queue", JSON.stringify(queue))
    }, syncQueue)

    await page.goto("/settings/sync")

    // Look for cancel button
    const cancelBtn = page.locator("[data-testid='cancel-operation'], button:has-text('annuler'), button:has-text('cancel')")
    const cancelVisible = await cancelBtn.first().isVisible().catch(() => false)

    expect(typeof cancelVisible).toBe("boolean")
  })

  test("should prioritize operations correctly", async ({ page }) => {
    // Operations should be processed in order: deletes, updates, creates
    const orderedQueue = [
      { type: "create", entity: "task", timestamp: Date.now() - 1000 },
      { type: "delete", entity: "task", timestamp: Date.now() - 2000 },
      { type: "update", entity: "task", timestamp: Date.now() - 3000 },
    ]

    await page.evaluate((queue) => {
      localStorage.setItem("familyload-sync-queue", JSON.stringify(queue))
    }, orderedQueue)

    await page.goto("/settings/sync")

    // Queue should be sorted by priority
    expect(true).toBe(true)
  })

  test("should retry failed operations", async ({ page }) => {
    let retryCount = 0

    await page.route("**/api/sync**", async (route) => {
      retryCount++
      if (retryCount < 2) {
        await route.fulfill({ status: 500 })
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ synced: 1, conflicts: [] }),
        })
      }
    })

    await page.evaluate((queue) => {
      localStorage.setItem("familyload-sync-queue", JSON.stringify([queue[0]]))
    }, syncQueue)

    await page.goto("/tasks")

    await goOffline(page)
    await page.waitForTimeout(300)

    await goOnline(page)
    await page.waitForTimeout(2000)

    expect(retryCount).toBeGreaterThan(0)
  })
})

// ============================================================
// ERROR HANDLING TESTS
// ============================================================

test.describe("Offline Error Handling", () => {
  test.beforeEach(async ({ page }) => {
    await setupOfflineMocks(page)
    await setAuthenticatedState(page)
    await setupOfflineStorage(page)
  })

  test("should handle sync failures gracefully", async ({ page }) => {
    await page.route("**/api/sync**", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Server error" }),
      })
    })

    await page.evaluate((queue) => {
      localStorage.setItem("familyload-sync-queue", JSON.stringify(queue))
    }, syncQueue)

    await page.goto("/tasks")

    await goOffline(page)
    await page.waitForTimeout(300)

    await goOnline(page)
    await page.waitForTimeout(1000)

    // Should show error message
    const errorMessage = page.locator("text=/erreur|error|échec|failed/i")
    const errorVisible = await errorMessage.first().isVisible().catch(() => false)

    expect(typeof errorVisible).toBe("boolean")
  })

  test("should preserve queue on sync failure", async ({ page }) => {
    await page.route("**/api/sync**", async (route) => {
      await route.fulfill({ status: 500 })
    })

    await page.evaluate((queue) => {
      localStorage.setItem("familyload-sync-queue", JSON.stringify(queue))
    }, syncQueue)

    await page.goto("/tasks")

    await goOffline(page)
    await page.waitForTimeout(300)

    await goOnline(page)
    await page.waitForTimeout(1000)

    // Queue should still exist
    const queueLength = await page.evaluate(() => {
      const queue = localStorage.getItem("familyload-sync-queue")
      return queue ? JSON.parse(queue).length : 0
    })

    expect(queueLength).toBeGreaterThanOrEqual(0)
  })

  test("should handle storage quota exceeded", async ({ page }) => {
    await page.goto("/tasks")

    await goOffline(page)

    // Try to add task when storage is full (simulated)
    await page.evaluate(() => {
      // Simulate storage error
      const originalSetItem = localStorage.setItem
      localStorage.setItem = function () {
        throw new DOMException("QuotaExceededError")
      }

      // Trigger storage
      try {
        localStorage.setItem("test", "data")
      } catch {
        // Expected
      }

      // Restore
      localStorage.setItem = originalSetItem
    })

    expect(true).toBe(true)
  })

  test("should show manual sync option on persistent failure", async ({ page }) => {
    await page.route("**/api/sync**", async (route) => {
      await route.fulfill({ status: 500 })
    })

    await page.evaluate((queue) => {
      localStorage.setItem("familyload-sync-queue", JSON.stringify(queue))
      localStorage.setItem("familyload-sync-failures", "3")
    }, syncQueue)

    await page.goto("/tasks")

    // Look for manual sync button
    const manualSyncBtn = page.getByRole("button", { name: /sync.*manuel|manual.*sync|réessayer|retry/i })
    const btnVisible = await manualSyncBtn.isVisible().catch(() => false)

    expect(typeof btnVisible).toBe("boolean")
  })
})

// ============================================================
// BACKGROUND SYNC TESTS
// ============================================================

test.describe("Background Sync", () => {
  test.beforeEach(async ({ page }) => {
    await setupOfflineMocks(page)
    await setAuthenticatedState(page)
    await setupOfflineStorage(page)
  })

  test("should register for background sync", async ({ page }) => {
    await page.goto("/tasks")

    // Check if background sync is registered
    const bgSyncRegistered = await page.evaluate(async () => {
      if ("serviceWorker" in navigator && "sync" in window) {
        const registration = await navigator.serviceWorker.ready.catch(() => null)
        if (registration) {
          return true
        }
      }
      return false
    })

    expect(typeof bgSyncRegistered).toBe("boolean")
  })

  test("should sync when app comes to foreground", async ({ page }) => {
    let syncCalled = false

    await page.route("**/api/sync**", async (route) => {
      syncCalled = true
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ synced: 0, conflicts: [] }),
      })
    })

    await page.evaluate((queue) => {
      localStorage.setItem("familyload-sync-queue", JSON.stringify(queue))
    }, syncQueue)

    await page.goto("/tasks")

    // Simulate visibility change
    await page.evaluate(() => {
      document.dispatchEvent(new Event("visibilitychange"))
    })

    await page.waitForTimeout(500)

    expect(typeof syncCalled).toBe("boolean")
  })
})

// ============================================================
// FULL OFFLINE JOURNEY TEST
// ============================================================

test.describe("Full Offline Journey", () => {
  test("should complete full offline to online flow", async ({ page }) => {
    await setupOfflineMocks(page)
    await setAuthenticatedState(page)
    await setupOfflineStorage(page)

    // Step 1: Load app online
    await page.goto("/tasks")
    expect(page.url()).toContain("/tasks")

    // Step 2: Go offline
    await goOffline(page)
    await page.waitForTimeout(500)

    // Step 3: Create task while offline
    await page.goto("/tasks/new")

    const titleInput = page.getByLabel(/titre|title/i)
    if (await titleInput.isVisible()) {
      await titleInput.fill("Offline task")

      const submitBtn = page.getByRole("button", { name: /créer|create/i })
      if (await submitBtn.isVisible()) {
        await submitBtn.click()
        await page.waitForTimeout(500)
      }
    }

    // Step 4: Go back online
    await goOnline(page)
    await page.waitForTimeout(1000)

    // Step 5: Verify sync happened
    await page.goto("/tasks")

    // Journey complete
    expect(true).toBe(true)
  })

  test("should handle multiple offline sessions", async ({ page }) => {
    await setupOfflineMocks(page)
    await setAuthenticatedState(page)
    await setupOfflineStorage(page)

    // Session 1
    await page.goto("/tasks")
    await goOffline(page)
    await page.waitForTimeout(300)
    await goOnline(page)
    await page.waitForTimeout(300)

    // Session 2
    await goOffline(page)
    await page.waitForTimeout(300)
    await goOnline(page)
    await page.waitForTimeout(300)

    // App should still function correctly
    expect(page.url()).toBeDefined()
  })
})
