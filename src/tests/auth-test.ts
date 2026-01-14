/**
 * Test Cognito signup/login programmatically
 * Run with: bun run src/tests/auth-test.ts
 */
import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  InitiateAuthCommand,
  AdminDeleteUserCommand,
  AdminConfirmSignUpCommand,
} from '@aws-sdk/client-cognito-identity-provider'
import * as crypto from 'crypto'

// Config
const USER_POOL_ID = process.env['NEXT_PUBLIC_COGNITO_USER_POOL_ID'] ?? 'us-east-1_20DAUfyAk'
const CLIENT_ID = process.env['NEXT_PUBLIC_COGNITO_CLIENT_ID'] ?? '29fdh7o94qgos24dge389uf2n3'
const REGION = process.env['COGNITO_REGION'] ?? 'us-east-1'

// Create Cognito client
const client = new CognitoIdentityProviderClient({
  region: REGION,
})

// Test user credentials
const TEST_EMAIL = `test-${crypto.randomBytes(8).toString('hex')}@example.com`
const TEST_PASSWORD = 'TestPassword123!'

interface TestResult {
  name: string
  success: boolean
  error?: string
  data?: unknown
}

const results: TestResult[] = []

function log(message: string, data?: unknown) {
  console.log(`[AUTH-TEST] ${message}`, data ?? '')
}

function logResult(result: TestResult) {
  results.push(result)
  if (result.success) {
    console.log(`✅ ${result.name}`)
  } else {
    console.log(`❌ ${result.name}: ${result.error}`)
  }
}

async function testSignUp(): Promise<string | null> {
  log('Testing signup...', { email: TEST_EMAIL })

  try {
    const command = new SignUpCommand({
      ClientId: CLIENT_ID,
      Username: TEST_EMAIL,
      Password: TEST_PASSWORD,
      UserAttributes: [
        { Name: 'email', Value: TEST_EMAIL },
        { Name: 'name', Value: 'Test User' },
      ],
    })

    const response = await client.send(command)

    logResult({
      name: 'Signup',
      success: true,
      data: { userSub: response.UserSub, confirmed: response.UserConfirmed },
    })

    return response.UserSub ?? null
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logResult({ name: 'Signup', success: false, error: message })
    return null
  }
}

async function testAdminConfirmSignUp(): Promise<boolean> {
  log('Admin-confirming signup...')

  try {
    const command = new AdminConfirmSignUpCommand({
      UserPoolId: USER_POOL_ID,
      Username: TEST_EMAIL,
    })

    await client.send(command)

    logResult({ name: 'Admin Confirm Signup', success: true })
    return true
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logResult({ name: 'Admin Confirm Signup', success: false, error: message })
    return false
  }
}

async function testLogin(): Promise<string | null> {
  log('Testing login...')

  try {
    const command = new InitiateAuthCommand({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: CLIENT_ID,
      AuthParameters: {
        USERNAME: TEST_EMAIL,
        PASSWORD: TEST_PASSWORD,
      },
    })

    const response = await client.send(command)

    const idToken = response.AuthenticationResult?.IdToken
    const accessToken = response.AuthenticationResult?.AccessToken

    if (!idToken || !accessToken) {
      logResult({ name: 'Login', success: false, error: 'No tokens returned' })
      return null
    }

    // Decode JWT to get sub (user ID)
    const payload = JSON.parse(Buffer.from(idToken.split('.')[1] ?? '', 'base64').toString())
    const userId = payload['sub'] as string

    logResult({
      name: 'Login',
      success: true,
      data: { userId, hasIdToken: !!idToken, hasAccessToken: !!accessToken },
    })

    return userId
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logResult({ name: 'Login', success: false, error: message })
    return null
  }
}

async function cleanupTestUser(): Promise<void> {
  log('Cleaning up test user...')

  try {
    const command = new AdminDeleteUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: TEST_EMAIL,
    })

    await client.send(command)
    logResult({ name: 'Cleanup Test User', success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logResult({ name: 'Cleanup Test User', success: false, error: message })
  }
}

async function checkAwsCredentials(): Promise<boolean> {
  try {
    // Try a simple admin operation to check credentials
    const { GetUserPoolMfaConfigCommand } = await import('@aws-sdk/client-cognito-identity-provider')
    const command = new GetUserPoolMfaConfigCommand({ UserPoolId: USER_POOL_ID })
    await client.send(command)
    return true
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (message.includes('credentials') || message.includes('Credentials')) {
      return false
    }
    // Other errors mean credentials work but something else failed
    return true
  }
}

async function runTests() {
  console.log('\n========================================')
  console.log('  AUTH TEST - Cognito Signup/Login')
  console.log('========================================\n')

  log('Configuration:', {
    userPoolId: USER_POOL_ID,
    clientId: CLIENT_ID,
    region: REGION,
    testEmail: TEST_EMAIL,
  })
  console.log('')

  // Check if we have admin credentials
  const hasAdminCredentials = await checkAwsCredentials()
  log('Admin credentials available:', hasAdminCredentials)
  console.log('')

  // Run tests in sequence
  const userSub = await testSignUp()

  if (userSub && hasAdminCredentials) {
    // Admin-confirm the user (skip email verification for test)
    const confirmed = await testAdminConfirmSignUp()

    if (confirmed) {
      // Now login
      await testLogin()
    }

    // Cleanup
    await cleanupTestUser()
  } else if (userSub && !hasAdminCredentials) {
    console.log('\n⚠️  Skipping login/cleanup tests - no admin credentials available')
    console.log('   Signup was successful, which validates Cognito connectivity.')
    console.log('   To run full tests, configure AWS credentials with admin access.')
    console.log('')
  }

  // Summary
  console.log('\n========================================')
  console.log('  TEST SUMMARY')
  console.log('========================================')

  const passed = results.filter((r) => r.success).length
  const failed = results.filter((r) => !r.success).length
  const skipped = hasAdminCredentials ? 0 : 2

  console.log(`\n  Passed:  ${passed}`)
  console.log(`  Failed:  ${failed}`)
  console.log(`  Skipped: ${skipped} (no admin credentials)`)
  console.log(`  Total:   ${results.length}`)

  if (failed > 0) {
    console.log('\n  FAILED TESTS:')
    results.filter((r) => !r.success).forEach((r) => {
      console.log(`    - ${r.name}: ${r.error}`)
    })
    process.exit(1)
  }

  console.log('\n✅ All available tests passed!')
  console.log('')
}

// Run tests
runTests().catch((error) => {
  console.error('Test runner failed:', error)
  process.exit(1)
})
