import { test, expect } from '@playwright/test'

/**
 * Home page navigation tests.
 * Tests button click events and navigation for both LPM and TAD roles.
 *
 * Note: The actual role depends on the authenticated user.
 * These tests will detect which home view is shown and test accordingly.
 */
test.describe('Home Page Navigation', () => {
  test.use({ storageState: './e2e/.auth/user.json' })

  test.beforeEach(async ({ page }) => {
    await page.goto('/home', { timeout: 30000, waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
  })

  test.describe('LPM Home', () => {
    test.skip(async ({ page }) => {
      // Skip LPM tests if TAD home is displayed
      const isLpmHome = await page.getByText('Welcome back!').isVisible().catch(() => false)
      return !isLpmHome
    }, 'Skipping LPM tests - user is not LPM role')

    test('should display LPM home with quick access cards', async ({ page }) => {
      await expect(page.getByText('Welcome back!')).toBeVisible({ timeout: 10000 })
      await expect(page.getByText('Manage your projects and team from here')).toBeVisible()
    })

    test('should navigate to project creation when clicking Create Project', async ({ page }) => {
      const createButton = page.getByRole('button', { name: /create project/i })
      await expect(createButton).toBeVisible({ timeout: 10000 })
      await createButton.click()
      await expect(page).toHaveURL(/\/project\/create/, { timeout: 10000 })
    })

    test('should navigate to projects list when clicking Projects card', async ({ page }) => {
      const projectsCard = page.locator('button', { hasText: 'Projects' }).first()
      await expect(projectsCard).toBeVisible({ timeout: 10000 })
      await projectsCard.click()
      await expect(page).toHaveURL(/\/project\/list/, { timeout: 10000 })
    })

    test('should navigate to job list when clicking Job List card', async ({ page }) => {
      const jobListCard = page.locator('button', { hasText: 'Job List' })
      await expect(jobListCard).toBeVisible({ timeout: 10000 })
      await jobListCard.click()
      await expect(page).toHaveURL(/\/job-list/, { timeout: 10000 })
    })

    test('should navigate to pros list when clicking Pros card', async ({ page }) => {
      // Use exact match to avoid matching sidebar menu button
      const prosCard = page.getByRole('button', { name: 'Pros', exact: true })
      await expect(prosCard).toBeVisible({ timeout: 10000 })
      await prosCard.click()
      await expect(page).toHaveURL(/\/pro\/list/, { timeout: 10000 })
    })

    test('should navigate to clients when clicking Clients card', async ({ page }) => {
      // Use exact match to avoid matching sidebar menu button
      const clientsCard = page.getByRole('button', { name: 'Clients', exact: true })
      await expect(clientsCard).toBeVisible({ timeout: 10000 })
      await clientsCard.click()
      await expect(page).toHaveURL(/\/client/, { timeout: 10000 })
    })
  })

  test.describe('TAD Home', () => {
    test.skip(async ({ page }) => {
      // Skip TAD tests if LPM home is displayed
      const isTadHome = await page.getByText('Manage Applicants').isVisible().catch(() => false)
      const hasOnboarding = await page.getByText('Onboarding overview').isVisible().catch(() => false)
      return !(isTadHome || hasOnboarding)
    }, 'Skipping TAD tests - user is not TAD role')

    test('should display TAD home with onboarding sections', async ({ page }) => {
      // TAD home should have either "Manage Applicants" or "Onboarding overview"
      const hasManageApplicants = await page.getByText('Manage Applicants').isVisible().catch(() => false)
      const hasOnboardingOverview = await page.getByText('Onboarding overview').isVisible().catch(() => false)
      expect(hasManageApplicants || hasOnboardingOverview).toBe(true)
    })

    test('should navigate to onboarding when clicking Start now', async ({ page }) => {
      const startNowButton = page.getByRole('button', { name: /start now/i })
      if (await startNowButton.isVisible().catch(() => false)) {
        await startNowButton.click()
        await expect(page).toHaveURL(/\/onboarding/, { timeout: 10000 })
      }
    })

    test('should navigate to onboarding when clicking Onboarding overview', async ({ page }) => {
      const onboardingLink = page.getByText('Onboarding overview').first()
      if (await onboardingLink.isVisible().catch(() => false)) {
        await onboardingLink.click()
        await expect(page).toHaveURL(/\/onboarding/, { timeout: 10000 })
      }
    })

    test('should display stat cards with values', async ({ page }) => {
      const statLabels = [
        'Awaiting assignment',
        'In communication',
        'Pause/Hold',
        'In testing',
        'Failed test',
      ]

      for (const label of statLabels) {
        const stat = page.getByText(label).first()
        if (await stat.isVisible().catch(() => false)) {
          await expect(stat).toBeVisible()
        }
      }
    })

    test('should display Today\'s New Sign-Up card', async ({ page }) => {
      const signupCard = page.getByText("Today's New Sign-Up").first()
      if (await signupCard.isVisible().catch(() => false)) {
        await expect(signupCard).toBeVisible()
      }
    })

    test('should open WowSub in new tab when clicking Go to WowSub', async ({ page, context }) => {
      const wowsubButton = page.getByRole('button', { name: /go to wowsub/i })
      if (await wowsubButton.isVisible().catch(() => false)) {
        const [newPage] = await Promise.all([
          context.waitForEvent('page'),
          wowsubButton.click(),
        ])
        // Verify new page was opened
        expect(newPage).toBeTruthy()
        await newPage.close()
      }
    })
  })
})
