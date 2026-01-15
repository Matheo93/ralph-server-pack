/**
 * Onboarding E2E Tests
 *
 * Tests for the onboarding flow including:
 * - Household creation
 * - Child addition
 * - Member invitation
 */

import { test, expect } from "@playwright/test"

test.describe("Onboarding Flow", () => {
  // Skip these tests as they require authentication
  // They are documented for when auth fixtures are available

  test.describe.skip("Step 1: Household Creation", () => {
    test("should display household form", async ({ page }) => {
      await page.goto("/onboarding")

      // Check for household name input
      await expect(page.getByLabel(/nom du foyer|household name/i)).toBeVisible()

      // Check for country selection
      await expect(page.locator("text=/pays|country/i")).toBeVisible()

      // Check for submit button
      await expect(page.getByRole("button", { name: /suivant|next|continuer|continue/i })).toBeVisible()
    })

    test("should validate household name", async ({ page }) => {
      await page.goto("/onboarding")

      // Try to proceed without filling
      await page.getByRole("button", { name: /suivant|next|continuer|continue/i }).click()

      // Should show validation error
      await expect(page.locator("text=/obligatoire|required/i")).toBeVisible()
    })
  })

  test.describe.skip("Step 2: Children Addition", () => {
    test("should allow adding children", async ({ page }) => {
      await page.goto("/onboarding") // Assumes we're on step 2

      // Check for child form
      await expect(page.getByLabel(/prénom|first name/i)).toBeVisible()
      await expect(page.getByLabel(/date de naissance|birthdate/i)).toBeVisible()
    })

    test("should validate child data", async ({ page }) => {
      await page.goto("/onboarding")

      // Click add child button
      const addChildBtn = page.getByRole("button", { name: /ajouter|add child/i })
      if (await addChildBtn.isVisible()) {
        await addChildBtn.click()

        // Try to proceed without required fields
        await page.getByRole("button", { name: /suivant|next/i }).click()

        // Should show validation error
        await expect(page.locator("text=/obligatoire|required/i")).toBeVisible()
      }
    })
  })

  test.describe.skip("Step 3: Member Invitation", () => {
    test("should show invitation form", async ({ page }) => {
      await page.goto("/onboarding")

      // Check for email input
      await expect(page.getByLabel(/email/i)).toBeVisible()

      // Check for role selection
      await expect(page.locator("text=/rôle|role/i")).toBeVisible()
    })

    test("should allow skipping invitations", async ({ page }) => {
      await page.goto("/onboarding")

      // Should have skip option
      const skipBtn = page.getByRole("button", { name: /passer|skip|ignorer/i })
      await expect(skipBtn).toBeVisible()
    })
  })

  test.describe.skip("Step 4: Preferences", () => {
    test("should show notification preferences", async ({ page }) => {
      await page.goto("/onboarding")

      // Check for notification options
      await expect(page.locator("text=/notification/i")).toBeVisible()
    })

    test("should complete onboarding", async ({ page }) => {
      await page.goto("/onboarding")

      // Should have finish button
      const finishBtn = page.getByRole("button", { name: /terminer|finish|commencer|start/i })
      await expect(finishBtn).toBeVisible()
    })
  })
})

test.describe("Onboarding Access", () => {
  test("should redirect unauthenticated users", async ({ page }) => {
    await page.goto("/onboarding")

    // Should redirect to login
    await expect(page).toHaveURL(/login/)
  })
})
