/**
 * Settings E2E Tests
 *
 * Tests for all settings pages: main settings, profile, notifications,
 * privacy, billing, preferences, and household management.
 */

import { test, expect } from "@playwright/test"

test.describe("Settings Pages", () => {
  test.describe("Main Settings Page", () => {
    test("should redirect unauthenticated users to login", async ({ page }) => {
      await page.goto("/settings")
      await expect(page).toHaveURL(/login|connexion/, { timeout: 10000 })
    })

    test("should display all settings sections when authenticated", async ({ page }) => {
      // This test requires authentication - check if page loads with proper content
      await page.goto("/settings")

      // If redirected to login, that's expected for unauthenticated users
      const url = page.url()
      if (url.includes("login")) {
        // Verify login page loads correctly
        await expect(page.locator("body")).toBeVisible()
        return
      }

      // If authenticated, verify settings sections
      await expect(page.locator("h1")).toContainText(/Paramètres|Settings/i)

      // Check for settings section links
      const settingsSections = [
        "Profil",
        "Foyer",
        "Espace Enfants",
        "Préférences",
        "Notifications",
        "Templates",
        "Confidentialité",
      ]

      for (const section of settingsSections) {
        await expect(
          page.locator(`text=${section}`).first()
        ).toBeVisible({ timeout: 5000 })
      }
    })

    test("settings page should have danger zone", async ({ page }) => {
      await page.goto("/settings")

      const url = page.url()
      if (url.includes("login")) {
        return // Skip if not authenticated
      }

      // Check for danger zone section
      await expect(
        page.locator("text=/Zone de danger|Danger zone/i")
      ).toBeVisible({ timeout: 5000 })

      // Check for delete account button
      await expect(
        page.locator("text=/Supprimer mon compte|Delete my account/i").first()
      ).toBeVisible()
    })
  })

  test.describe("Profile Settings", () => {
    test("should redirect unauthenticated users from profile settings", async ({ page }) => {
      await page.goto("/settings/profile")
      await expect(page).toHaveURL(/login|connexion/, { timeout: 10000 })
    })

    test("profile page should have back navigation", async ({ page }) => {
      await page.goto("/settings/profile")

      const url = page.url()
      if (url.includes("login")) {
        return
      }

      // Should have back button to settings
      await expect(
        page.locator("text=/Retour aux paramètres|Back to settings/i")
      ).toBeVisible({ timeout: 5000 })
    })

    test("profile page should display form fields", async ({ page }) => {
      await page.goto("/settings/profile")

      const url = page.url()
      if (url.includes("login")) {
        return
      }

      // Check for profile page title
      await expect(page.locator("h1")).toContainText(/Profil|Profile/i)

      // Check for account information card
      await expect(
        page.locator("text=/Informations du compte|Account information/i")
      ).toBeVisible({ timeout: 5000 })

      // Check for email section (readonly)
      await expect(
        page.locator("text=/Adresse email|Email address/i")
      ).toBeVisible()
    })
  })

  test.describe("Notification Settings", () => {
    test("should redirect unauthenticated users from notification settings", async ({ page }) => {
      await page.goto("/settings/notifications")
      await expect(page).toHaveURL(/login|connexion/, { timeout: 10000 })
    })

    test("notification page should display preference options", async ({ page }) => {
      await page.goto("/settings/notifications")

      const url = page.url()
      if (url.includes("login")) {
        return
      }

      // Check for notification page title
      await expect(page.locator("h1")).toContainText(/Notifications/i)

      // Check for notification channels section
      await expect(
        page.locator("text=/Canaux de notification|Notification channels/i")
      ).toBeVisible({ timeout: 5000 })

      // Check for daily reminders section
      await expect(
        page.locator("text=/Rappels quotidiens|Daily reminders/i")
      ).toBeVisible()

      // Check for summaries and alerts section
      await expect(
        page.locator("text=/Résumés et alertes|Summaries and alerts/i")
      ).toBeVisible()
    })

    test("notification page should show reminder settings", async ({ page }) => {
      await page.goto("/settings/notifications")

      const url = page.url()
      if (url.includes("login")) {
        return
      }

      // Check for morning reminder
      await expect(
        page.locator("text=/Rappel du matin|Morning reminder/i")
      ).toBeVisible({ timeout: 5000 })

      // Check for deadline reminder
      await expect(
        page.locator("text=/Avant deadline|Before deadline/i")
      ).toBeVisible()

      // Check for weekly summary
      await expect(
        page.locator("text=/Résumé hebdomadaire|Weekly summary/i")
      ).toBeVisible()
    })
  })

  test.describe("Privacy Settings", () => {
    test("should redirect unauthenticated users from privacy settings", async ({ page }) => {
      await page.goto("/settings/privacy")
      await expect(page).toHaveURL(/login|connexion/, { timeout: 10000 })
    })

    test("privacy page should display GDPR information", async ({ page }) => {
      await page.goto("/settings/privacy")

      const url = page.url()
      if (url.includes("login")) {
        return
      }

      // Check for privacy page title
      await expect(page.locator("h1")).toContainText(/Confidentialité|Privacy/i)

      // Check for data protection section
      await expect(
        page.locator("text=/Protection de vos données|Data protection/i")
      ).toBeVisible({ timeout: 5000 })

      // Check for GDPR mention
      await expect(
        page.locator("text=/RGPD|GDPR/i")
      ).toBeVisible()
    })

    test("privacy page should have export and delete options", async ({ page }) => {
      await page.goto("/settings/privacy")

      const url = page.url()
      if (url.includes("login")) {
        return
      }

      // Check for export data section
      await expect(
        page.locator("text=/Exporter mes données|Export my data/i")
      ).toBeVisible({ timeout: 5000 })

      // Check for delete account section
      await expect(
        page.locator("text=/Supprimer mon compte|Delete my account/i").first()
      ).toBeVisible()

      // Check for irreversible action warning
      await expect(
        page.locator("text=/irréversible|irreversible/i")
      ).toBeVisible()
    })
  })

  test.describe("Billing Settings", () => {
    test("should redirect unauthenticated users from billing settings", async ({ page }) => {
      await page.goto("/settings/billing")
      await expect(page).toHaveURL(/login|onboarding|connexion/, { timeout: 10000 })
    })
  })

  test.describe("Preferences Settings", () => {
    test("should redirect unauthenticated users from preferences settings", async ({ page }) => {
      await page.goto("/settings/preferences")
      await expect(page).toHaveURL(/login|connexion/, { timeout: 10000 })
    })

    test("preferences page should display category options", async ({ page }) => {
      await page.goto("/settings/preferences")

      const url = page.url()
      if (url.includes("login")) {
        return
      }

      // Check for preferences page title
      await expect(page.locator("h1")).toContainText(/Préférences|Preferences/i)

      // Check for assignment preferences description
      await expect(
        page.locator("text=/catégorie|category/i").first()
      ).toBeVisible({ timeout: 5000 })
    })
  })

  test.describe("Household Settings", () => {
    test("should redirect unauthenticated users from household settings", async ({ page }) => {
      await page.goto("/settings/household")
      await expect(page).toHaveURL(/login|onboarding|connexion/, { timeout: 10000 })
    })

    test("household page should display member management", async ({ page }) => {
      await page.goto("/settings/household")

      const url = page.url()
      if (url.includes("login") || url.includes("onboarding")) {
        return
      }

      // Check for household page title
      await expect(page.locator("h1")).toContainText(/Foyer|Household/i)

      // Check for household info section
      await expect(
        page.locator("text=/Informations du foyer|Household information/i")
      ).toBeVisible({ timeout: 5000 })

      // Check for members section
      await expect(
        page.locator("text=/Membres du foyer|Household members/i")
      ).toBeVisible()

      // Check for statistics section
      await expect(
        page.locator("text=/Statistiques|Statistics/i")
      ).toBeVisible()
    })
  })

  test.describe("Kids Settings", () => {
    test("should redirect unauthenticated users from kids settings", async ({ page }) => {
      await page.goto("/settings/kids")
      await expect(page).toHaveURL(/login|onboarding|connexion/, { timeout: 10000 })
    })
  })

  test.describe("Templates Settings", () => {
    test("should redirect unauthenticated users from templates settings", async ({ page }) => {
      await page.goto("/settings/templates")
      await expect(page).toHaveURL(/login|connexion/, { timeout: 10000 })
    })
  })

  test.describe("Settings Navigation", () => {
    test("should navigate from main settings to sub-pages", async ({ page }) => {
      await page.goto("/settings")

      const url = page.url()
      if (url.includes("login")) {
        return
      }

      // Click on Profile link
      await page.click("text=Profil")
      await expect(page).toHaveURL(/settings\/profile/, { timeout: 10000 })

      // Go back to settings
      await page.click("text=/Retour aux paramètres|Back to settings/i")
      await expect(page).toHaveURL(/\/settings$/, { timeout: 10000 })
    })

    test("settings links should be clickable", async ({ page }) => {
      await page.goto("/settings")

      const url = page.url()
      if (url.includes("login")) {
        return
      }

      // Verify that settings cards are links
      const profileCard = page.locator("a[href='/settings/profile']")
      await expect(profileCard).toBeVisible({ timeout: 5000 })

      const householdCard = page.locator("a[href='/settings/household']")
      await expect(householdCard).toBeVisible()

      const notificationsCard = page.locator("a[href='/settings/notifications']")
      await expect(notificationsCard).toBeVisible()

      const privacyCard = page.locator("a[href='/settings/privacy']")
      await expect(privacyCard).toBeVisible()
    })
  })
})

test.describe("Settings Accessibility", () => {
  test("settings page should have proper heading structure", async ({ page }) => {
    await page.goto("/settings")

    const url = page.url()
    if (url.includes("login")) {
      return
    }

    // Check for main heading
    const h1 = page.locator("h1")
    await expect(h1).toBeVisible({ timeout: 5000 })
    await expect(h1).toContainText(/Paramètres|Settings/i)

    // Check for section heading in danger zone
    const h2 = page.locator("h2")
    await expect(h2.first()).toBeVisible()
  })

  test("settings page should have visible buttons", async ({ page }) => {
    await page.goto("/settings")

    const url = page.url()
    if (url.includes("login")) {
      return
    }

    // Check that delete account button is visible and styled appropriately
    const deleteButton = page.locator("button").filter({ hasText: /Supprimer|Delete/i })
    await expect(deleteButton.first()).toBeVisible({ timeout: 5000 })
  })
})
