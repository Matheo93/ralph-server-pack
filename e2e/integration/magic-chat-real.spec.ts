/**
 * INTEGRATION TEST - Magic Chat (REAL DATABASE)
 *
 * ⚠️ Ce test utilise la VRAIE base de données
 * ⚠️ Il crée et supprime des données réelles
 *
 * Test: "Johan doit faire ses devoirs demain à 19h"
 * → Vérifie que la tâche est RÉELLEMENT créée en DB
 */

import { test, expect, Page } from "@playwright/test"
import { Pool } from "pg"

// Configuration DB (utilise les mêmes env vars que l'app)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

// Test user credentials (compte de test existant)
const TEST_USER = {
  email: "test-e2e@familyload.test",
  password: "TestE2E123!",
}

// Cleanup helper
async function cleanupTestData(householdId: string) {
  await pool.query(`DELETE FROM tasks WHERE household_id = $1 AND title LIKE '%E2E TEST%'`, [householdId])
}

// Get test user's household
async function getTestHouseholdId(): Promise<string | null> {
  const result = await pool.query(`
    SELECT hm.household_id
    FROM users u
    JOIN household_members hm ON u.id = hm.user_id
    WHERE u.email = $1
    LIMIT 1
  `, [TEST_USER.email])

  return result.rows[0]?.household_id ?? null
}

// Get child by name in household
async function getChildByName(householdId: string, name: string) {
  const result = await pool.query(`
    SELECT id, first_name
    FROM children
    WHERE household_id = $1 AND LOWER(first_name) = LOWER($2)
    LIMIT 1
  `, [householdId, name])

  return result.rows[0] ?? null
}

// Count tasks with title
async function countTasksWithTitle(householdId: string, titlePattern: string): Promise<number> {
  const result = await pool.query(`
    SELECT COUNT(*) as count
    FROM tasks
    WHERE household_id = $1 AND title ILIKE $2
  `, [householdId, `%${titlePattern}%`])

  return parseInt(result.rows[0].count, 10)
}

// Get latest task
async function getLatestTask(householdId: string) {
  const result = await pool.query(`
    SELECT id, title, child_id, due_date, status, created_at
    FROM tasks
    WHERE household_id = $1
    ORDER BY created_at DESC
    LIMIT 1
  `, [householdId])

  return result.rows[0] ?? null
}

test.describe("Magic Chat - REAL Integration Tests", () => {
  let householdId: string
  let page: Page

  test.beforeAll(async () => {
    // Get test household ID
    householdId = await getTestHouseholdId() as string
    if (!householdId) {
      throw new Error("Test user household not found. Create test user first.")
    }

    // Cleanup any previous test data
    await cleanupTestData(householdId)
  })

  test.afterAll(async () => {
    // Cleanup test data
    await cleanupTestData(householdId)
    await pool.end()
  })

  test.beforeEach(async ({ page: p }) => {
    page = p

    // Login as test user (REAL login, no mocks)
    await page.goto("/login")
    await page.getByLabel("Email").fill(TEST_USER.email)
    await page.getByLabel("Mot de passe").fill(TEST_USER.password)
    await page.getByRole("button", { name: /connexion/i }).click()

    // Wait for redirect to dashboard
    await expect(page).toHaveURL(/dashboard/, { timeout: 15000 })
  })

  test("should create task via Magic Chat with correct date parsing", async () => {
    // ARRANGE: Get child and initial task count
    const child = await getChildByName(householdId, "Johan")
    const initialTaskCount = await countTasksWithTitle(householdId, "devoirs")

    // ACT: Open Magic Chat
    const chatButton = page.getByTestId("magic-chat-button").or(
      page.locator('button:has(svg[class*="sparkle"])')
    ).or(
      page.getByRole("button", { name: /chat/i })
    )
    await chatButton.click()

    // Wait for chat to open
    await expect(page.getByPlaceholder(/message/i)).toBeVisible({ timeout: 5000 })

    // Type the message
    const input = page.getByPlaceholder(/message/i)
    await input.fill("E2E TEST - Johan doit faire ses devoirs demain à 19h")

    // Submit (press Enter)
    await input.press("Enter")

    // ASSERT: Wait for response
    await expect(page.getByText(/tâche créée/i)).toBeVisible({ timeout: 10000 })

    // ASSERT: Verify in database
    await page.waitForTimeout(2000) // Wait for DB write

    const newTaskCount = await countTasksWithTitle(householdId, "E2E TEST")
    expect(newTaskCount).toBe(initialTaskCount + 1)

    const latestTask = await getLatestTask(householdId)
    expect(latestTask).not.toBeNull()
    expect(latestTask.title).toContain("E2E TEST")

    // Verify child assignment if child exists
    if (child) {
      expect(latestTask.child_id).toBe(child.id)
    }

    // Verify due date is tomorrow
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const dueDate = new Date(latestTask.due_date)
    expect(dueDate.getDate()).toBe(tomorrow.getDate())
    expect(dueDate.getHours()).toBe(19)
  })

  test("should show task in task list after creation via chat", async () => {
    // Create task via chat
    const chatButton = page.getByTestId("magic-chat-button").or(
      page.locator('button:has(svg[class*="sparkle"])')
    )
    await chatButton.click()

    const input = page.getByPlaceholder(/message/i)
    await input.fill("E2E TEST - Tâche visible dans liste")
    await input.press("Enter")

    await expect(page.getByText(/tâche créée/i)).toBeVisible({ timeout: 10000 })

    // Close chat
    await page.keyboard.press("Escape")

    // Navigate to tasks
    await page.goto("/tasks")
    await page.waitForLoadState("networkidle")

    // ASSERT: Task appears in list
    await expect(page.getByText("E2E TEST - Tâche visible")).toBeVisible({ timeout: 10000 })
  })

  test("should handle error gracefully when not premium", async () => {
    // This test requires a non-premium user
    // Skip if test user is premium
    const result = await pool.query(`
      SELECT h.subscription_status
      FROM households h
      WHERE h.id = $1
    `, [householdId])

    const status = result.rows[0]?.subscription_status
    if (status === "active" || status === "premium") {
      test.skip()
      return
    }

    // Try to open chat
    const chatButton = page.getByTestId("magic-chat-button").or(
      page.locator('button:has(svg[class*="sparkle"])')
    )
    await chatButton.click()

    // Should show premium gate
    await expect(page.getByText(/premium/i)).toBeVisible({ timeout: 5000 })
  })
})

test.describe("Kids Dashboard - REAL Integration Tests", () => {
  let householdId: string
  let childId: string
  let page: Page

  test.beforeAll(async () => {
    householdId = await getTestHouseholdId() as string
    const child = await getChildByName(householdId, "Johan")
    if (!child) {
      throw new Error("Test child 'Johan' not found")
    }
    childId = child.id
  })

  test.afterAll(async () => {
    await pool.end()
  })

  test("should login with PIN and show dashboard", async ({ page: p }) => {
    page = p

    // Get child's PIN from database (for test setup)
    const result = await pool.query(`
      SELECT ca.pin_hash
      FROM child_accounts ca
      WHERE ca.child_id = $1
    `, [childId])

    // Navigate to kids page
    await page.goto("/kids")

    // Click on child profile
    await page.getByText(/Johan/i).click()

    // Enter PIN (assuming test PIN is 1234)
    const pinInput = page.getByRole("textbox").or(page.locator('input[type="password"]'))
    await pinInput.fill("1234")

    // Should redirect to dashboard
    await expect(page).toHaveURL(new RegExp(`/kids/${childId}/dashboard`), { timeout: 10000 })

    // Verify dashboard elements
    await expect(page.getByText(/XP/i)).toBeVisible()
  })

  test("should complete task and earn XP", async ({ page: p }) => {
    page = p

    // Get initial XP
    const initialXp = await pool.query(`
      SELECT COALESCE(total_xp, 0) as xp FROM children WHERE id = $1
    `, [childId])
    const startXp = parseInt(initialXp.rows[0]?.xp ?? "0", 10)

    // Create a test task assigned to this child
    await pool.query(`
      INSERT INTO tasks (household_id, child_id, title, status, category, priority)
      VALUES ($1, $2, 'E2E TEST - Complete me', 'pending', 'chores', 2)
    `, [householdId, childId])

    // Login as child
    await page.goto(`/kids/login/${childId}`)
    await page.locator('input').fill("1234")
    await page.waitForURL(new RegExp(`/kids/${childId}/dashboard`))

    // Find and complete the task
    const taskCard = page.getByText("E2E TEST - Complete me")
    await taskCard.click()

    // Click complete button
    await page.getByRole("button", { name: /terminer|fait|complet/i }).click()

    // Wait for celebration animation
    await page.waitForTimeout(2000)

    // ASSERT: XP increased in database
    const finalXp = await pool.query(`
      SELECT COALESCE(total_xp, 0) as xp FROM children WHERE id = $1
    `, [childId])
    const endXp = parseInt(finalXp.rows[0]?.xp ?? "0", 10)

    expect(endXp).toBeGreaterThan(startXp)

    // ASSERT: Task is completed in database
    const taskStatus = await pool.query(`
      SELECT status FROM tasks
      WHERE household_id = $1 AND title = 'E2E TEST - Complete me'
      ORDER BY created_at DESC LIMIT 1
    `, [householdId])

    expect(taskStatus.rows[0]?.status).toBe("completed")
  })
})
