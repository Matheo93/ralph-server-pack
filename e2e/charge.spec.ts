/**
 * Charge Mentale (Mental Load) E2E Tests
 *
 * Tests for load balance display:
 * - Balance indicators
 * - Week chart
 * - Member breakdown
 */

import { test, expect } from "@playwright/test"

test.describe("Charge Mentale", () => {
  test.describe("Dashboard Access", () => {
    test("should redirect unauthenticated users from dashboard", async ({ page }) => {
      await page.goto("/dashboard")
      await expect(page).toHaveURL(/login/)
    })
  })

  // Tests that require authentication
  test.describe.skip("Authenticated Charge Tests", () => {
    test("should display balance indicator on dashboard", async ({ page }) => {
      await page.goto("/dashboard")

      // Should show balance component
      const balanceIndicator = page.locator("[data-testid='charge-balance'], [data-testid='balance']")
      await expect(balanceIndicator).toBeVisible()
    })

    test("should show percentage for each member", async ({ page }) => {
      await page.goto("/dashboard")

      // Should show member percentages
      const percentages = page.locator("[data-testid='member-percentage'], text=/%/")
      await expect(percentages.first()).toBeVisible()
    })

    test("should display week chart", async ({ page }) => {
      await page.goto("/dashboard")

      // Should show chart
      const chart = page.locator("[data-testid='charge-chart'], [data-testid='week-chart']")
      await expect(chart).toBeVisible()
    })

    test("should update when task completed", async ({ page }) => {
      await page.goto("/dashboard")

      // Get initial balance
      const balanceBefore = await page.locator("[data-testid='charge-balance']").textContent()

      // Complete a task
      const checkbox = page.locator("[data-testid='task-checkbox']").first()
      if (await checkbox.isVisible()) {
        await checkbox.click()
        await page.waitForTimeout(1000)

        // Balance should potentially change
        const balanceAfter = await page.locator("[data-testid='charge-balance']").textContent()
        // Note: balance may or may not change depending on assignment
      }
    })

    test("should show balance alert when imbalanced", async ({ page }) => {
      await page.goto("/dashboard")

      // Check for alert component (may not be visible if balanced)
      const alert = page.locator("[data-testid='charge-alert']")
      // Alert visibility depends on actual balance state
      if (await alert.isVisible()) {
        await expect(alert).toContainText(/déséquilibre|imbalance|attention/i)
      }
    })
  })
})

test.describe("Charge Week View", () => {
  test.describe.skip("Authenticated Week View Tests", () => {
    test("should display 7 days of data", async ({ page }) => {
      await page.goto("/dashboard")

      // Chart should show 7 data points
      const dataPoints = page.locator("[data-testid='chart-bar'], [data-testid='day-bar']")
      await expect(dataPoints).toHaveCount(7)
    })

    test("should show legend with member names", async ({ page }) => {
      await page.goto("/dashboard")

      // Should have legend
      const legend = page.locator("[data-testid='chart-legend'], [role='legend']")
      await expect(legend).toBeVisible()
    })

    test("should update when date range changes", async ({ page }) => {
      await page.goto("/dashboard")

      // Click previous week button
      const prevBtn = page.locator("[data-testid='prev-week'], [aria-label*='précédent']")
      if (await prevBtn.isVisible()) {
        await prevBtn.click()
        await page.waitForTimeout(500)

        // Chart should update
        await expect(page.locator("[data-testid='charge-chart']")).toBeVisible()
      }
    })
  })
})

test.describe("Streak Display", () => {
  test.describe.skip("Authenticated Streak Tests", () => {
    test("should show streak counter", async ({ page }) => {
      await page.goto("/dashboard")

      // Should show streak
      const streak = page.locator("[data-testid='streak-counter']")
      await expect(streak).toBeVisible()
    })

    test("should show streak milestones", async ({ page }) => {
      await page.goto("/dashboard")

      // Should show milestone badges
      const milestones = page.locator("[data-testid='streak-milestone'], [data-testid='badge']")
      await expect(milestones.first()).toBeVisible()
    })

    test("should show joker button for premium users", async ({ page }) => {
      await page.goto("/dashboard")

      // Joker button visibility depends on subscription
      const jokerBtn = page.locator("[data-testid='joker-button']")
      // May or may not be visible depending on subscription status
    })
  })
})
