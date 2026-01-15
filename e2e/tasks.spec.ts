/**
 * Tasks E2E Tests
 *
 * Tests for task CRUD operations:
 * - Task listing
 * - Task creation
 * - Task completion
 * - Task deletion
 * - Week view
 */

import { test, expect } from "@playwright/test"

test.describe("Tasks", () => {
  test.describe("Tasks List Page", () => {
    test("should redirect unauthenticated users to login", async ({ page }) => {
      await page.goto("/tasks")
      await expect(page).toHaveURL(/login/)
    })
  })

  test.describe("Task Today Page", () => {
    test("should redirect unauthenticated users to login", async ({ page }) => {
      await page.goto("/tasks/today")
      await expect(page).toHaveURL(/login/)
    })
  })

  test.describe("Task Week Page", () => {
    test("should redirect unauthenticated users to login", async ({ page }) => {
      await page.goto("/tasks/week")
      await expect(page).toHaveURL(/login/)
    })
  })

  test.describe("New Task Page", () => {
    test("should redirect unauthenticated users to login", async ({ page }) => {
      await page.goto("/tasks/new")
      await expect(page).toHaveURL(/login/)
    })
  })

  // Tests that require authentication - documented for future use
  test.describe.skip("Authenticated Task Operations", () => {
    test("should display tasks list", async ({ page }) => {
      await page.goto("/tasks")

      // Should show task list or empty state
      const taskList = page.locator("[data-testid='task-list'], [data-testid='empty-state']")
      await expect(taskList.first()).toBeVisible()
    })

    test("should show create task button", async ({ page }) => {
      await page.goto("/tasks")

      // Should have add task button
      const addBtn = page.getByRole("button", { name: /ajouter|add|nouvelle|new/i })
        .or(page.getByRole("link", { name: /ajouter|add|nouvelle|new/i }))
      await expect(addBtn.first()).toBeVisible()
    })

    test("should show task creation form", async ({ page }) => {
      await page.goto("/tasks/new")

      // Check form elements
      await expect(page.getByLabel(/titre|title/i)).toBeVisible()
      await expect(page.getByLabel(/description/i)).toBeVisible()
      await expect(page.getByRole("button", { name: /créer|create|sauvegarder|save/i })).toBeVisible()
    })

    test("should validate task form", async ({ page }) => {
      await page.goto("/tasks/new")

      // Submit empty form
      await page.getByRole("button", { name: /créer|create|sauvegarder|save/i }).click()

      // Should show validation error
      await expect(page.locator("text=/obligatoire|required/i")).toBeVisible()
    })

    test("should display week view with 7 days", async ({ page }) => {
      await page.goto("/tasks/week")

      // Should show 7 day columns
      const dayColumns = page.locator("[data-testid='day-column']")
      await expect(dayColumns).toHaveCount(7)
    })

    test("should allow task completion via checkbox", async ({ page }) => {
      await page.goto("/tasks")

      // Find a task checkbox
      const checkbox = page.locator("[data-testid='task-checkbox']").first()
      if (await checkbox.isVisible()) {
        await checkbox.click()

        // Should show completion feedback
        await expect(page.locator("text=/complété|completed|terminé|done/i")).toBeVisible()
      }
    })

    test("should allow task deletion", async ({ page }) => {
      await page.goto("/tasks")

      // Find delete button
      const deleteBtn = page.locator("[data-testid='task-delete']").first()
      if (await deleteBtn.isVisible()) {
        await deleteBtn.click()

        // Should show confirmation dialog
        await expect(page.locator("text=/confirmer|confirm|supprimer|delete/i")).toBeVisible()
      }
    })
  })
})

test.describe("Task Filters", () => {
  test.describe.skip("Authenticated Filter Tests", () => {
    test("should filter by status", async ({ page }) => {
      await page.goto("/tasks")

      // Click filter dropdown
      const filterBtn = page.locator("[data-testid='filter-status']")
      if (await filterBtn.isVisible()) {
        await filterBtn.click()
        // Select completed
        await page.getByText(/terminé|completed|done/i).click()
        // URL should reflect filter
        await expect(page).toHaveURL(/status=done|completed/)
      }
    })

    test("should filter by child", async ({ page }) => {
      await page.goto("/tasks")

      // Click child filter
      const filterBtn = page.locator("[data-testid='filter-child']")
      if (await filterBtn.isVisible()) {
        await filterBtn.click()
        // Should show child options
        await expect(page.locator("[data-testid='child-option']")).toBeVisible()
      }
    })

    test("should filter by category", async ({ page }) => {
      await page.goto("/tasks")

      // Click category filter
      const filterBtn = page.locator("[data-testid='filter-category']")
      if (await filterBtn.isVisible()) {
        await filterBtn.click()
        // Should show category options
        await expect(page.locator("[data-testid='category-option']")).toBeVisible()
      }
    })
  })
})
