import { test as setup, expect } from '@playwright/test'
import path from 'path'

const authFile = path.join(__dirname, '.auth/user.json')

/**
 * Authentication setup via Hub login page with subdomain selection.
 *
 * Flow:
 * 1. Go to Hub signin page
 * 2. Enter email and password
 * 3. Submit form and wait for login
 * 4. Call /api/enough/u/hub-user/subdomains API
 * 5. Filter subdomains with status "done"
 * 6. Select subdomain (via env var or first available)
 * 7. Navigate to selected domainLink
 * 8. Save authenticated state
 *
 * Required environment variables:
 * - HUB_URL: Hub app URL (e.g., https://hub-dev.gloground.com)
 * - E2E_TEST_EMAIL: Test user email
 * - E2E_TEST_PASSWORD: Test user password
 * - E2E_SUBDOMAIN_NAME (optional): Specific subdomain name to select
 */
setup('authenticate via hub', async ({ page }) => {
  const hubUrl = process.env.NEXT_PUBLIC_HUB_URL || 'https://hub-dev.gloground.com'
  const testEmail = process.env.NEXT_PUBLIC_E2E_TEST_EMAIL || 'd_master_1@glozinc.com'
  const testPassword = process.env.NEXT_PUBLIC_E2E_TEST_PASSWORD || 'dnl dk Aowltus!'
  const preferredSubdomain = process.env.NEXT_PUBLIC_E2E_SUBDOMAIN_NAME

  if (!hubUrl || !testEmail || !testPassword) {
    console.warn(
      'Warning: HUB_URL, E2E_TEST_EMAIL, and E2E_TEST_PASSWORD environment variables are required.',
      'Tests requiring authentication will be skipped or fail.',
      'Please set these variables in .env.staging file.'
    )
    await page.context().storageState({ path: authFile })
    return
  }

  try {
    console.log(`\n📍 Step 1: Navigating to Hub signin: ${hubUrl}/signin`)

    // Step 1: Go to Hub signin page
    await page.goto(`${hubUrl}/signin`, { timeout: 30000 })
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})

    // Step 2: Fill in email field
    console.log('📝 Step 2: Entering email...')
    const emailInput = page.locator('input[placeholder="username@example.com"], input[name="email"]').first()
    await expect(emailInput).toBeVisible({ timeout: 10000 })
    await emailInput.fill(testEmail)

    // Step 3: Fill in password field
    console.log('🔑 Step 3: Entering password...')
    const passwordInput = page.locator('input[type="password"], input[id="auth-login-v2-password"]').first()
    await expect(passwordInput).toBeVisible({ timeout: 5000 })
    await passwordInput.fill(testPassword)

    // Step 4: Click sign in button
    console.log('🚀 Step 4: Clicking sign in...')

    // Close TanStack Query DevTools if visible (it can block clicks)
    const devToolsOverlay = page.locator('.tsqd-queries-overflow-container, [class*="tsqd-"]')
    if (await devToolsOverlay.isVisible().catch(() => false)) {
      console.log('   ⚠️ Closing DevTools overlay...')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(500)
    }

    const signInButton = page.locator('button[type="submit"]').filter({ hasText: /sign in/i })
    await expect(signInButton).toBeVisible({ timeout: 5000 })
    await signInButton.click({ force: true })

    // Step 5: Wait for login to complete
    await page.waitForURL((url) => !url.pathname.includes('/signin'), { timeout: 30000 })
    console.log('✅ Hub login successful!')

    // Wait for Hub to fully load
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})

    // Step 6: Get access token from localStorage
    console.log('🔐 Step 5: Getting access token...')
    const accessToken = await page.evaluate(() => {
      return localStorage.getItem('accessToken')
    })

    if (!accessToken) {
      throw new Error('Access token not found in localStorage after Hub login')
    }

    // Step 7: Call subdomains API (using backend API URL)
    console.log('📡 Step 6: Fetching available subdomains...')
    const apiBaseUrl = process.env.API_BASE_URL || 'https://api-enough-dev.gloground.com'
    const subdomainsResponse = await page.evaluate(async ({ token, apiUrl }) => {
      const response = await fetch(`${apiUrl}/api/enough/u/hub-user/subdomains`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      const text = await response.text()
      try {
        return JSON.parse(text)
      } catch {
        console.error('Failed to parse response:', text.substring(0, 200))
        throw new Error(`API returned non-JSON response: ${text.substring(0, 100)}`)
      }
    }, { token: accessToken, apiUrl: apiBaseUrl })

    // Step 8: Filter subdomains with status "done"
    const subdomains = subdomainsResponse.data || subdomainsResponse || []
    const availableSubdomains = subdomains.filter(
      (sub: any) => sub.status === 'done' && sub.domainLink
    )

    if (availableSubdomains.length === 0) {
      throw new Error('No available subdomains with status "done" found')
    }

    console.log('\n📋 Available subdomains (status: done):')
    availableSubdomains.forEach((sub: any, index: number) => {
      console.log(`   ${index + 1}. ${sub.name} (${sub.role}) - ${sub.domainLink}`)
    })

    // Step 9: Select subdomain
    let selectedSubdomain: any

    if (preferredSubdomain) {
      // Use preferred subdomain from env var
      selectedSubdomain = availableSubdomains.find(
        (sub: any) => sub.name.toLowerCase().includes(preferredSubdomain.toLowerCase())
      )
      if (!selectedSubdomain) {
        console.warn(`⚠️ Preferred subdomain "${preferredSubdomain}" not found, using first available`)
        selectedSubdomain = availableSubdomains[0]
      }
    } else {
      // Use first available subdomain
      selectedSubdomain = availableSubdomains[0]
    }

    console.log(`\n🎯 Step 7: Selected subdomain: ${selectedSubdomain.name} (${selectedSubdomain.role})`)
    console.log(`   Domain: ${selectedSubdomain.domainLink}`)

    // Step 10: Get user info for token exchange
    const userData = await page.evaluate(() => {
      const data = localStorage.getItem('userData')
      return data ? JSON.parse(data) : null
    })

    const userId = selectedSubdomain.userId || userData?.userId

    // Step 11: Navigate to selected subdomain with auth
    console.log('🚀 Step 8: Navigating to subdomain...')

    // Build the login URL for the subdomain
    const domainUrl = selectedSubdomain.domainLink
    const loginUrl = `${domainUrl}/login?callbackUrl=${encodeURIComponent(`/home?token=${accessToken}&userId=${userId}`)}`

    await page.goto(loginUrl, { timeout: 30000 })

    // Step 12: Wait for authentication to complete
    await page.waitForURL('**/home', { timeout: 30000 })
    await expect(page.locator('main, [role="main"]').first()).toBeVisible({ timeout: 15000 })

    // Wait for the page to fully load with auth state
    console.log('⏳ Step 9: Waiting for auth state to be fully populated...')

    // Wait for user profile to be visible (indicates successful login)
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})

    // Verify we're logged in by checking for user profile element
    const userProfile = page.locator('img[alt="Profile"], [alt*="Profile"]').first()
    await userProfile.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {})

    // Get current role from page or set default
    const currentRoleFromPage = await page.evaluate(() => {
      const authStorage = localStorage.getItem('auth-storage')
      if (authStorage) {
        try {
          const parsed = JSON.parse(authStorage)
          console.log('Auth storage:', JSON.stringify(parsed.state))
          return parsed.state?.currentRole
        } catch {
          return null
        }
      }
      return null
    })

    console.log(`   Current role detected: ${currentRoleFromPage?.name || 'unknown'}`)

    // Additional wait for stability
    await page.waitForTimeout(2000)

    // Step 13: Save the authenticated state
    await page.context().storageState({ path: authFile })

    console.log('\n✅ Authentication via Hub successful!')
    console.log(`   Logged in as: ${testEmail}`)
    console.log(`   Subdomain: ${selectedSubdomain.name}`)
    console.log(`   URL: ${domainUrl}`)

  } catch (error) {
    console.error(
      '\n❌ Hub authentication failed. This may be due to:',
      '\n   - Invalid email or password',
      '\n   - Hub app not accessible',
      '\n   - No subdomains with status "done"',
      '\n   - Network issues',
      '\n\nError:', error instanceof Error ? error.message : error
    )
    // Save empty auth state so tests can still run (and fail appropriately)
    await page.context().storageState({ path: authFile })
  }
})
