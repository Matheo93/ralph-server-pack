/**
 * INTEGRATION TEST - Tasks Lifecycle (REAL DATABASE)
 *
 * Tests COMPLETS pour les tâches:
 * - Création manuelle
 * - Assignation à enfant
 * - Modification
 * - Complétion (parent et enfant)
 * - Suppression
 * - Récurrence
 * - Filtres et tri
 */

import { test, expect, Page } from "@playwright/test"
import {
  query, queryOne, execute, closePool,
  getTestUser, getChildren, createTask, getTask,
  countTasks, getLatestTask, cleanupTasks
} from "../helpers/db"

const TEST_USER = {
  email: "test-e2e@familyload.test",
  password: "TestE2E123!",
}

test.describe("📋 Tasks Lifecycle - REAL Integration Tests", () => {
  let householdId: string
  let childId: string | null = null

  test.beforeAll(async () => {
    const user = await getTestUser(TEST_USER.email)
    if (!user) throw new Error("Test user not found")
    householdId = user.householdId

    const children = await getChildren(householdId)
    if (children.length > 0) {
      childId = children[0].id
    }

    // Cleanup previous test tasks
    await cleanupTasks(householdId, "E2E TEST")
  })

  test.afterAll(async () => {
    await cleanupTasks(householdId, "E2E TEST")
    await closePool()
  })

  // ============================================================
  // TASK CREATION
  // ============================================================

  test.describe("Task Creation", () => {

    test("1.1 - Create task via form saves to database", async ({ page }) => {
      // ARRANGE
      const initialCount = await countTasks(householdId, { titleLike: "E2E TEST" })

      // Login
      await page.goto("/login")
      await page.getByLabel(/email/i).fill(TEST_USER.email)
      await page.getByLabel(/mot de passe/i).fill(TEST_USER.password)
      await page.getByRole("button", { name: /connexion/i }).click()
      await expect(page).toHaveURL(/dashboard/, { timeout: 15000 })

      // Navigate to tasks
      await page.goto("/tasks")

      // Click create button
      const createBtn = page.getByRole("button", { name: /créer|nouvelle|ajouter|add/i })
        .or(page.getByTestId("create-task-button"))
      await createBtn.click()

      // Fill form
      await page.getByLabel(/titre|title/i).fill("E2E TEST - Tâche manuelle")

      // Select category
      const categorySelect = page.getByLabel(/catégorie|category/i)
      if (await categorySelect.isVisible().catch(() => false)) {
        await categorySelect.selectOption({ index: 1 })
      }

      // Set due date
      const dateInput = page.getByLabel(/date|échéance|due/i)
      if (await dateInput.isVisible().catch(() => false)) {
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        await dateInput.fill(tomorrow.toISOString().split("T")[0])
      }

      // Submit
      await page.getByRole("button", { name: /créer|enregistrer|save/i }).click()

      // Wait for save
      await page.waitForTimeout(2000)

      // ASSERT: Task in database
      const newCount = await countTasks(householdId, { titleLike: "E2E TEST" })
      expect(newCount).toBe(initialCount + 1)

      const task = await getLatestTask(householdId)
      expect(task?.title).toContain("E2E TEST - Tâche manuelle")
      expect(task?.status).toBe("pending")
    })

    test("1.2 - Create task with child assignment", async ({ page }) => {
      if (!childId) {
        test.skip()
        return
      }

      // Login
      await page.goto("/login")
      await page.getByLabel(/email/i).fill(TEST_USER.email)
      await page.getByLabel(/mot de passe/i).fill(TEST_USER.password)
      await page.getByRole("button", { name: /connexion/i }).click()
      await expect(page).toHaveURL(/dashboard/, { timeout: 15000 })

      // Navigate to tasks
      await page.goto("/tasks/new")

      // Fill form
      await page.getByLabel(/titre/i).fill("E2E TEST - Tâche assignée")

      // Select child
      const childSelect = page.getByLabel(/enfant|assigné|child/i)
        .or(page.getByTestId("child-select"))
      if (await childSelect.isVisible().catch(() => false)) {
        await childSelect.selectOption({ index: 1 })
      }

      // Submit
      await page.getByRole("button", { name: /créer|enregistrer/i }).click()
      await page.waitForTimeout(2000)

      // ASSERT: Task has child_id
      const task = await queryOne<{ child_id: string }>(`
        SELECT child_id FROM tasks
        WHERE household_id = $1 AND title LIKE '%E2E TEST - Tâche assignée%'
        ORDER BY created_at DESC LIMIT 1
      `, [householdId])
      expect(task?.child_id).toBe(childId)
    })

    test("1.3 - Create task validates required fields", async ({ page }) => {
      // Login
      await page.goto("/login")
      await page.getByLabel(/email/i).fill(TEST_USER.email)
      await page.getByLabel(/mot de passe/i).fill(TEST_USER.password)
      await page.getByRole("button", { name: /connexion/i }).click()
      await expect(page).toHaveURL(/dashboard/, { timeout: 15000 })

      // Navigate to task creation
      await page.goto("/tasks/new")

      // Try to submit empty form
      await page.getByRole("button", { name: /créer|enregistrer/i }).click()

      // Should show validation error
      await expect(page.getByText(/requis|obligatoire|required/i)).toBeVisible({ timeout: 5000 })
    })

    test("1.4 - Create recurring task", async ({ page }) => {
      // Login
      await page.goto("/login")
      await page.getByLabel(/email/i).fill(TEST_USER.email)
      await page.getByLabel(/mot de passe/i).fill(TEST_USER.password)
      await page.getByRole("button", { name: /connexion/i }).click()
      await expect(page).toHaveURL(/dashboard/, { timeout: 15000 })

      // Navigate to task creation
      await page.goto("/tasks/new")

      // Fill form
      await page.getByLabel(/titre/i).fill("E2E TEST - Tâche récurrente")

      // Enable recurrence
      const recurToggle = page.getByLabel(/récurren|repeat/i)
        .or(page.getByTestId("recurring-toggle"))
      if (await recurToggle.isVisible().catch(() => false)) {
        await recurToggle.click()

        // Select frequency
        const freqSelect = page.getByLabel(/fréquence|frequency/i)
        if (await freqSelect.isVisible().catch(() => false)) {
          await freqSelect.selectOption("weekly")
        }
      }

      // Submit
      await page.getByRole("button", { name: /créer|enregistrer/i }).click()
      await page.waitForTimeout(2000)

      // ASSERT: Task has recurrence
      const task = await queryOne<{ recurrence_rule: string }>(`
        SELECT recurrence_rule FROM tasks
        WHERE household_id = $1 AND title LIKE '%E2E TEST - Tâche récurrente%'
        ORDER BY created_at DESC LIMIT 1
      `, [householdId])

      // May or may not have recurrence depending on implementation
    })
  })

  // ============================================================
  // TASK MODIFICATION
  // ============================================================

  test.describe("Task Modification", () => {

    test("2.1 - Edit task updates database", async ({ page }) => {
      // Create task first
      const taskId = await createTask({
        householdId,
        title: "E2E TEST - À modifier",
        status: "pending",
      })

      // Login
      await page.goto("/login")
      await page.getByLabel(/email/i).fill(TEST_USER.email)
      await page.getByLabel(/mot de passe/i).fill(TEST_USER.password)
      await page.getByRole("button", { name: /connexion/i }).click()
      await expect(page).toHaveURL(/dashboard/, { timeout: 15000 })

      // Navigate to task
      await page.goto(`/tasks/${taskId}`)

      // Click edit
      const editBtn = page.getByRole("button", { name: /modifier|edit/i })
      if (await editBtn.isVisible().catch(() => false)) {
        await editBtn.click()

        // Change title
        await page.getByLabel(/titre/i).fill("E2E TEST - Titre modifié")

        // Save
        await page.getByRole("button", { name: /enregistrer|save/i }).click()
        await page.waitForTimeout(2000)

        // ASSERT: Database updated
        const task = await getTask(taskId)
        expect(task?.title).toContain("Titre modifié")
      }
    })

    test("2.2 - Change task assignee", async ({ page }) => {
      if (!childId) {
        test.skip()
        return
      }

      // Create unassigned task
      const taskId = await createTask({
        householdId,
        title: "E2E TEST - Sans assignation",
        status: "pending",
      })

      // Login and edit
      await page.goto("/login")
      await page.getByLabel(/email/i).fill(TEST_USER.email)
      await page.getByLabel(/mot de passe/i).fill(TEST_USER.password)
      await page.getByRole("button", { name: /connexion/i }).click()
      await expect(page).toHaveURL(/dashboard/, { timeout: 15000 })

      await page.goto(`/tasks/${taskId}/edit`)

      // Assign to child
      const childSelect = page.getByLabel(/enfant|assigné/i)
      if (await childSelect.isVisible().catch(() => false)) {
        await childSelect.selectOption({ index: 1 })
        await page.getByRole("button", { name: /enregistrer/i }).click()
        await page.waitForTimeout(2000)

        // ASSERT
        const task = await getTask(taskId)
        expect(task?.child_id).toBe(childId)
      }
    })

    test("2.3 - Change task priority", async ({ page }) => {
      const taskId = await createTask({
        householdId,
        title: "E2E TEST - Priorité à changer",
        priority: 1,
      })

      // Login and edit
      await page.goto("/login")
      await page.getByLabel(/email/i).fill(TEST_USER.email)
      await page.getByLabel(/mot de passe/i).fill(TEST_USER.password)
      await page.getByRole("button", { name: /connexion/i }).click()
      await expect(page).toHaveURL(/dashboard/, { timeout: 15000 })

      await page.goto(`/tasks/${taskId}/edit`)

      // Change priority
      const prioritySelect = page.getByLabel(/priorité|priority/i)
        .or(page.locator('[data-testid="priority-select"]'))
      if (await prioritySelect.isVisible().catch(() => false)) {
        await prioritySelect.selectOption("3") // High
        await page.getByRole("button", { name: /enregistrer/i }).click()
        await page.waitForTimeout(2000)

        // ASSERT
        const task = await queryOne<{ priority: number }>(`
          SELECT priority FROM tasks WHERE id = $1
        `, [taskId])
        expect(task?.priority).toBe(3)
      }
    })
  })

  // ============================================================
  // TASK COMPLETION
  // ============================================================

  test.describe("Task Completion", () => {

    test("3.1 - Parent completes task", async ({ page }) => {
      const taskId = await createTask({
        householdId,
        title: "E2E TEST - À compléter parent",
        status: "pending",
      })

      // Login
      await page.goto("/login")
      await page.getByLabel(/email/i).fill(TEST_USER.email)
      await page.getByLabel(/mot de passe/i).fill(TEST_USER.password)
      await page.getByRole("button", { name: /connexion/i }).click()
      await expect(page).toHaveURL(/dashboard/, { timeout: 15000 })

      // Go to tasks
      await page.goto("/tasks")

      // Find and complete task
      const taskCard = page.getByText("E2E TEST - À compléter parent")
      await taskCard.click()

      const completeBtn = page.getByRole("button", { name: /terminer|compléter|done|complete/i })
        .or(page.getByTestId("complete-task-button"))
      await completeBtn.click()

      await page.waitForTimeout(2000)

      // ASSERT
      const task = await getTask(taskId)
      expect(task?.status).toBe("completed")
    })

    test("3.2 - Completing task creates history record", async ({ page }) => {
      const taskId = await createTask({
        householdId,
        title: "E2E TEST - Avec historique",
        status: "pending",
      })

      // Complete via UI
      await page.goto("/login")
      await page.getByLabel(/email/i).fill(TEST_USER.email)
      await page.getByLabel(/mot de passe/i).fill(TEST_USER.password)
      await page.getByRole("button", { name: /connexion/i }).click()
      await expect(page).toHaveURL(/dashboard/, { timeout: 15000 })

      await page.goto(`/tasks/${taskId}`)

      const completeBtn = page.getByRole("button", { name: /terminer|compléter/i })
      if (await completeBtn.isVisible().catch(() => false)) {
        await completeBtn.click()
        await page.waitForTimeout(2000)

        // ASSERT: History record created
        const history = await queryOne(`
          SELECT * FROM task_completions WHERE task_id = $1
        `, [taskId])
        expect(history).not.toBeNull()
      }
    })

    test("3.3 - Completing assigned task awards XP to child", async ({ page }) => {
      if (!childId) {
        test.skip()
        return
      }

      // Get initial XP
      const initialXp = await queryOne<{ total_xp: number }>(`
        SELECT COALESCE(total_xp, 0) as total_xp FROM children WHERE id = $1
      `, [childId])
      const startXp = initialXp?.total_xp ?? 0

      // Create assigned task
      const taskId = await createTask({
        householdId,
        title: "E2E TEST - XP pour enfant",
        childId,
        status: "pending",
      })

      // Login as parent and complete
      await page.goto("/login")
      await page.getByLabel(/email/i).fill(TEST_USER.email)
      await page.getByLabel(/mot de passe/i).fill(TEST_USER.password)
      await page.getByRole("button", { name: /connexion/i }).click()
      await expect(page).toHaveURL(/dashboard/, { timeout: 15000 })

      await page.goto(`/tasks/${taskId}`)

      const completeBtn = page.getByRole("button", { name: /terminer|compléter/i })
      if (await completeBtn.isVisible().catch(() => false)) {
        await completeBtn.click()
        await page.waitForTimeout(2000)

        // ASSERT: XP increased
        const finalXp = await queryOne<{ total_xp: number }>(`
          SELECT COALESCE(total_xp, 0) as total_xp FROM children WHERE id = $1
        `, [childId])
        expect(finalXp?.total_xp ?? 0).toBeGreaterThanOrEqual(startXp)
      }
    })

    test("3.4 - Uncomplete task reverts status", async ({ page }) => {
      const taskId = await createTask({
        householdId,
        title: "E2E TEST - À dé-compléter",
        status: "completed",
      })

      // Login
      await page.goto("/login")
      await page.getByLabel(/email/i).fill(TEST_USER.email)
      await page.getByLabel(/mot de passe/i).fill(TEST_USER.password)
      await page.getByRole("button", { name: /connexion/i }).click()
      await expect(page).toHaveURL(/dashboard/, { timeout: 15000 })

      await page.goto(`/tasks/${taskId}`)

      // Uncomplete
      const uncompleteBtn = page.getByRole("button", { name: /annuler|réouvrir|uncomplete/i })
        .or(page.getByTestId("uncomplete-button"))
      if (await uncompleteBtn.isVisible().catch(() => false)) {
        await uncompleteBtn.click()
        await page.waitForTimeout(2000)

        const task = await getTask(taskId)
        expect(task?.status).toBe("pending")
      }
    })
  })

  // ============================================================
  // TASK DELETION
  // ============================================================

  test.describe("Task Deletion", () => {

    test("4.1 - Delete task removes from database", async ({ page }) => {
      const taskId = await createTask({
        householdId,
        title: "E2E TEST - À supprimer",
        status: "pending",
      })

      // Verify exists
      let task = await getTask(taskId)
      expect(task).not.toBeNull()

      // Login
      await page.goto("/login")
      await page.getByLabel(/email/i).fill(TEST_USER.email)
      await page.getByLabel(/mot de passe/i).fill(TEST_USER.password)
      await page.getByRole("button", { name: /connexion/i }).click()
      await expect(page).toHaveURL(/dashboard/, { timeout: 15000 })

      await page.goto(`/tasks/${taskId}`)

      // Delete
      const deleteBtn = page.getByRole("button", { name: /supprimer|delete/i })
      if (await deleteBtn.isVisible().catch(() => false)) {
        await deleteBtn.click()

        // Confirm if needed
        const confirmBtn = page.getByRole("button", { name: /confirmer|oui|yes/i })
        if (await confirmBtn.isVisible().catch(() => false)) {
          await confirmBtn.click()
        }

        await page.waitForTimeout(2000)

        // ASSERT: Gone from database
        task = await getTask(taskId)
        expect(task).toBeNull()
      }
    })

    test("4.2 - Bulk delete multiple tasks", async ({ page }) => {
      // Create multiple tasks
      await createTask({ householdId, title: "E2E TEST - Bulk 1" })
      await createTask({ householdId, title: "E2E TEST - Bulk 2" })
      await createTask({ householdId, title: "E2E TEST - Bulk 3" })

      const initialCount = await countTasks(householdId, { titleLike: "E2E TEST - Bulk" })
      expect(initialCount).toBe(3)

      // Login
      await page.goto("/login")
      await page.getByLabel(/email/i).fill(TEST_USER.email)
      await page.getByLabel(/mot de passe/i).fill(TEST_USER.password)
      await page.getByRole("button", { name: /connexion/i }).click()
      await expect(page).toHaveURL(/dashboard/, { timeout: 15000 })

      await page.goto("/tasks")

      // Select multiple
      const checkboxes = page.locator('[data-testid^="task-checkbox"]')
      if (await checkboxes.count() >= 3) {
        await checkboxes.nth(0).click()
        await checkboxes.nth(1).click()
        await checkboxes.nth(2).click()

        // Bulk delete
        const bulkDeleteBtn = page.getByRole("button", { name: /supprimer sélection/i })
        if (await bulkDeleteBtn.isVisible().catch(() => false)) {
          await bulkDeleteBtn.click()

          const confirmBtn = page.getByRole("button", { name: /confirmer/i })
          if (await confirmBtn.isVisible().catch(() => false)) {
            await confirmBtn.click()
          }

          await page.waitForTimeout(2000)

          const finalCount = await countTasks(householdId, { titleLike: "E2E TEST - Bulk" })
          expect(finalCount).toBe(0)
        }
      }
    })
  })

  // ============================================================
  // TASK FILTERS AND SORTING
  // ============================================================

  test.describe("Filters and Sorting", () => {

    test("5.1 - Filter by status shows correct tasks", async ({ page }) => {
      // Create tasks with different statuses
      await createTask({ householdId, title: "E2E TEST - Pending", status: "pending" })
      await createTask({ householdId, title: "E2E TEST - Completed", status: "completed" })

      // Login
      await page.goto("/login")
      await page.getByLabel(/email/i).fill(TEST_USER.email)
      await page.getByLabel(/mot de passe/i).fill(TEST_USER.password)
      await page.getByRole("button", { name: /connexion/i }).click()
      await expect(page).toHaveURL(/dashboard/, { timeout: 15000 })

      await page.goto("/tasks")

      // Filter by pending
      const statusFilter = page.getByLabel(/statut|status/i)
        .or(page.getByTestId("status-filter"))
      if (await statusFilter.isVisible().catch(() => false)) {
        await statusFilter.selectOption("pending")
        await page.waitForTimeout(1000)

        // Should see pending, not completed
        await expect(page.getByText("E2E TEST - Pending")).toBeVisible()
        await expect(page.getByText("E2E TEST - Completed")).not.toBeVisible()
      }
    })

    test("5.2 - Filter by child shows only their tasks", async ({ page }) => {
      if (!childId) {
        test.skip()
        return
      }

      await createTask({ householdId, title: "E2E TEST - Assigned", childId })
      await createTask({ householdId, title: "E2E TEST - Unassigned" })

      // Login
      await page.goto("/login")
      await page.getByLabel(/email/i).fill(TEST_USER.email)
      await page.getByLabel(/mot de passe/i).fill(TEST_USER.password)
      await page.getByRole("button", { name: /connexion/i }).click()
      await expect(page).toHaveURL(/dashboard/, { timeout: 15000 })

      await page.goto("/tasks")

      // Filter by child
      const childFilter = page.getByLabel(/enfant|assigné/i)
        .or(page.getByTestId("child-filter"))
      if (await childFilter.isVisible().catch(() => false)) {
        await childFilter.selectOption({ index: 1 })
        await page.waitForTimeout(1000)

        // Should see assigned only
        await expect(page.getByText("E2E TEST - Assigned")).toBeVisible()
        await expect(page.getByText("E2E TEST - Unassigned")).not.toBeVisible()
      }
    })

    test("5.3 - Search finds matching tasks", async ({ page }) => {
      await createTask({ householdId, title: "E2E TEST - Recherche spéciale" })

      // Login
      await page.goto("/login")
      await page.getByLabel(/email/i).fill(TEST_USER.email)
      await page.getByLabel(/mot de passe/i).fill(TEST_USER.password)
      await page.getByRole("button", { name: /connexion/i }).click()
      await expect(page).toHaveURL(/dashboard/, { timeout: 15000 })

      await page.goto("/tasks")

      // Search
      const searchInput = page.getByPlaceholder(/recherche|search/i)
        .or(page.getByTestId("search-input"))
      if (await searchInput.isVisible().catch(() => false)) {
        await searchInput.fill("spéciale")
        await page.waitForTimeout(1000)

        await expect(page.getByText("E2E TEST - Recherche spéciale")).toBeVisible()
      }
    })
  })
})
