import { Page, expect, Locator } from '@playwright/test'
import { BasePage } from './base.page'

/**
 * Page Object Model for Project List page.
 * The project list page displays projects in a virtualized table with filters.
 *
 * Page URL: /project/list
 *
 * Key elements:
 * - Header: Title "Project list (count)" with count in parentheses
 * - Filters: Select status, Management Status, Select category, Requested Date, Due Date
 * - Buttons: "Download CSV", "Smart Import [beta]", "Add new project"
 * - Table columns: Project No, Client, Project Name, Status, Management Status
 */
export class ProjectListPage extends BasePage {
  // Header elements
  readonly pageTitle: Locator
  readonly addNewProjectButton: Locator
  readonly smartImportButton: Locator
  readonly downloadCsvButton: Locator

  // Filter elements
  readonly statusFilter: Locator
  readonly managementStatusFilter: Locator
  readonly categoryFilter: Locator
  readonly requestedDateFilter: Locator
  readonly dueDateFilter: Locator
  readonly searchInput: Locator
  readonly resetButton: Locator

  // Table elements
  readonly tableContainer: Locator
  readonly tableHeaders: Locator
  readonly tableRows: Locator
  readonly loadingIndicator: Locator
  readonly emptyState: Locator

  constructor(page: Page) {
    super(page)

    // Header elements - title format: "Project list (128)"
    this.pageTitle = page.locator('text=/Project list.*\\(\\d+\\)/')
    this.addNewProjectButton = page.getByRole('button', { name: /add new project/i })
    this.smartImportButton = page.getByRole('button', { name: /smart import/i })
    this.downloadCsvButton = page.getByRole('button', { name: /download csv/i })

    // Filter elements - using actual button text from page
    this.statusFilter = page.locator('button:has-text("Select status")')
    this.managementStatusFilter = page.locator('button:has-text("Management Status")')
    this.categoryFilter = page.locator('button:has-text("Select category")')
    this.requestedDateFilter = page.locator('button:has-text("Requested Date")')
    this.dueDateFilter = page.locator('button:has-text("Due Date")')
    this.searchInput = page.locator('input[placeholder*="Search project"]')
    this.resetButton = page.locator('button:has-text("Reset")')

    // Table elements - virtualized table structure
    this.tableContainer = page.locator('table').first()
    this.tableHeaders = page.locator('th')
    this.tableRows = page.locator('tbody tr')
    this.loadingIndicator = page.locator('text=/Loading projects/i')
    this.emptyState = page.locator('text=/No projects found/i, text=/No project data found/i')
  }

  async navigate() {
    await this.goto('/project/list')
    await this.waitForPageLoad()
  }

  async waitForPageLoad() {
    // Wait for either data to load or empty state
    await this.page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {})

    // Wait for loading to complete
    const hasLoading = await this.loadingIndicator.isVisible().catch(() => false)
    if (hasLoading) {
      await this.loadingIndicator.waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {})
    }
  }

  async expectPageVisible() {
    // Verify page title "Project list (count)" is visible
    await expect(this.pageTitle).toBeVisible({ timeout: 15000 })
  }

  async expectTableLoaded() {
    // Wait for table to load
    await this.page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {})

    // Wait for either data rows or empty state
    const hasRows = await this.getRowCount().catch(() => 0)
    const hasEmpty = await this.emptyState.isVisible().catch(() => false)

    if (!hasRows && !hasEmpty) {
      // Wait a bit more for data to appear
      await this.page.waitForTimeout(2000)
      const finalRowCount = await this.getRowCount().catch(() => 0)
      return finalRowCount > 0
    }

    return hasRows > 0 || hasEmpty
  }

  async getProjectCount(): Promise<number> {
    // Title format: "Project list (128)"
    const titleText = await this.pageTitle.textContent()
    if (!titleText) return 0
    const match = titleText.match(/\((\d+)\)/)
    return match?.[1] ? parseInt(match[1], 10) : 0
  }

  async getRowCount(): Promise<number> {
    // For virtualized tables, get visible row count
    await this.page.waitForTimeout(500) // Allow time for rows to render
    const rows = await this.tableRows.count()
    return rows
  }

  async clickAddNewProject() {
    await this.addNewProjectButton.click()
    await expect(this.page).toHaveURL(/\/project\/create/, { timeout: 10000 })
  }

  async clickSmartImport() {
    await this.smartImportButton.click()
    // Smart Import modal should appear
    await expect(this.page.locator('[role="dialog"], [class*="modal"]')).toBeVisible({ timeout: 5000 })
  }

  async clickFirstProjectRow() {
    // Wait for rows to be visible
    await this.page.waitForTimeout(500)

    // The table uses virtualization and only the pinned column (Project No) is clickable
    // Click on the first cell of the first row (Project No column)
    const firstRow = this.tableRows.first()
    const isRowVisible = await firstRow.isVisible().catch(() => false)

    if (isRowVisible) {
      // Click the first cell (Project No) which is the pinned column
      const firstCell = firstRow.locator('td').first()
      const isCellVisible = await firstCell.isVisible().catch(() => false)

      if (isCellVisible) {
        await firstCell.click()
        await expect(this.page).toHaveURL(/\/project\/detail\//, { timeout: 10000 })
        return true
      }
    }

    return false
  }

  async searchProjects(keyword: string) {
    await this.searchInput.fill(keyword)
    // Trigger search (may need to press Enter or wait for debounce)
    await this.searchInput.press('Enter')
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
  }

  async clearSearch() {
    await this.searchInput.clear()
    await this.searchInput.press('Enter')
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
  }

  async resetFilters() {
    await this.resetButton.click()
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
  }

  async getTableColumnHeaders(): Promise<string[]> {
    const headers = await this.tableHeaders.allTextContents()
    return headers.filter((h) => h.trim().length > 0)
  }

  async isFilterVisible(filterName: 'status' | 'managementStatus' | 'category'): Promise<boolean> {
    switch (filterName) {
      case 'status':
        return await this.statusFilter.first().isVisible().catch(() => false)
      case 'managementStatus':
        return await this.managementStatusFilter.first().isVisible().catch(() => false)
      case 'category':
        return await this.categoryFilter.first().isVisible().catch(() => false)
      default:
        return false
    }
  }

  async getProjectNoFromFirstRow(): Promise<string | null> {
    const firstCell = this.page.locator('[role="row"]').filter({ hasNot: this.page.locator('th') }).first()
    const projectNo = await firstCell.locator('td, [role="cell"]').first().textContent()
    return projectNo?.trim() || null
  }
}
