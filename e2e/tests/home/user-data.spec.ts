import { test, expect } from '@playwright/test'
import { AUTH_FILE } from '../../constants'

/**
 * User Data tests.
 * Tests that user data is correctly fetched and stored after authentication.
 *
 * User data structure:
 * - Session contains: userId, email, legalName, roles, accessToken
 * - Session roles format: ["LPM-Master", "TAD-Master"] (strings with "name-type" format)
 * - currentRole in localStorage: {name: 'LPM', type: 'Master'} (object)
 *
 * These tests run before home navigation tests to verify data integrity.
 */

// Helper to parse session role string to object
function parseSessionRole(roleString: string): { name: string; type: string } | null {
  const parts = roleString.split('-')
  if (parts.length >= 2) {
    return { name: parts[0], type: parts.slice(1).join('-') }
  }
  return null
}

// Helper to check if session has specific role
function hasRole(sessionRoles: string[], roleName: string): boolean {
  return sessionRoles.some((role) => role.startsWith(roleName + '-'))
}

test.describe('User Data', () => {
  test.use({ storageState: AUTH_FILE })

  test.beforeEach(async ({ page }) => {
    await page.goto('/home', { timeout: 30000, waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
  })

  test('should have user session with roles', async ({ page }) => {
    // Fetch session from NextAuth API
    const session = await page.evaluate(async () => {
      const response = await fetch('/api/auth/session')
      return response.json()
    })

    // Session should exist and have roles
    expect(session).toBeTruthy()
    console.log('Session data:', JSON.stringify(session, null, 2))

    // roles should exist and be an array
    expect(session.roles).toBeTruthy()
    expect(Array.isArray(session.roles)).toBe(true)

    console.log('User roles from session:', JSON.stringify(session.roles, null, 2))

    // Each role should be a string in "name-type" format
    for (const role of session.roles) {
      expect(typeof role).toBe('string')
      const parsed = parseSessionRole(role)
      expect(parsed).toBeTruthy()
      expect(['LPM', 'TAD']).toContain(parsed!.name)
      console.log(`  - ${parsed!.name} (${parsed!.type})`)
    }
  })

  test('should have currentRole stored in localStorage', async ({ page }) => {
    // Get currentRole from localStorage
    const currentRole = await page.evaluate(() => {
      const value = window.localStorage.getItem('currentRole')
      return value ? JSON.parse(value) : null
    })

    // currentRole should exist
    expect(currentRole).toBeTruthy()

    console.log('Current role from localStorage:', JSON.stringify(currentRole, null, 2))

    // currentRole should have name and type
    expect(currentRole).toHaveProperty('name')
    expect(currentRole).toHaveProperty('type')
    expect(['LPM', 'TAD']).toContain(currentRole.name)
  })

  test('should have multiple roles for role switching capability', async ({ page }) => {
    // Fetch session from NextAuth API
    const session = await page.evaluate(async () => {
      const response = await fetch('/api/auth/session')
      return response.json()
    })

    expect(session).toBeTruthy()
    expect(session.roles).toBeTruthy()

    // Check if user has both LPM and TAD roles (session roles are strings like "LPM-Master")
    const hasLPM = hasRole(session.roles, 'LPM')
    const hasTAD = hasRole(session.roles, 'TAD')

    console.log('Session roles:', session.roles)
    console.log('Has LPM role:', hasLPM)
    console.log('Has TAD role:', hasTAD)

    if (hasLPM && hasTAD) {
      // User can switch roles
      expect(session.roles.length).toBeGreaterThanOrEqual(2)
      console.log('✅ User has multiple roles - role switching is available')
    } else {
      // User has single role - skip role switch tests
      console.log('⚠️ User has single role - role switching not available')
      test.skip(true, 'User has single role')
    }
  })

  test('should match currentRole with one of session roles', async ({ page }) => {
    // Get session and currentRole
    const [session, currentRole] = await page.evaluate(async () => {
      const sessionResponse = await fetch('/api/auth/session')
      const sessionData = await sessionResponse.json()

      const currentValue = window.localStorage.getItem('currentRole')
      const currentRoleData = currentValue ? JSON.parse(currentValue) : null

      return [sessionData, currentRoleData]
    })

    expect(session).toBeTruthy()
    expect(session.roles).toBeTruthy()
    expect(currentRole).toBeTruthy()

    console.log('Session roles:', session.roles)
    console.log('Current role:', currentRole)

    // Build the expected session role string from currentRole object
    // e.g., {name: "LPM", type: "Master"} -> "LPM-Master"
    const expectedRoleString = `${currentRole.name}-${currentRole.type}`

    // currentRole should match one of the session roles
    const matchingRole = session.roles.find(
      (role: string) => role === expectedRoleString
    )

    expect(matchingRole).toBeTruthy()
    console.log('✅ Current role matches session roles:', matchingRole)
  })

  test('should display correct UI based on currentRole', async ({ page }) => {
    // Get currentRole from localStorage
    const currentRole = await page.evaluate(() => {
      const value = window.localStorage.getItem('currentRole')
      return value ? JSON.parse(value) : null
    })

    expect(currentRole).toBeTruthy()

    if (currentRole.name === 'LPM') {
      // LPM role should show "Welcome back!" on home
      const welcomeText = page.getByText('Welcome back!')
      await expect(welcomeText).toBeVisible({ timeout: 10000 })
      console.log('✅ LPM home page displayed correctly')
    } else if (currentRole.name === 'TAD') {
      // TAD role should show TAD-specific content
      const hasTadContent =
        (await page.getByText('Manage Applicants').isVisible().catch(() => false)) ||
        (await page.getByText('Onboarding overview').isVisible().catch(() => false)) ||
        (await page.locator('text=Onboarding').first().isVisible().catch(() => false))

      expect(hasTadContent).toBe(true)
      console.log('✅ TAD home page displayed correctly')
    }
  })

  test('should have user info in session', async ({ page }) => {
    // Fetch session from NextAuth API
    const session = await page.evaluate(async () => {
      const response = await fetch('/api/auth/session')
      return response.json()
    })

    expect(session).toBeTruthy()

    // Session should have user information
    expect(session.userId).toBeTruthy()
    expect(session.email).toBeTruthy()
    expect(session.legalName).toBeTruthy()
    expect(session.accessToken).toBeTruthy()

    console.log('User info from session:')
    console.log('  - userId:', session.userId)
    console.log('  - email:', session.email)
    console.log('  - legalName:', session.legalName)
    console.log('  - roles count:', session.roles?.length)
  })
})
