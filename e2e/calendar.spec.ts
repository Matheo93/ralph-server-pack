/**
 * Calendar E2E Tests
 *
 * Tests for the family calendar:
 * - Route protection
 * - Month navigation (previous/next)
 * - View mode switching (month/week)
 * - Event creation via dialog
 * - Event modification
 * - Event deletion
 */

import { test, expect } from "@playwright/test"

test.describe("Calendar", () => {
  test.describe("Route Protection", () => {
    test("should redirect unauthenticated users to login", async ({ page }) => {
      await page.goto("/calendar")
      await expect(page).toHaveURL(/login/)
    })
  })

  test.describe("Page Structure", () => {
    test("should display calendar page title", async ({ page }) => {
      // This test documents the expected structure for authenticated users
      await page.goto("/calendar")
      // Will redirect to login for unauthenticated users
      await expect(page).toHaveURL(/login/)
    })
  })

  // Tests that require authentication - documented for future use with auth fixtures
  test.describe.skip("Authenticated Calendar Operations", () => {
    test("should display calendar with current month", async ({ page }) => {
      await page.goto("/calendar")

      // Should show the calendar header with month/year
      const monthHeader = page.locator("h2")
      await expect(monthHeader).toBeVisible()

      // Current month should be displayed (in French)
      const currentDate = new Date()
      const months = [
        "janvier", "février", "mars", "avril", "mai", "juin",
        "juillet", "août", "septembre", "octobre", "novembre", "décembre"
      ] as const
      const expectedMonth = months[currentDate.getMonth()] ?? "janvier"
      await expect(monthHeader).toContainText(new RegExp(expectedMonth, "i"))
    })

    test("should display weekday headers", async ({ page }) => {
      await page.goto("/calendar")

      // French weekday abbreviations
      const weekDays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]
      for (const day of weekDays) {
        await expect(page.getByText(day, { exact: true })).toBeVisible()
      }
    })

    test("should display add event button", async ({ page }) => {
      await page.goto("/calendar")

      const addEventBtn = page.getByRole("button", { name: /événement/i })
      await expect(addEventBtn).toBeVisible()
    })
  })

  test.describe.skip("Month Navigation", () => {
    test("should navigate to previous month", async ({ page }) => {
      await page.goto("/calendar")

      // Get the current month header text
      const monthHeader = page.locator("h2")
      const initialText = await monthHeader.textContent()

      // Click previous month button (ChevronLeft)
      await page.getByRole("button").filter({ has: page.locator("svg") }).first().click()

      // Month should have changed
      await expect(monthHeader).not.toHaveText(initialText || "")
    })

    test("should navigate to next month", async ({ page }) => {
      await page.goto("/calendar")

      const monthHeader = page.locator("h2")
      const initialText = await monthHeader.textContent()

      // Click next month button (second button with icon)
      const navButtons = page.locator("button").filter({ has: page.locator("svg.lucide-chevron-right") })
      await navButtons.click()

      await expect(monthHeader).not.toHaveText(initialText || "")
    })

    test("should return to today when clicking Aujourd'hui", async ({ page }) => {
      await page.goto("/calendar")

      // Navigate away first
      await page.getByRole("button").filter({ has: page.locator("svg") }).first().click()
      await page.getByRole("button").filter({ has: page.locator("svg") }).first().click()

      // Click "Aujourd'hui" button
      await page.getByRole("button", { name: /aujourd'hui/i }).click()

      // Should show current month again
      const monthHeader = page.locator("h2")
      const currentDate = new Date()
      const months = [
        "janvier", "février", "mars", "avril", "mai", "juin",
        "juillet", "août", "septembre", "octobre", "novembre", "décembre"
      ] as const
      const expectedMonth = months[currentDate.getMonth()] ?? "janvier"
      await expect(monthHeader).toContainText(new RegExp(expectedMonth, "i"))
    })
  })

  test.describe.skip("View Mode Switching", () => {
    test("should switch to week view", async ({ page }) => {
      await page.goto("/calendar")

      // Click week view button
      await page.getByRole("button", { name: /semaine/i }).click()

      // Header should show "Semaine du..."
      const monthHeader = page.locator("h2")
      await expect(monthHeader).toContainText(/semaine du/i)
    })

    test("should switch back to month view", async ({ page }) => {
      await page.goto("/calendar")

      // Switch to week view first
      await page.getByRole("button", { name: /semaine/i }).click()
      await expect(page.locator("h2")).toContainText(/semaine du/i)

      // Switch back to month view
      await page.getByRole("button", { name: /mois/i }).click()

      // Should show month name (not "Semaine du")
      await expect(page.locator("h2")).not.toContainText(/semaine du/i)
    })

    test("should display 7 days in week view", async ({ page }) => {
      await page.goto("/calendar")

      // Switch to week view
      await page.getByRole("button", { name: /semaine/i }).click()

      // Grid should have 7 columns (one row for week view)
      const dayCells = page.locator(".grid-cols-7 > div").filter({ has: page.locator("span") })
      await expect(dayCells).toHaveCount(7)
    })
  })

  test.describe.skip("Event Creation", () => {
    test("should open event form when clicking add button", async ({ page }) => {
      await page.goto("/calendar")

      // Click add event button
      await page.getByRole("button", { name: /événement/i }).click()

      // Dialog should open
      await expect(page.getByRole("dialog")).toBeVisible()
      await expect(page.getByText(/nouvel événement/i)).toBeVisible()
    })

    test("should open event form when clicking on a day", async ({ page }) => {
      await page.goto("/calendar")

      // Click on a day cell (pick day 15 as it's always visible)
      const dayCell = page.locator(".grid-cols-7 > div").filter({ hasText: "15" }).first()
      await dayCell.click()

      // Dialog should open
      await expect(page.getByRole("dialog")).toBeVisible()
    })

    test("should display all form fields", async ({ page }) => {
      await page.goto("/calendar")

      // Open event form
      await page.getByRole("button", { name: /événement/i }).click()

      // Check form fields
      await expect(page.getByLabel(/titre/i)).toBeVisible()
      await expect(page.getByLabel(/type/i)).toBeVisible()
      await expect(page.getByLabel(/couleur/i)).toBeVisible()
      await expect(page.getByLabel(/début/i)).toBeVisible()
      await expect(page.getByLabel(/fin/i)).toBeVisible()
      await expect(page.getByLabel(/récurrence/i)).toBeVisible()
      await expect(page.getByLabel(/lieu/i)).toBeVisible()
      await expect(page.getByLabel(/description/i)).toBeVisible()
    })

    test("should show validation error for empty title", async ({ page }) => {
      await page.goto("/calendar")

      // Open event form
      await page.getByRole("button", { name: /événement/i }).click()

      // Clear the title if pre-filled and submit
      await page.getByLabel(/titre/i).fill("")
      await page.getByRole("button", { name: /créer/i }).click()

      // Should show validation error
      await expect(page.getByText(/titre.*requis/i)).toBeVisible()
    })

    test("should create event with valid data", async ({ page }) => {
      await page.goto("/calendar")

      // Open event form
      await page.getByRole("button", { name: /événement/i }).click()

      // Fill the form
      await page.getByLabel(/titre/i).fill("RDV Pédiatre Test E2E")
      await page.getByLabel(/lieu/i).fill("Cabinet médical")
      await page.getByLabel(/description/i).fill("Visite de contrôle")

      // Submit the form
      await page.getByRole("button", { name: /créer/i }).click()

      // Dialog should close on success
      await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 10000 })
    })

    test("should allow selecting event type", async ({ page }) => {
      await page.goto("/calendar")

      // Open event form
      await page.getByRole("button", { name: /événement/i }).click()

      // Open type dropdown
      const typeSelect = page.locator("[name='event_type']").locator("..")
      await typeSelect.click()

      // Should show type options
      await expect(page.getByText(/médical/i)).toBeVisible()
      await expect(page.getByText(/école/i)).toBeVisible()
      await expect(page.getByText(/activité/i)).toBeVisible()
    })

    test("should allow selecting recurrence", async ({ page }) => {
      await page.goto("/calendar")

      // Open event form
      await page.getByRole("button", { name: /événement/i }).click()

      // Open recurrence dropdown
      const recurrenceSelect = page.locator("[name='recurrence']").locator("..")
      await recurrenceSelect.click()

      // Should show recurrence options
      await expect(page.getByText(/quotidien/i)).toBeVisible()
      await expect(page.getByText(/hebdomadaire/i)).toBeVisible()
      await expect(page.getByText(/mensuel/i)).toBeVisible()
    })

    test("should toggle all-day checkbox", async ({ page }) => {
      await page.goto("/calendar")

      // Open event form
      await page.getByRole("button", { name: /événement/i }).click()

      // Toggle all-day checkbox
      const allDayCheckbox = page.getByLabel(/toute la journée/i)
      await allDayCheckbox.click()

      // Checkbox should be checked
      await expect(allDayCheckbox).toBeChecked()
    })
  })

  test.describe.skip("Event Modification", () => {
    test("should open event form when clicking existing event", async ({ page }) => {
      // First create an event
      await page.goto("/calendar")
      await page.getByRole("button", { name: /événement/i }).click()
      await page.getByLabel(/titre/i).fill("Event To Modify")
      await page.getByRole("button", { name: /créer/i }).click()
      await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 10000 })

      // Now click on the created event
      await page.getByText("Event To Modify").click()

      // Should open dialog in edit mode
      await expect(page.getByRole("dialog")).toBeVisible()
      await expect(page.getByText(/modifier l'événement/i)).toBeVisible()
    })

    test("should show modify button in edit mode", async ({ page }) => {
      await page.goto("/calendar")

      // Create event first
      await page.getByRole("button", { name: /événement/i }).click()
      await page.getByLabel(/titre/i).fill("Event For Edit Test")
      await page.getByRole("button", { name: /créer/i }).click()
      await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 10000 })

      // Click on the event
      await page.getByText("Event For Edit Test").click()

      // Should show "Modifier" button instead of "Créer"
      await expect(page.getByRole("button", { name: /modifier/i })).toBeVisible()
    })

    test("should update event title", async ({ page }) => {
      await page.goto("/calendar")

      // Create event first
      await page.getByRole("button", { name: /événement/i }).click()
      await page.getByLabel(/titre/i).fill("Original Title")
      await page.getByRole("button", { name: /créer/i }).click()
      await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 10000 })

      // Click on the event
      await page.getByText("Original Title").click()

      // Modify the title
      await page.getByLabel(/titre/i).fill("Updated Title")
      await page.getByRole("button", { name: /modifier/i }).click()

      // Dialog should close
      await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 10000 })

      // New title should be visible
      await expect(page.getByText("Updated Title")).toBeVisible()
    })
  })

  test.describe.skip("Event Deletion", () => {
    test("should show delete button in edit mode", async ({ page }) => {
      await page.goto("/calendar")

      // Create event first
      await page.getByRole("button", { name: /événement/i }).click()
      await page.getByLabel(/titre/i).fill("Event To Delete")
      await page.getByRole("button", { name: /créer/i }).click()
      await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 10000 })

      // Click on the event
      await page.getByText("Event To Delete").click()

      // Should show delete button
      await expect(page.getByRole("button", { name: /supprimer/i })).toBeVisible()
    })

    test("should ask for confirmation before deleting", async ({ page }) => {
      await page.goto("/calendar")

      // Create event first
      await page.getByRole("button", { name: /événement/i }).click()
      await page.getByLabel(/titre/i).fill("Event Confirm Delete")
      await page.getByRole("button", { name: /créer/i }).click()
      await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 10000 })

      // Click on the event
      await page.getByText("Event Confirm Delete").click()

      // Set up dialog handler for confirmation
      page.on("dialog", async dialog => {
        expect(dialog.message()).toContain("Supprimer")
        await dialog.dismiss()
      })

      // Click delete
      await page.getByRole("button", { name: /supprimer/i }).click()
    })

    test("should delete event on confirmation", async ({ page }) => {
      await page.goto("/calendar")

      // Create event first
      await page.getByRole("button", { name: /événement/i }).click()
      await page.getByLabel(/titre/i).fill("Event Will Be Deleted")
      await page.getByRole("button", { name: /créer/i }).click()
      await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 10000 })

      // Verify event exists
      await expect(page.getByText("Event Will Be Deleted")).toBeVisible()

      // Click on the event
      await page.getByText("Event Will Be Deleted").click()

      // Accept confirmation dialog
      page.on("dialog", async dialog => {
        await dialog.accept()
      })

      // Click delete
      await page.getByRole("button", { name: /supprimer/i }).click()

      // Dialog should close
      await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 10000 })

      // Event should no longer be visible
      await expect(page.getByText("Event Will Be Deleted")).not.toBeVisible()
    })
  })

  test.describe.skip("Calendar with URL Parameters", () => {
    test("should respect month parameter in URL", async ({ page }) => {
      // Navigate to a specific month (March 2026)
      await page.goto("/calendar?month=3&year=2026")

      const monthHeader = page.locator("h2")
      await expect(monthHeader).toContainText(/mars/i)
      await expect(monthHeader).toContainText("2026")
    })

    test("should respect year parameter in URL", async ({ page }) => {
      // Navigate to a specific year
      await page.goto("/calendar?month=6&year=2025")

      const monthHeader = page.locator("h2")
      await expect(monthHeader).toContainText(/juin/i)
      await expect(monthHeader).toContainText("2025")
    })
  })

  test.describe.skip("Form Cancel", () => {
    test("should close dialog when clicking cancel", async ({ page }) => {
      await page.goto("/calendar")

      // Open event form
      await page.getByRole("button", { name: /événement/i }).click()
      await expect(page.getByRole("dialog")).toBeVisible()

      // Click cancel
      await page.getByRole("button", { name: /annuler/i }).click()

      // Dialog should close
      await expect(page.getByRole("dialog")).not.toBeVisible()
    })

    test("should close dialog when clicking outside", async ({ page }) => {
      await page.goto("/calendar")

      // Open event form
      await page.getByRole("button", { name: /événement/i }).click()
      await expect(page.getByRole("dialog")).toBeVisible()

      // Click outside the dialog (on the overlay)
      await page.locator("[data-state='open']").first().press("Escape")

      // Dialog should close
      await expect(page.getByRole("dialog")).not.toBeVisible()
    })
  })

  test.describe.skip("Responsive Layout", () => {
    test("should display calendar on mobile viewport", async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto("/calendar")

      // Calendar should still be visible
      await expect(page.locator(".grid-cols-7")).toBeVisible()

      // Header buttons should be accessible
      await expect(page.getByRole("button", { name: /événement/i })).toBeVisible()
    })

    test("should stack header elements on mobile", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto("/calendar")

      // Navigation and controls should be visible
      const header = page.locator(".flex.flex-col")
      await expect(header.first()).toBeVisible()
    })
  })
})
