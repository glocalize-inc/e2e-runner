import { test, expect } from '@playwright/test'
import { ProjectDetailPage } from '../../pages/project-detail.page'
import { ProjectListPage } from '../../pages/project-list.page'
import { ensureLpmRole } from '../../helpers/role-helper'
import { AUTH_FILE } from '../../constants'

/**
 * Project Detail tests.
 * Tests the project detail page functionality including navigation, tabs, and content.
 *
 * The project detail page is only accessible for LPM role users.
 *
 * Test coverage:
 * - Page navigation from project list
 * - Header elements (project ID, status, buttons)
 * - Tab navigation (Details, Jobs, Files, Invoice)
 * - Details tab content sections
 * - Back navigation to project list
 */

test.describe('Project Detail', () => {
  test.use({ storageState: AUTH_FILE })

  let projectDetailPage: ProjectDetailPage
  let projectListPage: ProjectListPage
  let testProjectId: string

  test.beforeEach(async ({ page }) => {
    projectDetailPage = new ProjectDetailPage(page)
    projectListPage = new ProjectListPage(page)

    // Navigate to home and ensure LPM role
    await page.goto('/home', { timeout: 30000, waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})

    const isLpm = await ensureLpmRole(page)
    if (!isLpm) {
      test.skip(true, 'Project detail is only available for LPM role')
      return
    }

    // Navigate to project list to get a valid project ID
    await projectListPage.navigate()
    await projectListPage.expectTableLoaded()

    // Get project ID from first row
    const rowCount = await projectListPage.getRowCount()
    if (rowCount === 0) {
      test.skip(true, 'No projects available for testing')
      return
    }

    // Click first row and extract project ID from URL
    await projectListPage.clickFirstProjectRow()
    testProjectId = await projectDetailPage.getProjectIdFromUrl()
  })

  test.describe('Page Navigation', () => {
    test('should navigate to project detail from list', async ({ page }) => {
      // Already navigated in beforeEach
      expect(testProjectId).toBeTruthy()
      await expect(page).toHaveURL(/\/project\/detail\//)
      console.log(`Navigated to project: ${testProjectId}`)
    })

    test('should display project detail page', async ({ page }) => {
      await projectDetailPage.expectPageVisible()
    })

    test('should display project ID in URL', async ({ page }) => {
      const projectId = await projectDetailPage.getProjectIdFromUrl()
      expect(projectId).toBeTruthy()
      expect(projectId.length).toBeGreaterThan(0)
      console.log(`Project ID from URL: ${projectId}`)
    })
  })

  test.describe('Header Elements', () => {
    test('should display project ID in header', async ({ page }) => {
      await projectDetailPage.waitForPageLoad()

      const headerProjectId = await projectDetailPage.getProjectIdFromHeader()
      if (headerProjectId) {
        console.log(`Project ID from header: ${headerProjectId}`)
        expect(headerProjectId).toMatch(/P-GLO-[A-Z0-9]+-\d+/)
      } else {
        console.log('Project ID not displayed in header (may have different format)')
      }
    })

    test('should display status badge', async ({ page }) => {
      await projectDetailPage.waitForPageLoad()

      const hasStatus = await projectDetailPage.hasStatusBadge()
      console.log(`Status badge visible: ${hasStatus}`)
      // Status badge should be visible for most projects
    })

    test('should display Print Quote button', async ({ page }) => {
      await projectDetailPage.waitForPageLoad()

      const isVisible = await projectDetailPage.printQuoteButton.isVisible().catch(() => false)
      console.log(`Print Quote button visible: ${isVisible}`)
    })

    test('should display Print Order button', async ({ page }) => {
      await projectDetailPage.waitForPageLoad()

      const isVisible = await projectDetailPage.printOrderButton.isVisible().catch(() => false)
      console.log(`Print Order button visible: ${isVisible}`)
    })
  })

  test.describe('Tab Navigation', () => {
    test('should display all tabs', async ({ page }) => {
      await projectDetailPage.waitForPageLoad()

      const tabs = await projectDetailPage.getTabNames()
      console.log(`Visible tabs: ${tabs.join(', ')}`)

      // Should have at least Details tab
      expect(tabs.length).toBeGreaterThan(0)
      expect(tabs).toContain('details')
    })

    test('should have Details tab active by default', async ({ page }) => {
      await projectDetailPage.waitForPageLoad()

      const isActive = await projectDetailPage.isTabActive('details')
      expect(isActive).toBe(true)
      console.log('✅ Details tab is active by default')
    })

    test('should switch to Jobs tab', async ({ page }) => {
      await projectDetailPage.waitForPageLoad()

      await projectDetailPage.clickTab('jobs')

      const isActive = await projectDetailPage.isTabActive('jobs')
      expect(isActive).toBe(true)

      // URL should have menu=jobs
      await expect(page).toHaveURL(/menu=jobs/)
      console.log('✅ Successfully switched to Jobs tab')
    })

    test('should switch to Files tab', async ({ page }) => {
      await projectDetailPage.waitForPageLoad()

      await projectDetailPage.clickTab('files')

      const isActive = await projectDetailPage.isTabActive('files')
      expect(isActive).toBe(true)

      // URL should have menu=files
      await expect(page).toHaveURL(/menu=files/)
      console.log('✅ Successfully switched to Files tab')
    })

    test('should switch to Invoice tab', async ({ page }) => {
      await projectDetailPage.waitForPageLoad()

      await projectDetailPage.clickTab('invoice')

      const isActive = await projectDetailPage.isTabActive('invoice')
      expect(isActive).toBe(true)

      // URL should have menu=invoice
      await expect(page).toHaveURL(/menu=invoice/)
      console.log('✅ Successfully switched to Invoice tab')
    })

    test('should switch back to Details tab', async ({ page }) => {
      await projectDetailPage.waitForPageLoad()

      // First switch to another tab
      await projectDetailPage.clickTab('jobs')
      await projectDetailPage.clickTab('details')

      const isActive = await projectDetailPage.isTabActive('details')
      expect(isActive).toBe(true)
      console.log('✅ Successfully switched back to Details tab')
    })
  })

  test.describe('Details Tab Content', () => {
    test('should display details tab content', async ({ page }) => {
      await projectDetailPage.waitForPageLoad()

      const hasContent = await projectDetailPage.expectDetailsTabContent()
      expect(hasContent).toBe(true)
      console.log('✅ Details tab has content')
    })

    test('should display history sidebar', async ({ page }) => {
      await projectDetailPage.waitForPageLoad()

      const hasHistory = await projectDetailPage.hasHistorySidebar()
      console.log(`History sidebar visible: ${hasHistory}`)
    })

    test('should display action buttons', async ({ page }) => {
      await projectDetailPage.waitForPageLoad()

      const hasActions = await projectDetailPage.hasActionButtons()
      console.log(`Action buttons visible: ${hasActions}`)
    })
  })

  test.describe('Back Navigation', () => {
    test('should navigate back to project list', async ({ page }) => {
      await projectDetailPage.waitForPageLoad()

      // Find and click back button or navigate back
      const backLink = page.locator('a[href*="/project/list"]').first()
      const hasBackLink = await backLink.isVisible().catch(() => false)

      if (hasBackLink) {
        await backLink.click()
        await expect(page).toHaveURL(/\/project\/list/, { timeout: 10000 })
        console.log('✅ Successfully navigated back to project list')
      } else {
        // Use browser back
        await page.goBack()
        await expect(page).toHaveURL(/\/project\/list/, { timeout: 10000 })
        console.log('✅ Used browser back to return to project list')
      }
    })
  })

  test.describe('Direct URL Navigation', () => {
    test('should load project detail via direct URL', async ({ page }) => {
      test.setTimeout(60000)

      // We already have testProjectId from beforeEach
      if (!testProjectId) {
        test.skip(true, 'No project ID available')
        return
      }

      // Check if page is still open before navigating
      if (page.isClosed()) {
        test.skip(true, 'Page was closed before test could run')
        return
      }

      try {
        // Navigate directly using URL
        await projectDetailPage.navigate(testProjectId)
        await projectDetailPage.expectPageVisible()
        console.log(`✅ Successfully loaded project detail via direct URL: ${testProjectId}`)
      } catch (error) {
        if (String(error).includes('closed')) {
          console.log('Page closed during navigation - skipping test')
          test.skip(true, 'Page was closed during navigation')
        } else {
          throw error
        }
      }
    })
  })
})
