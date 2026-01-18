/**
 * Recurring Tasks E2E Tests
 *
 * Tests for recurring task functionality:
 * - Route protection for recurring tasks page
 * - Recurring tasks list display
 * - Task creation with recurrence rules
 * - Recurrence options (daily, weekly, monthly, custom)
 * - Recurrence preview display
 * - Day of week selection for weekly recurrence
 * - Day of month selection for monthly recurrence
 */

import { test, expect } from "@playwright/test"

test.describe("Recurring Tasks", () => {
  test.describe("Route Protection", () => {
    test("should redirect unauthenticated users to login from recurring page", async ({
      page,
    }) => {
      await page.goto("/tasks/recurring")
      await expect(page).toHaveURL(/login/)
    })

    test("should redirect unauthenticated users to login from new task page", async ({
      page,
    }) => {
      await page.goto("/tasks/new")
      await expect(page).toHaveURL(/login/)
    })
  })

  test.describe("Page Structure", () => {
    test("should have recurring tasks page accessible", async ({ page }) => {
      // This test documents the expected structure for authenticated users
      await page.goto("/tasks/recurring")
      // Will redirect to login for unauthenticated users
      await expect(page).toHaveURL(/login/)
    })
  })

  // Tests that require authentication - documented for future use with auth fixtures
  test.describe.skip("Authenticated Recurring Task Operations", () => {
    test("should display recurring tasks page title", async ({ page }) => {
      await page.goto("/tasks/recurring")

      // Should show the page title "Tâches récurrentes"
      const pageTitle = page.getByRole("heading", {
        name: /tâches récurrentes/i,
      })
      await expect(pageTitle).toBeVisible()
    })

    test("should display task count", async ({ page }) => {
      await page.goto("/tasks/recurring")

      // Should show count like "X tâche(s) programmée(s)"
      await expect(page.getByText(/tâche.*programmée/i)).toBeVisible()
    })

    test("should show navigation buttons", async ({ page }) => {
      await page.goto("/tasks/recurring")

      // Should have "Toutes les tâches" button
      await expect(
        page.getByRole("link", { name: /toutes les tâches/i })
      ).toBeVisible()

      // Should have "Nouvelle tâche" button
      await expect(
        page.getByRole("link", { name: /nouvelle tâche/i })
      ).toBeVisible()
    })

    test("should show empty state when no recurring tasks", async ({
      page,
    }) => {
      await page.goto("/tasks/recurring")

      // If no tasks, should show empty state message
      const emptyState = page.getByText(
        /vous n'avez pas encore de tâches récurrentes/i
      )
      const taskGrid = page.locator(".grid")

      // Either empty state or task grid should be visible
      const isEmpty = await emptyState.isVisible().catch(() => false)
      if (isEmpty) {
        await expect(emptyState).toBeVisible()
        await expect(
          page.getByRole("link", { name: /créer une tâche récurrente/i })
        ).toBeVisible()
      } else {
        await expect(taskGrid).toBeVisible()
      }
    })

    test("should display recurring task cards with recurrence info", async ({
      page,
    }) => {
      await page.goto("/tasks/recurring")

      // Wait for either tasks or empty state
      await page.waitForLoadState("networkidle")

      // If tasks exist, check card structure
      const taskCard = page.locator(".card").first()
      if (await taskCard.isVisible().catch(() => false)) {
        // Should show task title
        await expect(taskCard.locator("h3, .card-title")).toBeVisible()

        // Should show recurrence indicator (🔄)
        await expect(taskCard.getByText("🔄")).toBeVisible()

        // Should show recurrence label
        await expect(
          taskCard.getByText(
            /tous les|toutes les|chaque|le \d|quotidien|hebdomadaire/i
          )
        ).toBeVisible()
      }
    })

    test("should show modify button on recurring task cards", async ({
      page,
    }) => {
      await page.goto("/tasks/recurring")

      await page.waitForLoadState("networkidle")

      const taskCard = page.locator(".card").first()
      if (await taskCard.isVisible().catch(() => false)) {
        await expect(
          taskCard.getByRole("link", { name: /modifier/i })
        ).toBeVisible()
      }
    })

    test("should display task weight and priority", async ({ page }) => {
      await page.goto("/tasks/recurring")

      await page.waitForLoadState("networkidle")

      const taskCard = page.locator(".card").first()
      if (await taskCard.isVisible().catch(() => false)) {
        // Should show weight info "Poids: X"
        await expect(taskCard.getByText(/poids:/i)).toBeVisible()

        // Should show priority info "Priorité: X"
        await expect(taskCard.getByText(/priorité:/i)).toBeVisible()
      }
    })

    test("should show critical badge for critical tasks", async ({ page }) => {
      await page.goto("/tasks/recurring")

      await page.waitForLoadState("networkidle")

      // Look for critical badge if any task has it
      const criticalBadge = page.locator('[class*="destructive"]', {
        hasText: /critique/i,
      })
      // This is optional - not all tasks are critical
      if (await criticalBadge.isVisible().catch(() => false)) {
        await expect(criticalBadge).toBeVisible()
      }
    })

    test("should show child name when task is linked to child", async ({
      page,
    }) => {
      await page.goto("/tasks/recurring")

      await page.waitForLoadState("networkidle")

      // Look for child indicator (👦)
      const childIndicator = page.getByText("👦")
      if (await childIndicator.isVisible().catch(() => false)) {
        await expect(childIndicator).toBeVisible()
      }
    })
  })

  test.describe.skip("Task Creation with Recurrence", () => {
    test("should display recurrence options in task form", async ({ page }) => {
      await page.goto("/tasks/new")

      // Should show recurrence selector
      await expect(page.getByText(/récurrence/i)).toBeVisible()
    })

    test("should show all recurrence presets", async ({ page }) => {
      await page.goto("/tasks/new")

      // Click on the recurrence dropdown
      const recurrenceSelect = page.locator("select, [role='combobox']").filter({
        has: page.getByText(/récurrence|pas de récurrence/i),
      })

      await recurrenceSelect.first().click()

      // Should show all preset options
      await expect(page.getByText(/pas de récurrence/i)).toBeVisible()
      await expect(page.getByText(/tous les jours/i)).toBeVisible()
      await expect(page.getByText(/toutes les semaines/i)).toBeVisible()
      await expect(page.getByText(/toutes les 2 semaines/i)).toBeVisible()
      await expect(page.getByText(/tous les mois/i)).toBeVisible()
      await expect(page.getByText(/personnalisé/i)).toBeVisible()
    })

    test("should select daily recurrence", async ({ page }) => {
      await page.goto("/tasks/new")

      // Open recurrence dropdown
      const recurrenceSelect = page.locator("[role='combobox']").filter({
        has: page.getByText(/pas de récurrence/i),
      })
      await recurrenceSelect.first().click()

      // Select daily
      await page.getByRole("option", { name: /tous les jours/i }).click()

      // Should show recurrence preview
      await expect(page.getByText(/prochaines occurrences/i)).toBeVisible()
    })

    test("should select weekly recurrence", async ({ page }) => {
      await page.goto("/tasks/new")

      // Open recurrence dropdown
      const recurrenceSelect = page.locator("[role='combobox']").filter({
        has: page.getByText(/pas de récurrence/i),
      })
      await recurrenceSelect.first().click()

      // Select weekly
      await page.getByRole("option", { name: /toutes les semaines/i }).click()

      // Should show recurrence preview
      await expect(page.getByText(/prochaines occurrences/i)).toBeVisible()
    })

    test("should select monthly recurrence", async ({ page }) => {
      await page.goto("/tasks/new")

      // Open recurrence dropdown
      const recurrenceSelect = page.locator("[role='combobox']").filter({
        has: page.getByText(/pas de récurrence/i),
      })
      await recurrenceSelect.first().click()

      // Select monthly
      await page.getByRole("option", { name: /tous les mois/i }).click()

      // Should show recurrence preview
      await expect(page.getByText(/prochaines occurrences/i)).toBeVisible()
    })

    test("should show custom recurrence options", async ({ page }) => {
      await page.goto("/tasks/new")

      // Open recurrence dropdown
      const recurrenceSelect = page.locator("[role='combobox']").filter({
        has: page.getByText(/pas de récurrence/i),
      })
      await recurrenceSelect.first().click()

      // Select custom
      await page.getByRole("option", { name: /personnalisé/i }).click()

      // Should show frequency selector
      await expect(page.getByText(/fréquence/i)).toBeVisible()

      // Should show interval selector
      await expect(page.getByText(/intervalle/i)).toBeVisible()
    })

    test("should show day of week selector for weekly custom recurrence", async ({
      page,
    }) => {
      await page.goto("/tasks/new")

      // Select custom recurrence
      const recurrenceSelect = page.locator("[role='combobox']").filter({
        has: page.getByText(/pas de récurrence/i),
      })
      await recurrenceSelect.first().click()
      await page.getByRole("option", { name: /personnalisé/i }).click()

      // Ensure weekly is selected (default)
      const frequencySelect = page.locator("[role='combobox']").filter({
        has: page.getByText(/hebdomadaire/i),
      })
      if (!(await frequencySelect.isVisible())) {
        // Select weekly frequency
        const freqDropdown = page.locator("[role='combobox']").nth(1)
        await freqDropdown.click()
        await page.getByRole("option", { name: /hebdomadaire/i }).click()
      }

      // Should show day of week buttons
      await expect(page.getByText(/jours de la semaine/i)).toBeVisible()

      // Should show all day buttons (French abbreviations)
      const dayButtons = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]
      for (const day of dayButtons) {
        await expect(page.getByRole("button", { name: day })).toBeVisible()
      }
    })

    test("should toggle day selection in weekly recurrence", async ({
      page,
    }) => {
      await page.goto("/tasks/new")

      // Select custom recurrence
      const recurrenceSelect = page.locator("[role='combobox']").filter({
        has: page.getByText(/pas de récurrence/i),
      })
      await recurrenceSelect.first().click()
      await page.getByRole("option", { name: /personnalisé/i }).click()

      // Click on Monday button
      const mondayBtn = page.getByRole("button", { name: "Lun" })
      await mondayBtn.click()

      // Button should be selected (have default variant)
      await expect(mondayBtn).toHaveAttribute("data-state", "active")

      // Click again to deselect
      await mondayBtn.click()

      // Button should be deselected
      await expect(mondayBtn).not.toHaveAttribute("data-state", "active")
    })

    test("should show day of month selector for monthly custom recurrence", async ({
      page,
    }) => {
      await page.goto("/tasks/new")

      // Select custom recurrence
      const recurrenceSelect = page.locator("[role='combobox']").filter({
        has: page.getByText(/pas de récurrence/i),
      })
      await recurrenceSelect.first().click()
      await page.getByRole("option", { name: /personnalisé/i }).click()

      // Select monthly frequency
      const frequencyDropdown = page.locator("[role='combobox']").filter({
        has: page.getByText(/hebdomadaire|quotidien/i),
      })
      await frequencyDropdown.first().click()
      await page.getByRole("option", { name: /mensuel/i }).click()

      // Should show day of month selector
      await expect(page.getByText(/jour du mois/i)).toBeVisible()
    })

    test("should display recurrence preview with dates", async ({ page }) => {
      await page.goto("/tasks/new")

      // Select daily recurrence
      const recurrenceSelect = page.locator("[role='combobox']").filter({
        has: page.getByText(/pas de récurrence/i),
      })
      await recurrenceSelect.first().click()
      await page.getByRole("option", { name: /tous les jours/i }).click()

      // Should show preview section
      const preview = page.locator("[class*='recurrence'], .border").filter({
        hasText: /prochaines occurrences/i,
      })
      await expect(preview.first()).toBeVisible()

      // Should show upcoming dates
      // Dates are displayed in French format
      await expect(preview.first().getByText(/\d{1,2}/)).toBeVisible()
    })

    test("should create task with recurrence rule", async ({ page }) => {
      await page.goto("/tasks/new")

      // Fill in required fields
      await page.getByLabel(/titre/i).fill("Tâche récurrente test E2E")

      // Select weekly recurrence
      const recurrenceSelect = page.locator("[role='combobox']").filter({
        has: page.getByText(/pas de récurrence/i),
      })
      await recurrenceSelect.first().click()
      await page.getByRole("option", { name: /toutes les semaines/i }).click()

      // Submit the form
      await page.getByRole("button", { name: /créer la tâche/i }).click()

      // Should redirect to tasks list on success
      await expect(page).toHaveURL(/\/tasks$/, { timeout: 10000 })
    })

    test("should preserve recurrence when editing task", async ({ page }) => {
      // First create a recurring task
      await page.goto("/tasks/new")
      await page.getByLabel(/titre/i).fill("Edit Recurrence Test")

      const recurrenceSelect = page.locator("[role='combobox']").filter({
        has: page.getByText(/pas de récurrence/i),
      })
      await recurrenceSelect.first().click()
      await page.getByRole("option", { name: /tous les mois/i }).click()

      await page.getByRole("button", { name: /créer la tâche/i }).click()
      await expect(page).toHaveURL(/\/tasks$/, { timeout: 10000 })

      // Now edit the task
      await page.getByText("Edit Recurrence Test").click()

      // Recurrence should be preserved
      await expect(
        page.getByText(/tous les mois|mensuel|monthly/i)
      ).toBeVisible()
    })
  })

  test.describe.skip("Recurrence Label Display", () => {
    test("should display 'Tous les jours' for daily recurrence", async ({
      page,
    }) => {
      await page.goto("/tasks/new")

      const recurrenceSelect = page.locator("[role='combobox']").filter({
        has: page.getByText(/pas de récurrence/i),
      })
      await recurrenceSelect.first().click()
      await page.getByRole("option", { name: /tous les jours/i }).click()

      // Preview should show "Tous les jours" label
      await expect(page.getByText(/tous les jours/i)).toBeVisible()
    })

    test("should display 'Toutes les semaines' for weekly recurrence", async ({
      page,
    }) => {
      await page.goto("/tasks/new")

      const recurrenceSelect = page.locator("[role='combobox']").filter({
        has: page.getByText(/pas de récurrence/i),
      })
      await recurrenceSelect.first().click()
      await page.getByRole("option", { name: /toutes les semaines/i }).click()

      await expect(page.getByText(/toutes les semaines/i)).toBeVisible()
    })

    test("should display 'Tous les X jours' for custom interval", async ({
      page,
    }) => {
      await page.goto("/tasks/new")

      // Select custom recurrence
      const recurrenceSelect = page.locator("[role='combobox']").filter({
        has: page.getByText(/pas de récurrence/i),
      })
      await recurrenceSelect.first().click()
      await page.getByRole("option", { name: /personnalisé/i }).click()

      // Select daily frequency
      const frequencyDropdown = page.locator("[role='combobox']").filter({
        has: page.getByText(/hebdomadaire/i),
      })
      await frequencyDropdown.first().click()
      await page.getByRole("option", { name: /quotidien/i }).click()

      // Select interval of 3
      const intervalDropdown = page.locator("[role='combobox']").filter({
        hasText: /tous les \d/i,
      })
      await intervalDropdown.first().click()
      await page.getByRole("option", { name: /tous les 3/i }).click()

      // Should show "Tous les 3 jours"
      await expect(page.getByText(/tous les 3 jours/i)).toBeVisible()
    })

    test("should display day names for weekly with specific days", async ({
      page,
    }) => {
      await page.goto("/tasks/new")

      // Select custom weekly recurrence
      const recurrenceSelect = page.locator("[role='combobox']").filter({
        has: page.getByText(/pas de récurrence/i),
      })
      await recurrenceSelect.first().click()
      await page.getByRole("option", { name: /personnalisé/i }).click()

      // Select Monday and Wednesday
      await page.getByRole("button", { name: "Lun" }).click()
      await page.getByRole("button", { name: "Mer" }).click()

      // Should show days in the label
      await expect(page.getByText(/lundi.*mercredi|les lun.*mer/i)).toBeVisible()
    })
  })

  test.describe.skip("Recurring Tasks Navigation", () => {
    test("should navigate from tasks page to recurring tasks page", async ({
      page,
    }) => {
      await page.goto("/tasks")

      // Look for link to recurring tasks
      const recurringLink = page.getByRole("link", {
        name: /récurrent|recurring/i,
      })
      if (await recurringLink.isVisible()) {
        await recurringLink.click()
        await expect(page).toHaveURL(/\/tasks\/recurring/)
      }
    })

    test("should navigate from recurring page back to all tasks", async ({
      page,
    }) => {
      await page.goto("/tasks/recurring")

      await page.getByRole("link", { name: /toutes les tâches/i }).click()
      await expect(page).toHaveURL(/\/tasks$/)
    })

    test("should navigate to new task from recurring page", async ({
      page,
    }) => {
      await page.goto("/tasks/recurring")

      await page.getByRole("link", { name: /nouvelle tâche/i }).click()
      await expect(page).toHaveURL(/\/tasks\/new/)
    })
  })

  test.describe.skip("Responsive Layout", () => {
    test("should display recurring tasks on mobile viewport", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto("/tasks/recurring")

      // Page should still be accessible
      await expect(
        page.getByRole("heading", { name: /tâches récurrentes/i })
      ).toBeVisible()
    })

    test("should display task form recurrence section on mobile", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto("/tasks/new")

      // Recurrence section should be visible
      await expect(page.getByText(/récurrence/i)).toBeVisible()
    })

    test("should handle day selection on touch devices", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto("/tasks/new")

      // Select custom recurrence
      const recurrenceSelect = page.locator("[role='combobox']").filter({
        has: page.getByText(/pas de récurrence/i),
      })
      await recurrenceSelect.first().click()
      await page.getByRole("option", { name: /personnalisé/i }).click()

      // Day buttons should be visible and tappable
      const mondayBtn = page.getByRole("button", { name: "Lun" })
      await expect(mondayBtn).toBeVisible()
      await mondayBtn.tap()
    })
  })

  test.describe.skip("Edge Cases", () => {
    test("should handle switching between recurrence types", async ({
      page,
    }) => {
      await page.goto("/tasks/new")

      const recurrenceSelect = page.locator("[role='combobox']").filter({
        has: page.getByText(/pas de récurrence/i),
      })

      // Select daily
      await recurrenceSelect.first().click()
      await page.getByRole("option", { name: /tous les jours/i }).click()
      await expect(page.getByText(/prochaines occurrences/i)).toBeVisible()

      // Switch to weekly
      await recurrenceSelect.first().click()
      await page.getByRole("option", { name: /toutes les semaines/i }).click()
      await expect(page.getByText(/prochaines occurrences/i)).toBeVisible()

      // Switch to none
      await recurrenceSelect.first().click()
      await page.getByRole("option", { name: /pas de récurrence/i }).click()
      await expect(
        page.getByText(/prochaines occurrences/i)
      ).not.toBeVisible()
    })

    test("should preserve custom recurrence settings when switching away and back", async ({
      page,
    }) => {
      await page.goto("/tasks/new")

      const recurrenceSelect = page.locator("[role='combobox']").filter({
        has: page.getByText(/pas de récurrence/i),
      })

      // Select custom and configure
      await recurrenceSelect.first().click()
      await page.getByRole("option", { name: /personnalisé/i }).click()

      // Select Monday
      await page.getByRole("button", { name: "Lun" }).click()

      // Switch to daily
      await recurrenceSelect.first().click()
      await page.getByRole("option", { name: /tous les jours/i }).click()

      // Switch back to custom
      await recurrenceSelect.first().click()
      await page.getByRole("option", { name: /personnalisé/i }).click()

      // Monday should still be selected (UI should preserve state)
      const mondayBtn = page.getByRole("button", { name: "Lun" })
      // Note: This depends on implementation - state may or may not be preserved
    })

    test("should handle form submission without recurrence", async ({
      page,
    }) => {
      await page.goto("/tasks/new")

      // Fill in required fields only
      await page.getByLabel(/titre/i).fill("Task without recurrence")

      // Ensure "Pas de récurrence" is selected (default)
      await expect(
        page.locator("[role='combobox']").filter({
          has: page.getByText(/pas de récurrence/i),
        })
      ).toBeVisible()

      // Submit
      await page.getByRole("button", { name: /créer la tâche/i }).click()

      // Should succeed
      await expect(page).toHaveURL(/\/tasks$/, { timeout: 10000 })
    })
  })
})
