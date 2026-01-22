import { Page, expect, Locator } from '@playwright/test'
import { BasePage } from './base.page'

/**
 * Page Object Model for TAD Home page.
 * TAD (Talent Acquisition Director) has onboarding management features.
 */
export class HomeTadPage extends BasePage {
  // First section cards
  readonly startNowButton: Locator
  readonly goToWowSubButton: Locator

  // Second section - Onboarding overview
  readonly onboardingOverviewLink: Locator
  readonly todaySignupCard: Locator

  // Stat cards
  readonly awaitingAssignmentStat: Locator
  readonly inCommunicationStat: Locator
  readonly pauseHoldStat: Locator
  readonly inTestingStat: Locator
  readonly failedTestStat: Locator

  // Comments table
  readonly commentsTable: Locator

  constructor(page: Page) {
    super(page)

    // First section buttons
    this.startNowButton = page.getByRole('button', { name: /start now/i })
    this.goToWowSubButton = page.getByRole('button', { name: /go to wowsub/i })

    // Onboarding overview header link
    this.onboardingOverviewLink = page.getByText('Onboarding overview').first()

    // Today's signup card
    this.todaySignupCard = page.locator('text=Today\'s New Sign-Up').first()

    // Stat cards - using partial text match
    this.awaitingAssignmentStat = page.locator('text=Awaiting assignment').first()
    this.inCommunicationStat = page.locator('text=In communication').first()
    this.pauseHoldStat = page.locator('text=Pause/Hold').first()
    this.inTestingStat = page.locator('text=In testing').first()
    this.failedTestStat = page.locator('text=Failed test').first()

    // Comments table
    this.commentsTable = page.locator('text=Comments on Pros').first()
  }

  async navigate() {
    await this.goto('/home')
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
  }

  async expectTadHomeVisible() {
    // TAD home has "Manage Applicants" section
    const hasManageApplicants = await this.page.getByText('Manage Applicants').isVisible().catch(() => false)
    const hasOnboardingOverview = await this.onboardingOverviewLink.isVisible().catch(() => false)
    expect(hasManageApplicants || hasOnboardingOverview).toBe(true)
  }

  async clickStartNow() {
    await this.startNowButton.click()
    await expect(this.page).toHaveURL(/\/onboarding/, { timeout: 10000 })
  }

  async clickGoToWowSub() {
    // This opens a new tab, so we need to handle it differently
    const [newPage] = await Promise.all([
      this.page.context().waitForEvent('page'),
      this.goToWowSubButton.click(),
    ])
    // Return the new page for verification
    return newPage
  }

  async clickOnboardingOverview() {
    await this.onboardingOverviewLink.click()
    await expect(this.page).toHaveURL(/\/onboarding/, { timeout: 10000 })
  }

  async clickCommentRow(index: number = 0) {
    // Click on a row in the comments table
    const rows = this.page.locator('table tbody tr, [role="row"]')
    const row = rows.nth(index)
    if (await row.isVisible()) {
      await row.click()
      // Should navigate to pro detail or onboarding detail
      await expect(this.page).toHaveURL(/\/(onboarding|pro)\/detail/, { timeout: 10000 })
    }
  }

  async getStatValue(statName: 'awaiting' | 'communication' | 'pause' | 'testing' | 'failed'): Promise<string> {
    const statMap = {
      awaiting: this.awaitingAssignmentStat,
      communication: this.inCommunicationStat,
      pause: this.pauseHoldStat,
      testing: this.inTestingStat,
      failed: this.failedTestStat,
    }
    const statCard = statMap[statName]
    const parent = statCard.locator('..')
    const valueElement = parent.locator('span, p, div').filter({ hasText: /^\d+$/ }).first()
    return (await valueElement.textContent()) || '0'
  }
}
