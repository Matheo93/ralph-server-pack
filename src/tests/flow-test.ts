/**
 * Test complete flow: user → foyer → enfant with PostgreSQL AWS
 * Run with: bun run src/tests/flow-test.ts
 */
import { Pool } from 'pg'
import * as crypto from 'crypto'

// Create connection pool
const pool = new Pool({
  connectionString: process.env['DATABASE_URL'],
  ssl: { rejectUnauthorized: false },
})

interface TestResult {
  name: string
  success: boolean
  error?: string
  data?: unknown
}

const results: TestResult[] = []

// Test data
const TEST_USER_ID = crypto.randomUUID()
const TEST_USER_EMAIL = `test-${crypto.randomBytes(8).toString('hex')}@example.com`
let TEST_HOUSEHOLD_ID: string | null = null
let TEST_CHILD_ID: string | null = null

function log(message: string, data?: unknown) {
  console.log(`[FLOW-TEST] ${message}`, data ?? '')
}

function logResult(result: TestResult) {
  results.push(result)
  if (result.success) {
    console.log(`✅ ${result.name}`)
  } else {
    console.log(`❌ ${result.name}: ${result.error}`)
  }
}

async function testDatabaseConnection(): Promise<boolean> {
  log('Testing database connection...')

  try {
    const result = await pool.query('SELECT NOW() as time')
    const row = result.rows[0] as { time: Date } | undefined
    logResult({
      name: 'Database Connection',
      success: true,
      data: { serverTime: row?.time },
    })
    return true
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logResult({ name: 'Database Connection', success: false, error: message })
    return false
  }
}

async function testSetCurrentUser(): Promise<boolean> {
  log('Testing set_config for RLS...')

  try {
    await pool.query('SELECT set_config($1, $2, false)', ['app.current_user_id', TEST_USER_ID])

    // Verify it was set
    const result = await pool.query('SELECT current_setting($1, true) as user_id', ['app.current_user_id'])
    const row = result.rows[0] as { user_id: string } | undefined
    const storedUserId = row?.user_id

    if (storedUserId !== TEST_USER_ID) {
      logResult({
        name: 'Set Current User',
        success: false,
        error: `Expected ${TEST_USER_ID}, got ${storedUserId}`,
      })
      return false
    }

    logResult({ name: 'Set Current User', success: true, data: { userId: storedUserId } })
    return true
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logResult({ name: 'Set Current User', success: false, error: message })
    return false
  }
}

async function testCreateUser(): Promise<boolean> {
  log('Testing user creation...')

  try {
    // Insert user first (household_members requires a user)
    await pool.query(
      `INSERT INTO users (id, email)
       VALUES ($1, $2)
       ON CONFLICT (id) DO NOTHING`,
      [TEST_USER_ID, TEST_USER_EMAIL]
    )

    logResult({ name: 'Create User', success: true, data: { id: TEST_USER_ID, email: TEST_USER_EMAIL } })
    return true
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logResult({ name: 'Create User', success: false, error: message })
    return false
  }
}

async function testCreateHousehold(): Promise<boolean> {
  log('Testing household creation...')

  try {
    // Insert household (no created_by column in actual schema)
    const householdResult = await pool.query(
      `INSERT INTO households (name, country, timezone)
       VALUES ($1, $2, $3)
       RETURNING id, name, created_at`,
      ['Test Family', 'FR', 'Europe/Paris']
    )

    const household = householdResult.rows[0] as {
      id: string
      name: string
      created_at: Date
    } | undefined

    if (!household) {
      logResult({ name: 'Create Household', success: false, error: 'No household returned' })
      return false
    }

    TEST_HOUSEHOLD_ID = household.id

    // Add user as member (no email column in actual schema)
    await pool.query(
      `INSERT INTO household_members (household_id, user_id, role)
       VALUES ($1, $2, $3)`,
      [TEST_HOUSEHOLD_ID, TEST_USER_ID, 'owner']
    )

    logResult({
      name: 'Create Household',
      success: true,
      data: { id: household.id, name: household.name },
    })
    return true
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logResult({ name: 'Create Household', success: false, error: message })
    return false
  }
}

async function testCreateChild(): Promise<boolean> {
  log('Testing child creation...')

  if (!TEST_HOUSEHOLD_ID) {
    logResult({ name: 'Create Child', success: false, error: 'No household ID available' })
    return false
  }

  try {
    const birthdate = new Date()
    birthdate.setFullYear(birthdate.getFullYear() - 8) // 8 years old

    const result = await pool.query(
      `INSERT INTO children (household_id, first_name, birthdate, is_active)
       VALUES ($1, $2, $3, $4)
       RETURNING id, first_name, birthdate, is_active`,
      [TEST_HOUSEHOLD_ID, 'Test Child', birthdate.toISOString().split('T')[0], true]
    )

    const child = result.rows[0] as {
      id: string
      first_name: string
      birthdate: Date
      is_active: boolean
    } | undefined

    if (!child) {
      logResult({ name: 'Create Child', success: false, error: 'No child returned' })
      return false
    }

    TEST_CHILD_ID = child.id

    logResult({
      name: 'Create Child',
      success: true,
      data: { id: child.id, name: child.first_name },
    })
    return true
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logResult({ name: 'Create Child', success: false, error: message })
    return false
  }
}

async function testReadHousehold(): Promise<boolean> {
  log('Testing household read...')

  if (!TEST_HOUSEHOLD_ID) {
    logResult({ name: 'Read Household', success: false, error: 'No household ID available' })
    return false
  }

  try {
    // Set user for RLS
    await pool.query('SELECT set_config($1, $2, false)', ['app.current_user_id', TEST_USER_ID])

    const result = await pool.query(
      `SELECT h.*, COUNT(c.id) as children_count
       FROM households h
       LEFT JOIN children c ON h.id = c.household_id AND c.is_active = true
       WHERE h.id = $1
       GROUP BY h.id`,
      [TEST_HOUSEHOLD_ID]
    )

    const household = result.rows[0] as {
      id: string
      name: string
      children_count: string
    } | undefined

    if (!household) {
      logResult({ name: 'Read Household', success: false, error: 'Household not found' })
      return false
    }

    logResult({
      name: 'Read Household',
      success: true,
      data: { id: household.id, name: household.name, childrenCount: household.children_count },
    })
    return true
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logResult({ name: 'Read Household', success: false, error: message })
    return false
  }
}

async function testReadChildren(): Promise<boolean> {
  log('Testing children read...')

  if (!TEST_HOUSEHOLD_ID) {
    logResult({ name: 'Read Children', success: false, error: 'No household ID available' })
    return false
  }

  try {
    const result = await pool.query(
      `SELECT id, first_name, birthdate, is_active
       FROM children
       WHERE household_id = $1 AND is_active = true`,
      [TEST_HOUSEHOLD_ID]
    )

    const children = result.rows as Array<{
      id: string
      first_name: string
      birthdate: Date
      is_active: boolean
    }>

    logResult({
      name: 'Read Children',
      success: true,
      data: { count: children.length, children: children.map((c) => c.first_name) },
    })
    return true
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logResult({ name: 'Read Children', success: false, error: message })
    return false
  }
}

async function cleanup(): Promise<void> {
  log('Cleaning up test data...')

  try {
    // Delete in reverse order of creation (respecting foreign keys)
    if (TEST_CHILD_ID) {
      await pool.query('DELETE FROM children WHERE id = $1', [TEST_CHILD_ID])
    }

    if (TEST_HOUSEHOLD_ID) {
      await pool.query('DELETE FROM household_members WHERE household_id = $1', [TEST_HOUSEHOLD_ID])
      await pool.query('DELETE FROM households WHERE id = $1', [TEST_HOUSEHOLD_ID])
    }

    // Delete test user
    await pool.query('DELETE FROM users WHERE id = $1', [TEST_USER_ID])

    logResult({ name: 'Cleanup', success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logResult({ name: 'Cleanup', success: false, error: message })
  }
}

async function runTests() {
  console.log('\n========================================')
  console.log('  FLOW TEST - User→Foyer→Enfant')
  console.log('========================================\n')

  log('Configuration:', {
    testUserId: TEST_USER_ID,
    testEmail: TEST_USER_EMAIL,
    database: process.env['DATABASE_URL']?.replace(/:([^:@]+)@/, ':***@'),
  })
  console.log('')

  // Run tests in sequence
  const connected = await testDatabaseConnection()
  if (!connected) {
    console.log('\n❌ Cannot proceed - database connection failed')
    process.exit(1)
  }

  await testSetCurrentUser()
  await testCreateUser()
  await testCreateHousehold()
  await testCreateChild()
  await testReadHousehold()
  await testReadChildren()

  // Cleanup
  await cleanup()

  // Close pool
  await pool.end()

  // Summary
  console.log('\n========================================')
  console.log('  TEST SUMMARY')
  console.log('========================================')

  const passed = results.filter((r) => r.success).length
  const failed = results.filter((r) => !r.success).length

  console.log(`\n  Passed: ${passed}`)
  console.log(`  Failed: ${failed}`)
  console.log(`  Total:  ${results.length}`)

  if (failed > 0) {
    console.log('\n  FAILED TESTS:')
    results.filter((r) => !r.success).forEach((r) => {
      console.log(`    - ${r.name}: ${r.error}`)
    })
    process.exit(1)
  }

  console.log('\n✅ All flow tests passed!')
  console.log('')
}

// Run tests
runTests().catch((error) => {
  console.error('Test runner failed:', error)
  process.exit(1)
})
