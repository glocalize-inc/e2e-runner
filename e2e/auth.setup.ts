import { test as setup, expect } from '@playwright/test'
import fs from 'fs'
import { AUTH_FILE, AUTH_DIR, ensureAuthDir } from './constants'

const authFile = AUTH_FILE

// Ensure auth directory exists
ensureAuthDir()

/**
 * Check if there's already a valid auth state with currentRole set
 */
function hasValidAuthState(): boolean {
  try {
    if (!fs.existsSync(authFile)) return false
    const content = fs.readFileSync(authFile, 'utf-8')
    const data = JSON.parse(content)

    // Check if any origin has a valid currentRole
    for (const origin of data.origins || []) {
      for (const item of origin.localStorage || []) {
        if (item.name === 'currentRole') {
          const role = JSON.parse(item.value)
          if (role?.name) {
            return true
          }
        }
      }
    }
    return false
  } catch {
    return false
  }
}

/**
 * Authentication setup for LSP app E2E tests.
 *
 * This setup runs before all tests that depend on authentication.
 * It saves the authenticated state to a file that other tests can reuse.
 *
 * LSP authentication flow:
 * 1. Navigate to /login with token and userId in callback URL
 * 2. Login page calls NextAuth signIn with credentials
 * 3. On success, session is created and user is redirected
 */
setup('authenticate', async ({ page }) => {
  // Skip if there's already a valid auth state (from hub auth or previous run)
  if (hasValidAuthState()) {
    console.log('✅ Valid auth state already exists, skipping token-based auth...')
    return
  }

  const testToken = process.env.E2E_TEST_TOKEN
  const testUserId = process.env.E2E_TEST_USER_ID

  if (!testToken || !testUserId) {
    console.warn(
      'Warning: E2E_TEST_TOKEN and E2E_TEST_USER_ID environment variables are not set.',
      'Tests requiring authentication will be skipped or fail.',
      'Please set these variables in .env.test file.'
    )
    // Don't overwrite if hub auth might have set a valid state
    if (!hasValidAuthState()) {
      await page.context().storageState({ path: authFile })
    }
    return
  }

  try {
    // Navigate to login with callback containing token
    const callbackUrl = `/home?token=${encodeURIComponent(testToken)}&userId=${testUserId}`
    await page.goto(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`)

    // Wait for authentication to complete and redirect to home
    await page.waitForURL('**/home', { timeout: 30000 })

    // Verify authentication by checking for authenticated UI elements
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 })

    // Save the authentication state
    await page.context().storageState({ path: authFile })
    console.log('Authentication successful!')
  } catch (error) {
    console.warn(
      'Authentication failed. This may be due to:',
      '\n  - Invalid or expired test token',
      '\n  - Backend API not accessible',
      '\n  - Hub app not running on localhost:3000',
      '\nTests requiring authentication will fail.',
      '\nError:', error instanceof Error ? error.message : error
    )
    // Don't overwrite valid state from hub auth
    if (!hasValidAuthState()) {
      await page.context().storageState({ path: authFile })
    }
  }
})
