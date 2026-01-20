/**
 * Database Helper for E2E Tests
 *
 * Provides direct database access for:
 * - Verifying data was actually saved
 * - Setting up test fixtures
 * - Cleaning up after tests
 */

import { Pool, PoolClient } from "pg"

// Use the same DATABASE_URL as the app
const connectionString = process.env['DATABASE_URL'] ||
  "postgresql://ralph:8gBOBENecJ6Erg9@ralph-test-db.cj8s4m06043b.us-east-1.rds.amazonaws.com:5432/ralphdb"

// Singleton pool
let pool: Pool | null = null

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString })
  }
  return pool
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end()
    pool = null
  }
}

// ============================================================
// QUERY HELPERS
// ============================================================

export async function query<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  const result = await getPool().query(sql, params)
  return result.rows as T[]
}

export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T | null> {
  const rows = await query<T>(sql, params)
  return rows[0] ?? null
}

export async function execute(sql: string, params?: unknown[]): Promise<number> {
  const result = await getPool().query(sql, params)
  return result.rowCount ?? 0
}

// ============================================================
// TEST DATA HELPERS
// ============================================================

export interface TestUser {
  id: string
  email: string
  householdId: string
}

export interface TestChild {
  id: string
  firstName: string
  householdId: string
}

/**
 * Get or create test user
 */
export async function getTestUser(email: string = "test-e2e@familyload.test"): Promise<TestUser | null> {
  const user = await queryOne<{ id: string; email: string }>(`
    SELECT u.id, u.email
    FROM users u
    WHERE u.email = $1
  `, [email])

  if (!user) return null

  const membership = await queryOne<{ household_id: string }>(`
    SELECT household_id
    FROM household_members
    WHERE user_id = $1
    LIMIT 1
  `, [user.id])

  return {
    id: user.id,
    email: user.email,
    householdId: membership?.household_id ?? "",
  }
}

/**
 * Get children for a household
 */
export async function getChildren(householdId: string): Promise<TestChild[]> {
  const children = await query<{ id: string; first_name: string; household_id: string }>(`
    SELECT id, first_name, household_id
    FROM children
    WHERE household_id = $1 AND is_active = true
  `, [householdId])

  return children.map(c => ({
    id: c.id,
    firstName: c.first_name,
    householdId: c.household_id,
  }))
}

/**
 * Get child by name
 */
export async function getChildByName(householdId: string, name: string): Promise<TestChild | null> {
  const child = await queryOne<{ id: string; first_name: string; household_id: string }>(`
    SELECT id, first_name, household_id
    FROM children
    WHERE household_id = $1 AND LOWER(first_name) = LOWER($2)
    LIMIT 1
  `, [householdId, name])

  if (!child) return null

  return {
    id: child.id,
    firstName: child.first_name,
    householdId: child.household_id,
  }
}

// ============================================================
// TASK HELPERS
// ============================================================

export interface TaskData {
  id?: string
  householdId: string
  title: string
  childId?: string
  status?: string
  dueDate?: string
  category?: string
  priority?: number
}

/**
 * Create a task directly in DB
 */
export async function createTask(data: TaskData): Promise<string> {
  const result = await queryOne<{ id: string }>(`
    INSERT INTO tasks (household_id, title, child_id, status, due_date, category, priority)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id
  `, [
    data.householdId,
    data.title,
    data.childId ?? null,
    data.status ?? "pending",
    data.dueDate ?? null,
    data.category ?? "general",
    data.priority ?? 2,
  ])

  return result!.id
}

/**
 * Get task by ID
 */
export async function getTask(taskId: string) {
  return queryOne<{
    id: string
    title: string
    status: string
    child_id: string | null
    due_date: string | null
    household_id: string
  }>(`SELECT * FROM tasks WHERE id = $1`, [taskId])
}

/**
 * Count tasks matching criteria
 */
export async function countTasks(householdId: string, filters?: {
  titleLike?: string
  status?: string
  childId?: string
}): Promise<number> {
  let sql = `SELECT COUNT(*) as count FROM tasks WHERE household_id = $1`
  const params: unknown[] = [householdId]
  let paramIndex = 2

  if (filters?.titleLike) {
    sql += ` AND title ILIKE $${paramIndex++}`
    params.push(`%${filters.titleLike}%`)
  }

  if (filters?.status) {
    sql += ` AND status = $${paramIndex++}`
    params.push(filters.status)
  }

  if (filters?.childId) {
    sql += ` AND child_id = $${paramIndex++}`
    params.push(filters.childId)
  }

  const result = await queryOne<{ count: string }>(sql, params)
  return parseInt(result?.count ?? "0", 10)
}

/**
 * Get latest task
 */
export async function getLatestTask(householdId: string) {
  return queryOne<{
    id: string
    title: string
    status: string
    child_id: string | null
    due_date: string | null
    created_at: string
  }>(`
    SELECT * FROM tasks
    WHERE household_id = $1
    ORDER BY created_at DESC
    LIMIT 1
  `, [householdId])
}

// ============================================================
// XP & GAMIFICATION HELPERS
// ============================================================

/**
 * Get child's XP
 */
export async function getChildXp(childId: string): Promise<number> {
  const result = await queryOne<{ total_xp: string }>(`
    SELECT COALESCE(total_xp, 0) as total_xp
    FROM children
    WHERE id = $1
  `, [childId])

  return parseInt(result?.total_xp ?? "0", 10)
}

/**
 * Set child's XP (for test setup)
 */
export async function setChildXp(childId: string, xp: number): Promise<void> {
  await execute(`UPDATE children SET total_xp = $1 WHERE id = $2`, [xp, childId])
}

// ============================================================
// CLEANUP HELPERS
// ============================================================

/**
 * Delete tasks matching pattern
 */
export async function cleanupTasks(householdId: string, titlePattern: string): Promise<number> {
  return execute(`
    DELETE FROM tasks
    WHERE household_id = $1 AND title ILIKE $2
  `, [householdId, `%${titlePattern}%`])
}

/**
 * Clean all test data (use with caution!)
 */
export async function cleanupAllTestData(householdId: string): Promise<void> {
  // Delete in correct order due to foreign keys
  await execute(`DELETE FROM task_completions WHERE task_id IN (SELECT id FROM tasks WHERE household_id = $1)`, [householdId])
  await execute(`DELETE FROM tasks WHERE household_id = $1 AND title LIKE '%TEST%'`, [householdId])
  await execute(`DELETE FROM shopping_items WHERE list_id IN (SELECT id FROM shopping_lists WHERE household_id = $1 AND name LIKE '%TEST%')`, [householdId])
  await execute(`DELETE FROM shopping_lists WHERE household_id = $1 AND name LIKE '%TEST%'`, [householdId])
  await execute(`DELETE FROM calendar_events WHERE household_id = $1 AND title LIKE '%TEST%'`, [householdId])
}

// ============================================================
// TRANSACTION HELPER
// ============================================================

/**
 * Run multiple operations in a transaction
 */
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect()
  try {
    await client.query("BEGIN")
    const result = await callback(client)
    await client.query("COMMIT")
    return result
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    client.release()
  }
}
