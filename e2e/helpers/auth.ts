import { Page } from "@playwright/test"

/**
 * Test user credentials and data
 * In a real scenario, these would be test accounts in a test environment
 */
export const TEST_USER = {
  email: "test@familyload.app",
  password: "test-password-123",
  name: "Test User",
  householdName: "Test Household",
}

/**
 * Mock authentication state for testing
 * Sets cookies/localStorage to simulate logged in state
 */
export async function mockAuthenticatedState(page: Page) {
  // Set a mock session cookie
  await page.context().addCookies([
    {
      name: "test-auth-session",
      value: "mock-session-token",
      domain: "localhost",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
  ])

  // Set localStorage state
  await page.evaluate(() => {
    localStorage.setItem("familyload-test-mode", "true")
  })
}

/**
 * Login via UI (for full integration tests)
 */
export async function loginViaUI(page: Page, email: string = TEST_USER.email) {
  await page.goto("/login")

  // Fill in email
  await page.getByRole("textbox", { name: /email/i }).fill(email)

  // Submit form
  await page.getByRole("button", { name: /Connexion|Log in|Continuer/i }).click()

  // Wait for redirect (magic link would be sent in real scenario)
  await page.waitForURL(/dashboard|onboarding/, { timeout: 10000 }).catch(() => {
    // If no redirect, we're still on login (expected for mock tests)
  })
}

/**
 * Logout user
 */
export async function logout(page: Page) {
  // Clear cookies
  await page.context().clearCookies()

  // Clear localStorage
  await page.evaluate(() => {
    localStorage.clear()
  })

  await page.goto("/login")
}

/**
 * Check if user is logged in
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  const url = page.url()
  return url.includes("/dashboard") || url.includes("/tasks") || url.includes("/children")
}

/**
 * Wait for authentication redirect
 */
export async function waitForAuthRedirect(page: Page, expectedPath: string) {
  await page.waitForURL(new RegExp(expectedPath), { timeout: 10000 })
}
