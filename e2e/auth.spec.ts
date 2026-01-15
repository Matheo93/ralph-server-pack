/**
 * Authentication E2E Tests
 *
 * Tests for login, signup, and logout flows.
 * Tests protection of authenticated routes.
 */

import { test, expect } from "@playwright/test"

test.describe("Authentication", () => {
  test.describe("Login Page", () => {
    test("should display login form", async ({ page }) => {
      await page.goto("/login")

      // Check page title
      await expect(page).toHaveTitle(/FamilyLoad/)

      // Check form elements are present
      await expect(page.getByLabel(/email/i)).toBeVisible()
      await expect(page.getByLabel(/mot de passe|password/i)).toBeVisible()
      await expect(page.getByRole("button", { name: /connexion|login|se connecter/i })).toBeVisible()
    })

    test("should show link to signup", async ({ page }) => {
      await page.goto("/login")

      // Should have link to create account
      const signupLink = page.getByRole("link", { name: /inscription|signup|créer|create/i })
      await expect(signupLink).toBeVisible()
    })

    test("should show validation errors for empty form", async ({ page }) => {
      await page.goto("/login")

      // Click submit without filling form
      await page.getByRole("button", { name: /connexion|login|se connecter/i }).click()

      // Should show validation error
      await expect(page.locator("text=/obligatoire|required|invalide|invalid/i")).toBeVisible({ timeout: 5000 })
    })

    test("should show error for invalid credentials", async ({ page }) => {
      await page.goto("/login")

      // Fill with invalid credentials
      await page.getByLabel(/email/i).fill("invalid@example.com")
      await page.getByLabel(/mot de passe|password/i).fill("wrongpassword")
      await page.getByRole("button", { name: /connexion|login|se connecter/i }).click()

      // Should show error message
      await expect(page.locator("text=/erreur|error|incorrect|invalide/i")).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe("Signup Page", () => {
    test("should display signup form", async ({ page }) => {
      await page.goto("/signup")

      // Check form elements
      await expect(page.getByLabel(/email/i)).toBeVisible()
      await expect(page.getByLabel(/mot de passe|password/i).first()).toBeVisible()
    })

    test("should show link to login", async ({ page }) => {
      await page.goto("/signup")

      // Should have link to login
      const loginLink = page.getByRole("link", { name: /connexion|login|déjà un compte/i })
      await expect(loginLink).toBeVisible()
    })

    test("should validate email format", async ({ page }) => {
      await page.goto("/signup")

      // Fill with invalid email
      await page.getByLabel(/email/i).fill("not-an-email")
      await page.getByLabel(/mot de passe|password/i).first().click() // blur email

      // Should show validation error
      await expect(page.locator("text=/invalide|invalid|format/i")).toBeVisible({ timeout: 5000 })
    })
  })

  test.describe("Route Protection", () => {
    test("should redirect unauthenticated users from dashboard", async ({ page }) => {
      await page.goto("/dashboard")

      // Should redirect to login
      await expect(page).toHaveURL(/login|connexion/)
    })

    test("should redirect unauthenticated users from tasks", async ({ page }) => {
      await page.goto("/tasks")

      // Should redirect to login
      await expect(page).toHaveURL(/login|connexion/)
    })

    test("should redirect unauthenticated users from settings", async ({ page }) => {
      await page.goto("/settings")

      // Should redirect to login
      await expect(page).toHaveURL(/login|connexion/)
    })

    test("should allow access to public pages", async ({ page }) => {
      // Home page should be accessible
      await page.goto("/")
      await expect(page.locator("body")).toBeVisible()

      // Login should be accessible
      await page.goto("/login")
      await expect(page.locator("body")).toBeVisible()

      // Signup should be accessible
      await page.goto("/signup")
      await expect(page.locator("body")).toBeVisible()
    })
  })
})

test.describe("Navigation", () => {
  test("should have consistent navigation elements", async ({ page }) => {
    await page.goto("/login")

    // Check for logo or brand
    const brand = page.locator("[data-testid='logo'], .logo, [alt*='logo'], text=FamilyLoad")
    await expect(brand.first()).toBeVisible({ timeout: 5000 })
  })
})
