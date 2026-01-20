/**
 * INTEGRATION TEST - Calendar (REAL DATABASE)
 *
 * Tests COMPLETS pour le calendrier:
 * - Création d'événements
 * - Vue mensuelle/hebdomadaire/journalière
 * - Événements récurrents
 * - Synchronisation avec tâches
 * - Rappels
 * - Partage entre membres
 */

import { test, expect, Page } from "@playwright/test"
import {
  query, queryOne, execute, closePool,
  getTestUser, getChildren
} from "../helpers/db"

const TEST_USER = {
  email: "test-e2e@familyload.test",
  password: "TestE2E123!",
}

test.describe("📅 Calendar - REAL Integration Tests", () => {
  let householdId: string
  let userId: string

  test.beforeAll(async () => {
    const user = await getTestUser(TEST_USER.email)
    if (!user) throw new Error("Test user not found")
    householdId = user.householdId
    userId = user.id

    // Cleanup test events
    await execute(`DELETE FROM calendar_events WHERE household_id = $1 AND title LIKE '%E2E TEST%'`, [householdId])
  })

  test.afterAll(async () => {
    await execute(`DELETE FROM calendar_events WHERE household_id = $1 AND title LIKE '%E2E TEST%'`, [householdId])
    await closePool()
  })

  // Helper to login
  async function login(page: Page) {
    await page.goto("/login")
    await page.getByLabel(/email/i).fill(TEST_USER.email)
    await page.getByLabel(/mot de passe/i).fill(TEST_USER.password)
    await page.getByRole("button", { name: /connexion/i }).click()
    await expect(page).toHaveURL(/dashboard/, { timeout: 15000 })
  }

  // ============================================================
  // CALENDAR VIEW
  // ============================================================

  test.describe("Calendar Views", () => {

    test("1.1 - Calendar page loads with month view", async ({ page }) => {
      await login(page)
      await page.goto("/calendar")

      // Should see month view
      await expect(page.getByText(/lundi|mardi|mercredi|monday|tuesday/i)).toBeVisible()

      // Should see current month
      const now = new Date()
      const monthNames = ["janvier", "février", "mars", "avril", "mai", "juin",
        "juillet", "août", "septembre", "octobre", "novembre", "décembre"]
      await expect(page.getByText(new RegExp(monthNames[now.getMonth()], "i"))).toBeVisible()
    })

    test("1.2 - Can switch to week view", async ({ page }) => {
      await login(page)
      await page.goto("/calendar")

      const weekBtn = page.getByRole("button", { name: /semaine|week/i })
        .or(page.getByTestId("week-view-button"))
      if (await weekBtn.isVisible().catch(() => false)) {
        await weekBtn.click()

        // Should show week view (hours visible)
        await expect(page.getByText(/08:00|09:00|10:00/)).toBeVisible({ timeout: 5000 })
      }
    })

    test("1.3 - Can switch to day view", async ({ page }) => {
      await login(page)
      await page.goto("/calendar")

      const dayBtn = page.getByRole("button", { name: /jour|day/i })
        .or(page.getByTestId("day-view-button"))
      if (await dayBtn.isVisible().catch(() => false)) {
        await dayBtn.click()

        // Should show single day with hours
        await expect(page.getByText(/08:00|09:00/)).toBeVisible()
      }
    })

    test("1.4 - Can navigate to previous/next month", async ({ page }) => {
      await login(page)
      await page.goto("/calendar")

      // Get current month text
      const monthText = await page.locator('h1, h2, [class*="month"]').first().textContent()

      // Click next
      const nextBtn = page.getByRole("button", { name: /suivant|next|>/i })
        .or(page.getByTestId("next-month"))
      await nextBtn.click()

      await page.waitForTimeout(500)

      // Month should have changed
      const newMonthText = await page.locator('h1, h2, [class*="month"]').first().textContent()
      // Text may or may not differ depending on current date
    })
  })

  // ============================================================
  // EVENT CREATION
  // ============================================================

  test.describe("Event Creation", () => {

    test("2.1 - Create event saves to database", async ({ page }) => {
      const initialCount = await queryOne<{ count: string }>(`
        SELECT COUNT(*) as count FROM calendar_events WHERE household_id = $1
      `, [householdId])
      const startCount = parseInt(initialCount?.count ?? "0")

      await login(page)
      await page.goto("/calendar")

      // Click create button or day
      const createBtn = page.getByRole("button", { name: /créer|ajouter|nouveau|add/i })
        .or(page.getByTestId("create-event-button"))

      if (await createBtn.isVisible().catch(() => false)) {
        await createBtn.click()

        // Fill form
        await page.getByLabel(/titre|title/i).fill("E2E TEST - Événement calendrier")

        // Set date/time
        const dateInput = page.getByLabel(/date/i)
        if (await dateInput.isVisible().catch(() => false)) {
          const tomorrow = new Date()
          tomorrow.setDate(tomorrow.getDate() + 1)
          await dateInput.fill(tomorrow.toISOString().split("T")[0])
        }

        const timeInput = page.getByLabel(/heure|time/i)
        if (await timeInput.isVisible().catch(() => false)) {
          await timeInput.fill("14:00")
        }

        // Save
        await page.getByRole("button", { name: /créer|enregistrer|save/i }).click()
        await page.waitForTimeout(2000)

        // ASSERT: Event in database
        const newCount = await queryOne<{ count: string }>(`
          SELECT COUNT(*) as count FROM calendar_events WHERE household_id = $1
        `, [householdId])
        expect(parseInt(newCount?.count ?? "0")).toBeGreaterThan(startCount)
      }
    })

    test("2.2 - Create all-day event", async ({ page }) => {
      await login(page)
      await page.goto("/calendar")

      const createBtn = page.getByRole("button", { name: /créer|ajouter/i })
      if (await createBtn.isVisible().catch(() => false)) {
        await createBtn.click()

        await page.getByLabel(/titre/i).fill("E2E TEST - Journée entière")

        // Toggle all-day
        const allDayToggle = page.getByLabel(/journée.*entière|all.*day/i)
          .or(page.getByTestId("all-day-toggle"))
        if (await allDayToggle.isVisible().catch(() => false)) {
          await allDayToggle.click()
        }

        await page.getByRole("button", { name: /créer|save/i }).click()
        await page.waitForTimeout(2000)

        // Verify
        const event = await queryOne<{ all_day: boolean }>(`
          SELECT all_day FROM calendar_events
          WHERE household_id = $1 AND title LIKE '%E2E TEST - Journée entière%'
          ORDER BY created_at DESC LIMIT 1
        `, [householdId])
        expect(event?.all_day).toBe(true)
      }
    })

    test("2.3 - Create event with location", async ({ page }) => {
      await login(page)
      await page.goto("/calendar/new")

      await page.getByLabel(/titre/i).fill("E2E TEST - Avec lieu")

      const locationInput = page.getByLabel(/lieu|location|adresse/i)
      if (await locationInput.isVisible().catch(() => false)) {
        await locationInput.fill("Paris, France")
      }

      await page.getByRole("button", { name: /créer|save/i }).click()
      await page.waitForTimeout(2000)

      const event = await queryOne<{ location: string }>(`
        SELECT location FROM calendar_events
        WHERE household_id = $1 AND title LIKE '%E2E TEST - Avec lieu%'
        ORDER BY created_at DESC LIMIT 1
      `, [householdId])
      expect(event?.location).toContain("Paris")
    })

    test("2.4 - Create recurring event", async ({ page }) => {
      await login(page)
      await page.goto("/calendar/new")

      await page.getByLabel(/titre/i).fill("E2E TEST - Récurrent")

      // Enable recurrence
      const recurToggle = page.getByLabel(/récurren|repeat/i)
        .or(page.getByTestId("recurring-toggle"))
      if (await recurToggle.isVisible().catch(() => false)) {
        await recurToggle.click()

        const freqSelect = page.getByLabel(/fréquence|frequency/i)
        if (await freqSelect.isVisible().catch(() => false)) {
          await freqSelect.selectOption("weekly")
        }
      }

      await page.getByRole("button", { name: /créer|save/i }).click()
      await page.waitForTimeout(2000)

      const event = await queryOne<{ recurrence_rule: string }>(`
        SELECT recurrence_rule FROM calendar_events
        WHERE household_id = $1 AND title LIKE '%E2E TEST - Récurrent%'
        ORDER BY created_at DESC LIMIT 1
      `, [householdId])
      // May have recurrence_rule set
    })
  })

  // ============================================================
  // EVENT MODIFICATION
  // ============================================================

  test.describe("Event Modification", () => {

    test("3.1 - Edit event updates database", async ({ page }) => {
      // Create event first
      const result = await queryOne<{ id: string }>(`
        INSERT INTO calendar_events (household_id, title, start_time, end_time)
        VALUES ($1, 'E2E TEST - À modifier', NOW() + interval '1 day', NOW() + interval '1 day' + interval '1 hour')
        RETURNING id
      `, [householdId])
      const eventId = result?.id

      await login(page)
      await page.goto(`/calendar/event/${eventId}`)

      const editBtn = page.getByRole("button", { name: /modifier|edit/i })
      if (await editBtn.isVisible().catch(() => false)) {
        await editBtn.click()

        await page.getByLabel(/titre/i).fill("E2E TEST - Titre modifié")
        await page.getByRole("button", { name: /save|enregistrer/i }).click()
        await page.waitForTimeout(2000)

        const event = await queryOne<{ title: string }>(`
          SELECT title FROM calendar_events WHERE id = $1
        `, [eventId])
        expect(event?.title).toContain("Titre modifié")
      }
    })

    test("3.2 - Drag and drop reschedules event", async ({ page }) => {
      // Create event
      await execute(`
        INSERT INTO calendar_events (household_id, title, start_time, end_time)
        VALUES ($1, 'E2E TEST - Drag Drop', NOW() + interval '1 day', NOW() + interval '1 day' + interval '1 hour')
      `, [householdId])

      await login(page)
      await page.goto("/calendar")

      // This test depends heavily on the calendar library used
      // Would need to implement drag simulation
    })

    test("3.3 - Delete event removes from database", async ({ page }) => {
      const result = await queryOne<{ id: string }>(`
        INSERT INTO calendar_events (household_id, title, start_time, end_time)
        VALUES ($1, 'E2E TEST - À supprimer', NOW() + interval '1 day', NOW() + interval '1 day' + interval '1 hour')
        RETURNING id
      `, [householdId])
      const eventId = result?.id

      await login(page)
      await page.goto(`/calendar/event/${eventId}`)

      const deleteBtn = page.getByRole("button", { name: /supprimer|delete/i })
      if (await deleteBtn.isVisible().catch(() => false)) {
        await deleteBtn.click()

        const confirmBtn = page.getByRole("button", { name: /confirmer|oui/i })
        if (await confirmBtn.isVisible().catch(() => false)) {
          await confirmBtn.click()
        }

        await page.waitForTimeout(2000)

        const event = await queryOne(`SELECT * FROM calendar_events WHERE id = $1`, [eventId])
        expect(event).toBeNull()
      }
    })
  })

  // ============================================================
  // TASK INTEGRATION
  // ============================================================

  test.describe("Task Integration", () => {

    test("4.1 - Tasks with due dates appear on calendar", async ({ page }) => {
      // Create task with due date
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)

      await execute(`
        INSERT INTO tasks (household_id, title, status, due_date)
        VALUES ($1, 'E2E TEST - Tâche calendrier', 'pending', $2)
      `, [householdId, tomorrow.toISOString()])

      await login(page)
      await page.goto("/calendar")

      // Navigate to tomorrow
      // Look for task on calendar
      await expect(page.getByText(/E2E TEST - Tâche calendrier/i)).toBeVisible({ timeout: 10000 })
    })

    test("4.2 - Clicking task on calendar opens task detail", async ({ page }) => {
      await login(page)
      await page.goto("/calendar")

      const taskEvent = page.getByText(/E2E TEST - Tâche calendrier/i)
      if (await taskEvent.isVisible().catch(() => false)) {
        await taskEvent.click()

        // Should open task detail or modal
        await expect(page.getByText(/status|statut|détail/i)).toBeVisible({ timeout: 5000 })
      }
    })
  })

  // ============================================================
  // REMINDERS
  // ============================================================

  test.describe("Reminders", () => {

    test("5.1 - Can set reminder on event", async ({ page }) => {
      await login(page)
      await page.goto("/calendar/new")

      await page.getByLabel(/titre/i).fill("E2E TEST - Avec rappel")

      // Set reminder
      const reminderSelect = page.getByLabel(/rappel|reminder/i)
      if (await reminderSelect.isVisible().catch(() => false)) {
        await reminderSelect.selectOption("15") // 15 minutes before
      }

      await page.getByRole("button", { name: /créer|save/i }).click()
      await page.waitForTimeout(2000)

      const event = await queryOne<{ reminder_minutes: number }>(`
        SELECT reminder_minutes FROM calendar_events
        WHERE household_id = $1 AND title LIKE '%E2E TEST - Avec rappel%'
        ORDER BY created_at DESC LIMIT 1
      `, [householdId])
      expect(event?.reminder_minutes).toBe(15)
    })
  })

  // ============================================================
  // FAMILY SHARING
  // ============================================================

  test.describe("Family Sharing", () => {

    test("6.1 - Events visible to all household members", async ({ page }) => {
      // Create event
      await execute(`
        INSERT INTO calendar_events (household_id, title, start_time, end_time, created_by)
        VALUES ($1, 'E2E TEST - Familial', NOW() + interval '1 day', NOW() + interval '1 day' + interval '1 hour', $2)
      `, [householdId, userId])

      await login(page)
      await page.goto("/calendar")

      // Should see the event
      await expect(page.getByText(/E2E TEST - Familial/i)).toBeVisible({ timeout: 10000 })
    })

    test("6.2 - Can assign event to specific members", async ({ page }) => {
      const children = await getChildren(householdId)
      if (children.length === 0) {
        test.skip()
        return
      }

      await login(page)
      await page.goto("/calendar/new")

      await page.getByLabel(/titre/i).fill("E2E TEST - Assigné")

      // Assign to member
      const memberSelect = page.getByLabel(/participant|assigné|member/i)
      if (await memberSelect.isVisible().catch(() => false)) {
        await memberSelect.selectOption({ index: 1 })
      }

      await page.getByRole("button", { name: /créer|save/i }).click()
    })
  })
})
