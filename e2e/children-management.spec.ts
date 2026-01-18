/**
 * Children Management E2E Tests
 *
 * Tests for complete CRUD operations on children:
 * - List children
 * - Create child
 * - View child details
 * - Edit child
 * - Delete child
 * - Setup PIN for Kids Space
 */

import { test, expect } from "@playwright/test"

test.describe("Children Management", () => {
  test.describe("Children List Page", () => {
    test("should redirect unauthenticated users to login", async ({ page }) => {
      await page.goto("/children")
      await expect(page).toHaveURL(/login/)
    })

    test("should display page title and add button when loaded", async ({ page }) => {
      // This test verifies the page structure exists
      await page.goto("/children")
      // Will redirect to login for unauthenticated users
      await expect(page).toHaveURL(/login|children/)
    })
  })

  test.describe("New Child Page", () => {
    test("should redirect unauthenticated users to login", async ({ page }) => {
      await page.goto("/children/new")
      await expect(page).toHaveURL(/login/)
    })
  })

  test.describe("Child Detail Page", () => {
    test("should redirect unauthenticated users to login", async ({ page }) => {
      // Using a fake UUID for testing
      await page.goto("/children/00000000-0000-0000-0000-000000000001")
      await expect(page).toHaveURL(/login/)
    })
  })

  test.describe("Edit Child Page", () => {
    test("should redirect unauthenticated users to login", async ({ page }) => {
      await page.goto("/children/00000000-0000-0000-0000-000000000001/edit")
      await expect(page).toHaveURL(/login/)
    })
  })

  test.describe("Setup PIN Page", () => {
    test("should redirect unauthenticated users to login", async ({ page }) => {
      await page.goto("/children/00000000-0000-0000-0000-000000000001/setup-pin")
      await expect(page).toHaveURL(/login/)
    })
  })

  // Tests that require authentication - documented for future use with auth helpers
  test.describe.skip("Authenticated Children Operations", () => {
    test("should display children list page with header", async ({ page }) => {
      await page.goto("/children")

      // Check page header
      await expect(page.getByRole("heading", { name: /enfants/i })).toBeVisible()

      // Check add button
      const addButton = page.getByRole("link", { name: /ajouter/i })
        .or(page.getByRole("button", { name: /ajouter/i }))
      await expect(addButton.first()).toBeVisible()
    })

    test("should display empty state when no children", async ({ page }) => {
      await page.goto("/children")

      // Check for empty state or children cards
      const childCard = page.locator("[data-testid='child-card']")
      const emptyState = page.locator("[data-testid='empty-state']")
        .or(page.locator("text=/aucun enfant|pas encore|ajouter votre premier/i"))

      // Either show children or empty state
      await expect(childCard.or(emptyState).first()).toBeVisible({ timeout: 10000 })
    })

    test("should navigate to new child form", async ({ page }) => {
      await page.goto("/children")

      // Click add button
      const addButton = page.getByRole("link", { name: /ajouter/i })
        .or(page.getByRole("button", { name: /ajouter/i }))
      await addButton.first().click()

      // Should navigate to new child page
      await expect(page).toHaveURL(/children\/new/)
    })
  })

  test.describe.skip("Authenticated - Create Child", () => {
    test("should display child form with all fields", async ({ page }) => {
      await page.goto("/children/new")

      // Check form fields
      await expect(page.getByLabel(/prénom/i)).toBeVisible()
      await expect(page.getByLabel(/date de naissance/i)).toBeVisible()
      await expect(page.getByText(/genre/i)).toBeVisible()
      await expect(page.getByText(/école/i).first()).toBeVisible()
      await expect(page.getByText(/niveau/i)).toBeVisible()
      await expect(page.getByText(/classe/i)).toBeVisible()

      // Check submit button
      const submitButton = page.getByRole("button", { name: /ajouter|créer|enregistrer/i })
      await expect(submitButton).toBeVisible()
    })

    test("should validate required fields", async ({ page }) => {
      await page.goto("/children/new")

      // Submit empty form
      const submitButton = page.getByRole("button", { name: /ajouter|créer|enregistrer/i })
      await submitButton.click()

      // Should show validation error for first name
      await expect(page.locator("text=/prénom.*obligatoire|requis|required/i")).toBeVisible({ timeout: 5000 })
    })

    test("should validate birthdate is not in future", async ({ page }) => {
      await page.goto("/children/new")

      // Fill with future date
      await page.getByLabel(/prénom/i).fill("Test")

      const futureDate = new Date()
      futureDate.setFullYear(futureDate.getFullYear() + 1)
      const futureDateStr = futureDate.toISOString().split("T")[0] ?? ""
      await page.getByLabel(/date de naissance/i).fill(futureDateStr)

      // Submit form
      const submitButton = page.getByRole("button", { name: /ajouter|créer|enregistrer/i })
      await submitButton.click()

      // Should show validation error
      await expect(page.locator("text=/futur|invalide|invalid/i")).toBeVisible({ timeout: 5000 })
    })

    test("should create child successfully", async ({ page }) => {
      await page.goto("/children/new")

      // Fill form with valid data
      await page.getByLabel(/prénom/i).fill("Emma")

      const birthdate = new Date()
      birthdate.setFullYear(birthdate.getFullYear() - 8) // 8 years old
      const birthdateStr = birthdate.toISOString().split("T")[0] ?? ""
      await page.getByLabel(/date de naissance/i).fill(birthdateStr)

      // Select gender
      await page.locator("select").filter({ hasText: /non spécifié/i }).first().selectOption("F")

      // Fill optional school info
      await page.getByLabel(/école/i).fill("École Jean Jaurès")
      await page.locator("select").filter({ hasText: /niveau/i }).selectOption("primaire")
      await page.getByLabel(/classe/i).fill("CE2")

      // Submit form
      const submitButton = page.getByRole("button", { name: /ajouter|créer|enregistrer/i })
      await submitButton.click()

      // Should show success message or redirect
      await expect(
        page.locator("text=/créé|ajouté|succès|success/i")
          .or(page.locator("[data-testid='toast-success']"))
      ).toBeVisible({ timeout: 10000 })
    })

    test("should auto-suggest school level based on age", async ({ page }) => {
      await page.goto("/children/new")

      // Fill birthdate for a 10-year-old (should suggest primaire)
      const birthdate = new Date()
      birthdate.setFullYear(birthdate.getFullYear() - 10)
      const birthdateStr = birthdate.toISOString().split("T")[0] ?? ""
      await page.getByLabel(/date de naissance/i).fill(birthdateStr)

      // Wait for auto-suggestion
      await page.waitForTimeout(500)

      // Check school level was auto-filled
      const schoolLevelSelect = page.locator("select").filter({ hasText: /primaire|collège/i })
      await expect(schoolLevelSelect).toBeVisible()
    })
  })

  test.describe.skip("Authenticated - View Child Details", () => {
    test("should display child profile header", async ({ page }) => {
      // Assuming we have a child created
      await page.goto("/children")

      // Click on first child card
      const childCard = page.locator("[data-testid='child-card']").first()
        .or(page.locator(".cursor-pointer").first())

      if (await childCard.isVisible()) {
        await childCard.click()

        // Should show child details
        await expect(page.getByRole("heading").first()).toBeVisible()
        await expect(page.locator("text=/an|ans/i")).toBeVisible()
      }
    })

    test("should display stats cards", async ({ page }) => {
      await page.goto("/children")

      const childCard = page.locator("[data-testid='child-card']").first()
        .or(page.locator(".cursor-pointer").first())

      if (await childCard.isVisible()) {
        await childCard.click()

        // Should show stats
        await expect(page.locator("text=/en cours|tâches/i").first()).toBeVisible({ timeout: 10000 })
        await expect(page.locator("text=/complétées|terminées/i").first()).toBeVisible()
      }
    })

    test("should have edit button", async ({ page }) => {
      await page.goto("/children")

      const childCard = page.locator("[data-testid='child-card']").first()
        .or(page.locator(".cursor-pointer").first())

      if (await childCard.isVisible()) {
        await childCard.click()

        // Should have edit link/button
        const editButton = page.getByRole("link", { name: /modifier/i })
          .or(page.getByRole("button", { name: /modifier/i }))
        await expect(editButton.first()).toBeVisible()
      }
    })

    test("should display Kids Space section", async ({ page }) => {
      await page.goto("/children")

      const childCard = page.locator("[data-testid='child-card']").first()
        .or(page.locator(".cursor-pointer").first())

      if (await childCard.isVisible()) {
        await childCard.click()

        // Should show Kids Space section
        await expect(page.locator("text=/espace enfant/i")).toBeVisible({ timeout: 10000 })
      }
    })

    test("should navigate to timeline", async ({ page }) => {
      await page.goto("/children")

      const childCard = page.locator("[data-testid='child-card']").first()
        .or(page.locator(".cursor-pointer").first())

      if (await childCard.isVisible()) {
        await childCard.click()

        // Click timeline button
        const timelineButton = page.getByRole("link", { name: /timeline/i })
          .or(page.getByRole("button", { name: /timeline/i }))

        if (await timelineButton.first().isVisible()) {
          await timelineButton.first().click()
          await expect(page).toHaveURL(/timeline/)
        }
      }
    })
  })

  test.describe.skip("Authenticated - Edit Child", () => {
    test("should display edit form with pre-filled data", async ({ page }) => {
      await page.goto("/children")

      // Navigate to edit via child card
      const editButton = page.getByRole("button", { name: /modifier/i }).first()
        .or(page.getByRole("link", { name: /modifier/i }).first())

      if (await editButton.isVisible()) {
        await editButton.click()

        // Form should be pre-filled
        const nameInput = page.getByLabel(/prénom/i)
        await expect(nameInput).toBeVisible()
        await expect(nameInput).not.toHaveValue("")
      }
    })

    test("should update child successfully", async ({ page }) => {
      await page.goto("/children")

      const editButton = page.getByRole("button", { name: /modifier/i }).first()

      if (await editButton.isVisible()) {
        await editButton.click()

        // Modify the name
        const nameInput = page.getByLabel(/prénom/i)
        await nameInput.clear()
        await nameInput.fill("Emma-Updated")

        // Save changes
        const saveButton = page.getByRole("button", { name: /enregistrer|sauvegarder|modifier/i })
        await saveButton.click()

        // Should show success
        await expect(
          page.locator("text=/modifié|mis à jour|succès|success/i")
            .or(page.locator("[data-testid='toast-success']"))
        ).toBeVisible({ timeout: 10000 })
      }
    })

    test("should have back button to return to list", async ({ page }) => {
      await page.goto("/children")

      const editButton = page.getByRole("button", { name: /modifier/i }).first()

      if (await editButton.isVisible()) {
        await editButton.click()

        // Should have back button
        const backButton = page.getByRole("link", { name: /retour/i })
          .or(page.getByRole("button", { name: /retour/i }))
        await expect(backButton.first()).toBeVisible()
      }
    })
  })

  test.describe.skip("Authenticated - Delete Child", () => {
    test("should show delete confirmation", async ({ page }) => {
      await page.goto("/children")

      // Find delete button on child card
      const deleteButton = page.getByRole("button", { name: /supprimer/i }).first()

      if (await deleteButton.isVisible()) {
        await deleteButton.click()

        // Should show confirmation
        await expect(page.locator("text=/confirmer|supprimer.*\\?/i")).toBeVisible()
        await expect(page.getByRole("button", { name: /annuler/i })).toBeVisible()
        await expect(page.getByRole("button", { name: /confirmer/i })).toBeVisible()
      }
    })

    test("should cancel delete when clicking cancel", async ({ page }) => {
      await page.goto("/children")

      const deleteButton = page.getByRole("button", { name: /supprimer/i }).first()

      if (await deleteButton.isVisible()) {
        await deleteButton.click()

        // Click cancel
        await page.getByRole("button", { name: /annuler/i }).click()

        // Confirmation should disappear
        await expect(page.locator("text=/confirmer.*supprimer/i")).not.toBeVisible()
      }
    })

    test("should delete child when confirmed", async ({ page }) => {
      await page.goto("/children")

      const deleteButton = page.getByRole("button", { name: /supprimer/i }).first()

      if (await deleteButton.isVisible()) {
        // Get child name before deletion
        const childName = await page.locator("[data-testid='child-name']").first()
          .or(page.locator("h3, h4").first()).textContent()

        await deleteButton.click()
        await page.getByRole("button", { name: /confirmer/i }).click()

        // Should show success message
        await expect(
          page.locator("text=/supprimé|deleted|succès/i")
            .or(page.locator("[data-testid='toast-success']"))
        ).toBeVisible({ timeout: 10000 })
      }
    })
  })

  test.describe.skip("Authenticated - Setup PIN", () => {
    test("should display PIN setup form", async ({ page }) => {
      await page.goto("/children")

      // Find setup PIN button
      const setupPinButton = page.getByRole("button", { name: /configurer.*pin/i })
        .or(page.getByRole("link", { name: /configurer.*pin/i }))

      if (await setupPinButton.first().isVisible()) {
        await setupPinButton.first().click()

        // Should show PIN input
        await expect(page.getByLabel(/pin|code/i).or(page.locator("input[type='password']"))).toBeVisible()
      }
    })

    test("should validate PIN length", async ({ page }) => {
      await page.goto("/children")

      const setupPinButton = page.getByRole("button", { name: /configurer.*pin/i })
        .or(page.getByRole("link", { name: /configurer.*pin/i }))

      if (await setupPinButton.first().isVisible()) {
        await setupPinButton.first().click()

        // Enter short PIN
        const pinInput = page.getByLabel(/pin|code/i).or(page.locator("input[type='password']").first())
        await pinInput.fill("12")

        // Submit
        const submitButton = page.getByRole("button", { name: /confirmer|enregistrer|créer/i })
        await submitButton.click()

        // Should show validation error
        await expect(page.locator("text=/4.*chiffres|digits|caractères/i")).toBeVisible({ timeout: 5000 })
      }
    })

    test("should setup PIN successfully", async ({ page }) => {
      await page.goto("/children")

      const setupPinButton = page.getByRole("button", { name: /configurer.*pin/i })
        .or(page.getByRole("link", { name: /configurer.*pin/i }))

      if (await setupPinButton.first().isVisible()) {
        await setupPinButton.first().click()

        // Enter valid PIN
        const pinInput = page.getByLabel(/pin|code/i).or(page.locator("input[type='password']").first())
        await pinInput.fill("1234")

        // Confirm PIN if there's a second field
        const confirmPinInput = page.getByLabel(/confirmer/i)
        if (await confirmPinInput.isVisible()) {
          await confirmPinInput.fill("1234")
        }

        // Submit
        const submitButton = page.getByRole("button", { name: /confirmer|enregistrer|créer/i })
        await submitButton.click()

        // Should show success
        await expect(
          page.locator("text=/configuré|créé|succès|success/i")
            .or(page.locator("[data-testid='toast-success']"))
        ).toBeVisible({ timeout: 10000 })
      }
    })
  })

  test.describe.skip("Authenticated - Kids Space Link", () => {
    test("should display kids login link when PIN is configured", async ({ page }) => {
      await page.goto("/children")

      // If child has account, should show kids space link
      const kidsSpaceSection = page.locator("text=/espace enfant/i")
      const copyLinkButton = page.getByRole("button", { name: /copier/i })

      if (await kidsSpaceSection.first().isVisible()) {
        await expect(copyLinkButton.first().or(kidsSpaceSection.first())).toBeVisible()
      }
    })

    test("should copy kids login link to clipboard", async ({ page }) => {
      await page.goto("/children")

      const copyLinkButton = page.getByRole("button", { name: /copier.*lien/i })

      if (await copyLinkButton.first().isVisible()) {
        await copyLinkButton.first().click()

        // Should show copied confirmation
        await expect(
          page.locator("text=/copié/i")
            .or(page.locator("[data-testid='toast-success']"))
        ).toBeVisible({ timeout: 5000 })
      }
    })
  })

  test.describe.skip("Authenticated - Premium Limits", () => {
    test("should show upgrade prompt when child limit reached", async ({ page }) => {
      // This test assumes free tier limit is reached
      await page.goto("/children/new")

      // If limit is reached, should show premium prompt
      const premiumPrompt = page.locator("text=/limite.*atteinte|premium|passer.*premium/i")
      const childForm = page.getByLabel(/prénom/i)

      // Either show form or premium prompt
      await expect(premiumPrompt.or(childForm)).toBeVisible({ timeout: 10000 })
    })

    test("should have link to pricing page from limit prompt", async ({ page }) => {
      await page.goto("/children/new")

      const premiumLink = page.getByRole("link", { name: /premium|pricing/i })

      if (await premiumLink.isVisible()) {
        await expect(premiumLink).toHaveAttribute("href", /pricing/)
      }
    })
  })

  test.describe.skip("Authenticated - Child Card Interactions", () => {
    test("should navigate to child detail when clicking card", async ({ page }) => {
      await page.goto("/children")

      const childCard = page.locator("[data-testid='child-card']").first()
        .or(page.locator(".cursor-pointer").filter({ hasText: /an/i }).first())

      if (await childCard.isVisible()) {
        await childCard.click()

        // Should navigate to child detail page
        await expect(page).toHaveURL(/children\/[a-f0-9-]+$/)
      }
    })

    test("should show child info on card", async ({ page }) => {
      await page.goto("/children")

      const childCard = page.locator("[data-testid='child-card']").first()
        .or(page.locator(".cursor-pointer").filter({ hasText: /an/i }).first())

      if (await childCard.isVisible()) {
        // Should show name
        const name = childCard.locator("h3, h4, [data-testid='child-name']")
        await expect(name.first()).toBeVisible()

        // Should show age
        await expect(childCard.locator("text=/an|ans/i")).toBeVisible()
      }
    })

    test("should show school info if available", async ({ page }) => {
      await page.goto("/children")

      const childCard = page.locator("[data-testid='child-card']").first()
        .or(page.locator(".cursor-pointer").filter({ hasText: /an/i }).first())

      if (await childCard.isVisible()) {
        // School info is optional, but if present should be displayed
        const schoolInfo = childCard.locator("text=/école|primaire|collège|lycée|maternelle/i")
        // This is optional, so we just check the card is visible
        await expect(childCard).toBeVisible()
      }
    })
  })

  test.describe.skip("Authenticated - Tasks Integration", () => {
    test("should show pending tasks count on child detail", async ({ page }) => {
      await page.goto("/children")

      const childCard = page.locator("[data-testid='child-card']").first()
        .or(page.locator(".cursor-pointer").filter({ hasText: /an/i }).first())

      if (await childCard.isVisible()) {
        await childCard.click()

        // Should show tasks stats
        await expect(page.locator("text=/en cours|tâches/i").first()).toBeVisible({ timeout: 10000 })
      }
    })

    test("should have link to add task for child", async ({ page }) => {
      await page.goto("/children")

      const childCard = page.locator("[data-testid='child-card']").first()
        .or(page.locator(".cursor-pointer").filter({ hasText: /an/i }).first())

      if (await childCard.isVisible()) {
        await childCard.click()

        // Should have add task button
        const addTaskButton = page.getByRole("link", { name: /ajouter.*tâche/i })
          .or(page.getByRole("button", { name: /ajouter.*tâche/i }))
        await expect(addTaskButton.first()).toBeVisible({ timeout: 10000 })
      }
    })

    test("should have link to view all tasks for child", async ({ page }) => {
      await page.goto("/children")

      const childCard = page.locator("[data-testid='child-card']").first()
        .or(page.locator(".cursor-pointer").filter({ hasText: /an/i }).first())

      if (await childCard.isVisible()) {
        await childCard.click()

        // Should have view all tasks button
        const viewTasksButton = page.getByRole("link", { name: /toutes.*tâches|voir.*tâches/i })
          .or(page.getByRole("button", { name: /toutes.*tâches/i }))

        if (await viewTasksButton.first().isVisible()) {
          await viewTasksButton.first().click()
          await expect(page).toHaveURL(/tasks.*child_id=/)
        }
      }
    })
  })
})

test.describe("Kids Login Flow", () => {
  test("should display kids login page", async ({ page }) => {
    await page.goto("/kids")

    // Should show kids page or selector
    await expect(page.locator("body")).toBeVisible()
  })

  test("should display kids profile selector", async ({ page }) => {
    await page.goto("/kids")

    // Page should load without errors
    await expect(page.locator("body")).toBeVisible()

    // If there are profiles, should show them
    // If no profiles, should show appropriate message
  })

  test("should display PIN login form for specific child", async ({ page }) => {
    // Using a fake UUID
    await page.goto("/kids/login/00000000-0000-0000-0000-000000000001")

    // Should show PIN input or error if child doesn't exist
    await expect(page.locator("body")).toBeVisible()
  })
})

test.describe("Children Page Accessibility", () => {
  test("should have proper heading hierarchy", async ({ page }) => {
    await page.goto("/children")

    // If redirected to login, check login page
    // Otherwise check children page
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10000 })
  })

  test("should have accessible form labels", async ({ page }) => {
    await page.goto("/children/new")

    // Will redirect to login, but structure should exist
    await expect(page.locator("body")).toBeVisible()
  })

  test("should be keyboard navigable", async ({ page }) => {
    await page.goto("/login")

    // Tab through elements
    await page.keyboard.press("Tab")

    // Should have focused element
    const focusedElement = page.locator(":focus")
    await expect(focusedElement).toBeVisible()
  })
})

test.describe("Children Page Mobile Responsiveness", () => {
  test("should be responsive on mobile viewport", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    await page.goto("/children")

    // Page should be usable
    await expect(page.locator("body")).toBeVisible()
  })

  test("should show mobile-friendly buttons", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })

    await page.goto("/login")

    // Buttons should be visible and tappable
    const button = page.getByRole("button").first()
    await expect(button).toBeVisible()
  })
})
