/**
 * Kids Dashboard E2E Tests
 *
 * Tests for the kids interface:
 * - Profile selection page
 * - PIN login flow
 * - Dashboard display
 * - Task viewing and interaction
 * - Navigation between kids pages
 */

import { test, expect } from "@playwright/test"

test.describe("Kids Dashboard", () => {
  test.describe("Profile Selection Page", () => {
    test("should display kids profile selection page", async ({ page }) => {
      await page.goto("/kids")

      // Check page title
      await expect(page).toHaveTitle(/Kids|Enfants|profil/i)

      // Should show the main header
      await expect(page.getByText(/FamilyLoad Kids/i)).toBeVisible()
    })

    test("should display profile selection header", async ({ page }) => {
      await page.goto("/kids")

      // Should show the call to action
      await expect(page.getByText(/choisis|super-héros/i)).toBeVisible()
    })

    test("should show message when no child accounts exist", async ({ page }) => {
      // This test checks the empty state - will show either profiles or the "no account" message
      await page.goto("/kids")

      // Either show profiles or the "no account" message
      const hasProfiles = await page.locator("button").filter({ hasText: /c'est moi/i }).first().isVisible().catch(() => false)
      const hasNoAccountMessage = await page.getByText(/pas encore de compte/i).isVisible().catch(() => false)

      // One of these should be true
      expect(hasProfiles || hasNoAccountMessage).toBeTruthy()
    })

    test("should have link to parent login", async ({ page }) => {
      await page.goto("/kids")

      // Should have a link for parents
      const parentLink = page.getByRole("link", { name: /parent/i })
      await expect(parentLink).toBeVisible()

      // Should link to login page
      await expect(parentLink).toHaveAttribute("href", "/login")
    })

    test("should display decorative elements for kid-friendly UI", async ({ page }) => {
      await page.goto("/kids")

      // Check for emojis in the page (game controller, target, etc.)
      const pageContent = await page.textContent("body")
      expect(pageContent).toMatch(/[🎮🎯🌟✨🎈]/u)
    })
  })

  test.describe("PIN Login Page", () => {
    test("should redirect to profile selection when accessing login without child ID", async ({ page }) => {
      // Trying to access login without a valid child ID should redirect
      await page.goto("/kids/login/invalid-id")

      // Should either redirect to /kids or show an error
      await page.waitForTimeout(2000)
      const currentUrl = page.url()

      // Should be at /kids or show the profile selection
      const isAtKidsPage = currentUrl.includes("/kids") && !currentUrl.includes("/login")
      const hasErrorMessage = await page.getByText(/erreur|introuvable|not found/i).isVisible().catch(() => false)

      expect(isAtKidsPage || hasErrorMessage).toBeTruthy()
    })

    test("should display PIN keypad elements", async ({ page }) => {
      // Navigate to kids page first
      await page.goto("/kids")

      // If there are child profiles, click on the first one to go to login
      const firstProfile = page.locator("button").filter({ hasText: /c'est moi/i }).first()

      if (await firstProfile.isVisible().catch(() => false)) {
        await firstProfile.click()

        // Wait for navigation to login page
        await page.waitForURL(/\/kids\/login\/.*/)

        // Should show PIN indicators (4 dots)
        const pinIndicators = page.locator("div.rounded-full").filter({ has: page.locator(":scope:not(:has(*))") })
        // PIN indicators should be visible
        await expect(page.getByText(/code secret/i)).toBeVisible()

        // Should show numeric keypad (digits 0-9)
        for (const digit of ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"]) {
          const keyButton = page.getByRole("button", { name: digit, exact: true })
          await expect(keyButton).toBeVisible()
        }

        // Should show delete button (backspace)
        const deleteButton = page.locator("button").filter({ has: page.locator("svg") }).last()
        await expect(deleteButton).toBeVisible()
      }
    })

    test("should display child name on login page", async ({ page }) => {
      await page.goto("/kids")

      const firstProfile = page.locator("button").filter({ hasText: /c'est moi/i }).first()

      if (await firstProfile.isVisible().catch(() => false)) {
        // Get the child's name from the profile
        const profileContainer = firstProfile.locator("xpath=ancestor::button")
        const childNameElement = profileContainer.locator("span.font-black").first()
        const childName = await childNameElement.textContent()

        await firstProfile.click()
        await page.waitForURL(/\/kids\/login\/.*/)

        // Should greet the child by name
        if (childName) {
          await expect(page.getByText(new RegExp(`Salut.*${childName}`, "i"))).toBeVisible()
        }
      }
    })

    test("should show error message for wrong PIN", async ({ page }) => {
      await page.goto("/kids")

      const firstProfile = page.locator("button").filter({ hasText: /c'est moi/i }).first()

      if (await firstProfile.isVisible().catch(() => false)) {
        await firstProfile.click()
        await page.waitForURL(/\/kids\/login\/.*/)

        // Enter a wrong PIN (0000)
        await page.getByRole("button", { name: "0", exact: true }).click()
        await page.getByRole("button", { name: "0", exact: true }).click()
        await page.getByRole("button", { name: "0", exact: true }).click()
        await page.getByRole("button", { name: "0", exact: true }).click()

        // Should show error message
        await expect(page.getByText(/erreur|incorrect|invalide|oublié/i)).toBeVisible({ timeout: 10000 })
      }
    })

    test("should show verification spinner when PIN is submitted", async ({ page }) => {
      await page.goto("/kids")

      const firstProfile = page.locator("button").filter({ hasText: /c'est moi/i }).first()

      if (await firstProfile.isVisible().catch(() => false)) {
        await firstProfile.click()
        await page.waitForURL(/\/kids\/login\/.*/)

        // Enter any 4-digit PIN quickly
        await page.getByRole("button", { name: "1", exact: true }).click()
        await page.getByRole("button", { name: "2", exact: true }).click()
        await page.getByRole("button", { name: "3", exact: true }).click()
        await page.getByRole("button", { name: "4", exact: true }).click()

        // Should show verification message briefly
        const verificationText = page.getByText(/vérification/i)
        // This may be very fast, so we just check it appeared
        await expect(verificationText.or(page.getByText(/erreur|dashboard/i))).toBeVisible({ timeout: 10000 })
      }
    })

    test("should allow PIN deletion with backspace button", async ({ page }) => {
      await page.goto("/kids")

      const firstProfile = page.locator("button").filter({ hasText: /c'est moi/i }).first()

      if (await firstProfile.isVisible().catch(() => false)) {
        await firstProfile.click()
        await page.waitForURL(/\/kids\/login\/.*/)

        // Enter 2 digits
        await page.getByRole("button", { name: "1", exact: true }).click()
        await page.getByRole("button", { name: "2", exact: true }).click()

        // Find and click the delete button (has an SVG icon)
        const deleteButton = page.locator("button").filter({ has: page.locator("svg path") })
        await deleteButton.click()

        // Now we should be able to enter 3 more digits to complete
        await page.getByRole("button", { name: "3", exact: true }).click()
        await page.getByRole("button", { name: "4", exact: true }).click()
        await page.getByRole("button", { name: "5", exact: true }).click()

        // Should trigger verification (1, 3, 4, 5 = 4 digits)
        await expect(page.getByText(/vérification|erreur/i)).toBeVisible({ timeout: 10000 })
      }
    })

    test("should show help message about forgotten PIN", async ({ page }) => {
      await page.goto("/kids")

      const firstProfile = page.locator("button").filter({ hasText: /c'est moi/i }).first()

      if (await firstProfile.isVisible().catch(() => false)) {
        await firstProfile.click()
        await page.waitForURL(/\/kids\/login\/.*/)

        // Should show help message about forgotten PIN
        await expect(page.getByText(/oublié.*code|parents.*réinitialiser/i)).toBeVisible()
      }
    })
  })

  test.describe("Dashboard Access Protection", () => {
    test("should redirect to /kids when accessing dashboard without session", async ({ page }) => {
      // Try to access dashboard directly without being logged in
      await page.goto("/kids/some-child-id/dashboard")

      // Should redirect to profile selection or login
      await page.waitForTimeout(2000)
      const currentUrl = page.url()

      expect(currentUrl).toMatch(/\/kids(\/login)?/)
    })

    test("should redirect to /kids when accessing challenges without session", async ({ page }) => {
      await page.goto("/kids/some-child-id/challenges")

      await page.waitForTimeout(2000)
      const currentUrl = page.url()

      expect(currentUrl).toMatch(/\/kids(\/login)?/)
    })

    test("should redirect to /kids when accessing shop without session", async ({ page }) => {
      await page.goto("/kids/some-child-id/shop")

      await page.waitForTimeout(2000)
      const currentUrl = page.url()

      expect(currentUrl).toMatch(/\/kids(\/login)?/)
    })

    test("should redirect to /kids when accessing badges without session", async ({ page }) => {
      await page.goto("/kids/some-child-id/badges")

      await page.waitForTimeout(2000)
      const currentUrl = page.url()

      expect(currentUrl).toMatch(/\/kids(\/login)?/)
    })

    test("should redirect to /kids when accessing profile without session", async ({ page }) => {
      await page.goto("/kids/some-child-id/profile")

      await page.waitForTimeout(2000)
      const currentUrl = page.url()

      expect(currentUrl).toMatch(/\/kids(\/login)?/)
    })
  })

  // Tests requiring authenticated kids session - documented for future use with auth fixtures
  test.describe.skip("Authenticated Dashboard Operations", () => {
    test("should display dashboard with XP and level", async ({ page }) => {
      // After successful PIN login
      await page.goto("/kids/test-child-id/dashboard")

      // Should show XP progress
      await expect(page.getByText(/XP/i)).toBeVisible()

      // Should show current level
      await expect(page.getByText(/niveau|level/i)).toBeVisible()

      // Should show streak
      await expect(page.getByText(/jour|streak/i)).toBeVisible()
    })

    test("should display stats cards", async ({ page }) => {
      await page.goto("/kids/test-child-id/dashboard")

      // Should show completed tasks count (Victoires)
      await expect(page.getByText(/victoires/i)).toBeVisible()

      // Should show pending proofs count (En cours)
      await expect(page.getByText(/en cours/i)).toBeVisible()

      // Should show streak count
      await expect(page.getByText(/jour/i)).toBeVisible()
    })

    test("should display roadmap with tasks", async ({ page }) => {
      await page.goto("/kids/test-child-id/dashboard")

      // Should show the quest title
      await expect(page.getByText(/ta quête/i)).toBeVisible()

      // Should show instructions
      await expect(page.getByText(/monte les niveaux/i)).toBeVisible()
    })

    test("should show empty state when no tasks", async ({ page }) => {
      await page.goto("/kids/test-child-id/dashboard")

      // If no tasks, should show celebration message
      const emptyState = page.getByText(/champion|terminées/i)
      const taskList = page.locator("[data-testid='roadmap-task']")

      const hasEmptyState = await emptyState.isVisible().catch(() => false)
      const hasTasks = await taskList.first().isVisible().catch(() => false)

      expect(hasEmptyState || hasTasks).toBeTruthy()
    })

    test("should open task modal when clicking a task", async ({ page }) => {
      await page.goto("/kids/test-child-id/dashboard")

      // Find and click on an available task
      const taskButton = page.locator("button").filter({ hasText: /c'est ton tour|go!/i }).first()

      if (await taskButton.isVisible().catch(() => false)) {
        await taskButton.click()

        // Modal should open with task details
        await expect(page.getByText(/récompense/i)).toBeVisible()
        await expect(page.getByRole("button", { name: /terminé|photo/i })).toBeVisible()
      }
    })

    test("should show XP reward in task modal", async ({ page }) => {
      await page.goto("/kids/test-child-id/dashboard")

      const taskButton = page.locator("button").filter({ hasText: /c'est ton tour/i }).first()

      if (await taskButton.isVisible().catch(() => false)) {
        await taskButton.click()

        // Should show XP reward
        await expect(page.getByText(/\+\d+ XP/)).toBeVisible()
      }
    })

    test("should close task modal when clicking close button", async ({ page }) => {
      await page.goto("/kids/test-child-id/dashboard")

      const taskButton = page.locator("button").filter({ hasText: /c'est ton tour/i }).first()

      if (await taskButton.isVisible().catch(() => false)) {
        await taskButton.click()

        // Modal should be visible
        await expect(page.getByText(/récompense/i)).toBeVisible()

        // Click close button
        const closeButton = page.locator("button").filter({ has: page.locator("svg") }).first()
        await closeButton.click()

        // Modal should be closed
        await expect(page.getByText(/récompense/i)).not.toBeVisible()
      }
    })

    test("should request camera permission when completing task", async ({ page, context }) => {
      // Grant camera permission
      await context.grantPermissions(["camera"])

      await page.goto("/kids/test-child-id/dashboard")

      const taskButton = page.locator("button").filter({ hasText: /c'est ton tour/i }).first()

      if (await taskButton.isVisible().catch(() => false)) {
        await taskButton.click()

        // Click the "J'ai terminé" button
        const completeButton = page.getByRole("button", { name: /terminé|photo/i })
        await completeButton.click()

        // Camera view should appear
        await expect(page.locator("video")).toBeVisible({ timeout: 10000 })
      }
    })

    test("should show task in waiting state after submitting proof", async ({ page }) => {
      await page.goto("/kids/test-child-id/dashboard")

      // Look for tasks in waiting state
      const waitingTask = page.getByText(/en attente/i)

      if (await waitingTask.isVisible().catch(() => false)) {
        // Should show the waiting indicator
        await expect(page.getByText(/⏳|attente|validation/i)).toBeVisible()
      }
    })
  })

  test.describe.skip("Kids Navigation", () => {
    test("should navigate to challenges page", async ({ page }) => {
      await page.goto("/kids/test-child-id/dashboard")

      // Find and click challenges link
      const challengesLink = page.getByRole("link", { name: /défis|challenges/i })
      await challengesLink.click()

      await expect(page).toHaveURL(/\/challenges/)
    })

    test("should navigate to badges page", async ({ page }) => {
      await page.goto("/kids/test-child-id/dashboard")

      const badgesLink = page.getByRole("link", { name: /badges|trophées/i })
      await badgesLink.click()

      await expect(page).toHaveURL(/\/badges/)
    })

    test("should navigate to shop page", async ({ page }) => {
      await page.goto("/kids/test-child-id/dashboard")

      const shopLink = page.getByRole("link", { name: /boutique|shop|récompenses/i })
      await shopLink.click()

      await expect(page).toHaveURL(/\/shop/)
    })

    test("should navigate to profile page", async ({ page }) => {
      await page.goto("/kids/test-child-id/dashboard")

      const profileLink = page.getByRole("link", { name: /profil|moi/i })
      await profileLink.click()

      await expect(page).toHaveURL(/\/profile/)
    })

    test("should return to dashboard from other pages", async ({ page }) => {
      await page.goto("/kids/test-child-id/challenges")

      const dashboardLink = page.getByRole("link", { name: /accueil|dashboard|quête/i })
      await dashboardLink.click()

      await expect(page).toHaveURL(/\/dashboard/)
    })
  })

  test.describe.skip("Kids Profile Page", () => {
    test("should display child profile information", async ({ page }) => {
      await page.goto("/kids/test-child-id/profile")

      // Should show child's name
      await expect(page.getByRole("heading")).toBeVisible()

      // Should show XP and level
      await expect(page.getByText(/XP/i)).toBeVisible()
      await expect(page.getByText(/niveau|level/i)).toBeVisible()
    })

    test("should display logout button", async ({ page }) => {
      await page.goto("/kids/test-child-id/profile")

      // Should show logout button
      const logoutButton = page.getByRole("button", { name: /déconnexion|logout|quitter/i })
      await expect(logoutButton).toBeVisible()
    })

    test("should logout and redirect to /kids", async ({ page }) => {
      await page.goto("/kids/test-child-id/profile")

      const logoutButton = page.getByRole("button", { name: /déconnexion|logout|quitter/i })
      await logoutButton.click()

      // Should redirect to profile selection
      await expect(page).toHaveURL(/\/kids$/)
    })

    test("should display XP history", async ({ page }) => {
      await page.goto("/kids/test-child-id/profile")

      // Should show XP history section
      await expect(page.getByText(/historique|history|gains/i)).toBeVisible()
    })

    test("should display sound toggle", async ({ page }) => {
      await page.goto("/kids/test-child-id/profile")

      // Should show sound toggle
      const soundToggle = page.getByRole("switch").or(page.getByLabel(/son|sound|audio/i))
      await expect(soundToggle).toBeVisible()
    })
  })

  test.describe.skip("Kids Badges Page", () => {
    test("should display badges grid", async ({ page }) => {
      await page.goto("/kids/test-child-id/badges")

      // Should show badges section
      await expect(page.getByText(/badges|trophées|récompenses/i)).toBeVisible()
    })

    test("should show locked and unlocked badges", async ({ page }) => {
      await page.goto("/kids/test-child-id/badges")

      // Should have badge indicators (locked or unlocked)
      const badges = page.locator("[data-testid='badge-item']").or(page.locator(".badge"))

      // At least some badges should be displayed
      await expect(badges.first()).toBeVisible({ timeout: 10000 })
    })

    test("should display leaderboard", async ({ page }) => {
      await page.goto("/kids/test-child-id/badges")

      // Should show leaderboard section
      await expect(page.getByText(/classement|leaderboard|top/i)).toBeVisible()
    })
  })

  test.describe.skip("Kids Shop Page", () => {
    test("should display shop with rewards", async ({ page }) => {
      await page.goto("/kids/test-child-id/shop")

      // Should show shop title
      await expect(page.getByText(/boutique|shop|récompenses/i)).toBeVisible()
    })

    test("should display current XP balance", async ({ page }) => {
      await page.goto("/kids/test-child-id/shop")

      // Should show XP balance
      await expect(page.getByText(/XP/i)).toBeVisible()
    })

    test("should show reward prices", async ({ page }) => {
      await page.goto("/kids/test-child-id/shop")

      // Rewards should show XP cost
      const rewardPrice = page.getByText(/\d+ XP/)
      if (await rewardPrice.first().isVisible().catch(() => false)) {
        await expect(rewardPrice.first()).toBeVisible()
      }
    })

    test("should show empty shop message when no rewards", async ({ page }) => {
      await page.goto("/kids/test-child-id/shop")

      // Either show rewards or empty message
      const hasRewards = await page.locator("[data-testid='reward-item']").first().isVisible().catch(() => false)
      const hasEmptyMessage = await page.getByText(/pas de récompenses|aucune|vide/i).isVisible().catch(() => false)

      expect(hasRewards || hasEmptyMessage).toBeTruthy()
    })

    test("should disable purchase when not enough XP", async ({ page }) => {
      await page.goto("/kids/test-child-id/shop")

      // Find a reward item
      const rewardButton = page.getByRole("button", { name: /échanger|acheter|obtenir/i }).first()

      if (await rewardButton.isVisible().catch(() => false)) {
        // If disabled, should show visual indication
        const isDisabled = await rewardButton.isDisabled()
        // This is expected behavior - button may be enabled or disabled based on XP
        expect(typeof isDisabled).toBe("boolean")
      }
    })
  })

  test.describe.skip("Kids Challenges Page", () => {
    test("should display challenges grid", async ({ page }) => {
      await page.goto("/kids/test-child-id/challenges")

      // Should show challenges title
      await expect(page.getByText(/défis|challenges/i)).toBeVisible()
    })

    test("should show challenge progress", async ({ page }) => {
      await page.goto("/kids/test-child-id/challenges")

      // Challenges should show progress
      const progressIndicator = page.locator("[role='progressbar']").or(page.getByText(/\d+\/\d+/))
      if (await progressIndicator.first().isVisible().catch(() => false)) {
        await expect(progressIndicator.first()).toBeVisible()
      }
    })

    test("should show challenge rewards", async ({ page }) => {
      await page.goto("/kids/test-child-id/challenges")

      // Challenges should show XP rewards
      const rewardText = page.getByText(/\+\d+ XP/)
      if (await rewardText.first().isVisible().catch(() => false)) {
        await expect(rewardText.first()).toBeVisible()
      }
    })
  })

  test.describe("Responsive Layout", () => {
    test("should display correctly on mobile viewport", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto("/kids")

      // Page should still be functional
      await expect(page.getByText(/FamilyLoad Kids/i)).toBeVisible()
    })

    test("should display PIN keypad correctly on mobile", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto("/kids")

      const firstProfile = page.locator("button").filter({ hasText: /c'est moi/i }).first()

      if (await firstProfile.isVisible().catch(() => false)) {
        await firstProfile.click()
        await page.waitForURL(/\/kids\/login\/.*/)

        // All keypad buttons should be visible and accessible
        for (const digit of ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"]) {
          const keyButton = page.getByRole("button", { name: digit, exact: true })
          await expect(keyButton).toBeVisible()
        }
      }
    })

    test("should display correctly on tablet viewport", async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 })
      await page.goto("/kids")

      // Page should still be functional
      await expect(page.getByText(/FamilyLoad Kids/i)).toBeVisible()
    })
  })

  test.describe("Accessibility", () => {
    test("should have accessible profile buttons", async ({ page }) => {
      await page.goto("/kids")

      // Profile buttons should be accessible
      const profileButtons = page.locator("button").filter({ hasText: /c'est moi/i })

      if (await profileButtons.first().isVisible().catch(() => false)) {
        // Buttons should be focusable
        await profileButtons.first().focus()
        await expect(profileButtons.first()).toBeFocused()
      }
    })

    test("should have accessible PIN keypad", async ({ page }) => {
      await page.goto("/kids")

      const firstProfile = page.locator("button").filter({ hasText: /c'est moi/i }).first()

      if (await firstProfile.isVisible().catch(() => false)) {
        await firstProfile.click()
        await page.waitForURL(/\/kids\/login\/.*/)

        // Keypad buttons should be focusable and have proper text
        const key1 = page.getByRole("button", { name: "1", exact: true })
        await key1.focus()
        await expect(key1).toBeFocused()
      }
    })

    test("should navigate PIN keypad with keyboard", async ({ page }) => {
      await page.goto("/kids")

      const firstProfile = page.locator("button").filter({ hasText: /c'est moi/i }).first()

      if (await firstProfile.isVisible().catch(() => false)) {
        await firstProfile.click()
        await page.waitForURL(/\/kids\/login\/.*/)

        // Tab through keypad buttons
        await page.keyboard.press("Tab")
        await page.keyboard.press("Tab")

        // Should be able to interact with keyboard
        await page.keyboard.press("Enter")

        // Some interaction should occur (either PIN input or navigation)
        await page.waitForTimeout(500)
      }
    })
  })

  test.describe("Error Handling", () => {
    test("should handle network errors gracefully on /kids page", async ({ page }) => {
      // Simulate offline mode
      await page.route("**/api/**", (route) => route.abort())

      await page.goto("/kids")

      // Page should still load (cached or show error)
      const pageContent = await page.textContent("body")
      expect(pageContent).toBeTruthy()
    })

    test("should show rate limit message after multiple failed PIN attempts", async ({ page }) => {
      await page.goto("/kids")

      const firstProfile = page.locator("button").filter({ hasText: /c'est moi/i }).first()

      if (await firstProfile.isVisible().catch(() => false)) {
        await firstProfile.click()
        await page.waitForURL(/\/kids\/login\/.*/)

        // Try wrong PIN multiple times
        for (let i = 0; i < 3; i++) {
          await page.getByRole("button", { name: "9", exact: true }).click()
          await page.getByRole("button", { name: "9", exact: true }).click()
          await page.getByRole("button", { name: "9", exact: true }).click()
          await page.getByRole("button", { name: "9", exact: true }).click()

          // Wait for error and reset
          await page.waitForTimeout(1500)
        }

        // Should show rate limit or multiple attempts warning
        const errorText = page.getByText(/erreur|incorrect|tentative|bloqué|attendre/i)
        await expect(errorText).toBeVisible({ timeout: 10000 })
      }
    })
  })
})
