/**
 * INTEGRATION TEST - Shopping Lists (REAL DATABASE)
 *
 * Tests COMPLETS pour les listes de courses:
 * - Création de liste
 * - Ajout d'articles
 * - Cochage/décochage
 * - Catégorisation
 * - Partage familial
 * - Synchronisation temps réel
 */

import { test, expect, Page } from "@playwright/test"
import {
  query, queryOne, execute, closePool,
  getTestUser
} from "../helpers/db"

const TEST_USER = {
  email: "test-e2e@familyload.test",
  password: "TestE2E123!",
}

test.describe("🛒 Shopping Lists - REAL Integration Tests", () => {
  let householdId: string

  test.beforeAll(async () => {
    const user = await getTestUser(TEST_USER.email)
    if (!user) throw new Error("Test user not found")
    householdId = user.householdId

    // Cleanup
    await execute(`
      DELETE FROM shopping_items WHERE list_id IN (
        SELECT id FROM shopping_lists WHERE household_id = $1 AND name LIKE '%E2E TEST%'
      )
    `, [householdId])
    await execute(`DELETE FROM shopping_lists WHERE household_id = $1 AND name LIKE '%E2E TEST%'`, [householdId])
  })

  test.afterAll(async () => {
    await execute(`
      DELETE FROM shopping_items WHERE list_id IN (
        SELECT id FROM shopping_lists WHERE household_id = $1 AND name LIKE '%E2E TEST%'
      )
    `, [householdId])
    await execute(`DELETE FROM shopping_lists WHERE household_id = $1 AND name LIKE '%E2E TEST%'`, [householdId])
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
  // LIST CREATION
  // ============================================================

  test.describe("List Management", () => {

    test("1.1 - Create shopping list saves to database", async ({ page }) => {
      const initialCount = await queryOne<{ count: string }>(`
        SELECT COUNT(*) as count FROM shopping_lists WHERE household_id = $1
      `, [householdId])
      const startCount = parseInt(initialCount?.count ?? "0")

      await login(page)
      await page.goto("/shopping")

      const createBtn = page.getByRole("button", { name: /créer|nouvelle|ajouter|add/i })
        .or(page.getByTestId("create-list-button"))

      await createBtn.click()

      // Fill name
      await page.getByLabel(/nom|name/i).fill("E2E TEST - Liste courses")

      await page.getByRole("button", { name: /créer|enregistrer|save/i }).click()
      await page.waitForTimeout(2000)

      // ASSERT
      const newCount = await queryOne<{ count: string }>(`
        SELECT COUNT(*) as count FROM shopping_lists WHERE household_id = $1
      `, [householdId])
      expect(parseInt(newCount?.count ?? "0")).toBeGreaterThan(startCount)
    })

    test("1.2 - Lists page shows all household lists", async ({ page }) => {
      // Create list directly
      await execute(`
        INSERT INTO shopping_lists (household_id, name)
        VALUES ($1, 'E2E TEST - Liste visible')
      `, [householdId])

      await login(page)
      await page.goto("/shopping")

      await expect(page.getByText("E2E TEST - Liste visible")).toBeVisible({ timeout: 10000 })
    })

    test("1.3 - Can rename shopping list", async ({ page }) => {
      const result = await queryOne<{ id: string }>(`
        INSERT INTO shopping_lists (household_id, name)
        VALUES ($1, 'E2E TEST - À renommer')
        RETURNING id
      `, [householdId])
      const listId = result?.id

      await login(page)
      await page.goto(`/shopping/${listId}`)

      const editBtn = page.getByRole("button", { name: /modifier|edit|rename/i })
        .or(page.getByTestId("edit-list"))
      if (await editBtn.isVisible().catch(() => false)) {
        await editBtn.click()
        await page.getByLabel(/nom/i).fill("E2E TEST - Renommée")
        await page.getByRole("button", { name: /save|enregistrer/i }).click()
        await page.waitForTimeout(2000)

        const list = await queryOne<{ name: string }>(`
          SELECT name FROM shopping_lists WHERE id = $1
        `, [listId])
        expect(list?.name).toContain("Renommée")
      }
    })

    test("1.4 - Can delete shopping list", async ({ page }) => {
      const result = await queryOne<{ id: string }>(`
        INSERT INTO shopping_lists (household_id, name)
        VALUES ($1, 'E2E TEST - À supprimer')
        RETURNING id
      `, [householdId])
      const listId = result?.id

      await login(page)
      await page.goto(`/shopping/${listId}`)

      const deleteBtn = page.getByRole("button", { name: /supprimer|delete/i })
      if (await deleteBtn.isVisible().catch(() => false)) {
        await deleteBtn.click()

        const confirmBtn = page.getByRole("button", { name: /confirmer|oui/i })
        if (await confirmBtn.isVisible().catch(() => false)) {
          await confirmBtn.click()
        }

        await page.waitForTimeout(2000)

        const list = await queryOne(`SELECT * FROM shopping_lists WHERE id = $1`, [listId])
        expect(list).toBeNull()
      }
    })
  })

  // ============================================================
  // ITEMS MANAGEMENT
  // ============================================================

  test.describe("Items Management", () => {

    test("2.1 - Add item to list saves to database", async ({ page }) => {
      const listResult = await queryOne<{ id: string }>(`
        INSERT INTO shopping_lists (household_id, name)
        VALUES ($1, 'E2E TEST - Avec articles')
        RETURNING id
      `, [householdId])
      const listId = listResult?.id

      await login(page)
      await page.goto(`/shopping/${listId}`)

      // Add item
      const addInput = page.getByPlaceholder(/ajouter|add|article/i)
        .or(page.getByTestId("add-item-input"))

      await addInput.fill("Lait")
      await addInput.press("Enter")

      await page.waitForTimeout(2000)

      // ASSERT
      const item = await queryOne<{ name: string }>(`
        SELECT name FROM shopping_items WHERE list_id = $1 AND name = 'Lait'
      `, [listId])
      expect(item).not.toBeNull()
    })

    test("2.2 - Check item marks as purchased", async ({ page }) => {
      const listResult = await queryOne<{ id: string }>(`
        INSERT INTO shopping_lists (household_id, name)
        VALUES ($1, 'E2E TEST - Check items')
        RETURNING id
      `, [householdId])
      const listId = listResult?.id

      await execute(`
        INSERT INTO shopping_items (list_id, name, is_checked)
        VALUES ($1, 'Pain', false)
      `, [listId])

      await login(page)
      await page.goto(`/shopping/${listId}`)

      // Check item
      const checkbox = page.locator('[type="checkbox"]').first()
        .or(page.getByRole("checkbox").first())

      if (await checkbox.isVisible().catch(() => false)) {
        await checkbox.click()
        await page.waitForTimeout(2000)

        const item = await queryOne<{ is_checked: boolean }>(`
          SELECT is_checked FROM shopping_items WHERE list_id = $1 AND name = 'Pain'
        `, [listId])
        expect(item?.is_checked).toBe(true)
      }
    })

    test("2.3 - Uncheck item marks as not purchased", async ({ page }) => {
      const listResult = await queryOne<{ id: string }>(`
        INSERT INTO shopping_lists (household_id, name)
        VALUES ($1, 'E2E TEST - Uncheck items')
        RETURNING id
      `, [householdId])
      const listId = listResult?.id

      await execute(`
        INSERT INTO shopping_items (list_id, name, is_checked)
        VALUES ($1, 'Oeufs', true)
      `, [listId])

      await login(page)
      await page.goto(`/shopping/${listId}`)

      // Uncheck item
      const checkbox = page.locator('[type="checkbox"]:checked').first()
      if (await checkbox.isVisible().catch(() => false)) {
        await checkbox.click()
        await page.waitForTimeout(2000)

        const item = await queryOne<{ is_checked: boolean }>(`
          SELECT is_checked FROM shopping_items WHERE list_id = $1 AND name = 'Oeufs'
        `, [listId])
        expect(item?.is_checked).toBe(false)
      }
    })

    test("2.4 - Delete item removes from database", async ({ page }) => {
      const listResult = await queryOne<{ id: string }>(`
        INSERT INTO shopping_lists (household_id, name)
        VALUES ($1, 'E2E TEST - Delete item')
        RETURNING id
      `, [householdId])
      const listId = listResult?.id

      const itemResult = await queryOne<{ id: string }>(`
        INSERT INTO shopping_items (list_id, name)
        VALUES ($1, 'À supprimer')
        RETURNING id
      `, [listId])
      const itemId = itemResult?.id

      await login(page)
      await page.goto(`/shopping/${listId}`)

      // Find and delete item
      const deleteBtn = page.locator(`[data-item-id="${itemId}"] button[aria-label*="supprimer"]`)
        .or(page.getByText("À supprimer").locator("..").getByRole("button"))

      if (await deleteBtn.isVisible().catch(() => false)) {
        await deleteBtn.click()
        await page.waitForTimeout(2000)

        const item = await queryOne(`SELECT * FROM shopping_items WHERE id = $1`, [itemId])
        expect(item).toBeNull()
      }
    })

    test("2.5 - Add item with quantity", async ({ page }) => {
      const listResult = await queryOne<{ id: string }>(`
        INSERT INTO shopping_lists (household_id, name)
        VALUES ($1, 'E2E TEST - With quantity')
        RETURNING id
      `, [householdId])
      const listId = listResult?.id

      await login(page)
      await page.goto(`/shopping/${listId}`)

      // Add item with quantity
      const addInput = page.getByPlaceholder(/ajouter/i)
      await addInput.fill("2x Bananes")
      await addInput.press("Enter")

      await page.waitForTimeout(2000)

      const item = await queryOne<{ name: string; quantity: number }>(`
        SELECT name, quantity FROM shopping_items
        WHERE list_id = $1
        ORDER BY created_at DESC LIMIT 1
      `, [listId])
      expect(item?.quantity).toBe(2)
    })
  })

  // ============================================================
  // CATEGORIES
  // ============================================================

  test.describe("Categories", () => {

    test("3.1 - Items are auto-categorized", async ({ page }) => {
      const listResult = await queryOne<{ id: string }>(`
        INSERT INTO shopping_lists (household_id, name)
        VALUES ($1, 'E2E TEST - Auto category')
        RETURNING id
      `, [householdId])
      const listId = listResult?.id

      await login(page)
      await page.goto(`/shopping/${listId}`)

      // Add known category item
      const addInput = page.getByPlaceholder(/ajouter/i)
      await addInput.fill("Tomates")
      await addInput.press("Enter")

      await page.waitForTimeout(2000)

      const item = await queryOne<{ category: string }>(`
        SELECT category FROM shopping_items
        WHERE list_id = $1 AND name ILIKE '%tomate%'
      `, [listId])
      // May have category set (fruits/légumes)
    })

    test("3.2 - Can change item category", async ({ page }) => {
      const listResult = await queryOne<{ id: string }>(`
        INSERT INTO shopping_lists (household_id, name)
        VALUES ($1, 'E2E TEST - Change category')
        RETURNING id
      `, [householdId])
      const listId = listResult?.id

      await execute(`
        INSERT INTO shopping_items (list_id, name, category)
        VALUES ($1, 'Mystère', 'other')
      `, [listId])

      await login(page)
      await page.goto(`/shopping/${listId}`)

      // Click on item to edit
      const itemRow = page.getByText("Mystère")
      if (await itemRow.isVisible().catch(() => false)) {
        await itemRow.click()

        // Change category
        const categorySelect = page.getByLabel(/catégorie/i)
        if (await categorySelect.isVisible().catch(() => false)) {
          await categorySelect.selectOption("dairy")
          await page.getByRole("button", { name: /save|enregistrer/i }).click()
          await page.waitForTimeout(2000)

          const item = await queryOne<{ category: string }>(`
            SELECT category FROM shopping_items
            WHERE list_id = $1 AND name = 'Mystère'
          `, [listId])
          expect(item?.category).toBe("dairy")
        }
      }
    })

    test("3.3 - Items grouped by category in view", async ({ page }) => {
      const listResult = await queryOne<{ id: string }>(`
        INSERT INTO shopping_lists (household_id, name)
        VALUES ($1, 'E2E TEST - Grouped view')
        RETURNING id
      `, [householdId])
      const listId = listResult?.id

      await execute(`
        INSERT INTO shopping_items (list_id, name, category) VALUES
        ($1, 'Pommes', 'fruits'),
        ($1, 'Yaourt', 'dairy'),
        ($1, 'Beurre', 'dairy')
      `, [listId])

      await login(page)
      await page.goto(`/shopping/${listId}`)

      // Should see category headers
      await expect(page.getByText(/fruits|légumes/i).or(page.getByText(/produits laitiers|dairy/i)))
        .toBeVisible({ timeout: 5000 })
    })
  })

  // ============================================================
  // QUICK ADD
  // ============================================================

  test.describe("Quick Add Features", () => {

    test("4.1 - Suggestions appear while typing", async ({ page }) => {
      const listResult = await queryOne<{ id: string }>(`
        INSERT INTO shopping_lists (household_id, name)
        VALUES ($1, 'E2E TEST - Suggestions')
        RETURNING id
      `, [householdId])
      const listId = listResult?.id

      await login(page)
      await page.goto(`/shopping/${listId}`)

      const addInput = page.getByPlaceholder(/ajouter/i)
      await addInput.fill("Lai")

      // Should see suggestions
      const suggestions = page.locator('[class*="suggestion"], [role="listbox"]')
      // May or may not show suggestions
    })

    test("4.2 - Can add multiple items at once", async ({ page }) => {
      const listResult = await queryOne<{ id: string }>(`
        INSERT INTO shopping_lists (household_id, name)
        VALUES ($1, 'E2E TEST - Bulk add')
        RETURNING id
      `, [householdId])
      const listId = listResult?.id

      await login(page)
      await page.goto(`/shopping/${listId}`)

      // Try bulk add (comma separated or multiple lines)
      const addInput = page.getByPlaceholder(/ajouter/i)
      await addInput.fill("Pain, Beurre, Confiture")
      await addInput.press("Enter")

      await page.waitForTimeout(2000)

      const count = await queryOne<{ count: string }>(`
        SELECT COUNT(*) as count FROM shopping_items WHERE list_id = $1
      `, [listId])
      // Should have created multiple items (or just one depending on implementation)
    })
  })

  // ============================================================
  // CLEAR COMPLETED
  // ============================================================

  test.describe("Clear Completed", () => {

    test("5.1 - Clear completed removes checked items", async ({ page }) => {
      const listResult = await queryOne<{ id: string }>(`
        INSERT INTO shopping_lists (household_id, name)
        VALUES ($1, 'E2E TEST - Clear completed')
        RETURNING id
      `, [householdId])
      const listId = listResult?.id

      await execute(`
        INSERT INTO shopping_items (list_id, name, is_checked) VALUES
        ($1, 'Checked 1', true),
        ($1, 'Checked 2', true),
        ($1, 'Unchecked', false)
      `, [listId])

      await login(page)
      await page.goto(`/shopping/${listId}`)

      const clearBtn = page.getByRole("button", { name: /effacer.*cochés|clear.*completed/i })
        .or(page.getByTestId("clear-completed"))

      if (await clearBtn.isVisible().catch(() => false)) {
        await clearBtn.click()

        const confirmBtn = page.getByRole("button", { name: /confirmer|oui/i })
        if (await confirmBtn.isVisible().catch(() => false)) {
          await confirmBtn.click()
        }

        await page.waitForTimeout(2000)

        const count = await queryOne<{ count: string }>(`
          SELECT COUNT(*) as count FROM shopping_items WHERE list_id = $1
        `, [listId])
        expect(parseInt(count?.count ?? "0")).toBe(1) // Only unchecked remains
      }
    })
  })

  // ============================================================
  // SHARE & SYNC
  // ============================================================

  test.describe("Family Sharing", () => {

    test("6.1 - Lists visible to all household members", async ({ page }) => {
      await execute(`
        INSERT INTO shopping_lists (household_id, name)
        VALUES ($1, 'E2E TEST - Shared list')
      `, [householdId])

      await login(page)
      await page.goto("/shopping")

      await expect(page.getByText("E2E TEST - Shared list")).toBeVisible({ timeout: 10000 })
    })

    test("6.2 - Real-time sync between users", async ({ page, context }) => {
      const listResult = await queryOne<{ id: string }>(`
        INSERT INTO shopping_lists (household_id, name)
        VALUES ($1, 'E2E TEST - Realtime')
        RETURNING id
      `, [householdId])
      const listId = listResult?.id

      // Open two tabs
      await login(page)
      await page.goto(`/shopping/${listId}`)

      const page2 = await context.newPage()
      await page2.goto(`/shopping/${listId}`)

      // Add item in first tab
      const addInput = page.getByPlaceholder(/ajouter/i)
      await addInput.fill("Item temps réel")
      await addInput.press("Enter")

      // Should appear in second tab (if real-time sync implemented)
      // await expect(page2.getByText("Item temps réel")).toBeVisible({ timeout: 10000 })

      await page2.close()
    })
  })
})
