import { Page, expect, Locator } from '@playwright/test'
import { BasePage } from './base.page'

/**
 * Page Object Model for LPM Home page.
 * LPM (Language Project Manager) has quick access cards for navigation.
 */
export class HomeLpmPage extends BasePage {
  // Quick access card buttons
  readonly createProjectButton: Locator
  readonly projectsCard: Locator
  readonly jobListCard: Locator
  readonly prosCard: Locator
  readonly clientsCard: Locator

  constructor(page: Page) {
    super(page)

    // Create Project button in header
    this.createProjectButton = page.getByRole('button', { name: /create project/i })

    // Quick access cards - using exact name match to avoid sidebar buttons
    this.projectsCard = page.getByRole('button', { name: 'Projects', exact: true })
    this.jobListCard = page.getByRole('button', { name: 'Job List', exact: true })
    this.prosCard = page.getByRole('button', { name: 'Pros', exact: true })
    this.clientsCard = page.getByRole('button', { name: 'Clients', exact: true })
  }

  async navigate() {
    await this.goto('/home')
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
  }

  async expectLpmHomeVisible() {
    // LPM home has "Welcome back!" title
    await expect(this.page.getByText('Welcome back!')).toBeVisible({ timeout: 10000 })
  }

  async clickCreateProject() {
    await this.createProjectButton.click()
    await expect(this.page).toHaveURL(/\/project\/create/, { timeout: 10000 })
  }

  async clickProjectsCard() {
    await this.projectsCard.click()
    await expect(this.page).toHaveURL(/\/project\/list/, { timeout: 10000 })
  }

  async clickJobListCard() {
    await this.jobListCard.click()
    await expect(this.page).toHaveURL(/\/job-list/, { timeout: 10000 })
  }

  async clickProsCard() {
    await this.prosCard.click()
    await expect(this.page).toHaveURL(/\/pro\/list/, { timeout: 10000 })
  }

  async clickClientsCard() {
    await this.clientsCard.click()
    await expect(this.page).toHaveURL(/\/client/, { timeout: 10000 })
  }
}
