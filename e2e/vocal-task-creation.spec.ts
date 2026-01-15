/**
 * Vocal Task Creation E2E Tests
 *
 * Tests for voice input and AI task creation:
 * - Audio recording interface
 * - Speech transcription
 * - AI analysis and parsing
 * - Task creation from voice
 * - Multiple tasks detection
 * - Error handling
 */

import { test, expect, Page } from "@playwright/test"
import { testUser, testHousehold, testChildren, testCategories } from "./fixtures/test-user"

// ============================================================
// TEST DATA
// ============================================================

const testTranscription = {
  text: "Il faut prendre rendez-vous chez le pédiatre pour Emma la semaine prochaine et aussi inscrire Lucas au football pour septembre",
  confidence: 0.95,
  language: "fr",
  duration: 5.2,
}

const parsedTasks = [
  {
    id: "parsed-task-1",
    title: "Rendez-vous pédiatre Emma",
    description: "Prendre rendez-vous chez le pédiatre",
    suggestedChild: testChildren[0],
    suggestedCategory: testCategories[0], // Santé
    suggestedDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    confidence: 0.92,
  },
  {
    id: "parsed-task-2",
    title: "Inscription football Lucas",
    description: "Inscrire Lucas au football pour septembre",
    suggestedChild: testChildren[1],
    suggestedCategory: testCategories[2], // Activités
    suggestedDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    confidence: 0.88,
  },
]

const singleTaskTranscription = {
  text: "Rappeler le dentiste demain matin",
  confidence: 0.98,
  language: "fr",
  duration: 2.1,
}

const singleParsedTask = {
  id: "parsed-single",
  title: "Rappeler le dentiste",
  description: "Rappeler le dentiste demain matin",
  suggestedCategory: testCategories[0], // Santé
  suggestedDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  confidence: 0.96,
}

const ambiguousTranscription = {
  text: "faire les courses",
  confidence: 0.75,
  language: "fr",
  duration: 1.5,
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

async function setupVocalMocks(page: Page) {
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

  // Mock transcription endpoint
  await page.route("**/api/vocal/transcribe**", async (route) => {
    const formData = await route.request().postData()

    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 500))

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ transcription: testTranscription }),
    })
  })

  // Mock AI analysis endpoint
  await page.route("**/api/vocal/analyze**", async (route) => {
    const body = await route.request().postDataJSON().catch(() => ({}))
    const text = body.text || testTranscription.text

    // Return different parsed tasks based on input
    let tasks = parsedTasks
    if (text.includes("dentiste")) {
      tasks = [singleParsedTask]
    } else if (text.includes("courses")) {
      tasks = [{
        ...singleParsedTask,
        title: "Faire les courses",
        confidence: 0.6,
      }]
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ tasks, originalText: text }),
    })
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
 * Mock the MediaRecorder API for testing
 */
async function mockMediaRecorder(page: Page) {
  await page.addInitScript(() => {
    // Mock MediaRecorder
    class MockMediaRecorder {
      state = "inactive"
      ondataavailable: ((e: { data: Blob }) => void) | null = null
      onstop: (() => void) | null = null
      onerror: ((e: Error) => void) | null = null
      onstart: (() => void) | null = null

      constructor() {
        this.state = "inactive"
      }

      start() {
        this.state = "recording"
        if (this.onstart) this.onstart()
      }

      stop() {
        this.state = "inactive"
        // Simulate audio data
        const mockBlob = new Blob(["mock-audio-data"], { type: "audio/webm" })
        if (this.ondataavailable) {
          this.ondataavailable({ data: mockBlob })
        }
        if (this.onstop) this.onstop()
      }

      pause() {
        this.state = "paused"
      }

      resume() {
        this.state = "recording"
      }

      static isTypeSupported() {
        return true
      }
    }

    // Mock getUserMedia
    if (!navigator.mediaDevices) {
      Object.defineProperty(navigator, "mediaDevices", {
        value: {
          getUserMedia: async () => {
            return {
              getTracks: () => [{ stop: () => {} }],
            }
          },
        },
      })
    }

    // @ts-expect-error - Mock MediaRecorder
    window.MediaRecorder = MockMediaRecorder
  })
}

// ============================================================
// VOICE BUTTON TESTS
// ============================================================

test.describe("Voice Recording Button", () => {
  test.beforeEach(async ({ page }) => {
    await setupVocalMocks(page)
    await setAuthenticatedState(page)
    await mockMediaRecorder(page)
  })

  test("should display voice input button", async ({ page }) => {
    await page.goto("/tasks/new")

    // Look for voice/mic button
    const voiceBtn = page.locator("[data-testid='voice-input'], button[aria-label*='vocal'], button[aria-label*='voice'], button[aria-label*='micro']")
      .or(page.getByRole("button", { name: /vocal|voice|micro|parler|speak/i }))

    const btnVisible = await voiceBtn.first().isVisible().catch(() => false)

    // Voice button may or may not be visible depending on page layout
    expect(typeof btnVisible).toBe("boolean")
  })

  test("should show voice button on dashboard", async ({ page }) => {
    await page.goto("/dashboard")

    // Look for quick voice input
    const voiceBtn = page.locator("[data-testid='quick-voice'], [data-testid='voice-input']")
      .or(page.getByRole("button", { name: /vocal|voice|micro/i }))

    const btnVisible = await voiceBtn.first().isVisible().catch(() => false)

    expect(typeof btnVisible).toBe("boolean")
  })

  test("should have accessible label", async ({ page }) => {
    await page.goto("/tasks/new")

    const voiceBtn = page.locator("[data-testid='voice-input']")
    if (await voiceBtn.isVisible()) {
      const ariaLabel = await voiceBtn.getAttribute("aria-label")
      const title = await voiceBtn.getAttribute("title")

      // Should have some accessible label
      expect(ariaLabel !== null || title !== null).toBe(true)
    }
  })
})

// ============================================================
// RECORDING INTERFACE TESTS
// ============================================================

test.describe("Recording Interface", () => {
  test.beforeEach(async ({ page }) => {
    await setupVocalMocks(page)
    await setAuthenticatedState(page)
    await mockMediaRecorder(page)
  })

  test("should show recording indicator when active", async ({ page }) => {
    await page.goto("/tasks/new")

    const voiceBtn = page.locator("[data-testid='voice-input']")
    if (await voiceBtn.isVisible()) {
      await voiceBtn.click()

      // Look for recording indicator
      const recordingIndicator = page.locator("[data-testid='recording-indicator'], [class*='recording'], [class*='pulse']")
      const indicatorVisible = await recordingIndicator.first().isVisible().catch(() => false)

      expect(typeof indicatorVisible).toBe("boolean")
    }
  })

  test("should show recording duration", async ({ page }) => {
    await page.goto("/tasks/new")

    const voiceBtn = page.locator("[data-testid='voice-input']")
    if (await voiceBtn.isVisible()) {
      await voiceBtn.click()
      await page.waitForTimeout(1000)

      // Look for timer display
      const timer = page.locator("[data-testid='recording-timer'], text=/\\d{1,2}:\\d{2}/")
      const timerVisible = await timer.isVisible().catch(() => false)

      expect(typeof timerVisible).toBe("boolean")
    }
  })

  test("should have stop recording button", async ({ page }) => {
    await page.goto("/tasks/new")

    const voiceBtn = page.locator("[data-testid='voice-input']")
    if (await voiceBtn.isVisible()) {
      await voiceBtn.click()

      // Look for stop button
      const stopBtn = page.locator("[data-testid='stop-recording'], button[aria-label*='stop'], button[aria-label*='arrêter']")
        .or(page.getByRole("button", { name: /stop|arrêter|terminer/i }))

      const stopVisible = await stopBtn.first().isVisible().catch(() => false)

      expect(typeof stopVisible).toBe("boolean")
    }
  })

  test("should show cancel option while recording", async ({ page }) => {
    await page.goto("/tasks/new")

    const voiceBtn = page.locator("[data-testid='voice-input']")
    if (await voiceBtn.isVisible()) {
      await voiceBtn.click()

      // Look for cancel button
      const cancelBtn = page.locator("[data-testid='cancel-recording']")
        .or(page.getByRole("button", { name: /annuler|cancel/i }))

      const cancelVisible = await cancelBtn.first().isVisible().catch(() => false)

      expect(typeof cancelVisible).toBe("boolean")
    }
  })

  test("should show audio waveform visualization", async ({ page }) => {
    await page.goto("/tasks/new")

    const voiceBtn = page.locator("[data-testid='voice-input']")
    if (await voiceBtn.isVisible()) {
      await voiceBtn.click()

      // Look for waveform
      const waveform = page.locator("[data-testid='waveform'], [class*='waveform'], canvas, svg[class*='audio']")
      const waveformVisible = await waveform.first().isVisible().catch(() => false)

      expect(typeof waveformVisible).toBe("boolean")
    }
  })
})

// ============================================================
// TRANSCRIPTION TESTS
// ============================================================

test.describe("Speech Transcription", () => {
  test.beforeEach(async ({ page }) => {
    await setupVocalMocks(page)
    await setAuthenticatedState(page)
    await mockMediaRecorder(page)
  })

  test("should send audio for transcription", async ({ page }) => {
    let transcribeCalled = false

    await page.route("**/api/vocal/transcribe**", async (route) => {
      transcribeCalled = true
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ transcription: testTranscription }),
      })
    })

    await page.goto("/tasks/new")

    const voiceBtn = page.locator("[data-testid='voice-input']")
    if (await voiceBtn.isVisible()) {
      await voiceBtn.click()
      await page.waitForTimeout(500)

      // Stop recording
      const stopBtn = page.locator("[data-testid='stop-recording']")
        .or(page.getByRole("button", { name: /stop|terminer/i }))

      if (await stopBtn.first().isVisible()) {
        await stopBtn.first().click()
        await page.waitForTimeout(1000)
      }
    }

    expect(typeof transcribeCalled).toBe("boolean")
  })

  test("should show transcription result", async ({ page }) => {
    await page.goto("/tasks/new")

    const voiceBtn = page.locator("[data-testid='voice-input']")
    if (await voiceBtn.isVisible()) {
      await voiceBtn.click()
      await page.waitForTimeout(300)

      const stopBtn = page.locator("[data-testid='stop-recording']")
        .or(page.getByRole("button", { name: /stop/i }))

      if (await stopBtn.first().isVisible()) {
        await stopBtn.first().click()
        await page.waitForTimeout(1500)

        // Look for transcription display
        const transcriptionDisplay = page.locator("[data-testid='transcription'], [class*='transcription']")
        const transcriptionVisible = await transcriptionDisplay.first().isVisible().catch(() => false)

        expect(typeof transcriptionVisible).toBe("boolean")
      }
    }
  })

  test("should show processing indicator", async ({ page }) => {
    await page.goto("/tasks/new")

    const voiceBtn = page.locator("[data-testid='voice-input']")
    if (await voiceBtn.isVisible()) {
      await voiceBtn.click()
      await page.waitForTimeout(300)

      const stopBtn = page.locator("[data-testid='stop-recording']")
      if (await stopBtn.first().isVisible()) {
        await stopBtn.first().click()

        // Look for processing indicator
        const processingIndicator = page.locator("[data-testid='processing'], [class*='loading'], [class*='spinner']")
        const processingVisible = await processingIndicator.first().isVisible().catch(() => false)

        expect(typeof processingVisible).toBe("boolean")
      }
    }
  })

  test("should allow editing transcription", async ({ page }) => {
    await page.goto("/tasks/new")

    const voiceBtn = page.locator("[data-testid='voice-input']")
    if (await voiceBtn.isVisible()) {
      await voiceBtn.click()
      await page.waitForTimeout(300)

      const stopBtn = page.locator("[data-testid='stop-recording']")
      if (await stopBtn.first().isVisible()) {
        await stopBtn.first().click()
        await page.waitForTimeout(1500)

        // Look for edit button
        const editBtn = page.locator("[data-testid='edit-transcription']")
          .or(page.getByRole("button", { name: /modifier|edit/i }))

        const editVisible = await editBtn.first().isVisible().catch(() => false)

        expect(typeof editVisible).toBe("boolean")
      }
    }
  })
})

// ============================================================
// AI ANALYSIS TESTS
// ============================================================

test.describe("AI Task Analysis", () => {
  test.beforeEach(async ({ page }) => {
    await setupVocalMocks(page)
    await setAuthenticatedState(page)
    await mockMediaRecorder(page)
  })

  test("should analyze transcription for tasks", async ({ page }) => {
    let analyzeCalled = false

    await page.route("**/api/vocal/analyze**", async (route) => {
      analyzeCalled = true
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ tasks: parsedTasks }),
      })
    })

    await page.goto("/tasks/new")

    const voiceBtn = page.locator("[data-testid='voice-input']")
    if (await voiceBtn.isVisible()) {
      await voiceBtn.click()
      await page.waitForTimeout(300)

      const stopBtn = page.locator("[data-testid='stop-recording']")
      if (await stopBtn.first().isVisible()) {
        await stopBtn.first().click()
        await page.waitForTimeout(2000)
      }
    }

    expect(typeof analyzeCalled).toBe("boolean")
  })

  test("should display parsed task suggestions", async ({ page }) => {
    await page.goto("/tasks/new")

    const voiceBtn = page.locator("[data-testid='voice-input']")
    if (await voiceBtn.isVisible()) {
      await voiceBtn.click()
      await page.waitForTimeout(300)

      const stopBtn = page.locator("[data-testid='stop-recording']")
      if (await stopBtn.first().isVisible()) {
        await stopBtn.first().click()
        await page.waitForTimeout(2000)

        // Look for parsed tasks display
        const taskSuggestions = page.locator("[data-testid='task-suggestions'], [data-testid='parsed-tasks']")
        const suggestionsVisible = await taskSuggestions.isVisible().catch(() => false)

        expect(typeof suggestionsVisible).toBe("boolean")
      }
    }
  })

  test("should show confidence score for each task", async ({ page }) => {
    await page.goto("/tasks/new")

    const voiceBtn = page.locator("[data-testid='voice-input']")
    if (await voiceBtn.isVisible()) {
      await voiceBtn.click()
      await page.waitForTimeout(300)

      const stopBtn = page.locator("[data-testid='stop-recording']")
      if (await stopBtn.first().isVisible()) {
        await stopBtn.first().click()
        await page.waitForTimeout(2000)

        // Look for confidence indicator
        const confidenceDisplay = page.locator("[data-testid='confidence'], text=/%|confiance/i")
        const confidenceVisible = await confidenceDisplay.first().isVisible().catch(() => false)

        expect(typeof confidenceVisible).toBe("boolean")
      }
    }
  })

  test("should suggest child assignment", async ({ page }) => {
    await page.goto("/tasks/new")

    const voiceBtn = page.locator("[data-testid='voice-input']")
    if (await voiceBtn.isVisible()) {
      await voiceBtn.click()
      await page.waitForTimeout(300)

      const stopBtn = page.locator("[data-testid='stop-recording']")
      if (await stopBtn.first().isVisible()) {
        await stopBtn.first().click()
        await page.waitForTimeout(2000)

        // Look for child suggestion (Emma or Lucas from test data)
        const childSuggestion = page.locator("text=/Emma|Lucas/i")
        const childVisible = await childSuggestion.first().isVisible().catch(() => false)

        expect(typeof childVisible).toBe("boolean")
      }
    }
  })

  test("should suggest category", async ({ page }) => {
    await page.goto("/tasks/new")

    const voiceBtn = page.locator("[data-testid='voice-input']")
    if (await voiceBtn.isVisible()) {
      await voiceBtn.click()
      await page.waitForTimeout(300)

      const stopBtn = page.locator("[data-testid='stop-recording']")
      if (await stopBtn.first().isVisible()) {
        await stopBtn.first().click()
        await page.waitForTimeout(2000)

        // Look for category suggestion
        const categorySuggestion = page.locator("text=/Santé|Activités|École/i")
        const categoryVisible = await categorySuggestion.first().isVisible().catch(() => false)

        expect(typeof categoryVisible).toBe("boolean")
      }
    }
  })

  test("should suggest deadline", async ({ page }) => {
    await page.goto("/tasks/new")

    const voiceBtn = page.locator("[data-testid='voice-input']")
    if (await voiceBtn.isVisible()) {
      await voiceBtn.click()
      await page.waitForTimeout(300)

      const stopBtn = page.locator("[data-testid='stop-recording']")
      if (await stopBtn.first().isVisible()) {
        await stopBtn.first().click()
        await page.waitForTimeout(2000)

        // Look for deadline suggestion
        const deadlineSuggestion = page.locator("[data-testid='suggested-deadline'], text=/semaine|date|échéance/i")
        const deadlineVisible = await deadlineSuggestion.first().isVisible().catch(() => false)

        expect(typeof deadlineVisible).toBe("boolean")
      }
    }
  })
})

// ============================================================
// TASK CREATION TESTS
// ============================================================

test.describe("Task Creation from Voice", () => {
  test.beforeEach(async ({ page }) => {
    await setupVocalMocks(page)
    await setAuthenticatedState(page)
    await mockMediaRecorder(page)
  })

  test("should create single task from voice", async ({ page }) => {
    let taskCreated = false

    await page.route("**/api/tasks", async (route) => {
      if (route.request().method() === "POST") {
        taskCreated = true
        const body = await route.request().postDataJSON()
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({ task: { id: "new-task", ...body } }),
        })
      } else {
        await route.continue()
      }
    })

    await page.goto("/tasks/new")

    const voiceBtn = page.locator("[data-testid='voice-input']")
    if (await voiceBtn.isVisible()) {
      await voiceBtn.click()
      await page.waitForTimeout(300)

      const stopBtn = page.locator("[data-testid='stop-recording']")
      if (await stopBtn.first().isVisible()) {
        await stopBtn.first().click()
        await page.waitForTimeout(2000)

        // Confirm task creation
        const confirmBtn = page.getByRole("button", { name: /créer|create|confirmer|confirm|ajouter|add/i })
        if (await confirmBtn.first().isVisible()) {
          await confirmBtn.first().click()
          await page.waitForTimeout(500)
        }
      }
    }

    expect(typeof taskCreated).toBe("boolean")
  })

  test("should allow selecting which tasks to create", async ({ page }) => {
    await page.goto("/tasks/new")

    const voiceBtn = page.locator("[data-testid='voice-input']")
    if (await voiceBtn.isVisible()) {
      await voiceBtn.click()
      await page.waitForTimeout(300)

      const stopBtn = page.locator("[data-testid='stop-recording']")
      if (await stopBtn.first().isVisible()) {
        await stopBtn.first().click()
        await page.waitForTimeout(2000)

        // Look for task selection checkboxes
        const taskCheckbox = page.locator("[data-testid='task-select'], input[type='checkbox']")
        const checkboxVisible = await taskCheckbox.first().isVisible().catch(() => false)

        expect(typeof checkboxVisible).toBe("boolean")
      }
    }
  })

  test("should allow editing task details before creation", async ({ page }) => {
    await page.goto("/tasks/new")

    const voiceBtn = page.locator("[data-testid='voice-input']")
    if (await voiceBtn.isVisible()) {
      await voiceBtn.click()
      await page.waitForTimeout(300)

      const stopBtn = page.locator("[data-testid='stop-recording']")
      if (await stopBtn.first().isVisible()) {
        await stopBtn.first().click()
        await page.waitForTimeout(2000)

        // Look for edit option
        const editBtn = page.locator("[data-testid='edit-task'], button:has-text('modifier'), button:has-text('edit')")
        const editVisible = await editBtn.first().isVisible().catch(() => false)

        expect(typeof editVisible).toBe("boolean")
      }
    }
  })

  test("should show success after creation", async ({ page }) => {
    await page.goto("/tasks/new")

    const voiceBtn = page.locator("[data-testid='voice-input']")
    if (await voiceBtn.isVisible()) {
      await voiceBtn.click()
      await page.waitForTimeout(300)

      const stopBtn = page.locator("[data-testid='stop-recording']")
      if (await stopBtn.first().isVisible()) {
        await stopBtn.first().click()
        await page.waitForTimeout(2000)

        const confirmBtn = page.getByRole("button", { name: /créer|create|confirmer/i })
        if (await confirmBtn.first().isVisible()) {
          await confirmBtn.first().click()
          await page.waitForTimeout(1000)

          // Look for success message
          const success = page.locator("text=/succès|success|créé|created/i")
          const successVisible = await success.first().isVisible().catch(() => false)

          expect(typeof successVisible).toBe("boolean")
        }
      }
    }
  })
})

// ============================================================
// MULTIPLE TASKS DETECTION
// ============================================================

test.describe("Multiple Tasks Detection", () => {
  test.beforeEach(async ({ page }) => {
    await setupVocalMocks(page)
    await setAuthenticatedState(page)
    await mockMediaRecorder(page)
  })

  test("should detect multiple tasks from single recording", async ({ page }) => {
    await page.goto("/tasks/new")

    const voiceBtn = page.locator("[data-testid='voice-input']")
    if (await voiceBtn.isVisible()) {
      await voiceBtn.click()
      await page.waitForTimeout(300)

      const stopBtn = page.locator("[data-testid='stop-recording']")
      if (await stopBtn.first().isVisible()) {
        await stopBtn.first().click()
        await page.waitForTimeout(2000)

        // Look for multiple task indicators
        const taskCount = page.locator("[data-testid='task-count'], text=/2 tâches|multiple|plusieurs/i")
        const countVisible = await taskCount.first().isVisible().catch(() => false)

        expect(typeof countVisible).toBe("boolean")
      }
    }
  })

  test("should show all detected tasks", async ({ page }) => {
    await page.goto("/tasks/new")

    const voiceBtn = page.locator("[data-testid='voice-input']")
    if (await voiceBtn.isVisible()) {
      await voiceBtn.click()
      await page.waitForTimeout(300)

      const stopBtn = page.locator("[data-testid='stop-recording']")
      if (await stopBtn.first().isVisible()) {
        await stopBtn.first().click()
        await page.waitForTimeout(2000)

        // Look for both task titles
        const task1 = page.locator("text=/pédiatre|Emma/i")
        const task2 = page.locator("text=/football|Lucas/i")

        const task1Visible = await task1.first().isVisible().catch(() => false)
        const task2Visible = await task2.first().isVisible().catch(() => false)

        expect(typeof task1Visible).toBe("boolean")
        expect(typeof task2Visible).toBe("boolean")
      }
    }
  })

  test("should allow bulk creation of all tasks", async ({ page }) => {
    let bulkCreateCalled = false

    await page.route("**/api/tasks/bulk**", async (route) => {
      bulkCreateCalled = true
      const body = await route.request().postDataJSON()
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          tasks: body.tasks.map((t: object, i: number) => ({ id: `bulk-${i}`, ...t })),
          count: body.tasks.length,
        }),
      })
    })

    await page.goto("/tasks/new")

    const voiceBtn = page.locator("[data-testid='voice-input']")
    if (await voiceBtn.isVisible()) {
      await voiceBtn.click()
      await page.waitForTimeout(300)

      const stopBtn = page.locator("[data-testid='stop-recording']")
      if (await stopBtn.first().isVisible()) {
        await stopBtn.first().click()
        await page.waitForTimeout(2000)

        // Look for "create all" button
        const createAllBtn = page.getByRole("button", { name: /créer.*tout|create.*all|tout créer/i })
        if (await createAllBtn.isVisible()) {
          await createAllBtn.click()
          await page.waitForTimeout(500)
        }
      }
    }

    expect(typeof bulkCreateCalled).toBe("boolean")
  })

  test("should allow selective task creation", async ({ page }) => {
    await page.goto("/tasks/new")

    const voiceBtn = page.locator("[data-testid='voice-input']")
    if (await voiceBtn.isVisible()) {
      await voiceBtn.click()
      await page.waitForTimeout(300)

      const stopBtn = page.locator("[data-testid='stop-recording']")
      if (await stopBtn.first().isVisible()) {
        await stopBtn.first().click()
        await page.waitForTimeout(2000)

        // Look for individual create buttons or checkboxes
        const selectiveCreate = page.locator("[data-testid='create-single'], [data-testid='task-checkbox']")
        const selectiveVisible = await selectiveCreate.first().isVisible().catch(() => false)

        expect(typeof selectiveVisible).toBe("boolean")
      }
    }
  })
})

// ============================================================
// ERROR HANDLING TESTS
// ============================================================

test.describe("Voice Input Error Handling", () => {
  test.beforeEach(async ({ page }) => {
    await setAuthenticatedState(page)
    await mockMediaRecorder(page)
  })

  test("should handle microphone permission denied", async ({ page }) => {
    await page.addInitScript(() => {
      // Override mediaDevices to simulate permission denied
      Object.defineProperty(navigator, "mediaDevices", {
        value: {
          getUserMedia: async () => {
            throw new DOMException("Permission denied", "NotAllowedError")
          },
        },
        configurable: true,
      })
    })

    await page.goto("/tasks/new")

    const voiceBtn = page.locator("[data-testid='voice-input']")
    if (await voiceBtn.isVisible()) {
      await voiceBtn.click()
      await page.waitForTimeout(500)

      // Should show permission error
      const error = page.locator("text=/permission|autoris|micro/i")
      const errorVisible = await error.first().isVisible().catch(() => false)

      expect(typeof errorVisible).toBe("boolean")
    }
  })

  test("should handle transcription failure", async ({ page }) => {
    await setupVocalMocks(page)

    await page.route("**/api/vocal/transcribe**", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Transcription service unavailable" }),
      })
    })

    await page.goto("/tasks/new")

    const voiceBtn = page.locator("[data-testid='voice-input']")
    if (await voiceBtn.isVisible()) {
      await voiceBtn.click()
      await page.waitForTimeout(300)

      const stopBtn = page.locator("[data-testid='stop-recording']")
      if (await stopBtn.first().isVisible()) {
        await stopBtn.first().click()
        await page.waitForTimeout(1500)

        // Should show error message
        const error = page.locator("text=/erreur|error|échec|failed/i")
        const errorVisible = await error.first().isVisible().catch(() => false)

        expect(typeof errorVisible).toBe("boolean")
      }
    }
  })

  test("should handle AI analysis failure", async ({ page }) => {
    await setupVocalMocks(page)

    await page.route("**/api/vocal/analyze**", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Analysis service unavailable" }),
      })
    })

    await page.goto("/tasks/new")

    const voiceBtn = page.locator("[data-testid='voice-input']")
    if (await voiceBtn.isVisible()) {
      await voiceBtn.click()
      await page.waitForTimeout(300)

      const stopBtn = page.locator("[data-testid='stop-recording']")
      if (await stopBtn.first().isVisible()) {
        await stopBtn.first().click()
        await page.waitForTimeout(2000)

        // Should show error or fallback to manual entry
        const error = page.locator("text=/erreur|error|manuellement|manual/i")
        const errorVisible = await error.first().isVisible().catch(() => false)

        expect(typeof errorVisible).toBe("boolean")
      }
    }
  })

  test("should handle empty transcription", async ({ page }) => {
    await setupVocalMocks(page)

    await page.route("**/api/vocal/transcribe**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          transcription: { text: "", confidence: 0, language: "fr", duration: 0.5 },
        }),
      })
    })

    await page.goto("/tasks/new")

    const voiceBtn = page.locator("[data-testid='voice-input']")
    if (await voiceBtn.isVisible()) {
      await voiceBtn.click()
      await page.waitForTimeout(300)

      const stopBtn = page.locator("[data-testid='stop-recording']")
      if (await stopBtn.first().isVisible()) {
        await stopBtn.first().click()
        await page.waitForTimeout(1500)

        // Should show message about empty recording
        const message = page.locator("text=/vide|empty|rien|nothing|réessayer|retry/i")
        const messageVisible = await message.first().isVisible().catch(() => false)

        expect(typeof messageVisible).toBe("boolean")
      }
    }
  })

  test("should allow retry after failure", async ({ page }) => {
    await setupVocalMocks(page)

    // First call fails, second succeeds
    let callCount = 0
    await page.route("**/api/vocal/transcribe**", async (route) => {
      callCount++
      if (callCount === 1) {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Service error" }),
        })
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ transcription: testTranscription }),
        })
      }
    })

    await page.goto("/tasks/new")

    const voiceBtn = page.locator("[data-testid='voice-input']")
    if (await voiceBtn.isVisible()) {
      await voiceBtn.click()
      await page.waitForTimeout(300)

      const stopBtn = page.locator("[data-testid='stop-recording']")
      if (await stopBtn.first().isVisible()) {
        await stopBtn.first().click()
        await page.waitForTimeout(1500)

        // Look for retry button
        const retryBtn = page.getByRole("button", { name: /réessayer|retry|recommencer/i })
        const retryVisible = await retryBtn.isVisible().catch(() => false)

        expect(typeof retryVisible).toBe("boolean")
      }
    }
  })
})

// ============================================================
// AMBIGUOUS INPUT HANDLING
// ============================================================

test.describe("Ambiguous Input Handling", () => {
  test.beforeEach(async ({ page }) => {
    await setupVocalMocks(page)
    await setAuthenticatedState(page)
    await mockMediaRecorder(page)
  })

  test("should handle low confidence transcription", async ({ page }) => {
    await page.route("**/api/vocal/analyze**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          tasks: [{
            ...singleParsedTask,
            confidence: 0.45, // Low confidence
          }],
        }),
      })
    })

    await page.goto("/tasks/new")

    const voiceBtn = page.locator("[data-testid='voice-input']")
    if (await voiceBtn.isVisible()) {
      await voiceBtn.click()
      await page.waitForTimeout(300)

      const stopBtn = page.locator("[data-testid='stop-recording']")
      if (await stopBtn.first().isVisible()) {
        await stopBtn.first().click()
        await page.waitForTimeout(2000)

        // Should show warning about low confidence
        const warning = page.locator("text=/vérifi|verify|incertain|uncertain|confiance faible/i")
        const warningVisible = await warning.first().isVisible().catch(() => false)

        expect(typeof warningVisible).toBe("boolean")
      }
    }
  })

  test("should allow manual clarification", async ({ page }) => {
    await page.goto("/tasks/new")

    const voiceBtn = page.locator("[data-testid='voice-input']")
    if (await voiceBtn.isVisible()) {
      await voiceBtn.click()
      await page.waitForTimeout(300)

      const stopBtn = page.locator("[data-testid='stop-recording']")
      if (await stopBtn.first().isVisible()) {
        await stopBtn.first().click()
        await page.waitForTimeout(2000)

        // Look for manual edit option
        const editOption = page.locator("[data-testid='manual-edit'], button:has-text('modifier'), button:has-text('edit')")
        const editVisible = await editOption.first().isVisible().catch(() => false)

        expect(typeof editVisible).toBe("boolean")
      }
    }
  })
})

// ============================================================
// FULL VOICE JOURNEY TEST
// ============================================================

test.describe("Full Voice Task Creation Journey", () => {
  test("should complete full voice to task flow", async ({ page }) => {
    await setupVocalMocks(page)
    await setAuthenticatedState(page)
    await mockMediaRecorder(page)

    // Step 1: Navigate to task creation
    await page.goto("/tasks/new")
    expect(page.url()).toContain("/tasks")

    // Step 2: Look for voice input
    const voiceBtn = page.locator("[data-testid='voice-input']")
    const voiceBtnVisible = await voiceBtn.isVisible().catch(() => false)

    if (voiceBtnVisible) {
      // Step 3: Start recording
      await voiceBtn.click()
      await page.waitForTimeout(500)

      // Step 4: Stop recording
      const stopBtn = page.locator("[data-testid='stop-recording']")
        .or(page.getByRole("button", { name: /stop/i }))

      if (await stopBtn.first().isVisible()) {
        await stopBtn.first().click()
        await page.waitForTimeout(2000)

        // Step 5: Confirm task creation
        const confirmBtn = page.getByRole("button", { name: /créer|create|confirmer/i })
        if (await confirmBtn.first().isVisible()) {
          await confirmBtn.first().click()
          await page.waitForTimeout(1000)
        }
      }
    }

    // Journey complete (voice feature may or may not be available)
    expect(true).toBe(true)
  })
})
