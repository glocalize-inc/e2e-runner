import { Page, expect } from '@playwright/test'
import { BasePage } from './base.page'

/**
 * Page Object Model for the Home/Dashboard page.
 */
export class HomePage extends BasePage {
  // Selectors - adjust based on actual UI
  readonly sidebar = '[data-testid="sidebar"], aside'
  readonly userMenu = '[data-testid="user-menu"]'
  readonly mainContent = 'main'

  constructor(page: Page) {
    super(page)
  }

  /**
   * Navigate to home page
   */
  async navigate() {
    await this.goto('/home')
  }

  /**
   * Check if user is authenticated by verifying UI elements
   */
  async expectAuthenticated() {
    // Wait for main layout to be visible
    await expect(this.page.locator(this.mainContent)).toBeVisible({ timeout: 10000 })
  }

  /**
   * Check if on home page
   */
  async expectOnHomePage() {
    await expect(this.page).toHaveURL(/\/home/)
  }

  /**
   * Open user menu (for logout, settings, etc.)
   */
  async openUserMenu() {
    await this.page.locator(this.userMenu).click()
  }
}
