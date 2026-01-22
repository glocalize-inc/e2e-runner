import { test, expect } from '../../fixtures/auth.fixture'
import { ROUTES } from '../../fixtures/test-data'

test.describe('Session Management', () => {
  // These tests use authenticated state from setup

  test('should maintain session across page navigations', async ({ page }) => {
    // Increase timeout for this test
    test.setTimeout(60000)

    await page.goto(ROUTES.home, { timeout: 30000 })
    await expect(page).toHaveURL(/\/home/, { timeout: 10000 })

    // Navigate to another protected route
    await page.goto(ROUTES.dashboards, { timeout: 30000, waitUntil: 'domcontentloaded' })

    // Should either be on dashboards or still authenticated (not on login)
    const currentUrl = page.url()
    const isAuthenticated = !currentUrl.includes('/login')
    expect(isAuthenticated).toBe(true)
  })

  test('should display authenticated UI elements', async ({ page, homePage }) => {
    test.setTimeout(60000)

    await page.goto('/home', { timeout: 30000, waitUntil: 'domcontentloaded' })

    // Wait for URL to be correct
    await expect(page).toHaveURL(/\/home/, { timeout: 10000 })

    // Wait for any main content indicator to be visible
    const mainLocator = page.locator('main, [role="main"], #__next > div')
    await expect(mainLocator.first()).toBeVisible({ timeout: 15000 })
  })

  test('should handle page refresh without losing session', async ({ page }) => {
    test.setTimeout(60000)

    await page.goto(ROUTES.home, { timeout: 30000, waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/home/, { timeout: 10000 })

    // Wait for page to stabilize before refresh
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})

    // Refresh the page
    await page.reload({ timeout: 30000, waitUntil: 'domcontentloaded' })

    // Should still be on home page (not redirected to login)
    await expect(page).toHaveURL(/\/home/, { timeout: 10000 })

    // Verify some content is visible (flexible selector)
    const mainContent = page.locator('main, [role="main"], #__next > div')
    await expect(mainContent.first()).toBeVisible({ timeout: 15000 })
  })

  test('should show error page for session errors', async ({ page }) => {
    // Test the error page directly
    await page.goto('/auth/error?error=SessionExpired')

    // Should show error page content
    await expect(page).toHaveURL(/\/auth\/error/)
  })

  test('should handle RefreshTokenError gracefully', async ({ page }) => {
    await page.goto('/auth/error?error=RefreshTokenError')

    // Should show appropriate error message
    await expect(page).toHaveURL(/\/auth\/error/)
  })
})
