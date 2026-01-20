/**
 * Authentication Helper for E2E Tests
 *
 * Provides real authentication utilities for integration tests.
 * NO MOCKS - uses actual login flow.
 */

import { Page, expect } from "@playwright/test"

/**
 * Test user credentials
 * These should exist in the test database
 */
export const TEST_USER = {
  email: "test-e2e@familyload.test",
  password: "TestE2E123!",
  name: "Test User E2E",
}

/**
 * Test child info
 */
export const TEST_CHILD = {
  name: "Johan",
  pin: "1234",
}

/**
 * Login via UI with email/password
 * This is a REAL login, not mocked
 */
export async function loginAs(
  page: Page,
  credentials: { email: string; password: string } = TEST_USER
): Promise<void> {
  await page.goto("/login")

  // Fill credentials
  await page.getByLabel(/email/i).fill(credentials.email)
  await page.getByLabel(/mot de passe|password/i).fill(credentials.password)

  // Submit
  await page.getByRole("button", { name: /connexion|login|se connecter/i }).click()

  // Wait for redirect
  await expect(page).toHaveURL(/dashboard|onboarding/, { timeout: 15000 })
}

/**
 * Login and navigate to a specific page
 */
export async function loginAndGoTo(
  page: Page,
  path: string,
  credentials: { email: string; password: string } = TEST_USER
): Promise<void> {
  await loginAs(page, credentials)
  if (!page.url().endsWith(path)) {
    await page.goto(path)
  }
}

/**
 * Login as child with PIN
 */
export async function loginAsChild(
  page: Page,
  childId: string,
  pin: string = TEST_CHILD.pin
): Promise<void> {
  await page.goto(`/kids/login/${childId}`)

  // Enter PIN
  const pinInput = page.locator('input[type="password"], input[type="tel"], input[inputmode="numeric"]')
  await pinInput.fill(pin)

  // Wait for redirect
  await expect(page).toHaveURL(new RegExp(`/kids/${childId}`), { timeout: 10000 })
}

/**
 * Get auth cookie from logged-in page
 */
export async function getAuthCookie(page: Page): Promise<string> {
  const cookies = await page.context().cookies()
  const authCookies = cookies.filter(c =>
    c.name.includes("session") ||
    c.name.includes("auth") ||
    c.name.includes("token")
  )
  return authCookies.map(c => `${c.name}=${c.value}`).join("; ")
}

/**
 * Check if user is logged in
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  const url = page.url()
  return (
    url.includes("/dashboard") ||
    url.includes("/tasks") ||
    url.includes("/settings") ||
    url.includes("/calendar") ||
    url.includes("/shopping")
  )
}

/**
 * Logout user
 */
export async function logout(page: Page): Promise<void> {
  // Try to find and click logout button
  const userMenu = page.getByTestId("user-menu")
    .or(page.getByRole("button", { name: /profil|account|menu/i }))

  if (await userMenu.isVisible().catch(() => false)) {
    await userMenu.click()
  }

  const logoutBtn = page.getByRole("button", { name: /déconnexion|logout/i })
    .or(page.getByRole("link", { name: /déconnexion|logout/i }))

  if (await logoutBtn.isVisible().catch(() => false)) {
    await logoutBtn.click()
    await expect(page).toHaveURL(/login|^\/$/, { timeout: 10000 })
  } else {
    // Fallback: clear cookies
    await page.context().clearCookies()
    await page.goto("/login")
  }
}

/**
 * Wait for authentication redirect
 */
export async function waitForAuthRedirect(
  page: Page,
  expectedPath: string,
  timeout: number = 15000
): Promise<void> {
  await expect(page).toHaveURL(new RegExp(expectedPath), { timeout })
}

/**
 * Create a fresh session for testing
 * Clears all cookies and storage
 */
export async function clearSession(page: Page): Promise<void> {
  await page.context().clearCookies()
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
}

/**
 * Helper to get cookies as header string for API requests
 */
export async function getCookieHeader(page: Page): Promise<string> {
  const cookies = await page.context().cookies()
  return cookies.map(c => `${c.name}=${c.value}`).join("; ")
}

/**
 * Setup authenticated API request context
 */
export async function setupAuthenticatedRequest(page: Page) {
  await loginAs(page, TEST_USER)
  return getCookieHeader(page)
}
