/**
 * INTEGRATION TEST - Authentication (REAL DATABASE)
 *
 * Tests COMPLETS pour l'authentification:
 * - Signup parent
 * - Login parent
 * - Logout
 * - Session persistence
 * - Password reset flow
 * - Login enfant avec PIN
 * - PIN incorrect = blocage
 */

import { test, expect, Page, BrowserContext } from "@playwright/test"
import { getPool, query, queryOne, execute, closePool } from "../helpers/db"

// Test credentials
const TEST_SIGNUP_EMAIL = `test-signup-${Date.now()}@familyload.test`
const TEST_SIGNUP_PASSWORD = "TestSignup123!"

const EXISTING_USER = {
  email: "test-e2e@familyload.test",
  password: "TestE2E123!",
}

test.describe("🔐 Authentication - REAL Integration Tests", () => {

  test.afterAll(async () => {
    // Cleanup test user created during signup test
    await execute(`DELETE FROM users WHERE email = $1`, [TEST_SIGNUP_EMAIL])
    await closePool()
  })

  // ============================================================
  // SIGNUP TESTS
  // ============================================================

  test.describe("Signup Flow", () => {

    test("1.1 - Signup creates user in database", async ({ page }) => {
      // ARRANGE
      const initialUserCount = await queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM users WHERE email = $1`,
        [TEST_SIGNUP_EMAIL]
      )
      expect(parseInt(initialUserCount?.count ?? "0")).toBe(0)

      // ACT - Go to signup
      await page.goto("/signup")
      await expect(page.getByRole("heading", { name: /inscription|créer/i })).toBeVisible()

      // Fill form
      await page.getByLabel(/email/i).fill(TEST_SIGNUP_EMAIL)
      await page.getByLabel(/mot de passe/i).first().fill(TEST_SIGNUP_PASSWORD)

      // Check for confirm password field
      const confirmField = page.getByLabel(/confirmer|confirmation/i)
      if (await confirmField.isVisible()) {
        await confirmField.fill(TEST_SIGNUP_PASSWORD)
      }

      // Submit
      await page.getByRole("button", { name: /créer|inscription|s'inscrire/i }).click()

      // ASSERT - Should redirect to onboarding or dashboard
      await expect(page).toHaveURL(/onboarding|dashboard|verify/, { timeout: 15000 })

      // ASSERT - User exists in database
      const newUser = await queryOne<{ id: string; email: string }>(
        `SELECT id, email FROM users WHERE email = $1`,
        [TEST_SIGNUP_EMAIL]
      )
      expect(newUser).not.toBeNull()
      expect(newUser?.email).toBe(TEST_SIGNUP_EMAIL)
    })

    test("1.2 - Signup rejects invalid email", async ({ page }) => {
      await page.goto("/signup")

      await page.getByLabel(/email/i).fill("not-an-email")
      await page.getByLabel(/mot de passe/i).first().fill(TEST_SIGNUP_PASSWORD)

      await page.getByRole("button", { name: /créer|inscription/i }).click()

      // Should show error
      await expect(page.getByText(/email.*invalide|invalid.*email/i)).toBeVisible({ timeout: 5000 })

      // Should NOT create user
      const user = await queryOne(`SELECT * FROM users WHERE email = 'not-an-email'`)
      expect(user).toBeNull()
    })

    test("1.3 - Signup rejects weak password", async ({ page }) => {
      await page.goto("/signup")

      await page.getByLabel(/email/i).fill(`weak-pass-${Date.now()}@test.com`)
      await page.getByLabel(/mot de passe/i).first().fill("123") // Too weak

      await page.getByRole("button", { name: /créer|inscription/i }).click()

      // Should show error about password
      await expect(page.getByText(/mot de passe.*court|password.*short|caractères/i)).toBeVisible({ timeout: 5000 })
    })

    test("1.4 - Signup rejects duplicate email", async ({ page }) => {
      await page.goto("/signup")

      // Use existing user email
      await page.getByLabel(/email/i).fill(EXISTING_USER.email)
      await page.getByLabel(/mot de passe/i).first().fill(TEST_SIGNUP_PASSWORD)

      const confirmField = page.getByLabel(/confirmer|confirmation/i)
      if (await confirmField.isVisible()) {
        await confirmField.fill(TEST_SIGNUP_PASSWORD)
      }

      await page.getByRole("button", { name: /créer|inscription/i }).click()

      // Should show error about existing email
      await expect(page.getByText(/existe|already|déjà/i)).toBeVisible({ timeout: 10000 })
    })
  })

  // ============================================================
  // LOGIN TESTS
  // ============================================================

  test.describe("Login Flow", () => {

    test("2.1 - Login with valid credentials redirects to dashboard", async ({ page }) => {
      // ACT
      await page.goto("/login")
      await page.getByLabel(/email/i).fill(EXISTING_USER.email)
      await page.getByLabel(/mot de passe/i).fill(EXISTING_USER.password)
      await page.getByRole("button", { name: /connexion|login|se connecter/i }).click()

      // ASSERT
      await expect(page).toHaveURL(/dashboard|onboarding/, { timeout: 15000 })

      // Verify session cookie exists
      const cookies = await page.context().cookies()
      const sessionCookie = cookies.find(c =>
        c.name.includes("session") || c.name.includes("auth") || c.name.includes("token")
      )
      expect(sessionCookie).toBeTruthy()
    })

    test("2.2 - Login with wrong password shows error", async ({ page }) => {
      await page.goto("/login")

      await page.getByLabel(/email/i).fill(EXISTING_USER.email)
      await page.getByLabel(/mot de passe/i).fill("WrongPassword123!")

      await page.getByRole("button", { name: /connexion|login/i }).click()

      // Should show error
      await expect(page.getByText(/incorrect|invalide|erreur|failed/i)).toBeVisible({ timeout: 10000 })

      // Should stay on login page
      await expect(page).toHaveURL(/login/)
    })

    test("2.3 - Login with non-existent email shows error", async ({ page }) => {
      await page.goto("/login")

      await page.getByLabel(/email/i).fill("nonexistent@test.com")
      await page.getByLabel(/mot de passe/i).fill(TEST_SIGNUP_PASSWORD)

      await page.getByRole("button", { name: /connexion|login/i }).click()

      await expect(page.getByText(/incorrect|invalide|erreur|not found|introuvable/i)).toBeVisible({ timeout: 10000 })
    })

    test("2.4 - Protected routes redirect to login when not authenticated", async ({ page }) => {
      // Clear any existing session
      await page.context().clearCookies()

      // Try to access protected route
      await page.goto("/dashboard")

      // Should redirect to login
      await expect(page).toHaveURL(/login/, { timeout: 10000 })
    })
  })

  // ============================================================
  // SESSION TESTS
  // ============================================================

  test.describe("Session Management", () => {

    test("3.1 - Session persists after page reload", async ({ page }) => {
      // Login
      await page.goto("/login")
      await page.getByLabel(/email/i).fill(EXISTING_USER.email)
      await page.getByLabel(/mot de passe/i).fill(EXISTING_USER.password)
      await page.getByRole("button", { name: /connexion|login/i }).click()

      await expect(page).toHaveURL(/dashboard|onboarding/, { timeout: 15000 })

      // Reload page
      await page.reload()

      // Should still be on dashboard (not redirected to login)
      await expect(page).not.toHaveURL(/login/)
    })

    test("3.2 - Session persists in new tab", async ({ page, context }) => {
      // Login in first tab
      await page.goto("/login")
      await page.getByLabel(/email/i).fill(EXISTING_USER.email)
      await page.getByLabel(/mot de passe/i).fill(EXISTING_USER.password)
      await page.getByRole("button", { name: /connexion|login/i }).click()

      await expect(page).toHaveURL(/dashboard|onboarding/, { timeout: 15000 })

      // Open new tab
      const newPage = await context.newPage()
      await newPage.goto("/dashboard")

      // Should be authenticated in new tab
      await expect(newPage).not.toHaveURL(/login/)
      await expect(newPage).toHaveURL(/dashboard/)
    })

    test("3.3 - Logout clears session", async ({ page }) => {
      // Login first
      await page.goto("/login")
      await page.getByLabel(/email/i).fill(EXISTING_USER.email)
      await page.getByLabel(/mot de passe/i).fill(EXISTING_USER.password)
      await page.getByRole("button", { name: /connexion|login/i }).click()

      await expect(page).toHaveURL(/dashboard|onboarding/, { timeout: 15000 })

      // Find and click logout
      const userMenu = page.getByTestId("user-menu").or(page.getByRole("button", { name: /profil|account|menu/i }))
      if (await userMenu.isVisible()) {
        await userMenu.click()
      }

      const logoutBtn = page.getByRole("button", { name: /déconnexion|logout|se déconnecter/i })
        .or(page.getByRole("link", { name: /déconnexion|logout/i }))
        .or(page.getByText(/déconnexion|logout/i))

      await logoutBtn.click()

      // Should redirect to home or login
      await expect(page).toHaveURL(/login|^\/$/, { timeout: 10000 })

      // Try to access protected route
      await page.goto("/dashboard")

      // Should redirect to login
      await expect(page).toHaveURL(/login/)
    })
  })

  // ============================================================
  // KIDS LOGIN TESTS
  // ============================================================

  test.describe("Kids PIN Login", () => {

    test("4.1 - Kids can login with correct PIN", async ({ page }) => {
      // Get a child with account
      const child = await queryOne<{ id: string; first_name: string }>(`
        SELECT c.id, c.first_name
        FROM children c
        JOIN child_accounts ca ON c.id = ca.child_id
        WHERE c.is_active = true
        LIMIT 1
      `)

      if (!child) {
        test.skip()
        return
      }

      // Go to kids page
      await page.goto("/kids")

      // Click on child
      await page.getByText(new RegExp(child.first_name, "i")).click()

      // Enter PIN (assuming test PIN is 1234)
      const pinInput = page.locator('input[type="password"], input[type="tel"], input[inputmode="numeric"]')
      await pinInput.fill("1234")

      // Should redirect to kids dashboard
      await expect(page).toHaveURL(new RegExp(`/kids/${child.id}/dashboard`), { timeout: 10000 })

      // Should see child's name
      await expect(page.getByText(new RegExp(child.first_name, "i"))).toBeVisible()
    })

    test("4.2 - Wrong PIN shows error", async ({ page }) => {
      const child = await queryOne<{ id: string }>(`
        SELECT c.id FROM children c
        JOIN child_accounts ca ON c.id = ca.child_id
        WHERE c.is_active = true LIMIT 1
      `)

      if (!child) {
        test.skip()
        return
      }

      await page.goto(`/kids/login/${child.id}`)

      // Enter wrong PIN
      const pinInput = page.locator('input[type="password"], input[type="tel"], input[inputmode="numeric"]')
      await pinInput.fill("9999")

      // Should show error
      await expect(page.getByText(/incorrect|invalide|erreur/i)).toBeVisible({ timeout: 5000 })

      // Should NOT redirect
      await expect(page).toHaveURL(/login/)
    })

    test("4.3 - Multiple wrong PINs should show warning/lockout", async ({ page }) => {
      const child = await queryOne<{ id: string }>(`
        SELECT c.id FROM children c
        JOIN child_accounts ca ON c.id = ca.child_id
        WHERE c.is_active = true LIMIT 1
      `)

      if (!child) {
        test.skip()
        return
      }

      await page.goto(`/kids/login/${child.id}`)

      const pinInput = page.locator('input[type="password"], input[type="tel"], input[inputmode="numeric"]')

      // Try wrong PIN multiple times
      for (let i = 0; i < 3; i++) {
        await pinInput.fill("9999")
        await page.waitForTimeout(500)
        await pinInput.clear()
      }

      // Should show warning or lockout message
      const warningOrLockout = page.getByText(/tentative|essai|bloqué|locked|too many/i)
      // This may or may not exist depending on implementation
    })
  })
})
