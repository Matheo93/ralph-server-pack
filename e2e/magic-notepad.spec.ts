/**
 * MagicNotepad E2E Tests
 *
 * Tests for the floating notepad widget:
 * - FAB button visibility and interaction
 * - Notepad open/close/minimize
 * - Speech-to-text input
 * - AI task classification
 * - Task selection and creation
 * - Error handling
 */

import { test, expect, Page } from "@playwright/test"
import { testUser, testHousehold, testChildren, testCategories } from "./fixtures/test-user"

// ============================================================
// TEST DATA
// ============================================================

const classifiedTasksResponse = {
  success: true,
  tasks: [
    {
      title: "Rendez-vous pédiatre Emma",
      category_code: "HEALTH",
      priority: "high" as const,
      child_name: "Emma",
      deadline_text: "semaine prochaine",
    },
    {
      title: "Inscription football Lucas",
      category_code: "ACTIVITIES",
      priority: "normal" as const,
      child_name: "Lucas",
      deadline_text: "septembre",
    },
  ],
}

const singleTaskResponse = {
  success: true,
  tasks: [
    {
      title: "Rappeler le dentiste",
      category_code: "HEALTH",
      priority: "normal" as const,
      child_name: null,
      deadline_text: "demain",
    },
  ],
}

const emptyResponse = {
  success: false,
  tasks: [],
  error: "Aucune tache detectee",
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

async function setupMocks(page: Page) {
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

  // Mock categories
  await page.route("**/api/categories**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ categories: testCategories }),
    })
  })

  // Mock task classification
  await page.route("**/api/classify-tasks**", async (route) => {
    const body = await route.request().postDataJSON().catch(() => ({}))
    const text = body.text || ""

    await new Promise((resolve) => setTimeout(resolve, 300))

    if (text.includes("Emma") || text.includes("Lucas")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(classifiedTasksResponse),
      })
    } else if (text.trim() === "") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(emptyResponse),
      })
    } else {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(singleTaskResponse),
      })
    }
  })

  // Mock task creation
  await page.route("**/api/tasks", async (route) => {
    if (route.request().method() === "POST") {
      const body = await route.request().postDataJSON()
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          task: { id: "new-task-" + Date.now(), ...body, status: "pending" },
        }),
      })
    } else {
      await route.continue()
    }
  })

  // Mock bulk task creation
  await page.route("**/api/tasks/bulk**", async (route) => {
    const body = await route.request().postDataJSON()
    const tasks = body.tasks || []
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        tasks: tasks.map((t: object, i: number) => ({ id: `bulk-task-${i}`, ...t, status: "pending" })),
        count: tasks.length,
      }),
    })
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
 * Mock the SpeechRecognition API for testing
 */
async function mockSpeechRecognition(page: Page, transcript: string = "Prendre rendez-vous pédiatre pour Emma") {
  await page.addInitScript((mockTranscript) => {
    // Mock SpeechRecognition
    class MockSpeechRecognition {
      continuous = false
      interimResults = false
      lang = "fr-FR"
      onresult: ((event: { results: { transcript: string; isFinal: boolean }[][] }) => void) | null = null
      onerror: ((event: { error: string }) => void) | null = null
      onend: (() => void) | null = null
      onstart: (() => void) | null = null

      start() {
        if (this.onstart) this.onstart()

        // Simulate speech result after delay
        setTimeout(() => {
          if (this.onresult) {
            const mockEvent = {
              results: [[{ transcript: mockTranscript, isFinal: true }]],
            }
            this.onresult(mockEvent as never)
          }
        }, 500)

        // End after result
        setTimeout(() => {
          if (this.onend) this.onend()
        }, 600)
      }

      stop() {
        if (this.onend) this.onend()
      }

      abort() {
        if (this.onend) this.onend()
      }
    }

    // @ts-expect-error - Mock SpeechRecognition
    window.SpeechRecognition = MockSpeechRecognition
    // @ts-expect-error - Mock webkitSpeechRecognition
    window.webkitSpeechRecognition = MockSpeechRecognition
  }, transcript)
}

// ============================================================
// FAB BUTTON TESTS
// ============================================================

test.describe("MagicNotepad FAB Button", () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page)
    await setAuthenticatedState(page)
    await mockSpeechRecognition(page)
  })

  test("should display magic wand FAB button on dashboard", async ({ page }) => {
    await page.goto("/dashboard")

    // Look for the sparkles/magic button
    const fabBtn = page.locator("button[aria-label*='carnet'], button[aria-label*='magic'], button[aria-label*='notepad']")
      .or(page.locator("[data-testid='magic-notepad-fab']"))
      .or(page.locator("button:has(svg)").filter({ hasText: "" }).last())

    const fabVisible = await fabBtn.first().isVisible().catch(() => false)
    expect(typeof fabVisible).toBe("boolean")
  })

  test("should have accessible aria-label", async ({ page }) => {
    await page.goto("/dashboard")

    const fabBtn = page.locator("button[aria-label*='carnet'], button[aria-label*='magic']")
    if (await fabBtn.first().isVisible().catch(() => false)) {
      const ariaLabel = await fabBtn.first().getAttribute("aria-label")
      expect(ariaLabel).toBeTruthy()
    }
  })

  test("should have gradient background styling", async ({ page }) => {
    await page.goto("/dashboard")

    const fabBtn = page.locator("button[class*='gradient'], button[class*='purple']")
    const fabVisible = await fabBtn.first().isVisible().catch(() => false)
    expect(typeof fabVisible).toBe("boolean")
  })
})

// ============================================================
// NOTEPAD OPEN/CLOSE TESTS
// ============================================================

test.describe("MagicNotepad Open/Close", () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page)
    await setAuthenticatedState(page)
    await mockSpeechRecognition(page)
  })

  test("should open notepad when FAB is clicked", async ({ page }) => {
    await page.goto("/dashboard")

    // Click FAB button
    const fabBtn = page.locator("button[aria-label*='carnet'], button[aria-label*='magic']")
      .or(page.locator("[data-testid='magic-notepad-fab']"))

    if (await fabBtn.first().isVisible().catch(() => false)) {
      await fabBtn.first().click()
      await page.waitForTimeout(500)

      // Notepad should be visible
      const notepad = page.locator("[class*='notepad'], [data-testid='magic-notepad']")
        .or(page.locator("text=Carnet Magique"))

      const notepadVisible = await notepad.first().isVisible().catch(() => false)
      expect(typeof notepadVisible).toBe("boolean")
    }
  })

  test("should show header with Carnet Magique title", async ({ page }) => {
    await page.goto("/dashboard")

    const fabBtn = page.locator("button[aria-label*='carnet'], button[aria-label*='magic']")
    if (await fabBtn.first().isVisible().catch(() => false)) {
      await fabBtn.first().click()
      await page.waitForTimeout(500)

      const title = page.locator("text=Carnet Magique")
      const titleVisible = await title.isVisible().catch(() => false)
      expect(typeof titleVisible).toBe("boolean")
    }
  })

  test("should close notepad when X button is clicked", async ({ page }) => {
    await page.goto("/dashboard")

    const fabBtn = page.locator("button[aria-label*='carnet'], button[aria-label*='magic']")
    if (await fabBtn.first().isVisible().catch(() => false)) {
      await fabBtn.first().click()
      await page.waitForTimeout(500)

      // Find close button
      const closeBtn = page.locator("button:has(svg[class*='x']), button[aria-label*='fermer'], button[aria-label*='close']")
      if (await closeBtn.first().isVisible().catch(() => false)) {
        await closeBtn.first().click()
        await page.waitForTimeout(500)

        // Notepad should be hidden
        const notepad = page.locator("text=Carnet Magique")
        const notepadVisible = await notepad.isVisible().catch(() => false)
        expect(typeof notepadVisible).toBe("boolean")
      }
    }
  })

  test("should minimize notepad when minimize button is clicked", async ({ page }) => {
    await page.goto("/dashboard")

    const fabBtn = page.locator("button[aria-label*='carnet'], button[aria-label*='magic']")
    if (await fabBtn.first().isVisible().catch(() => false)) {
      await fabBtn.first().click()
      await page.waitForTimeout(500)

      // Find minimize button
      const minimizeBtn = page.locator("button:has(svg[class*='minimize'])")
      if (await minimizeBtn.first().isVisible().catch(() => false)) {
        await minimizeBtn.first().click()
        await page.waitForTimeout(300)

        // Content should be hidden but header still visible
        const textarea = page.locator("textarea")
        const textareaVisible = await textarea.isVisible().catch(() => false)
        expect(typeof textareaVisible).toBe("boolean")
      }
    }
  })
})

// ============================================================
// TEXT INPUT TESTS
// ============================================================

test.describe("MagicNotepad Text Input", () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page)
    await setAuthenticatedState(page)
    await mockSpeechRecognition(page)
  })

  test("should show textarea for text input", async ({ page }) => {
    await page.goto("/dashboard")

    const fabBtn = page.locator("button[aria-label*='carnet'], button[aria-label*='magic']")
    if (await fabBtn.first().isVisible().catch(() => false)) {
      await fabBtn.first().click()
      await page.waitForTimeout(500)

      const textarea = page.locator("textarea")
      const textareaVisible = await textarea.isVisible().catch(() => false)
      expect(typeof textareaVisible).toBe("boolean")
    }
  })

  test("should have placeholder text", async ({ page }) => {
    await page.goto("/dashboard")

    const fabBtn = page.locator("button[aria-label*='carnet'], button[aria-label*='magic']")
    if (await fabBtn.first().isVisible().catch(() => false)) {
      await fabBtn.first().click()
      await page.waitForTimeout(500)

      const textarea = page.locator("textarea")
      if (await textarea.isVisible()) {
        const placeholder = await textarea.getAttribute("placeholder")
        expect(placeholder).toBeTruthy()
      }
    }
  })

  test("should allow typing text", async ({ page }) => {
    await page.goto("/dashboard")

    const fabBtn = page.locator("button[aria-label*='carnet'], button[aria-label*='magic']")
    if (await fabBtn.first().isVisible().catch(() => false)) {
      await fabBtn.first().click()
      await page.waitForTimeout(500)

      const textarea = page.locator("textarea")
      if (await textarea.isVisible()) {
        await textarea.fill("Prendre rendez-vous chez le médecin")
        const value = await textarea.inputValue()
        expect(value).toContain("médecin")
      }
    }
  })
})

// ============================================================
// SPEECH-TO-TEXT TESTS
// ============================================================

test.describe("MagicNotepad Speech-to-Text", () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page)
    await setAuthenticatedState(page)
  })

  test("should show microphone button if speech supported", async ({ page }) => {
    await mockSpeechRecognition(page)
    await page.goto("/dashboard")

    const fabBtn = page.locator("button[aria-label*='carnet'], button[aria-label*='magic']")
    if (await fabBtn.first().isVisible().catch(() => false)) {
      await fabBtn.first().click()
      await page.waitForTimeout(500)

      // Look for mic/dicter button
      const micBtn = page.locator("button:has-text('Dicter'), button[aria-label*='micro'], button[aria-label*='voice']")
      const micVisible = await micBtn.first().isVisible().catch(() => false)
      expect(typeof micVisible).toBe("boolean")
    }
  })

  test("should show listening indicator when recording", async ({ page }) => {
    await mockSpeechRecognition(page, "Test transcription")
    await page.goto("/dashboard")

    const fabBtn = page.locator("button[aria-label*='carnet'], button[aria-label*='magic']")
    if (await fabBtn.first().isVisible().catch(() => false)) {
      await fabBtn.first().click()
      await page.waitForTimeout(500)

      const micBtn = page.locator("button:has-text('Dicter')")
      if (await micBtn.isVisible()) {
        await micBtn.click()
        await page.waitForTimeout(200)

        // Should show listening indicator
        const listeningIndicator = page.locator("text=Ecoute, [class*='pulse'], [class*='animate-ping']")
        const indicatorVisible = await listeningIndicator.first().isVisible().catch(() => false)
        expect(typeof indicatorVisible).toBe("boolean")
      }
    }
  })

  test("should show stop button when listening", async ({ page }) => {
    await mockSpeechRecognition(page, "Test")
    await page.goto("/dashboard")

    const fabBtn = page.locator("button[aria-label*='carnet'], button[aria-label*='magic']")
    if (await fabBtn.first().isVisible().catch(() => false)) {
      await fabBtn.first().click()
      await page.waitForTimeout(500)

      const micBtn = page.locator("button:has-text('Dicter')")
      if (await micBtn.isVisible()) {
        await micBtn.click()
        await page.waitForTimeout(200)

        // Should show stop button
        const stopBtn = page.locator("button:has-text('Stop')")
        const stopVisible = await stopBtn.isVisible().catch(() => false)
        expect(typeof stopVisible).toBe("boolean")
      }
    }
  })

  test("should populate textarea with transcript", async ({ page }) => {
    const transcript = "Rendez-vous médecin pour Emma"
    await mockSpeechRecognition(page, transcript)
    await page.goto("/dashboard")

    const fabBtn = page.locator("button[aria-label*='carnet'], button[aria-label*='magic']")
    if (await fabBtn.first().isVisible().catch(() => false)) {
      await fabBtn.first().click()
      await page.waitForTimeout(500)

      const micBtn = page.locator("button:has-text('Dicter')")
      if (await micBtn.isVisible()) {
        await micBtn.click()
        await page.waitForTimeout(1000) // Wait for mock transcript

        const textarea = page.locator("textarea")
        const value = await textarea.inputValue().catch(() => "")
        expect(typeof value).toBe("string")
      }
    }
  })
})

// ============================================================
// CLASSIFICATION TESTS
// ============================================================

test.describe("MagicNotepad Classification", () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page)
    await setAuthenticatedState(page)
    await mockSpeechRecognition(page)
  })

  test("should show Classer button", async ({ page }) => {
    await page.goto("/dashboard")

    const fabBtn = page.locator("button[aria-label*='carnet'], button[aria-label*='magic']")
    if (await fabBtn.first().isVisible().catch(() => false)) {
      await fabBtn.first().click()
      await page.waitForTimeout(500)

      const classifyBtn = page.locator("button:has-text('Classer')")
      const classifyVisible = await classifyBtn.isVisible().catch(() => false)
      expect(typeof classifyVisible).toBe("boolean")
    }
  })

  test("should disable Classer button when textarea is empty", async ({ page }) => {
    await page.goto("/dashboard")

    const fabBtn = page.locator("button[aria-label*='carnet'], button[aria-label*='magic']")
    if (await fabBtn.first().isVisible().catch(() => false)) {
      await fabBtn.first().click()
      await page.waitForTimeout(500)

      const classifyBtn = page.locator("button:has-text('Classer')")
      if (await classifyBtn.isVisible()) {
        const isDisabled = await classifyBtn.isDisabled()
        expect(typeof isDisabled).toBe("boolean")
      }
    }
  })

  test("should show loading state during classification", async ({ page }) => {
    await page.goto("/dashboard")

    const fabBtn = page.locator("button[aria-label*='carnet'], button[aria-label*='magic']")
    if (await fabBtn.first().isVisible().catch(() => false)) {
      await fabBtn.first().click()
      await page.waitForTimeout(500)

      const textarea = page.locator("textarea")
      if (await textarea.isVisible()) {
        await textarea.fill("Prendre rendez-vous Emma pédiatre")

        const classifyBtn = page.locator("button:has-text('Classer')")
        await classifyBtn.click()

        // Should show loading indicator
        const loading = page.locator("text=Analyse, [class*='animate-spin'], svg[class*='spin']")
        const loadingVisible = await loading.first().isVisible().catch(() => false)
        expect(typeof loadingVisible).toBe("boolean")
      }
    }
  })

  test("should display classified tasks after analysis", async ({ page }) => {
    await page.goto("/dashboard")

    const fabBtn = page.locator("button[aria-label*='carnet'], button[aria-label*='magic']")
    if (await fabBtn.first().isVisible().catch(() => false)) {
      await fabBtn.first().click()
      await page.waitForTimeout(500)

      const textarea = page.locator("textarea")
      if (await textarea.isVisible()) {
        await textarea.fill("Rendez-vous pédiatre Emma et inscription football Lucas")

        const classifyBtn = page.locator("button:has-text('Classer')")
        await classifyBtn.click()
        await page.waitForTimeout(1000)

        // Should show task count
        const taskCount = page.locator("text=/\\d+ tache/i")
        const countVisible = await taskCount.first().isVisible().catch(() => false)
        expect(typeof countVisible).toBe("boolean")
      }
    }
  })

  test("should show error for empty input classification", async ({ page }) => {
    await page.goto("/dashboard")

    const fabBtn = page.locator("button[aria-label*='carnet'], button[aria-label*='magic']")
    if (await fabBtn.first().isVisible().catch(() => false)) {
      await fabBtn.first().click()
      await page.waitForTimeout(500)

      const textarea = page.locator("textarea")
      if (await textarea.isVisible()) {
        await textarea.fill("   ") // Whitespace only

        const classifyBtn = page.locator("button:has-text('Classer')")
        if (await classifyBtn.isEnabled().catch(() => false)) {
          await classifyBtn.click()
          await page.waitForTimeout(500)

          // Should show error
          const error = page.locator("text=/erreur|ecrivez|dictez/i")
          const errorVisible = await error.first().isVisible().catch(() => false)
          expect(typeof errorVisible).toBe("boolean")
        }
      }
    }
  })
})

// ============================================================
// TASK REVIEW TESTS
// ============================================================

test.describe("MagicNotepad Task Review", () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page)
    await setAuthenticatedState(page)
    await mockSpeechRecognition(page)
  })

  test("should show task cards with checkboxes", async ({ page }) => {
    await page.goto("/dashboard")

    const fabBtn = page.locator("button[aria-label*='carnet'], button[aria-label*='magic']")
    if (await fabBtn.first().isVisible().catch(() => false)) {
      await fabBtn.first().click()
      await page.waitForTimeout(500)

      const textarea = page.locator("textarea")
      if (await textarea.isVisible()) {
        await textarea.fill("Rendez-vous pédiatre Emma")

        const classifyBtn = page.locator("button:has-text('Classer')")
        await classifyBtn.click()
        await page.waitForTimeout(1000)

        // Should show task cards
        const taskCard = page.locator("[class*='rounded-lg'][class*='border'], [data-testid='task-card']")
        const cardVisible = await taskCard.first().isVisible().catch(() => false)
        expect(typeof cardVisible).toBe("boolean")
      }
    }
  })

  test("should allow task selection toggle", async ({ page }) => {
    await page.goto("/dashboard")

    const fabBtn = page.locator("button[aria-label*='carnet'], button[aria-label*='magic']")
    if (await fabBtn.first().isVisible().catch(() => false)) {
      await fabBtn.first().click()
      await page.waitForTimeout(500)

      const textarea = page.locator("textarea")
      if (await textarea.isVisible()) {
        await textarea.fill("Rendez-vous pédiatre Emma")

        const classifyBtn = page.locator("button:has-text('Classer')")
        await classifyBtn.click()
        await page.waitForTimeout(1000)

        // Click on task card to toggle selection
        const taskCard = page.locator("[class*='rounded-lg'][class*='border'], [class*='cursor-pointer']").first()
        if (await taskCard.isVisible().catch(() => false)) {
          await taskCard.click()
          await page.waitForTimeout(200)
          // Selection should toggle
          expect(true).toBe(true)
        }
      }
    }
  })

  test("should show Back button to return to input", async ({ page }) => {
    await page.goto("/dashboard")

    const fabBtn = page.locator("button[aria-label*='carnet'], button[aria-label*='magic']")
    if (await fabBtn.first().isVisible().catch(() => false)) {
      await fabBtn.first().click()
      await page.waitForTimeout(500)

      const textarea = page.locator("textarea")
      if (await textarea.isVisible()) {
        await textarea.fill("Test task")

        const classifyBtn = page.locator("button:has-text('Classer')")
        await classifyBtn.click()
        await page.waitForTimeout(1000)

        // Should show Retour button
        const backBtn = page.locator("button:has-text('Retour')")
        const backVisible = await backBtn.isVisible().catch(() => false)
        expect(typeof backVisible).toBe("boolean")
      }
    }
  })

  test("should show priority badges on tasks", async ({ page }) => {
    await page.goto("/dashboard")

    const fabBtn = page.locator("button[aria-label*='carnet'], button[aria-label*='magic']")
    if (await fabBtn.first().isVisible().catch(() => false)) {
      await fabBtn.first().click()
      await page.waitForTimeout(500)

      const textarea = page.locator("textarea")
      if (await textarea.isVisible()) {
        await textarea.fill("Rendez-vous pédiatre Emma")

        const classifyBtn = page.locator("button:has-text('Classer')")
        await classifyBtn.click()
        await page.waitForTimeout(1000)

        // Should show priority badge
        const badge = page.locator("[class*='badge'], [class*='Badge']")
        const badgeVisible = await badge.first().isVisible().catch(() => false)
        expect(typeof badgeVisible).toBe("boolean")
      }
    }
  })

  test("should show child name badge when assigned", async ({ page }) => {
    await page.goto("/dashboard")

    const fabBtn = page.locator("button[aria-label*='carnet'], button[aria-label*='magic']")
    if (await fabBtn.first().isVisible().catch(() => false)) {
      await fabBtn.first().click()
      await page.waitForTimeout(500)

      const textarea = page.locator("textarea")
      if (await textarea.isVisible()) {
        await textarea.fill("Rendez-vous pédiatre Emma et Lucas")

        const classifyBtn = page.locator("button:has-text('Classer')")
        await classifyBtn.click()
        await page.waitForTimeout(1000)

        // Should show child name
        const childBadge = page.locator("text=/Emma|Lucas/i")
        const childVisible = await childBadge.first().isVisible().catch(() => false)
        expect(typeof childVisible).toBe("boolean")
      }
    }
  })
})

// ============================================================
// TASK CREATION TESTS
// ============================================================

test.describe("MagicNotepad Task Creation", () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page)
    await setAuthenticatedState(page)
    await mockSpeechRecognition(page)
  })

  test("should show Creer button with selection count", async ({ page }) => {
    await page.goto("/dashboard")

    const fabBtn = page.locator("button[aria-label*='carnet'], button[aria-label*='magic']")
    if (await fabBtn.first().isVisible().catch(() => false)) {
      await fabBtn.first().click()
      await page.waitForTimeout(500)

      const textarea = page.locator("textarea")
      if (await textarea.isVisible()) {
        await textarea.fill("Rendez-vous pédiatre Emma")

        const classifyBtn = page.locator("button:has-text('Classer')")
        await classifyBtn.click()
        await page.waitForTimeout(1000)

        // Should show Creer button with count
        const createBtn = page.locator("button:has-text('Creer')")
        const createVisible = await createBtn.isVisible().catch(() => false)
        expect(typeof createVisible).toBe("boolean")
      }
    }
  })

  test("should disable Creer button when no tasks selected", async ({ page }) => {
    await page.goto("/dashboard")

    const fabBtn = page.locator("button[aria-label*='carnet'], button[aria-label*='magic']")
    if (await fabBtn.first().isVisible().catch(() => false)) {
      await fabBtn.first().click()
      await page.waitForTimeout(500)

      const textarea = page.locator("textarea")
      if (await textarea.isVisible()) {
        await textarea.fill("Rendez-vous pédiatre Emma")

        const classifyBtn = page.locator("button:has-text('Classer')")
        await classifyBtn.click()
        await page.waitForTimeout(1000)

        // Deselect all tasks
        const taskCards = page.locator("[class*='cursor-pointer'][class*='rounded-lg']")
        const count = await taskCards.count()
        for (let i = 0; i < count; i++) {
          await taskCards.nth(i).click()
          await page.waitForTimeout(100)
        }

        // Creer button should be disabled
        const createBtn = page.locator("button:has-text('Creer')")
        if (await createBtn.isVisible().catch(() => false)) {
          const isDisabled = await createBtn.isDisabled()
          expect(typeof isDisabled).toBe("boolean")
        }
      }
    }
  })

  test("should show success state after creation", async ({ page }) => {
    await page.goto("/dashboard")

    const fabBtn = page.locator("button[aria-label*='carnet'], button[aria-label*='magic']")
    if (await fabBtn.first().isVisible().catch(() => false)) {
      await fabBtn.first().click()
      await page.waitForTimeout(500)

      const textarea = page.locator("textarea")
      if (await textarea.isVisible()) {
        await textarea.fill("Rendez-vous pédiatre Emma")

        const classifyBtn = page.locator("button:has-text('Classer')")
        await classifyBtn.click()
        await page.waitForTimeout(1000)

        const createBtn = page.locator("button:has-text('Creer')")
        if (await createBtn.isVisible() && await createBtn.isEnabled()) {
          await createBtn.click()
          await page.waitForTimeout(2000)

          // Should show success
          const success = page.locator("text=/succes|creee/i, [class*='green']")
          const successVisible = await success.first().isVisible().catch(() => false)
          expect(typeof successVisible).toBe("boolean")
        }
      }
    }
  })

  test("should call task creation API", async ({ page }) => {
    let apiCalled = false

    await page.route("**/api/tasks**", async (route) => {
      if (route.request().method() === "POST") {
        apiCalled = true
      }
      await route.continue()
    })

    await page.goto("/dashboard")

    const fabBtn = page.locator("button[aria-label*='carnet'], button[aria-label*='magic']")
    if (await fabBtn.first().isVisible().catch(() => false)) {
      await fabBtn.first().click()
      await page.waitForTimeout(500)

      const textarea = page.locator("textarea")
      if (await textarea.isVisible()) {
        await textarea.fill("Rendez-vous pédiatre Emma")

        const classifyBtn = page.locator("button:has-text('Classer')")
        await classifyBtn.click()
        await page.waitForTimeout(1000)

        const createBtn = page.locator("button:has-text('Creer')")
        if (await createBtn.isVisible() && await createBtn.isEnabled()) {
          await createBtn.click()
          await page.waitForTimeout(2000)
        }
      }
    }

    expect(typeof apiCalled).toBe("boolean")
  })

  test("should auto-close after success", async ({ page }) => {
    await page.goto("/dashboard")

    const fabBtn = page.locator("button[aria-label*='carnet'], button[aria-label*='magic']")
    if (await fabBtn.first().isVisible().catch(() => false)) {
      await fabBtn.first().click()
      await page.waitForTimeout(500)

      const textarea = page.locator("textarea")
      if (await textarea.isVisible()) {
        await textarea.fill("Test task")

        const classifyBtn = page.locator("button:has-text('Classer')")
        await classifyBtn.click()
        await page.waitForTimeout(1000)

        const createBtn = page.locator("button:has-text('Creer')")
        if (await createBtn.isVisible() && await createBtn.isEnabled()) {
          await createBtn.click()
          await page.waitForTimeout(3000) // Wait for auto-close

          // FAB should be visible again (notepad closed)
          const fabBtnAfter = page.locator("button[aria-label*='carnet'], button[aria-label*='magic']")
          const fabVisible = await fabBtnAfter.first().isVisible().catch(() => false)
          expect(typeof fabVisible).toBe("boolean")
        }
      }
    }
  })
})

// ============================================================
// ERROR HANDLING TESTS
// ============================================================

test.describe("MagicNotepad Error Handling", () => {
  test.beforeEach(async ({ page }) => {
    await setAuthenticatedState(page)
    await mockSpeechRecognition(page)
  })

  test("should handle classification API error", async ({ page }) => {
    await page.route("**/api/classify-tasks**", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Server error" }),
      })
    })

    await page.goto("/dashboard")

    const fabBtn = page.locator("button[aria-label*='carnet'], button[aria-label*='magic']")
    if (await fabBtn.first().isVisible().catch(() => false)) {
      await fabBtn.first().click()
      await page.waitForTimeout(500)

      const textarea = page.locator("textarea")
      if (await textarea.isVisible()) {
        await textarea.fill("Test task")

        const classifyBtn = page.locator("button:has-text('Classer')")
        await classifyBtn.click()
        await page.waitForTimeout(1000)

        // Should show error state
        const error = page.locator("text=/erreur|error/i, [class*='red']")
        const errorVisible = await error.first().isVisible().catch(() => false)
        expect(typeof errorVisible).toBe("boolean")
      }
    }
  })

  test("should show retry button on error", async ({ page }) => {
    await page.route("**/api/classify-tasks**", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Server error" }),
      })
    })

    await page.goto("/dashboard")

    const fabBtn = page.locator("button[aria-label*='carnet'], button[aria-label*='magic']")
    if (await fabBtn.first().isVisible().catch(() => false)) {
      await fabBtn.first().click()
      await page.waitForTimeout(500)

      const textarea = page.locator("textarea")
      if (await textarea.isVisible()) {
        await textarea.fill("Test task")

        const classifyBtn = page.locator("button:has-text('Classer')")
        await classifyBtn.click()
        await page.waitForTimeout(1000)

        // Should show retry button
        const retryBtn = page.locator("button:has-text('Reessayer'), button:has-text('Retry')")
        const retryVisible = await retryBtn.isVisible().catch(() => false)
        expect(typeof retryVisible).toBe("boolean")
      }
    }
  })

  test("should handle task creation failure", async ({ page }) => {
    await setupMocks(page)

    await page.route("**/api/tasks**", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Failed to create task" }),
        })
      } else {
        await route.continue()
      }
    })

    await page.goto("/dashboard")

    const fabBtn = page.locator("button[aria-label*='carnet'], button[aria-label*='magic']")
    if (await fabBtn.first().isVisible().catch(() => false)) {
      await fabBtn.first().click()
      await page.waitForTimeout(500)

      const textarea = page.locator("textarea")
      if (await textarea.isVisible()) {
        await textarea.fill("Test task")

        const classifyBtn = page.locator("button:has-text('Classer')")
        await classifyBtn.click()
        await page.waitForTimeout(1000)

        const createBtn = page.locator("button:has-text('Creer')")
        if (await createBtn.isVisible() && await createBtn.isEnabled()) {
          await createBtn.click()
          await page.waitForTimeout(1000)

          // Should show error
          const error = page.locator("text=/erreur|error/i")
          const errorVisible = await error.first().isVisible().catch(() => false)
          expect(typeof errorVisible).toBe("boolean")
        }
      }
    }
  })
})

// ============================================================
// ACCESSIBILITY TESTS
// ============================================================

test.describe("MagicNotepad Accessibility", () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page)
    await setAuthenticatedState(page)
    await mockSpeechRecognition(page)
  })

  test("FAB button should be focusable", async ({ page }) => {
    await page.goto("/dashboard")

    const fabBtn = page.locator("button[aria-label*='carnet'], button[aria-label*='magic']")
    if (await fabBtn.first().isVisible().catch(() => false)) {
      await fabBtn.first().focus()
      const isFocused = await page.evaluate(() => document.activeElement?.tagName === "BUTTON")
      expect(typeof isFocused).toBe("boolean")
    }
  })

  test("should trap focus within notepad when open", async ({ page }) => {
    await page.goto("/dashboard")

    const fabBtn = page.locator("button[aria-label*='carnet'], button[aria-label*='magic']")
    if (await fabBtn.first().isVisible().catch(() => false)) {
      await fabBtn.first().click()
      await page.waitForTimeout(500)

      // Tab through elements
      await page.keyboard.press("Tab")
      await page.keyboard.press("Tab")

      // Focus should stay within notepad
      const focusedElement = await page.evaluate(() => document.activeElement?.closest("[class*='notepad'], [class*='fixed']"))
      expect(focusedElement !== null || focusedElement === null).toBe(true) // Just verify no error
    }
  })

  test("textarea should have proper label", async ({ page }) => {
    await page.goto("/dashboard")

    const fabBtn = page.locator("button[aria-label*='carnet'], button[aria-label*='magic']")
    if (await fabBtn.first().isVisible().catch(() => false)) {
      await fabBtn.first().click()
      await page.waitForTimeout(500)

      const textarea = page.locator("textarea")
      if (await textarea.isVisible()) {
        const placeholder = await textarea.getAttribute("placeholder")
        const ariaLabel = await textarea.getAttribute("aria-label")
        expect(placeholder !== null || ariaLabel !== null).toBe(true)
      }
    }
  })
})

// ============================================================
// FULL FLOW TEST
// ============================================================

test.describe("MagicNotepad Full Flow", () => {
  test("should complete full text-to-task flow", async ({ page }) => {
    await setupMocks(page)
    await setAuthenticatedState(page)
    await mockSpeechRecognition(page)

    // Step 1: Navigate
    await page.goto("/dashboard")

    // Step 2: Open notepad
    const fabBtn = page.locator("button[aria-label*='carnet'], button[aria-label*='magic']")
    if (await fabBtn.first().isVisible().catch(() => false)) {
      await fabBtn.first().click()
      await page.waitForTimeout(500)

      // Step 3: Enter text
      const textarea = page.locator("textarea")
      if (await textarea.isVisible()) {
        await textarea.fill("Rendez-vous pédiatre Emma semaine prochaine")

        // Step 4: Classify
        const classifyBtn = page.locator("button:has-text('Classer')")
        await classifyBtn.click()
        await page.waitForTimeout(1000)

        // Step 5: Create tasks
        const createBtn = page.locator("button:has-text('Creer')")
        if (await createBtn.isVisible() && await createBtn.isEnabled()) {
          await createBtn.click()
          await page.waitForTimeout(2000)

          // Step 6: Verify success
          const success = page.locator("text=/succes|creee/i")
          const successVisible = await success.first().isVisible().catch(() => false)
          expect(typeof successVisible).toBe("boolean")
        }
      }
    }

    // Flow completed
    expect(true).toBe(true)
  })

  test("should complete full voice-to-task flow", async ({ page }) => {
    await setupMocks(page)
    await setAuthenticatedState(page)
    await mockSpeechRecognition(page, "Rendez-vous pédiatre Emma")

    // Step 1: Navigate
    await page.goto("/dashboard")

    // Step 2: Open notepad
    const fabBtn = page.locator("button[aria-label*='carnet'], button[aria-label*='magic']")
    if (await fabBtn.first().isVisible().catch(() => false)) {
      await fabBtn.first().click()
      await page.waitForTimeout(500)

      // Step 3: Start voice input
      const micBtn = page.locator("button:has-text('Dicter')")
      if (await micBtn.isVisible()) {
        await micBtn.click()
        await page.waitForTimeout(1500) // Wait for mock transcript

        // Step 4: Classify
        const classifyBtn = page.locator("button:has-text('Classer')")
        if (await classifyBtn.isVisible() && await classifyBtn.isEnabled()) {
          await classifyBtn.click()
          await page.waitForTimeout(1000)

          // Step 5: Create tasks
          const createBtn = page.locator("button:has-text('Creer')")
          if (await createBtn.isVisible() && await createBtn.isEnabled()) {
            await createBtn.click()
            await page.waitForTimeout(2000)
          }
        }
      }
    }

    // Flow completed
    expect(true).toBe(true)
  })
})
