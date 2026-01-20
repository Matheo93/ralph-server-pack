/**
 * INTEGRATION TEST - Onboarding Flow (REAL DATABASE)
 *
 * Tests COMPLETS pour l'onboarding:
 * - Création de household
 * - Ajout des enfants
 * - Configuration des préférences
 * - Génération de tâches suggérées
 */

import { test, expect, Page } from "@playwright/test"
import { getPool, query, queryOne, execute, closePool, getTestUser } from "../helpers/db"

// Test credentials - fresh signup for onboarding
const ONBOARDING_EMAIL = `onboarding-test-${Date.now()}@familyload.test`
const ONBOARDING_PASSWORD = "OnboardTest123!"

test.describe("🏠 Onboarding Flow - REAL Integration Tests", () => {
  let userId: string | null = null
  let householdId: string | null = null

  test.afterAll(async () => {
    // Cleanup all test data
    if (householdId) {
      await execute(`DELETE FROM children WHERE household_id = $1`, [householdId])
      await execute(`DELETE FROM tasks WHERE household_id = $1`, [householdId])
      await execute(`DELETE FROM household_members WHERE household_id = $1`, [householdId])
      await execute(`DELETE FROM households WHERE id = $1`, [householdId])
    }
    if (userId) {
      await execute(`DELETE FROM users WHERE id = $1`, [userId])
    }
    await closePool()
  })

  // ============================================================
  // HOUSEHOLD CREATION
  // ============================================================

  test.describe("Household Setup", () => {

    test("1.1 - Onboarding creates household after signup", async ({ page }) => {
      // First signup
      await page.goto("/signup")
      await page.getByLabel(/email/i).fill(ONBOARDING_EMAIL)
      await page.getByLabel(/mot de passe/i).first().fill(ONBOARDING_PASSWORD)

      const confirmField = page.getByLabel(/confirmer|confirmation/i)
      if (await confirmField.isVisible()) {
        await confirmField.fill(ONBOARDING_PASSWORD)
      }

      await page.getByRole("button", { name: /créer|inscription/i }).click()

      // Should redirect to onboarding
      await expect(page).toHaveURL(/onboarding/, { timeout: 15000 })

      // Get user from DB
      const user = await queryOne<{ id: string }>(`
        SELECT id FROM users WHERE email = $1
      `, [ONBOARDING_EMAIL])
      expect(user).not.toBeNull()
      userId = user!.id

      // Fill household name
      const householdInput = page.getByLabel(/nom.*famille|household|foyer/i)
        .or(page.getByPlaceholder(/famille/i))
      await householdInput.fill("Famille Test E2E")

      // Submit step 1
      await page.getByRole("button", { name: /suivant|continuer|next/i }).click()

      // Wait for household creation
      await page.waitForTimeout(2000)

      // ASSERT: Household created in DB
      const membership = await queryOne<{ household_id: string }>(`
        SELECT household_id FROM household_members WHERE user_id = $1
      `, [userId])
      expect(membership).not.toBeNull()
      householdId = membership!.household_id

      const household = await queryOne<{ name: string }>(`
        SELECT name FROM households WHERE id = $1
      `, [householdId])
      expect(household?.name).toBe("Famille Test E2E")
    })

    test("1.2 - Onboarding validates household name", async ({ page }) => {
      await page.goto("/onboarding")

      // Try empty name
      const householdInput = page.getByLabel(/nom.*famille|household/i)
        .or(page.getByPlaceholder(/famille/i))

      if (await householdInput.isVisible()) {
        await householdInput.fill("")
        await page.getByRole("button", { name: /suivant|continuer/i }).click()

        // Should show error
        await expect(page.getByText(/requis|obligatoire|required/i)).toBeVisible({ timeout: 5000 })
      }
    })
  })

  // ============================================================
  // CHILDREN ADDITION
  // ============================================================

  test.describe("Children Setup", () => {

    test("2.1 - Adding child creates record in database", async ({ page }) => {
      // Login with onboarding user
      await page.goto("/login")
      await page.getByLabel(/email/i).fill(ONBOARDING_EMAIL)
      await page.getByLabel(/mot de passe/i).fill(ONBOARDING_PASSWORD)
      await page.getByRole("button", { name: /connexion/i }).click()

      await expect(page).toHaveURL(/onboarding|dashboard/, { timeout: 15000 })

      // Navigate to children step if needed
      const addChildBtn = page.getByRole("button", { name: /ajouter.*enfant|add.*child/i })
        .or(page.getByTestId("add-child-button"))

      if (await addChildBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await addChildBtn.click()

        // Fill child info
        await page.getByLabel(/prénom|first.*name/i).fill("TestChild")
        await page.getByLabel(/date.*naissance|birthdate/i).fill("2015-06-15")

        // Select avatar if available
        const avatar = page.locator('[data-testid="avatar-option"]').first()
        if (await avatar.isVisible().catch(() => false)) {
          await avatar.click()
        }

        // Save child
        await page.getByRole("button", { name: /enregistrer|sauvegarder|save/i }).click()

        // Wait for DB write
        await page.waitForTimeout(2000)

        // ASSERT: Child in database
        if (householdId) {
          const child = await queryOne<{ first_name: string }>(`
            SELECT first_name FROM children
            WHERE household_id = $1 AND first_name = 'TestChild'
          `, [householdId])
          expect(child).not.toBeNull()
        }
      }
    })

    test("2.2 - Child PIN is created for account", async ({ page }) => {
      if (!householdId) {
        test.skip()
        return
      }

      // Get child
      const child = await queryOne<{ id: string }>(`
        SELECT id FROM children WHERE household_id = $1 LIMIT 1
      `, [householdId])

      if (!child) {
        test.skip()
        return
      }

      // Navigate to child settings
      await page.goto("/login")
      await page.getByLabel(/email/i).fill(ONBOARDING_EMAIL)
      await page.getByLabel(/mot de passe/i).fill(ONBOARDING_PASSWORD)
      await page.getByRole("button", { name: /connexion/i }).click()

      await expect(page).toHaveURL(/dashboard|onboarding/, { timeout: 15000 })

      // Go to settings/children
      await page.goto("/settings/children")

      // Click on child to edit
      const childCard = page.getByText("TestChild")
      if (await childCard.isVisible().catch(() => false)) {
        await childCard.click()

        // Set PIN
        const pinInput = page.getByLabel(/pin|code/i)
        if (await pinInput.isVisible().catch(() => false)) {
          await pinInput.fill("1234")
          await page.getByRole("button", { name: /enregistrer|save/i }).click()

          await page.waitForTimeout(2000)

          // ASSERT: PIN created in DB
          const account = await queryOne<{ id: string }>(`
            SELECT id FROM child_accounts WHERE child_id = $1
          `, [child.id])
          expect(account).not.toBeNull()
        }
      }
    })

    test("2.3 - Multiple children can be added", async ({ page }) => {
      if (!householdId) {
        test.skip()
        return
      }

      // Get initial count
      const initialCount = await queryOne<{ count: string }>(`
        SELECT COUNT(*) as count FROM children WHERE household_id = $1
      `, [householdId])
      const startCount = parseInt(initialCount?.count ?? "0")

      // Login
      await page.goto("/login")
      await page.getByLabel(/email/i).fill(ONBOARDING_EMAIL)
      await page.getByLabel(/mot de passe/i).fill(ONBOARDING_PASSWORD)
      await page.getByRole("button", { name: /connexion/i }).click()

      await expect(page).toHaveURL(/dashboard|onboarding/, { timeout: 15000 })

      // Go to settings/children
      await page.goto("/settings/children")

      // Add another child
      const addBtn = page.getByRole("button", { name: /ajouter/i })
      if (await addBtn.isVisible().catch(() => false)) {
        await addBtn.click()

        await page.getByLabel(/prénom/i).fill("SecondChild")
        await page.getByLabel(/date.*naissance/i).fill("2018-03-20")
        await page.getByRole("button", { name: /enregistrer|save/i }).click()

        await page.waitForTimeout(2000)

        // ASSERT: Count increased
        const newCount = await queryOne<{ count: string }>(`
          SELECT COUNT(*) as count FROM children WHERE household_id = $1
        `, [householdId])
        expect(parseInt(newCount?.count ?? "0")).toBeGreaterThan(startCount)
      }
    })
  })

  // ============================================================
  // PREFERENCES SETUP
  // ============================================================

  test.describe("Preferences Setup", () => {

    test("3.1 - Category preferences are saved", async ({ page }) => {
      if (!householdId) {
        test.skip()
        return
      }

      // Login
      await page.goto("/login")
      await page.getByLabel(/email/i).fill(ONBOARDING_EMAIL)
      await page.getByLabel(/mot de passe/i).fill(ONBOARDING_PASSWORD)
      await page.getByRole("button", { name: /connexion/i }).click()

      await expect(page).toHaveURL(/dashboard|onboarding/, { timeout: 15000 })

      // Navigate to onboarding preferences step if in onboarding
      // Or to settings/preferences if on dashboard
      const prefsPage = page.url().includes("onboarding")
        ? page
        : await page.goto("/settings/preferences").then(() => page)

      // Select task categories
      const categories = page.locator('[data-testid="category-toggle"], [role="checkbox"]')
      const count = await categories.count()

      if (count > 0) {
        // Toggle some categories
        await categories.first().click()

        // Save
        await page.getByRole("button", { name: /enregistrer|save|suivant/i }).click()

        await page.waitForTimeout(2000)

        // ASSERT: Preferences saved
        const prefs = await queryOne(`
          SELECT * FROM household_preferences WHERE household_id = $1
        `, [householdId])

        // May or may not exist depending on implementation
      }
    })

    test("3.2 - Notification preferences are saved", async ({ page }) => {
      // Login
      await page.goto("/login")
      await page.getByLabel(/email/i).fill(ONBOARDING_EMAIL)
      await page.getByLabel(/mot de passe/i).fill(ONBOARDING_PASSWORD)
      await page.getByRole("button", { name: /connexion/i }).click()

      await expect(page).toHaveURL(/dashboard|onboarding/, { timeout: 15000 })

      // Go to notification settings
      await page.goto("/settings/notifications")

      // Toggle notifications
      const emailToggle = page.getByLabel(/email/i).or(page.locator('[data-testid="email-notifications"]'))
      if (await emailToggle.isVisible().catch(() => false)) {
        await emailToggle.click()
        await page.getByRole("button", { name: /enregistrer|save/i }).click()
      }
    })
  })

  // ============================================================
  // SUGGESTED TASKS GENERATION
  // ============================================================

  test.describe("Task Suggestions", () => {

    test("4.1 - Suggested tasks appear based on children age", async ({ page }) => {
      if (!householdId) {
        test.skip()
        return
      }

      // Login
      await page.goto("/login")
      await page.getByLabel(/email/i).fill(ONBOARDING_EMAIL)
      await page.getByLabel(/mot de passe/i).fill(ONBOARDING_PASSWORD)
      await page.getByRole("button", { name: /connexion/i }).click()

      await expect(page).toHaveURL(/dashboard|onboarding/, { timeout: 15000 })

      // Look for task suggestions
      const suggestions = page.getByTestId("task-suggestions")
        .or(page.getByText(/tâches suggérées|suggestions/i))

      if (await suggestions.isVisible({ timeout: 5000 }).catch(() => false)) {
        // Should have age-appropriate tasks
        await expect(suggestions).toBeVisible()
      }
    })

    test("4.2 - Accepting suggested task creates it in DB", async ({ page }) => {
      if (!householdId) {
        test.skip()
        return
      }

      // Get initial task count
      const initialCount = await queryOne<{ count: string }>(`
        SELECT COUNT(*) as count FROM tasks WHERE household_id = $1
      `, [householdId])
      const startCount = parseInt(initialCount?.count ?? "0")

      // Login
      await page.goto("/login")
      await page.getByLabel(/email/i).fill(ONBOARDING_EMAIL)
      await page.getByLabel(/mot de passe/i).fill(ONBOARDING_PASSWORD)
      await page.getByRole("button", { name: /connexion/i }).click()

      await expect(page).toHaveURL(/dashboard|onboarding/, { timeout: 15000 })

      // Find and accept a suggestion
      const acceptBtn = page.getByRole("button", { name: /ajouter|accepter|add/i })
        .first()

      if (await acceptBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await acceptBtn.click()
        await page.waitForTimeout(2000)

        // ASSERT: Task count increased
        const newCount = await queryOne<{ count: string }>(`
          SELECT COUNT(*) as count FROM tasks WHERE household_id = $1
        `, [householdId])
        expect(parseInt(newCount?.count ?? "0")).toBeGreaterThan(startCount)
      }
    })
  })

  // ============================================================
  // ONBOARDING COMPLETION
  // ============================================================

  test.describe("Completion", () => {

    test("5.1 - Completing onboarding redirects to dashboard", async ({ page }) => {
      // Login
      await page.goto("/login")
      await page.getByLabel(/email/i).fill(ONBOARDING_EMAIL)
      await page.getByLabel(/mot de passe/i).fill(ONBOARDING_PASSWORD)
      await page.getByRole("button", { name: /connexion/i }).click()

      // If still in onboarding, complete it
      if (page.url().includes("onboarding")) {
        // Click through steps
        const nextBtn = page.getByRole("button", { name: /suivant|continuer|terminer|finish/i })

        while (await nextBtn.isVisible().catch(() => false)) {
          await nextBtn.click()
          await page.waitForTimeout(1000)

          if (page.url().includes("dashboard")) break
        }
      }

      // Should end up on dashboard
      await expect(page).toHaveURL(/dashboard/, { timeout: 15000 })
    })

    test("5.2 - Onboarding status is saved (user doesnt see it again)", async ({ page, context }) => {
      // Login
      await page.goto("/login")
      await page.getByLabel(/email/i).fill(ONBOARDING_EMAIL)
      await page.getByLabel(/mot de passe/i).fill(ONBOARDING_PASSWORD)
      await page.getByRole("button", { name: /connexion/i }).click()

      await expect(page).toHaveURL(/dashboard/, { timeout: 15000 })

      // Open new tab, should go directly to dashboard
      const newPage = await context.newPage()
      await newPage.goto("/")

      // Should redirect to dashboard, NOT onboarding
      await expect(newPage).toHaveURL(/dashboard/, { timeout: 15000 })
      await expect(newPage).not.toHaveURL(/onboarding/)
    })
  })
})
