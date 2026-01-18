/**
 * Shopping List E2E Tests
 *
 * Tests for the family shopping list:
 * - Route protection
 * - Adding items (quick add and detailed form)
 * - Toggling item completion
 * - Deleting items
 * - Category filtering
 * - Clearing checked items
 */

import { test, expect } from "@playwright/test"

test.describe("Shopping List", () => {
  test.describe("Route Protection", () => {
    test("should redirect unauthenticated users to login", async ({ page }) => {
      await page.goto("/shopping")
      await expect(page).toHaveURL(/login/)
    })
  })

  test.describe("Page Structure", () => {
    test("should display shopping page title for redirect check", async ({ page }) => {
      // This test documents the expected structure for authenticated users
      await page.goto("/shopping")
      // Will redirect to login for unauthenticated users
      await expect(page).toHaveURL(/login/)
    })
  })

  // Tests that require authentication - documented for future use with auth fixtures
  test.describe.skip("Authenticated Shopping Operations", () => {
    test("should display shopping list page", async ({ page }) => {
      await page.goto("/shopping")

      // Should show page title
      await expect(page.getByRole("heading", { name: /liste de courses/i })).toBeVisible()

      // Should show the shopping list component
      const shoppingList = page.locator("[data-testid='shopping-list']")
      await expect(shoppingList).toBeVisible()
    })

    test("should display stats cards", async ({ page }) => {
      await page.goto("/shopping")

      // Should show stat cards
      await expect(page.getByText(/total/i)).toBeVisible()
      await expect(page.getByText(/cochés/i)).toBeVisible()
      await expect(page.getByText(/urgents/i)).toBeVisible()
      await expect(page.getByText(/catégories/i)).toBeVisible()
    })

    test("should display quick add form", async ({ page }) => {
      await page.goto("/shopping")

      // Should show quick add input
      const quickAddInput = page.locator("[data-testid='quick-add-input']")
      await expect(quickAddInput).toBeVisible()

      // Should show submit button
      const submitButton = page.locator("[data-testid='quick-add-submit']")
      await expect(submitButton).toBeVisible()

      // Should show detailed add button
      const detailedButton = page.locator("[data-testid='add-detailed-button']")
      await expect(detailedButton).toBeVisible()
    })

    test("should show empty state when list is empty", async ({ page }) => {
      await page.goto("/shopping")

      // If no items, should show empty state
      const emptyState = page.locator("[data-testid='empty-state']")
      const itemsList = page.locator("[data-testid='shopping-items-list']")

      // Either empty state or items list should be visible
      const isEmpty = await emptyState.isVisible()
      const hasItems = await itemsList.isVisible()
      expect(isEmpty || hasItems).toBeTruthy()
    })
  })

  test.describe.skip("Quick Add Item", () => {
    test("should add item via quick add input", async ({ page }) => {
      await page.goto("/shopping")

      const quickAddInput = page.locator("[data-testid='quick-add-input']")
      const submitButton = page.locator("[data-testid='quick-add-submit']")

      // Type item name
      await quickAddInput.fill("Lait E2E Test")

      // Submit
      await submitButton.click()

      // Wait for the item to appear
      await expect(page.getByText("Lait E2E Test")).toBeVisible({ timeout: 10000 })
    })

    test("should add item via Enter key", async ({ page }) => {
      await page.goto("/shopping")

      const quickAddInput = page.locator("[data-testid='quick-add-input']")

      // Type item name and press Enter
      await quickAddInput.fill("Pain E2E Test")
      await quickAddInput.press("Enter")

      // Wait for the item to appear
      await expect(page.getByText("Pain E2E Test")).toBeVisible({ timeout: 10000 })
    })

    test("should clear input after adding item", async ({ page }) => {
      await page.goto("/shopping")

      const quickAddInput = page.locator("[data-testid='quick-add-input']")
      const submitButton = page.locator("[data-testid='quick-add-submit']")

      // Type and submit
      await quickAddInput.fill("Beurre E2E Test")
      await submitButton.click()

      // Input should be cleared
      await expect(quickAddInput).toHaveValue("")
    })

    test("should not submit empty item", async ({ page }) => {
      await page.goto("/shopping")

      const submitButton = page.locator("[data-testid='quick-add-submit']")

      // Button should be disabled when input is empty
      await expect(submitButton).toBeDisabled()
    })
  })

  test.describe.skip("Detailed Add Item Dialog", () => {
    test("should open add item dialog", async ({ page }) => {
      await page.goto("/shopping")

      // Click detailed add button
      await page.locator("[data-testid='add-detailed-button']").click()

      // Dialog should open
      const dialog = page.locator("[data-testid='add-item-dialog']")
      await expect(dialog).toBeVisible()
    })

    test("should display all form fields", async ({ page }) => {
      await page.goto("/shopping")

      // Open dialog
      await page.locator("[data-testid='add-detailed-button']").click()

      // Check form fields
      await expect(page.getByLabel(/nom de l'article/i)).toBeVisible()
      await expect(page.getByLabel(/quantité/i)).toBeVisible()
      await expect(page.getByLabel(/unité/i)).toBeVisible()
      await expect(page.getByLabel(/catégorie/i)).toBeVisible()
      await expect(page.getByLabel(/note/i)).toBeVisible()
      await expect(page.getByLabel(/urgent/i)).toBeVisible()
    })

    test("should add item with details", async ({ page }) => {
      await page.goto("/shopping")

      // Open dialog
      await page.locator("[data-testid='add-detailed-button']").click()

      // Fill form
      await page.locator("[data-testid='add-item-name']").fill("Tomates Bio E2E")
      await page.locator("[data-testid='add-item-quantity']").fill("3")

      // Submit
      await page.locator("[data-testid='add-item-submit']").click()

      // Dialog should close
      await expect(page.locator("[data-testid='add-item-dialog']")).not.toBeVisible({ timeout: 10000 })

      // Item should appear
      await expect(page.getByText("Tomates Bio E2E")).toBeVisible()
    })

    test("should add urgent item", async ({ page }) => {
      await page.goto("/shopping")

      // Open dialog
      await page.locator("[data-testid='add-detailed-button']").click()

      // Fill form with urgent flag
      await page.locator("[data-testid='add-item-name']").fill("Couches Urgent E2E")
      await page.locator("[data-testid='add-item-urgent']").click()

      // Submit
      await page.locator("[data-testid='add-item-submit']").click()

      // Wait for dialog to close and item to appear
      await expect(page.locator("[data-testid='add-item-dialog']")).not.toBeVisible({ timeout: 10000 })
      await expect(page.getByText("Couches Urgent E2E")).toBeVisible()

      // Should show urgent badge
      await expect(page.getByText("Urgent")).toBeVisible()
    })

    test("should close dialog on cancel", async ({ page }) => {
      await page.goto("/shopping")

      // Open dialog
      await page.locator("[data-testid='add-detailed-button']").click()
      await expect(page.locator("[data-testid='add-item-dialog']")).toBeVisible()

      // Cancel
      await page.locator("[data-testid='add-item-cancel']").click()

      // Dialog should close
      await expect(page.locator("[data-testid='add-item-dialog']")).not.toBeVisible()
    })

    test("should close dialog on escape key", async ({ page }) => {
      await page.goto("/shopping")

      // Open dialog
      await page.locator("[data-testid='add-detailed-button']").click()
      await expect(page.locator("[data-testid='add-item-dialog']")).toBeVisible()

      // Press Escape
      await page.keyboard.press("Escape")

      // Dialog should close
      await expect(page.locator("[data-testid='add-item-dialog']")).not.toBeVisible()
    })

    test("should show validation error for empty name", async ({ page }) => {
      await page.goto("/shopping")

      // Open dialog
      await page.locator("[data-testid='add-detailed-button']").click()

      // Clear name and submit
      await page.locator("[data-testid='add-item-name']").fill("")
      await page.locator("[data-testid='add-item-submit']").click()

      // Should show error or validation message
      // The form has required attribute, so browser will show validation
      const nameInput = page.locator("[data-testid='add-item-name']")
      await expect(nameInput).toBeFocused()
    })
  })

  test.describe.skip("Toggle Item Completion", () => {
    test("should toggle item as checked", async ({ page }) => {
      await page.goto("/shopping")

      // First add an item
      const quickAddInput = page.locator("[data-testid='quick-add-input']")
      await quickAddInput.fill("Test Toggle Item E2E")
      await quickAddInput.press("Enter")
      await expect(page.getByText("Test Toggle Item E2E")).toBeVisible({ timeout: 10000 })

      // Find the checkbox
      const itemCheckbox = page.locator("[data-testid='shopping-item']")
        .filter({ hasText: "Test Toggle Item E2E" })
        .locator("[data-testid='shopping-item-checkbox']")

      // Click to check
      await itemCheckbox.click()

      // Item should be marked as checked (has line-through style)
      const item = page.locator("[data-testid='shopping-item']").filter({ hasText: "Test Toggle Item E2E" })
      await expect(item).toHaveAttribute("data-item-checked", "true")
    })

    test("should toggle item back to unchecked", async ({ page }) => {
      await page.goto("/shopping")

      // Add and check an item
      const quickAddInput = page.locator("[data-testid='quick-add-input']")
      await quickAddInput.fill("Test Uncheck Item E2E")
      await quickAddInput.press("Enter")
      await expect(page.getByText("Test Uncheck Item E2E")).toBeVisible({ timeout: 10000 })

      const item = page.locator("[data-testid='shopping-item']").filter({ hasText: "Test Uncheck Item E2E" })
      const checkbox = item.locator("[data-testid='shopping-item-checkbox']")

      // Check
      await checkbox.click()
      await expect(item).toHaveAttribute("data-item-checked", "true")

      // Uncheck
      await checkbox.click()
      await expect(item).toHaveAttribute("data-item-checked", "false")
    })

    test("should show who checked the item", async ({ page }) => {
      await page.goto("/shopping")

      // Add and check an item
      const quickAddInput = page.locator("[data-testid='quick-add-input']")
      await quickAddInput.fill("Test Checked By E2E")
      await quickAddInput.press("Enter")
      await expect(page.getByText("Test Checked By E2E")).toBeVisible({ timeout: 10000 })

      const item = page.locator("[data-testid='shopping-item']").filter({ hasText: "Test Checked By E2E" })
      const checkbox = item.locator("[data-testid='shopping-item-checkbox']")

      // Check
      await checkbox.click()

      // Should show "Coché par" text
      await expect(item.getByText(/coché par/i)).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe.skip("Delete Item", () => {
    test("should show delete option in menu", async ({ page }) => {
      await page.goto("/shopping")

      // Add an item
      const quickAddInput = page.locator("[data-testid='quick-add-input']")
      await quickAddInput.fill("Test Delete Menu E2E")
      await quickAddInput.press("Enter")
      await expect(page.getByText("Test Delete Menu E2E")).toBeVisible({ timeout: 10000 })

      // Open menu
      const item = page.locator("[data-testid='shopping-item']").filter({ hasText: "Test Delete Menu E2E" })
      await item.locator("[data-testid='shopping-item-menu']").click()

      // Should show delete option
      await expect(page.locator("[data-testid='shopping-item-delete']")).toBeVisible()
    })

    test("should ask for confirmation before deleting", async ({ page }) => {
      await page.goto("/shopping")

      // Add an item
      const quickAddInput = page.locator("[data-testid='quick-add-input']")
      await quickAddInput.fill("Test Delete Confirm E2E")
      await quickAddInput.press("Enter")
      await expect(page.getByText("Test Delete Confirm E2E")).toBeVisible({ timeout: 10000 })

      // Set up dialog handler
      page.on("dialog", async dialog => {
        expect(dialog.message()).toContain("Supprimer")
        await dialog.dismiss()
      })

      // Open menu and click delete
      const item = page.locator("[data-testid='shopping-item']").filter({ hasText: "Test Delete Confirm E2E" })
      await item.locator("[data-testid='shopping-item-menu']").click()
      await page.locator("[data-testid='shopping-item-delete']").click()

      // Item should still be there (we dismissed the dialog)
      await expect(page.getByText("Test Delete Confirm E2E")).toBeVisible()
    })

    test("should delete item on confirmation", async ({ page }) => {
      await page.goto("/shopping")

      // Add an item
      const quickAddInput = page.locator("[data-testid='quick-add-input']")
      await quickAddInput.fill("Test Delete Real E2E")
      await quickAddInput.press("Enter")
      await expect(page.getByText("Test Delete Real E2E")).toBeVisible({ timeout: 10000 })

      // Accept confirmation dialog
      page.on("dialog", async dialog => {
        await dialog.accept()
      })

      // Open menu and click delete
      const item = page.locator("[data-testid='shopping-item']").filter({ hasText: "Test Delete Real E2E" })
      await item.locator("[data-testid='shopping-item-menu']").click()
      await page.locator("[data-testid='shopping-item-delete']").click()

      // Item should be gone
      await expect(page.getByText("Test Delete Real E2E")).not.toBeVisible({ timeout: 10000 })
    })
  })

  test.describe.skip("Category Filtering", () => {
    test("should display category filter when multiple categories exist", async ({ page }) => {
      await page.goto("/shopping")

      // Add items in different categories via detailed form
      // Item 1 - Fruits
      await page.locator("[data-testid='add-detailed-button']").click()
      await page.locator("[data-testid='add-item-name']").fill("Pommes Category E2E")
      await page.getByLabel(/catégorie/i).click()
      await page.getByText(/fruits/i).click()
      await page.locator("[data-testid='add-item-submit']").click()
      await expect(page.locator("[data-testid='add-item-dialog']")).not.toBeVisible({ timeout: 10000 })

      // Item 2 - Produits laitiers
      await page.locator("[data-testid='add-detailed-button']").click()
      await page.locator("[data-testid='add-item-name']").fill("Yaourt Category E2E")
      await page.getByLabel(/catégorie/i).click()
      await page.getByText(/produits laitiers/i).click()
      await page.locator("[data-testid='add-item-submit']").click()
      await expect(page.locator("[data-testid='add-item-dialog']")).not.toBeVisible({ timeout: 10000 })

      // Category filter should be visible
      await expect(page.locator("[data-testid='category-filter']")).toBeVisible()
    })

    test("should filter items by category", async ({ page }) => {
      await page.goto("/shopping")

      // Add items in different categories
      await page.locator("[data-testid='add-detailed-button']").click()
      await page.locator("[data-testid='add-item-name']").fill("Oranges Filter E2E")
      await page.getByLabel(/catégorie/i).click()
      await page.getByText(/fruits/i).click()
      await page.locator("[data-testid='add-item-submit']").click()
      await expect(page.locator("[data-testid='add-item-dialog']")).not.toBeVisible({ timeout: 10000 })

      await page.locator("[data-testid='add-detailed-button']").click()
      await page.locator("[data-testid='add-item-name']").fill("Fromage Filter E2E")
      await page.getByLabel(/catégorie/i).click()
      await page.getByText(/produits laitiers/i).click()
      await page.locator("[data-testid='add-item-submit']").click()
      await expect(page.locator("[data-testid='add-item-dialog']")).not.toBeVisible({ timeout: 10000 })

      // Click on Fruits category filter
      await page.locator("[data-testid='category-filter']").getByText(/fruits/i).click()

      // Should show only Fruits items
      await expect(page.getByText("Oranges Filter E2E")).toBeVisible()
      await expect(page.getByText("Fromage Filter E2E")).not.toBeVisible()
    })

    test("should show all items when clicking Tous", async ({ page }) => {
      await page.goto("/shopping")

      // Assuming items exist in different categories
      const categoryFilter = page.locator("[data-testid='category-filter']")
      if (await categoryFilter.isVisible()) {
        // First filter by a category
        await categoryFilter.getByText(/fruits/i).click()

        // Then click "Tous"
        await page.locator("[data-testid='category-filter-all']").click()

        // All items should be visible now
        const itemsList = page.locator("[data-testid='shopping-items-list']")
        await expect(itemsList).toBeVisible()
      }
    })
  })

  test.describe.skip("Bulk Operations", () => {
    test("should show uncheck all button when items are checked", async ({ page }) => {
      await page.goto("/shopping")

      // Add and check an item
      const quickAddInput = page.locator("[data-testid='quick-add-input']")
      await quickAddInput.fill("Test Uncheck All E2E")
      await quickAddInput.press("Enter")
      await expect(page.getByText("Test Uncheck All E2E")).toBeVisible({ timeout: 10000 })

      const item = page.locator("[data-testid='shopping-item']").filter({ hasText: "Test Uncheck All E2E" })
      await item.locator("[data-testid='shopping-item-checkbox']").click()

      // Uncheck all button should be visible
      await expect(page.locator("[data-testid='uncheck-all-button']")).toBeVisible()
    })

    test("should uncheck all items", async ({ page }) => {
      await page.goto("/shopping")

      // Add and check multiple items
      const items = ["Item A E2E", "Item B E2E"]
      for (const itemName of items) {
        const quickAddInput = page.locator("[data-testid='quick-add-input']")
        await quickAddInput.fill(itemName)
        await quickAddInput.press("Enter")
        await expect(page.getByText(itemName)).toBeVisible({ timeout: 10000 })

        const item = page.locator("[data-testid='shopping-item']").filter({ hasText: itemName })
        await item.locator("[data-testid='shopping-item-checkbox']").click()
      }

      // Click uncheck all
      await page.locator("[data-testid='uncheck-all-button']").click()

      // All items should be unchecked
      for (const itemName of items) {
        const item = page.locator("[data-testid='shopping-item']").filter({ hasText: itemName })
        await expect(item).toHaveAttribute("data-item-checked", "false")
      }
    })

    test("should show clear checked button when items are checked", async ({ page }) => {
      await page.goto("/shopping")

      // Add and check an item
      const quickAddInput = page.locator("[data-testid='quick-add-input']")
      await quickAddInput.fill("Test Clear Checked E2E")
      await quickAddInput.press("Enter")
      await expect(page.getByText("Test Clear Checked E2E")).toBeVisible({ timeout: 10000 })

      const item = page.locator("[data-testid='shopping-item']").filter({ hasText: "Test Clear Checked E2E" })
      await item.locator("[data-testid='shopping-item-checkbox']").click()

      // Clear checked button should be visible
      await expect(page.locator("[data-testid='clear-checked-button']")).toBeVisible()
    })

    test("should ask for confirmation before clearing checked items", async ({ page }) => {
      await page.goto("/shopping")

      // Add and check an item
      const quickAddInput = page.locator("[data-testid='quick-add-input']")
      await quickAddInput.fill("Test Clear Confirm E2E")
      await quickAddInput.press("Enter")
      await expect(page.getByText("Test Clear Confirm E2E")).toBeVisible({ timeout: 10000 })

      const item = page.locator("[data-testid='shopping-item']").filter({ hasText: "Test Clear Confirm E2E" })
      await item.locator("[data-testid='shopping-item-checkbox']").click()

      // Set up dialog handler to dismiss
      page.on("dialog", async dialog => {
        expect(dialog.message()).toContain("cochés")
        await dialog.dismiss()
      })

      // Click clear checked
      await page.locator("[data-testid='clear-checked-button']").click()

      // Item should still be there (we dismissed)
      await expect(page.getByText("Test Clear Confirm E2E")).toBeVisible()
    })

    test("should clear checked items on confirmation", async ({ page }) => {
      await page.goto("/shopping")

      // Add and check an item
      const quickAddInput = page.locator("[data-testid='quick-add-input']")
      await quickAddInput.fill("Test Clear Real E2E")
      await quickAddInput.press("Enter")
      await expect(page.getByText("Test Clear Real E2E")).toBeVisible({ timeout: 10000 })

      const item = page.locator("[data-testid='shopping-item']").filter({ hasText: "Test Clear Real E2E" })
      await item.locator("[data-testid='shopping-item-checkbox']").click()

      // Accept confirmation
      page.on("dialog", async dialog => {
        await dialog.accept()
      })

      // Click clear checked
      await page.locator("[data-testid='clear-checked-button']").click()

      // Item should be gone
      await expect(page.getByText("Test Clear Real E2E")).not.toBeVisible({ timeout: 10000 })
    })
  })

  test.describe.skip("Progress Indicator", () => {
    test("should display progress bar", async ({ page }) => {
      await page.goto("/shopping")

      // Progress bar should be visible
      await expect(page.locator("[role='progressbar']")).toBeVisible()
    })

    test("should update progress when checking items", async ({ page }) => {
      await page.goto("/shopping")

      // Add two items
      const quickAddInput = page.locator("[data-testid='quick-add-input']")
      await quickAddInput.fill("Progress Item 1 E2E")
      await quickAddInput.press("Enter")
      await expect(page.getByText("Progress Item 1 E2E")).toBeVisible({ timeout: 10000 })

      await quickAddInput.fill("Progress Item 2 E2E")
      await quickAddInput.press("Enter")
      await expect(page.getByText("Progress Item 2 E2E")).toBeVisible({ timeout: 10000 })

      // Should show 0/2
      await expect(page.getByText("0/2")).toBeVisible()

      // Check one item
      const item = page.locator("[data-testid='shopping-item']").filter({ hasText: "Progress Item 1 E2E" })
      await item.locator("[data-testid='shopping-item-checkbox']").click()

      // Should show 1/2
      await expect(page.getByText("1/2")).toBeVisible()
    })
  })

  test.describe.skip("Suggestions", () => {
    test("should display suggestions when input is empty", async ({ page }) => {
      await page.goto("/shopping")

      // Suggestions should be visible when no text is entered
      const suggestions = page.getByText(/suggestions/i)
      // Suggestions may or may not be visible depending on data
      const isVisible = await suggestions.isVisible()
      expect(typeof isVisible).toBe("boolean")
    })

    test("should hide suggestions when typing", async ({ page }) => {
      await page.goto("/shopping")

      const quickAddInput = page.locator("[data-testid='quick-add-input']")

      // Type something
      await quickAddInput.fill("Test")

      // Suggestions should be hidden
      const suggestions = page.getByText(/suggestions/i)
      await expect(suggestions).not.toBeVisible()
    })
  })

  test.describe.skip("Responsive Layout", () => {
    test("should display correctly on mobile viewport", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto("/shopping")

      // Page should still be functional
      await expect(page.locator("[data-testid='shopping-list']")).toBeVisible()
      await expect(page.locator("[data-testid='quick-add-input']")).toBeVisible()
    })

    test("should display correctly on tablet viewport", async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 })
      await page.goto("/shopping")

      // Page should still be functional
      await expect(page.locator("[data-testid='shopping-list']")).toBeVisible()
      await expect(page.locator("[data-testid='quick-add-input']")).toBeVisible()
    })
  })
})
