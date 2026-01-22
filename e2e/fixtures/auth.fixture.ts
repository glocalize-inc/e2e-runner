import { test as base, expect } from '@playwright/test'
import { LoginPage } from '../pages/login.page'
import { HomePage } from '../pages/home.page'
import { HomeLpmPage } from '../pages/home-lpm.page'
import { HomeTadPage } from '../pages/home-tad.page'

/**
 * Custom test fixtures with page objects for authentication tests.
 */
type AuthFixtures = {
  loginPage: LoginPage
  homePage: HomePage
  homeLpmPage: HomeLpmPage
  homeTadPage: HomeTadPage
}

export const test = base.extend<AuthFixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page))
  },
  homePage: async ({ page }, use) => {
    await use(new HomePage(page))
  },
  homeLpmPage: async ({ page }, use) => {
    await use(new HomeLpmPage(page))
  },
  homeTadPage: async ({ page }, use) => {
    await use(new HomeTadPage(page))
  },
})

export { expect }
