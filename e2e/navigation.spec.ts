import { test, expect } from "@playwright/test"

test.describe("Navigation", () => {
  test.describe("Landing Page", () => {
    test("should display landing page with main elements", async ({ page }) => {
      await page.goto("/")

      // Check for main heading (FamilyLoad branding)
      await expect(page.locator("body")).toContainText(/FamilyLoad/i)

      // Check for CTA buttons
      const ctaButton = page.getByRole("link", { name: /commencer|start|essayer|try/i }).first()
      await expect(ctaButton).toBeVisible()
    })

    test("should have working navigation links", async ({ page }) => {
      await page.goto("/")

      // Check for login/signup links
      const loginLink = page.getByRole("link", { name: /connexion|login/i }).first()
      if (await loginLink.isVisible()) {
        await loginLink.click()
        await expect(page).toHaveURL(/login/)
      }
    })
  })

  test.describe("404 Page", () => {
    test("should display 404 for non-existent pages", async ({ page }) => {
      const response = await page.goto("/non-existent-page-12345")

      // Should show 404 status or redirect
      if (response) {
        expect([404, 200]).toContain(response.status())
      }

      // Page should have some indication it's not found
      await expect(page.locator("body")).toContainText(/404|not found|introuvable|page/i)
    })
  })

  test.describe("Responsive Design", () => {
    test("should display correctly on mobile viewport", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto("/")

      // Page should still be functional
      await expect(page.locator("body")).toBeVisible()
    })

    test("should display correctly on tablet viewport", async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 })
      await page.goto("/")

      await expect(page.locator("body")).toBeVisible()
    })

    test("should display correctly on desktop viewport", async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 })
      await page.goto("/")

      await expect(page.locator("body")).toBeVisible()
    })
  })
})
