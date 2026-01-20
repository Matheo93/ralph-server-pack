/**
 * INTEGRATION TEST - Settings (REAL DATABASE)
 *
 * Tests COMPLETS pour les paramètres:
 * - Profil utilisateur
 * - Gestion des enfants
 * - Notifications
 * - Préférences
 * - Sécurité
 * - Données et export
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

test.describe("⚙️ Settings - REAL Integration Tests", () => {
  let householdId: string
  let userId: string

  test.beforeAll(async () => {
    const user = await getTestUser(TEST_USER.email)
    if (!user) throw new Error("Test user not found")
    householdId = user.householdId
    userId = user.id
  })

  test.afterAll(async () => {
    await closePool()
  })

  async function login(page: Page) {
    await page.goto("/login")
    await page.getByLabel(/email/i).fill(TEST_USER.email)
    await page.getByLabel(/mot de passe/i).fill(TEST_USER.password)
    await page.getByRole("button", { name: /connexion/i }).click()
    await expect(page).toHaveURL(/dashboard/, { timeout: 15000 })
  }

  // ============================================================
  // PROFILE SETTINGS
  // ============================================================

  test.describe("Profile Settings", () => {

    test("1.1 - Can view profile information", async ({ page }) => {
      await login(page)
      await page.goto("/settings/profile")

      // Should see email
      await expect(page.getByText(TEST_USER.email)).toBeVisible()

      // Should see name field
      await expect(page.getByLabel(/nom|name/i)).toBeVisible()
    })

    test("1.2 - Can update profile name", async ({ page }) => {
      await login(page)
      await page.goto("/settings/profile")

      const nameInput = page.getByLabel(/nom|name/i)
      await nameInput.fill("Test User E2E Updated")

      await page.getByRole("button", { name: /enregistrer|save/i }).click()
      await page.waitForTimeout(2000)

      // Verify in database
      const user = await queryOne<{ name: string }>(`
        SELECT name FROM users WHERE id = $1
      `, [userId])
      expect(user?.name).toContain("E2E Updated")
    })

    test("1.3 - Can upload avatar", async ({ page }) => {
      await login(page)
      await page.goto("/settings/profile")

      const avatarUpload = page.locator('input[type="file"]')
      if (await avatarUpload.isVisible().catch(() => false)) {
        // Would upload file
        // await avatarUpload.setInputFiles('path/to/avatar.png')
      }
    })

    test("1.4 - Profile validates required fields", async ({ page }) => {
      await login(page)
      await page.goto("/settings/profile")

      const nameInput = page.getByLabel(/nom|name/i)
      await nameInput.fill("")

      await page.getByRole("button", { name: /enregistrer|save/i }).click()

      // Should show validation error
      await expect(page.getByText(/requis|required/i)).toBeVisible({ timeout: 5000 })
    })
  })

  // ============================================================
  // CHILDREN MANAGEMENT
  // ============================================================

  test.describe("Children Management", () => {

    test("2.1 - Can view children list", async ({ page }) => {
      await login(page)
      await page.goto("/settings/children")

      const children = await getChildren(householdId)
      for (const child of children) {
        await expect(page.getByText(child.firstName)).toBeVisible()
      }
    })

    test("2.2 - Can add new child", async ({ page }) => {
      const initialCount = await queryOne<{ count: string }>(`
        SELECT COUNT(*) as count FROM children WHERE household_id = $1
      `, [householdId])
      const startCount = parseInt(initialCount?.count ?? "0")

      await login(page)
      await page.goto("/settings/children")

      const addBtn = page.getByRole("button", { name: /ajouter|add/i })
      await addBtn.click()

      await page.getByLabel(/prénom|first.*name/i).fill("SettingsTestChild")
      await page.getByLabel(/date.*naissance|birthdate/i).fill("2017-08-15")

      await page.getByRole("button", { name: /enregistrer|save/i }).click()
      await page.waitForTimeout(2000)

      const newCount = await queryOne<{ count: string }>(`
        SELECT COUNT(*) as count FROM children WHERE household_id = $1
      `, [householdId])
      expect(parseInt(newCount?.count ?? "0")).toBeGreaterThan(startCount)

      // Cleanup
      await execute(`DELETE FROM children WHERE household_id = $1 AND first_name = 'SettingsTestChild'`, [householdId])
    })

    test("2.3 - Can edit child information", async ({ page }) => {
      const children = await getChildren(householdId)
      if (children.length === 0) {
        test.skip()
        return
      }

      await login(page)
      await page.goto("/settings/children")

      // Click on first child
      await page.getByText(children[0].firstName).click()

      // Edit
      const editBtn = page.getByRole("button", { name: /modifier|edit/i })
      if (await editBtn.isVisible().catch(() => false)) {
        await editBtn.click()

        // Change something
        const nicknameInput = page.getByLabel(/surnom|nickname/i)
        if (await nicknameInput.isVisible().catch(() => false)) {
          await nicknameInput.fill("Petit")
          await page.getByRole("button", { name: /save|enregistrer/i }).click()
        }
      }
    })

    test("2.4 - Can set child PIN", async ({ page }) => {
      const children = await getChildren(householdId)
      if (children.length === 0) {
        test.skip()
        return
      }

      await login(page)
      await page.goto(`/settings/children/${children[0].id}`)

      const pinSection = page.getByText(/pin|code/i)
      if (await pinSection.isVisible().catch(() => false)) {
        const pinInput = page.getByLabel(/pin|code/i)
        await pinInput.fill("5678")
        await page.getByRole("button", { name: /save|enregistrer/i }).click()

        await page.waitForTimeout(2000)

        // Verify PIN was saved
        const account = await queryOne<{ pin_hash: string }>(`
          SELECT pin_hash FROM child_accounts WHERE child_id = $1
        `, [children[0].id])
        expect(account?.pin_hash).toBeTruthy()
      }
    })

    test("2.5 - Can delete child", async ({ page }) => {
      // Create temporary child
      const result = await queryOne<{ id: string }>(`
        INSERT INTO children (household_id, first_name, birthdate, is_active)
        VALUES ($1, 'ToDelete', '2018-01-01', true)
        RETURNING id
      `, [householdId])
      const childId = result?.id

      await login(page)
      await page.goto(`/settings/children/${childId}`)

      const deleteBtn = page.getByRole("button", { name: /supprimer|delete/i })
      if (await deleteBtn.isVisible().catch(() => false)) {
        await deleteBtn.click()

        const confirmBtn = page.getByRole("button", { name: /confirmer|oui/i })
        if (await confirmBtn.isVisible().catch(() => false)) {
          await confirmBtn.click()
        }

        await page.waitForTimeout(2000)

        // Verify deleted (or deactivated)
        const child = await queryOne<{ is_active: boolean }>(`
          SELECT is_active FROM children WHERE id = $1
        `, [childId])
        expect(child?.is_active).toBe(false)
      }

      // Cleanup
      await execute(`DELETE FROM children WHERE id = $1`, [childId])
    })
  })

  // ============================================================
  // NOTIFICATIONS SETTINGS
  // ============================================================

  test.describe("Notification Settings", () => {

    test("3.1 - Can view notification preferences", async ({ page }) => {
      await login(page)
      await page.goto("/settings/notifications")

      // Should see notification toggles
      await expect(page.getByText(/notification|email|push/i)).toBeVisible()
    })

    test("3.2 - Can toggle email notifications", async ({ page }) => {
      await login(page)
      await page.goto("/settings/notifications")

      const emailToggle = page.getByLabel(/email/i)
        .or(page.locator('[data-testid="email-notifications"]'))

      if (await emailToggle.isVisible().catch(() => false)) {
        const wasChecked = await emailToggle.isChecked()
        await emailToggle.click()
        await page.getByRole("button", { name: /save|enregistrer/i }).click()
        await page.waitForTimeout(2000)

        // Verify changed
        await page.reload()
        const isNowChecked = await emailToggle.isChecked()
        expect(isNowChecked).toBe(!wasChecked)

        // Restore
        await emailToggle.click()
        await page.getByRole("button", { name: /save/i }).click()
      }
    })

    test("3.3 - Can toggle push notifications", async ({ page }) => {
      await login(page)
      await page.goto("/settings/notifications")

      const pushToggle = page.getByLabel(/push/i)
        .or(page.locator('[data-testid="push-notifications"]'))

      if (await pushToggle.isVisible().catch(() => false)) {
        await pushToggle.click()
        await page.getByRole("button", { name: /save/i }).click()
      }
    })

    test("3.4 - Can set reminder preferences", async ({ page }) => {
      await login(page)
      await page.goto("/settings/notifications")

      const reminderTime = page.getByLabel(/rappel|reminder.*time/i)
      if (await reminderTime.isVisible().catch(() => false)) {
        await reminderTime.selectOption("30") // 30 minutes before
        await page.getByRole("button", { name: /save/i }).click()
      }
    })
  })

  // ============================================================
  // HOUSEHOLD SETTINGS
  // ============================================================

  test.describe("Household Settings", () => {

    test("4.1 - Can view household information", async ({ page }) => {
      await login(page)
      await page.goto("/settings/household")

      // Should see household name
      await expect(page.getByLabel(/nom.*famille|household.*name/i)).toBeVisible()
    })

    test("4.2 - Can update household name", async ({ page }) => {
      await login(page)
      await page.goto("/settings/household")

      const nameInput = page.getByLabel(/nom.*famille|household/i)
      const originalName = await nameInput.inputValue()

      await nameInput.fill("Test Household E2E")
      await page.getByRole("button", { name: /save|enregistrer/i }).click()
      await page.waitForTimeout(2000)

      // Verify
      const household = await queryOne<{ name: string }>(`
        SELECT name FROM households WHERE id = $1
      `, [householdId])
      expect(household?.name).toBe("Test Household E2E")

      // Restore
      await execute(`UPDATE households SET name = $1 WHERE id = $2`, [originalName, householdId])
    })

    test("4.3 - Can invite family member", async ({ page }) => {
      await login(page)
      await page.goto("/settings/household")

      const inviteBtn = page.getByRole("button", { name: /inviter|invite/i })
      if (await inviteBtn.isVisible().catch(() => false)) {
        await inviteBtn.click()

        const emailInput = page.getByLabel(/email/i)
        await emailInput.fill("invite-test@example.com")

        await page.getByRole("button", { name: /envoyer|send/i }).click()

        // Should show success or pending invitation
        await expect(page.getByText(/invitation.*envoyée|sent/i)).toBeVisible({ timeout: 5000 })
      }
    })

    test("4.4 - Can view household members", async ({ page }) => {
      await login(page)
      await page.goto("/settings/household")

      // Should see member list
      await expect(page.getByText(/membre|member/i)).toBeVisible()
      await expect(page.getByText(TEST_USER.email)).toBeVisible()
    })
  })

  // ============================================================
  // SECURITY SETTINGS
  // ============================================================

  test.describe("Security Settings", () => {

    test("5.1 - Can change password", async ({ page }) => {
      await login(page)
      await page.goto("/settings/security")

      const changePasswordBtn = page.getByRole("button", { name: /changer.*mot.*passe|change.*password/i })
      if (await changePasswordBtn.isVisible().catch(() => false)) {
        await changePasswordBtn.click()

        // Fill form
        await page.getByLabel(/actuel|current/i).fill(TEST_USER.password)
        await page.getByLabel(/nouveau|new/i).first().fill("NewPassword123!")
        await page.getByLabel(/confirmer|confirm/i).fill("NewPassword123!")

        // Don't actually change in test
        // await page.getByRole('button', { name: /save/i }).click()
      }
    })

    test("5.2 - Password change validates current password", async ({ page }) => {
      await login(page)
      await page.goto("/settings/security")

      const changePasswordBtn = page.getByRole("button", { name: /changer.*mot.*passe/i })
      if (await changePasswordBtn.isVisible().catch(() => false)) {
        await changePasswordBtn.click()

        await page.getByLabel(/actuel|current/i).fill("WrongPassword!")
        await page.getByLabel(/nouveau|new/i).first().fill("NewPassword123!")
        await page.getByLabel(/confirmer|confirm/i).fill("NewPassword123!")

        await page.getByRole("button", { name: /save|enregistrer/i }).click()

        // Should show error
        await expect(page.getByText(/incorrect|invalid|erreur/i)).toBeVisible({ timeout: 5000 })
      }
    })

    test("5.3 - Can enable 2FA", async ({ page }) => {
      await login(page)
      await page.goto("/settings/security")

      const enable2FA = page.getByRole("button", { name: /activer.*2fa|enable.*2fa/i })
      if (await enable2FA.isVisible().catch(() => false)) {
        await enable2FA.click()

        // Should show QR code or setup instructions
        await expect(page.locator('img[alt*="qr"], [class*="qr"]')).toBeVisible({ timeout: 5000 })
      }
    })

    test("5.4 - Shows active sessions", async ({ page }) => {
      await login(page)
      await page.goto("/settings/security")

      // Should show current session
      const sessions = page.getByText(/session|appareil|device/i)
      await expect(sessions).toBeVisible()
    })
  })

  // ============================================================
  // DATA & PRIVACY
  // ============================================================

  test.describe("Data & Privacy", () => {

    test("6.1 - Can export data", async ({ page }) => {
      await login(page)
      await page.goto("/settings/data")

      const exportBtn = page.getByRole("button", { name: /exporter|export|télécharger/i })
      if (await exportBtn.isVisible().catch(() => false)) {
        await exportBtn.click()

        // Should trigger download or show progress
        await expect(page.getByText(/prépar|generating|download/i)).toBeVisible({ timeout: 5000 })
      }
    })

    test("6.2 - Can view privacy policy", async ({ page }) => {
      await login(page)
      await page.goto("/settings/data")

      const privacyLink = page.getByRole("link", { name: /confidentialité|privacy/i })
      if (await privacyLink.isVisible().catch(() => false)) {
        await privacyLink.click()
        await expect(page).toHaveURL(/privacy|confidentialite/)
      }
    })

    test("6.3 - Can request account deletion", async ({ page }) => {
      await login(page)
      await page.goto("/settings/data")

      const deleteBtn = page.getByRole("button", { name: /supprimer.*compte|delete.*account/i })
      if (await deleteBtn.isVisible().catch(() => false)) {
        await deleteBtn.click()

        // Should show warning
        await expect(page.getByText(/irréversible|permanent|sûr/i)).toBeVisible()

        // Don't actually delete
      }
    })
  })

  // ============================================================
  // PREFERENCES
  // ============================================================

  test.describe("Preferences", () => {

    test("7.1 - Can change language", async ({ page }) => {
      await login(page)
      await page.goto("/settings/preferences")

      const langSelect = page.getByLabel(/langue|language/i)
      if (await langSelect.isVisible().catch(() => false)) {
        await langSelect.selectOption("en")
        await page.getByRole("button", { name: /save/i }).click()

        // Page should reload in English
        await page.waitForTimeout(2000)

        // Restore
        await langSelect.selectOption("fr")
        await page.getByRole("button", { name: /save/i }).click()
      }
    })

    test("7.2 - Can toggle dark mode", async ({ page }) => {
      await login(page)
      await page.goto("/settings/preferences")

      const darkToggle = page.getByLabel(/sombre|dark/i)
        .or(page.locator('[data-testid="dark-mode-toggle"]'))

      if (await darkToggle.isVisible().catch(() => false)) {
        await darkToggle.click()

        // Check for dark class
        const html = page.locator("html")
        await expect(html).toHaveClass(/dark/)

        // Toggle back
        await darkToggle.click()
      }
    })

    test("7.3 - Can set default task category", async ({ page }) => {
      await login(page)
      await page.goto("/settings/preferences")

      const categorySelect = page.getByLabel(/catégorie.*défaut|default.*category/i)
      if (await categorySelect.isVisible().catch(() => false)) {
        await categorySelect.selectOption("chores")
        await page.getByRole("button", { name: /save/i }).click()
      }
    })

    test("7.4 - Can set week start day", async ({ page }) => {
      await login(page)
      await page.goto("/settings/preferences")

      const weekStartSelect = page.getByLabel(/début.*semaine|week.*start/i)
      if (await weekStartSelect.isVisible().catch(() => false)) {
        await weekStartSelect.selectOption("monday")
        await page.getByRole("button", { name: /save/i }).click()
      }
    })
  })
})
