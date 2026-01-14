import { test, expect } from "@playwright/test"

test.describe("Authentication", () => {
  test.describe("Login Flow", () => {
    test("should display login page", async ({ page }) => {
      await page.goto("/login")

      // Check page title and form elements
      await expect(page.locator("h1")).toContainText(/Connexion|Log in/i)
      await expect(page.getByRole("textbox", { name: /email/i })).toBeVisible()
      await expect(page.getByRole("button", { name: /Connexion|Log in|Continuer/i })).toBeVisible()
    })

    test("should show error for invalid credentials", async ({ page }) => {
      await page.goto("/login")

      // Fill in invalid credentials
      await page.getByRole("textbox", { name: /email/i }).fill("invalid@test.com")

      // Submit form
      await page.getByRole("button", { name: /Connexion|Log in|Continuer/i }).click()

      // Should show error or stay on login page
      await expect(page).toHaveURL(/login/)
    })

    test("should have signup link", async ({ page }) => {
      await page.goto("/login")

      // Check for signup link
      const signupLink = page.getByRole("link", { name: /inscription|signup|créer|create/i })
      await expect(signupLink).toBeVisible()
    })

    test("should have Google login option", async ({ page }) => {
      await page.goto("/login")

      // Check for Google button
      const googleButton = page.getByRole("button", { name: /google/i })
      await expect(googleButton).toBeVisible()
    })
  })

  test.describe("Signup Flow", () => {
    test("should display signup page", async ({ page }) => {
      await page.goto("/signup")

      // Check page elements
      await expect(page.locator("h1")).toContainText(/inscription|sign up|créer/i)
      await expect(page.getByRole("textbox", { name: /email/i })).toBeVisible()
    })

    test("should have login link", async ({ page }) => {
      await page.goto("/signup")

      // Check for login link
      const loginLink = page.getByRole("link", { name: /connexion|log in|déjà/i })
      await expect(loginLink).toBeVisible()
    })
  })

  test.describe("Protected Routes", () => {
    test("should redirect to login from dashboard when not authenticated", async ({ page }) => {
      // Try to access dashboard without authentication
      await page.goto("/dashboard")

      // Should redirect to login
      await expect(page).toHaveURL(/login/)
    })

    test("should redirect to login from settings when not authenticated", async ({ page }) => {
      await page.goto("/settings")
      await expect(page).toHaveURL(/login/)
    })

    test("should redirect to login from children page when not authenticated", async ({ page }) => {
      await page.goto("/children")
      await expect(page).toHaveURL(/login/)
    })

    test("should redirect to login from charge page when not authenticated", async ({ page }) => {
      await page.goto("/charge")
      await expect(page).toHaveURL(/login/)
    })
  })

  test.describe("Public Routes", () => {
    test("should allow access to home page", async ({ page }) => {
      await page.goto("/")
      await expect(page).toHaveURL("/")
    })

    test("should allow access to login page", async ({ page }) => {
      await page.goto("/login")
      await expect(page).toHaveURL("/login")
    })

    test("should allow access to signup page", async ({ page }) => {
      await page.goto("/signup")
      await expect(page).toHaveURL("/signup")
    })
  })
})
