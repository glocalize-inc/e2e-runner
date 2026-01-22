import { Page } from '@playwright/test'

/**
 * Base page class providing common functionality for all page objects.
 */
export class BasePage {
  constructor(protected page: Page) {}

  /**
   * Navigate to a path relative to baseURL
   */
  async goto(path: string) {
    await this.page.goto(path)
  }

  /**
   * Wait for page to be fully loaded
   */
  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle')
  }

  /**
   * Get current URL path
   */
  getCurrentPath(): string {
    return new URL(this.page.url()).pathname
  }

  /**
   * Take a screenshot with a descriptive name
   */
  async takeScreenshot(name: string) {
    await this.page.screenshot({ path: `e2e/test-results/screenshots/${name}.png` })
  }
}
