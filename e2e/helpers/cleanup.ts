/**
 * Cleanup Helper for E2E Tests
 *
 * Functions to clean up test data after tests complete.
 * Ensures tests don't pollute the database.
 */

import { execute, closePool, getPool } from "./db"

/**
 * Cleanup all test data from a household
 * Use with caution - deletes ALL test-related data
 */
export async function cleanupHousehold(householdId: string): Promise<void> {
  // Delete in order due to foreign key constraints

  // 1. Task-related
  await execute(`
    DELETE FROM task_completions
    WHERE task_id IN (SELECT id FROM tasks WHERE household_id = $1 AND title LIKE '%TEST%')
  `, [householdId])

  await execute(`
    DELETE FROM tasks WHERE household_id = $1 AND title LIKE '%TEST%'
  `, [householdId])

  // 2. Shopping-related
  await execute(`
    DELETE FROM shopping_items
    WHERE list_id IN (SELECT id FROM shopping_lists WHERE household_id = $1 AND name LIKE '%TEST%')
  `, [householdId])

  await execute(`
    DELETE FROM shopping_lists WHERE household_id = $1 AND name LIKE '%TEST%'
  `, [householdId])

  // 3. Calendar-related
  await execute(`
    DELETE FROM calendar_events WHERE household_id = $1 AND title LIKE '%TEST%'
  `, [householdId])

  // 4. Kids-related
  await execute(`
    DELETE FROM child_badges WHERE child_id IN (
      SELECT id FROM children WHERE household_id = $1 AND first_name LIKE '%Test%'
    )
  `, [householdId])

  await execute(`
    DELETE FROM child_accounts WHERE child_id IN (
      SELECT id FROM children WHERE household_id = $1 AND first_name LIKE '%Test%'
    )
  `, [householdId])

  await execute(`
    DELETE FROM children WHERE household_id = $1 AND first_name LIKE '%Test%'
  `, [householdId])
}

/**
 * Cleanup tasks with specific title pattern
 */
export async function cleanupTasks(householdId: string, titlePattern: string): Promise<number> {
  // First delete completions
  await execute(`
    DELETE FROM task_completions
    WHERE task_id IN (SELECT id FROM tasks WHERE household_id = $1 AND title ILIKE $2)
  `, [householdId, `%${titlePattern}%`])

  // Then delete tasks
  return execute(`
    DELETE FROM tasks WHERE household_id = $1 AND title ILIKE $2
  `, [householdId, `%${titlePattern}%`])
}

/**
 * Cleanup shopping lists with specific name pattern
 */
export async function cleanupShoppingLists(householdId: string, namePattern: string): Promise<number> {
  // First delete items
  await execute(`
    DELETE FROM shopping_items
    WHERE list_id IN (SELECT id FROM shopping_lists WHERE household_id = $1 AND name ILIKE $2)
  `, [householdId, `%${namePattern}%`])

  // Then delete lists
  return execute(`
    DELETE FROM shopping_lists WHERE household_id = $1 AND name ILIKE $2
  `, [householdId, `%${namePattern}%`])
}

/**
 * Cleanup calendar events with specific title pattern
 */
export async function cleanupCalendarEvents(householdId: string, titlePattern: string): Promise<number> {
  return execute(`
    DELETE FROM calendar_events WHERE household_id = $1 AND title ILIKE $2
  `, [householdId, `%${titlePattern}%`])
}

/**
 * Cleanup test users created during signup tests
 */
export async function cleanupTestUsers(emailPattern: string): Promise<number> {
  // First remove from household_members
  await execute(`
    DELETE FROM household_members
    WHERE user_id IN (SELECT id FROM users WHERE email ILIKE $1)
  `, [`%${emailPattern}%`])

  // Then delete users
  return execute(`
    DELETE FROM users WHERE email ILIKE $1
  `, [`%${emailPattern}%`])
}

/**
 * Reset child XP to a known value
 */
export async function resetChildXp(childId: string, xp: number = 0): Promise<void> {
  await execute(`UPDATE children SET total_xp = $1 WHERE id = $2`, [xp, childId])
}

/**
 * Reset household subscription status
 */
export async function resetSubscription(
  householdId: string,
  status: string = "free"
): Promise<void> {
  await execute(`
    UPDATE households
    SET subscription_status = $1,
        trial_end_date = NULL,
        subscription_end_date = NULL
    WHERE id = $2
  `, [status, householdId])
}

/**
 * Global cleanup function to run after all tests
 */
export async function globalCleanup(): Promise<void> {
  try {
    // Clean up any test data with common patterns
    await execute(`DELETE FROM tasks WHERE title LIKE '%E2E TEST%'`)
    await execute(`DELETE FROM tasks WHERE title LIKE '%TEST%'`)
    await execute(`DELETE FROM shopping_lists WHERE name LIKE '%E2E TEST%'`)
    await execute(`DELETE FROM calendar_events WHERE title LIKE '%E2E TEST%'`)
    await execute(`DELETE FROM users WHERE email LIKE '%test-signup-%'`)
    await execute(`DELETE FROM users WHERE email LIKE '%onboarding-test-%'`)
  } catch (error) {
    console.error("Cleanup error:", error)
  } finally {
    await closePool()
  }
}
