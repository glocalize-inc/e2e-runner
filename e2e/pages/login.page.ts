import { Page, expect } from '@playwright/test'
import { BasePage } from './base.page'

/**
 * Page Object Model for the Login page.
 *
 * LSP app authentication flow:
 * 1. User accesses LSP app
 * 2. If not authenticated, middleware redirects to /login
 * 3. /login page extracts token and userId from callback URL
 * 4. Calls signIn('credentials', { externalToken, userId })
 * 5. On success, redirects to target path; on failure, redirects to Hub
 */
export class LoginPage extends BasePage {
  // Selectors
  readonly loadingIndicator = '[data-testid="loading"]'

  constructor(page: Page) {
    super(page)
  }

  /**
   * Navigate to login page with credentials in callback URL
   * This simulates the flow from Hub app
   */
  async navigateWithCredentials(token: string, userId: string, targetPath: string = '/home') {
    const callbackUrl = `${targetPath}?token=${encodeURIComponent(token)}&userId=${userId}`
    await this.page.goto(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`)
  }

  /**
   * Wait for authentication to complete and redirect away from login
   */
  async waitForAuthenticationComplete() {
    await this.page.waitForURL((url) => !url.pathname.includes('/login'), {
      timeout: 30000,
    })
  }

  /**
   * Check if redirected to Hub (authentication failure)
   */
  async expectRedirectToHub() {
    const hubUrl = process.env.NEXT_PUBLIC_HUB_URL || 'http://localhost:3000'
    await expect(this.page).toHaveURL(new RegExp(hubUrl))
  }

  /**
   * Check if on login page
   */
  async expectOnLoginPage() {
    await expect(this.page).toHaveURL(/\/login/)
  }
}
