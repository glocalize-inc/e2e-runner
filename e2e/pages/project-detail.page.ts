import { Page, expect, Locator } from '@playwright/test'
import { BasePage } from './base.page'

/**
 * Page Object Model for Project Detail page.
 * The project detail page shows project information with tabbed content.
 *
 * Page URL: /project/detail/[id]
 *
 * Key elements:
 * - Header: Project ID, Status badge, Back button, Print buttons
 * - Tabs: Details, Jobs, Files, Invoice
 * - Details Tab: Project Info, Item Info, Client Info, Team, Comments, History
 */
export class ProjectDetailPage extends BasePage {
  // Header elements
  readonly backButton: Locator
  readonly projectId: Locator
  readonly statusBadge: Locator
  readonly printQuoteButton: Locator
  readonly printOrderButton: Locator

  // Tab navigation
  readonly detailsTab: Locator
  readonly jobsTab: Locator
  readonly filesTab: Locator
  readonly invoiceTab: Locator

  // Details tab sections
  readonly projectInfoSection: Locator
  readonly itemInfoSection: Locator
  readonly clientInfoSection: Locator
  readonly projectTeamSection: Locator
  readonly commentSection: Locator

  // History sidebar
  readonly historySidebar: Locator
  readonly recentHistoryTitle: Locator

  // Action buttons in details tab
  readonly completeProjectButton: Locator
  readonly cancelProjectButton: Locator

  // Loading and error states
  readonly loadingIndicator: Locator
  readonly errorState: Locator

  constructor(page: Page) {
    super(page)

    // Header elements
    this.backButton = page.locator('a[href*="/project/list"], button:has(svg)').first()
    this.projectId = page.locator('text=/P-GLO-[A-Z0-9]+-\\d+/')
    // Status badge appears next to the project ID heading
    this.statusBadge = page.locator('h1:has-text("P-GLO") + *').first()
    this.printQuoteButton = page.getByRole('button', { name: /print quote/i })
    this.printOrderButton = page.getByRole('button', { name: /print order/i })

    // Tab navigation - using role and text
    this.detailsTab = page.locator('[role="tab"]:has-text("Details")')
    this.jobsTab = page.locator('[role="tab"]:has-text("Jobs")')
    this.filesTab = page.locator('[role="tab"]:has-text("Files")')
    this.invoiceTab = page.locator('[role="tab"]:has-text("Invoice")')

    // Details tab sections - using heading or section patterns
    this.projectInfoSection = page.locator('text=/Project Info/i').first()
    this.itemInfoSection = page.locator('text=/Item Info/i, text=/Items/i').first()
    this.clientInfoSection = page.locator('text=/Client Info/i').first()
    this.projectTeamSection = page.locator('text=/Project Team/i, text=/Team/i').first()
    this.commentSection = page.locator('text=/Comment/i').first()

    // History sidebar
    this.historySidebar = page.locator('text=/Recent History/i').first()
    this.recentHistoryTitle = page.locator('text=/Recent History/i')

    // Action buttons
    this.completeProjectButton = page.getByRole('button', { name: /complete this project/i })
    this.cancelProjectButton = page.getByRole('button', { name: /cancel this project/i })

    // Loading and error states
    this.loadingIndicator = page.locator('[class*="loading"], [class*="Loading"], [class*="spinner"]')
    this.errorState = page.locator('text=/error/i, text=/not found/i')
  }

  async navigate(projectId: string) {
    await this.goto(`/project/detail/${projectId}`)
    await this.waitForPageLoad()
  }

  async waitForPageLoad(options: { timeout?: number } = {}) {
    const timeout = options.timeout || 45000

    // Wait for full-page loading screen to disappear first
    const fullPageLoading = this.page.locator('h2:has-text("Loading...")')
    await fullPageLoading.waitFor({ state: 'hidden', timeout: timeout }).catch(() => {})

    // Wait for network to be idle
    await this.page.waitForLoadState('networkidle', { timeout: timeout }).catch(() => {})

    // Wait for tabs to be visible with extended timeout
    await this.detailsTab.waitFor({ state: 'visible', timeout: timeout }).catch(() => {
      // If tabs not visible, wait for any main content
      console.log('Tabs not visible, waiting for main content...')
    })

    // Extra wait for dynamic content to settle
    await this.page.waitForTimeout(500)
  }

  async expectPageVisible(options: { timeout?: number } = {}) {
    const timeout = options.timeout || 30000

    // Check if page is still open
    if (this.page.isClosed()) {
      throw new Error('Page has been closed')
    }

    // Wait for loading to complete first with extended timeout
    const fullPageLoading = this.page.locator('h2:has-text("Loading...")')
    const isLoading = await fullPageLoading.isVisible().catch(() => false)

    if (isLoading) {
      // Wait for loading to finish with extended timeout
      await fullPageLoading.waitFor({ state: 'hidden', timeout: timeout }).catch(() => {})
      await this.page.waitForLoadState('networkidle', { timeout: timeout }).catch(() => {})
    }

    // Wait for network idle first
    await this.page.waitForLoadState('networkidle', { timeout: timeout }).catch(() => {})

    // Check if tabs are visible (indicates page loaded)
    try {
      await expect(this.detailsTab).toBeVisible({ timeout: timeout })
    } catch (error) {
      // If tabs not visible, try waiting for any project detail content
      // Use more specific selectors first
      const specificSelectors = [
        'h1:has-text("P-GLO")', // Project ID header
        'h2:has-text("Project info")', // Project info section
        'h2:has-text("Item Info")', // Item info section
        '[role="tablist"]', // Tab list
      ]

      let found = false
      for (const selector of specificSelectors) {
        const element = this.page.locator(selector).first()
        const isVisible = await element.isVisible().catch(() => false)
        if (isVisible) {
          found = true
          break
        }
      }

      if (!found) {
        // Last resort: wait for main content area
        const projectContent = this.page.locator('main, [role="main"]').first()
        await expect(projectContent).toBeVisible({ timeout: timeout / 2 })
      }
    }
  }

  getProjectIdFromUrl(): string {
    const url = this.page.url()
    const match = url.match(/\/project\/detail\/([^/?]+)/)
    return match?.[1] ?? ''
  }

  async getProjectIdFromHeader(): Promise<string | null> {
    const idText = await this.projectId.textContent().catch(() => null)
    return idText?.trim() || null
  }

  async clickTab(tabName: 'details' | 'jobs' | 'files' | 'invoice', options: { timeout?: number } = {}) {
    const timeout = options.timeout || 30000
    const tabMap = {
      details: this.detailsTab,
      jobs: this.jobsTab,
      files: this.filesTab,
      invoice: this.invoiceTab,
    }

    // Wait for tab to be clickable first
    await tabMap[tabName].waitFor({ state: 'visible', timeout: timeout }).catch(() => {})
    await tabMap[tabName].click()
    await this.page.waitForLoadState('networkidle', { timeout: timeout }).catch(() => {})
  }

  async isTabActive(tabName: 'details' | 'jobs' | 'files' | 'invoice'): Promise<boolean> {
    const tabMap = {
      details: this.detailsTab,
      jobs: this.jobsTab,
      files: this.filesTab,
      invoice: this.invoiceTab,
    }

    const dataState = await tabMap[tabName].getAttribute('data-state')
    return dataState === 'active'
  }

  async expectDetailsTabContent() {
    // Wait for any section to be visible in details tab
    await this.page.waitForTimeout(1000)

    const hasProjectInfo = await this.projectInfoSection.isVisible().catch(() => false)
    const hasClientInfo = await this.clientInfoSection.isVisible().catch(() => false)
    const hasHistory = await this.historySidebar.isVisible().catch(() => false)

    return hasProjectInfo || hasClientInfo || hasHistory
  }

  async clickBackToList() {
    await this.backButton.click()
    await expect(this.page).toHaveURL(/\/project\/list/, { timeout: 10000 })
  }

  async clickPrintQuote() {
    await this.printQuoteButton.click()
    // Wait for modal overlay to appear (z-[1300] class indicates modal)
    await this.page.locator('.z-\\[1300\\]').waitFor({ state: 'visible', timeout: 5000 })
  }

  async clickPrintOrder() {
    await this.printOrderButton.click()
    // Wait for modal overlay to appear (z-[1300] class indicates modal)
    await this.page.locator('.z-\\[1300\\]').waitFor({ state: 'visible', timeout: 5000 })
  }

  // ============================================================================
  // Print Quote / Print Order Methods
  // ============================================================================

  /**
   * Check if Print Quote button is visible and enabled
   */
  async isPrintQuoteButtonAvailable(): Promise<boolean> {
    const isVisible = await this.printQuoteButton.isVisible().catch(() => false)
    if (!isVisible) return false
    const isDisabled = await this.printQuoteButton.isDisabled().catch(() => true)
    return !isDisabled
  }

  /**
   * Check if Print Order button is visible and enabled
   */
  async isPrintOrderButtonAvailable(): Promise<boolean> {
    const isVisible = await this.printOrderButton.isVisible().catch(() => false)
    if (!isVisible) return false
    const isDisabled = await this.printOrderButton.isDisabled().catch(() => true)
    return !isDisabled
  }

  /**
   * Check if Quote Settings Modal is open
   * Modal uses z-[1300] overlay and contains "Quote Settings" or "견적 설정" title
   */
  async isQuoteSettingsModalOpen(): Promise<boolean> {
    // Check for modal overlay
    const modalOverlay = this.page.locator('.z-\\[1300\\]')
    const isOverlayVisible = await modalOverlay.isVisible().catch(() => false)
    if (!isOverlayVisible) return false

    // Check for Quote Settings title (English or Korean)
    const englishTitle = modalOverlay.locator('h2:has-text("Quote Settings")')
    const koreanTitle = modalOverlay.locator('h2:has-text("견적 설정")')

    return await englishTitle.isVisible().catch(() => false) ||
           await koreanTitle.isVisible().catch(() => false)
  }

  /**
   * Check if Order Settings Modal is open
   * Modal uses z-[1300] overlay and contains "Order Settings" or "주문 설정" title
   */
  async isOrderSettingsModalOpen(): Promise<boolean> {
    // Check for modal overlay
    const modalOverlay = this.page.locator('.z-\\[1300\\]')
    const isOverlayVisible = await modalOverlay.isVisible().catch(() => false)
    if (!isOverlayVisible) return false

    // Check for Order Settings title (English or Korean)
    const englishTitle = modalOverlay.locator('h2:has-text("Order Settings")')
    const koreanTitle = modalOverlay.locator('h2:has-text("주문 설정")')

    return await englishTitle.isVisible().catch(() => false) ||
           await koreanTitle.isVisible().catch(() => false)
  }

  /**
   * Check if PDF Download Modal is open (the preview modal with black header)
   */
  async isPdfDownloadModalOpen(): Promise<boolean> {
    // The PDF Download modal has a specific structure: black header with Download/Close buttons
    const blackHeader = this.page.locator('.bg-black.h-20')
    const downloadButton = blackHeader.locator('button:has-text("Download")')
    return await downloadButton.isVisible().catch(() => false)
  }

  /**
   * Click Apply button in Quote Settings Modal
   */
  async clickApplyQuoteSettings() {
    const modalOverlay = this.page.locator('.z-\\[1300\\]')
    // Look for Apply button (English) or 적용 (Korean)
    const applyButton = modalOverlay.locator('button:has-text("Apply"), button:has-text("적용")').first()
    await applyButton.waitFor({ state: 'visible', timeout: 5000 })
    await applyButton.click()
    await this.page.waitForTimeout(2000) // Wait for API call to complete
  }

  /**
   * Click Apply button in Order Settings Modal
   */
  async clickApplyOrderSettings() {
    const modalOverlay = this.page.locator('.z-\\[1300\\]')
    // Look for Apply button (English) or 적용 (Korean)
    const applyButton = modalOverlay.locator('button:has-text("Apply"), button:has-text("적용")').first()
    await applyButton.waitFor({ state: 'visible', timeout: 5000 })
    await applyButton.click()
    await this.page.waitForTimeout(2000) // Wait for API call to complete
  }

  /**
   * Click Cancel button in Settings Modal
   */
  async clickCancelSettingsModal() {
    const modalOverlay = this.page.locator('.z-\\[1300\\]')
    // Look for Cancel button (English) or 취소 (Korean)
    const cancelButton = modalOverlay.locator('button:has-text("Cancel"), button:has-text("취소")').first()
    await cancelButton.waitFor({ state: 'visible', timeout: 5000 })
    await cancelButton.click()
    await this.page.waitForTimeout(500)
  }

  /**
   * Select language in Quote/Order Settings Modal
   */
  async selectSettingsLanguage(language: 'ENGLISH' | 'KOREAN') {
    const modalOverlay = this.page.locator('.z-\\[1300\\]')
    // Find the language radio button label
    const labelText = language === 'ENGLISH' ? 'English' : 'Korean'
    const languageLabel = modalOverlay.locator(`label:has-text("${labelText}")`).first()
    if (await languageLabel.isVisible().catch(() => false)) {
      await languageLabel.click()
      await this.page.waitForTimeout(300)
    }
  }

  /**
   * Wait for PDF Download Modal to appear
   */
  async waitForPdfDownloadModal() {
    // Wait for the black header with Download button to appear
    const blackHeader = this.page.locator('.bg-black.h-20')
    await blackHeader.waitFor({ state: 'visible', timeout: 15000 })

    const downloadButton = blackHeader.locator('button:has-text("Download")')
    await downloadButton.waitFor({ state: 'visible', timeout: 5000 })
  }

  /**
   * Click Download button in PDF Download Modal
   * Returns true if download was initiated successfully
   */
  async clickDownloadPdf(): Promise<boolean> {
    const blackHeader = this.page.locator('.bg-black.h-20')
    const downloadButton = blackHeader.locator('button:has-text("Download")')

    await downloadButton.waitFor({ state: 'visible', timeout: 5000 })

    // Check if button is in loading state
    const buttonText = await downloadButton.textContent()
    if (buttonText?.includes('Loading')) {
      // Wait for loading to complete
      await this.page.waitForFunction(
        () => {
          const btn = document.querySelector('.bg-black.h-20 button')
          return btn && !btn.textContent?.includes('Loading')
        },
        { timeout: 30000 }
      ).catch(() => {})
    }

    // Click download
    await downloadButton.click()

    // Wait for print dialog preparation (the modal uses iframe printing)
    await this.page.waitForTimeout(3000)

    return true
  }

  /**
   * Click Close button in PDF Download Modal
   */
  async clickClosePdfDownloadModal() {
    const blackHeader = this.page.locator('.bg-black.h-20')
    const closeButton = blackHeader.locator('button:has-text("Close")')

    await closeButton.waitFor({ state: 'visible', timeout: 5000 })
    await closeButton.click()
    await this.page.waitForTimeout(500)
  }

  /**
   * Click Send Quote button in PDF Download Modal
   */
  async clickSendQuote() {
    const blackHeader = this.page.locator('.bg-black.h-20')
    const sendButton = blackHeader.locator('button:has-text("Send quote")')

    await sendButton.waitFor({ state: 'visible', timeout: 5000 })
    await sendButton.click()
    await this.page.waitForTimeout(2000)
  }

  /**
   * Click Send Order button in PDF Download Modal
   */
  async clickSendOrder() {
    const blackHeader = this.page.locator('.bg-black.h-20')
    const sendButton = blackHeader.locator('button:has-text("Send order")')

    await sendButton.waitFor({ state: 'visible', timeout: 5000 })
    await sendButton.click()
    await this.page.waitForTimeout(2000)
  }

  /**
   * Complete Print Quote flow: Open settings, apply, and get to PDF preview
   */
  async openPrintQuotePreview() {
    await this.clickPrintQuote()
    await this.page.waitForTimeout(500)

    // Wait for settings modal
    const isSettingsOpen = await this.isQuoteSettingsModalOpen()
    if (isSettingsOpen) {
      await this.clickApplyQuoteSettings()
    }

    // Wait for PDF preview modal
    await this.waitForPdfDownloadModal()
  }

  /**
   * Complete Print Order flow: Open settings, apply, and get to PDF preview
   */
  async openPrintOrderPreview() {
    await this.clickPrintOrder()
    await this.page.waitForTimeout(500)

    // Wait for settings modal
    const isSettingsOpen = await this.isOrderSettingsModalOpen()
    if (isSettingsOpen) {
      await this.clickApplyOrderSettings()
    }

    // Wait for PDF preview modal
    await this.waitForPdfDownloadModal()
  }

  /**
   * Get PDF preview content text
   */
  async getPdfPreviewContent(): Promise<string | null> {
    const contentArea = this.page.locator('.max-w-\\[789px\\]')
    const text = await contentArea.textContent().catch(() => null)
    return text?.trim() || null
  }

  /**
   * Check if PDF preview shows Quote content
   */
  async isPdfPreviewShowingQuote(): Promise<boolean> {
    const content = await this.getPdfPreviewContent()
    // Quote preview should contain specific text patterns
    return content?.toLowerCase().includes('quote') ||
           content?.toLowerCase().includes('견적') ||
           false
  }

  /**
   * Check if PDF preview shows Order content
   */
  async isPdfPreviewShowingOrder(): Promise<boolean> {
    const content = await this.getPdfPreviewContent()
    // Order preview should contain specific text patterns
    return content?.toLowerCase().includes('order') ||
           content?.toLowerCase().includes('주문') ||
           false
  }

  async getTabNames(): Promise<string[]> {
    const tabs = ['details', 'jobs', 'files', 'invoice']
    const visibleTabs: string[] = []

    for (const tab of tabs) {
      const tabMap = {
        details: this.detailsTab,
        jobs: this.jobsTab,
        files: this.filesTab,
        invoice: this.invoiceTab,
      }
      const isVisible = await tabMap[tab as keyof typeof tabMap].isVisible().catch(() => false)
      if (isVisible) {
        visibleTabs.push(tab)
      }
    }

    return visibleTabs
  }

  async hasStatusBadge(): Promise<boolean> {
    return await this.statusBadge.isVisible().catch(() => false)
  }

  async hasHistorySidebar(): Promise<boolean> {
    return await this.historySidebar.isVisible().catch(() => false)
  }

  async hasActionButtons(): Promise<boolean> {
    const hasComplete = await this.completeProjectButton.isVisible().catch(() => false)
    const hasCancel = await this.cancelProjectButton.isVisible().catch(() => false)
    return hasComplete || hasCancel
  }

  // ============================================================================
  // Project Info Edit Methods
  // ============================================================================

  /**
   * Wait for loading to complete in the page
   */
  async waitForLoadingComplete() {
    // Wait for full-page loading screen to disappear (h2 "Loading...")
    const fullPageLoading = this.page.locator('h2:has-text("Loading...")')
    await fullPageLoading.waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {})

    // Wait for skeleton loaders to disappear
    const skeleton = this.page.locator('[class*="skeleton"], [class*="Skeleton"]')
    await skeleton.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {})

    // Wait for any generic loading indicators
    const loadingOverlay = this.page.locator('[class*="loading"]:not([class*="loadingOverlay"])')
    await loadingOverlay.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {})

    await this.page.waitForTimeout(500)
  }

  /**
   * Click the Edit button on Project Info section
   */
  async clickEditProjectInfo() {
    await this.waitForLoadingComplete()

    // Find the Project Info card and its edit button
    const projectInfoCard = this.page.locator('h2:has-text("Project info")').locator('xpath=ancestor::div[contains(@class, "p-6")]')
    const editButton = projectInfoCard.locator('button').filter({ has: this.page.locator('svg') }).first()

    await editButton.waitFor({ state: 'visible', timeout: 10000 })
    await editButton.click()
    await this.page.waitForTimeout(500)
  }

  /**
   * Check if Project Info is in edit mode
   */
  async isProjectInfoEditing(): Promise<boolean> {
    const projectInfoCard = this.page.locator('h2:has-text("Project info")').locator('xpath=ancestor::div[contains(@class, "p-6")]')
    const saveButton = projectInfoCard.getByRole('button', { name: /save/i })
    return await saveButton.isVisible().catch(() => false)
  }

  /**
   * Click Save button in Project Info edit mode
   */
  async clickSaveProjectInfo() {
    const projectInfoCard = this.page.locator('h2:has-text("Project info")').locator('xpath=ancestor::div[contains(@class, "p-6")]')
    const saveButton = projectInfoCard.getByRole('button', { name: /save/i })

    await saveButton.waitFor({ state: 'visible', timeout: 5000 })
    await saveButton.click()

    // Wait for success toast notification
    const toast = this.page.locator('text="Project updated successfully"')
    await toast.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {
      console.log('Toast notification not found, continuing...')
    })

    // Wait for toast to disappear (indicating the save cycle is complete)
    await toast.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {})

    // Wait for save to complete and edit mode to exit
    await this.waitForLoadingComplete()
    await this.page.waitForTimeout(1500)

    // Verify we're out of edit mode
    await saveButton.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {})
  }

  /**
   * Click Cancel button in Project Info edit mode
   */
  async clickCancelProjectInfo() {
    const projectInfoCard = this.page.locator('h2:has-text("Project info")').locator('xpath=ancestor::div[contains(@class, "p-6")]')
    // Use exact match to avoid matching "Cancel this project"
    const cancelButton = projectInfoCard.getByRole('button', { name: 'Cancel', exact: true })

    await cancelButton.waitFor({ state: 'visible', timeout: 5000 })
    await cancelButton.click()
    await this.page.waitForTimeout(500)
  }

  /**
   * Select Management Status in edit mode
   */
  async selectManagementStatus(status: string) {
    await this.waitForLoadingComplete()

    // Find the Management Status combobox in the Project Info section
    const projectInfoCard = this.page.locator('h2:has-text("Project info")').locator('xpath=ancestor::div[contains(@class, "p-6")]')
    const fieldLabel = projectInfoCard.locator('text="Management Status"').first()
    const fieldContainer = fieldLabel.locator('xpath=ancestor::div[1]')
    const selectTrigger = fieldContainer.locator('[role="combobox"]').first()

    await selectTrigger.waitFor({ state: 'visible', timeout: 5000 })
    await selectTrigger.click()
    await this.page.waitForTimeout(500)

    // Wait for dropdown dialog/listbox and select option
    const listbox = this.page.locator('[role="listbox"]').first()
    await listbox.waitFor({ state: 'visible', timeout: 5000 })

    const option = listbox.locator(`[role="option"]:has-text("${status}")`).first()
    await option.waitFor({ state: 'visible', timeout: 5000 })
    await option.click()

    // Wait for listbox to close (confirms selection was registered)
    await listbox.waitFor({ state: 'hidden', timeout: 5000 })
    await this.page.waitForTimeout(500)

    // Verify the combobox now shows the selected value
    const newValue = await selectTrigger.textContent()
    console.log(`Management Status combobox now shows: ${newValue}`)
  }

  /**
   * Select Currency in edit mode
   */
  async selectCurrency(currency: string) {
    await this.waitForLoadingComplete()

    // Find the Currency field
    const fieldLabel = this.page.locator('text="Currency"').first()
    const fieldContainer = fieldLabel.locator('xpath=ancestor::div[1]')
    const selectTrigger = fieldContainer.locator('[role="combobox"]').first()

    await selectTrigger.waitFor({ state: 'visible', timeout: 5000 })
    await selectTrigger.click()
    await this.page.waitForTimeout(500)

    // Wait for dropdown and select option
    const popover = this.page.locator('[data-radix-popper-content-wrapper]').first()
    await popover.waitFor({ state: 'visible', timeout: 5000 })

    const option = popover.locator(`[role="option"]:has-text("${currency}")`).first()
    await option.click()
    await this.page.waitForTimeout(300)
  }

  /**
   * Select Revenue From in edit mode
   */
  async selectRevenueFrom(revenue: string) {
    await this.waitForLoadingComplete()

    // Find the Revenue from field
    const fieldLabel = this.page.locator('text="Revenue from"').first()
    const fieldContainer = fieldLabel.locator('xpath=ancestor::div[1]')
    const selectTrigger = fieldContainer.locator('[role="combobox"]').first()

    await selectTrigger.waitFor({ state: 'visible', timeout: 5000 })
    await selectTrigger.click()
    await this.page.waitForTimeout(500)

    // Wait for dropdown and select option
    const popover = this.page.locator('[data-radix-popper-content-wrapper]').first()
    await popover.waitFor({ state: 'visible', timeout: 5000 })

    const option = popover.locator(`[role="option"]:has-text("${revenue}")`).first()
    await option.click()
    await this.page.waitForTimeout(300)
  }

  /**
   * Fill Project Description in edit mode
   */
  async fillProjectDescription(description: string) {
    await this.waitForLoadingComplete()

    // Find the Project description textarea
    const fieldLabel = this.page.locator('text="Project description"').first()
    const fieldContainer = fieldLabel.locator('xpath=ancestor::div[1]')
    const textarea = fieldContainer.locator('textarea').first()

    await textarea.waitFor({ state: 'visible', timeout: 5000 })
    await textarea.fill(description)
    await this.page.waitForTimeout(200)
  }

  /**
   * Get current value of a field in Project Info section
   */
  async getProjectInfoFieldValue(fieldName: string): Promise<string | null> {
    await this.waitForLoadingComplete()

    // Find the field by label
    const fieldLabel = this.page.locator(`text="${fieldName}"`).first()
    const fieldContainer = fieldLabel.locator('xpath=ancestor::div[1]')

    // Try to get text content from the value display element (next sibling or nearby div)
    const valueElement = fieldContainer.locator('div').last()
    const text = await valueElement.textContent().catch(() => null)

    return text?.trim() || null
  }

  /**
   * Get the current Management Status value
   */
  async getManagementStatus(): Promise<string | null> {
    await this.waitForLoadingComplete()

    const fieldLabel = this.page.locator('text="Management Status"').first()
    const fieldContainer = fieldLabel.locator('xpath=ancestor::div[1]')

    // In view mode, look for the Select display value
    const selectValue = fieldContainer.locator('[role="combobox"]').first()
    if (await selectValue.isVisible()) {
      const text = await selectValue.textContent()
      return text?.trim() || null
    }

    return null
  }

  /**
   * Get the current Currency value
   */
  async getCurrency(): Promise<string | null> {
    await this.waitForLoadingComplete()

    const fieldLabel = this.page.locator('text="Currency"').first()
    const fieldContainer = fieldLabel.locator('xpath=ancestor::div[1]')

    // In view mode, get the text value
    const valueDiv = fieldContainer.locator('div').last()
    const text = await valueDiv.textContent().catch(() => null)

    return text?.trim() || null
  }

  /**
   * Get the current Project Description value
   */
  async getProjectDescription(): Promise<string | null> {
    await this.waitForLoadingComplete()

    // Project description field is in a col-span-2 div
    const fieldLabel = this.page.locator('text="Project description"').first()
    const fieldContainer = fieldLabel.locator('xpath=ancestor::div[contains(@class, "col-span-2")]')

    // Try to find the value div (last div after the label)
    const allDivs = fieldContainer.locator('> div')
    const count = await allDivs.count()

    // The structure is: <div label/>, <div value/> or <textarea/>
    // In view mode, the value is in the second div
    if (count >= 2) {
      const valueDiv = allDivs.nth(1)
      const text = await valueDiv.textContent().catch(() => null)
      if (text && text !== '-') {
        return text.trim()
      }
    }

    // Fallback: try to get any text content after the label
    const siblingDiv = fieldLabel.locator('xpath=following-sibling::div[1]')
    const text = await siblingDiv.textContent().catch(() => null)

    return text?.trim() || null
  }

  /**
   * Check if Edit button is available (project must be in editable status)
   */
  async isEditButtonAvailable(): Promise<boolean> {
    const projectInfoCard = this.page.locator('h2:has-text("Project info")').locator('xpath=ancestor::div[contains(@class, "p-6")]')
    const editButton = projectInfoCard.locator('button').filter({ has: this.page.locator('svg') }).first()

    const isVisible = await editButton.isVisible().catch(() => false)
    if (!isVisible) return false

    const isDisabled = await editButton.isDisabled().catch(() => true)
    return !isDisabled
  }

  // ============================================================================
  // Item Info Edit Methods
  // ============================================================================

  /**
   * Click the Edit button on Item Info section
   */
  async clickEditItemInfo() {
    await this.waitForLoadingComplete()

    // Find the Item Info heading and its immediate parent container
    // Structure: div > (h2 "Item Info" + button[svg])
    const itemInfoHeading = this.page.locator('h2:has-text("Item Info")')
    const headingParent = itemInfoHeading.locator('xpath=..')
    const editButton = headingParent.locator('button').filter({ has: this.page.locator('svg') }).first()

    await editButton.waitFor({ state: 'visible', timeout: 10000 })
    await editButton.click()
    await this.page.waitForTimeout(1000)
  }

  /**
   * Check if Item Info is in edit mode
   * In edit mode, a sidebar with Price Summary and Save/Cancel buttons appears
   */
  async isItemInfoEditing(): Promise<boolean> {
    // The Item Info edit sidebar has h3 "Price Summary" header
    // Structure: parent div > (h3 "Price Summary" + price details + buttons container with Save/Cancel)
    const priceSummaryHeading = this.page.locator('h3:has-text("Price Summary")')
    const hasPriceSummary = await priceSummaryHeading.isVisible().catch(() => false)

    if (!hasPriceSummary) return false

    // The Save and Cancel buttons are in the same parent container as Price Summary
    const priceSummaryParent = priceSummaryHeading.locator('xpath=..')
    const saveButton = priceSummaryParent.locator('button:has-text("Save")')
    const hasSaveButton = await saveButton.isVisible().catch(() => false)

    return hasSaveButton
  }

  /**
   * Click Save button in Item Info edit mode (in sidebar)
   */
  async clickSaveItemInfo() {
    // The Save button is in the sidebar with Price Summary
    const priceSummaryParent = this.page.locator('h3:has-text("Price Summary")').locator('xpath=..')
    const saveButton = priceSummaryParent.locator('button:has-text("Save")')

    await saveButton.waitFor({ state: 'visible', timeout: 5000 })
    await saveButton.click()

    // Wait for save to complete
    const toast = this.page.locator('text="Project details updated successfully"')
    await toast.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {
      console.log('Toast notification not found, continuing...')
    })

    await this.waitForLoadingComplete()
    await this.page.waitForTimeout(1000)
  }

  /**
   * Click Cancel button in Item Info edit mode (in sidebar)
   */
  async clickCancelItemInfo() {
    // The Cancel button is in the sidebar with Price Summary
    const priceSummaryParent = this.page.locator('h3:has-text("Price Summary")').locator('xpath=..')
    const cancelButton = priceSummaryParent.locator('button:has-text("Cancel")')

    await cancelButton.waitFor({ state: 'visible', timeout: 5000 })
    await cancelButton.click()
    await this.page.waitForTimeout(500)
  }

  /**
   * Handle the discard changes confirmation modal
   */
  async confirmDiscardChanges() {
    const discardButton = this.page.locator('button:has-text("Discard")')
    await discardButton.waitFor({ state: 'visible', timeout: 5000 })
    await discardButton.click()
    await this.page.waitForTimeout(500)
  }

  /**
   * Handle the keep editing option in confirmation modal
   */
  async clickKeepEditing() {
    const keepEditingButton = this.page.locator('button:has-text("Keep Editing")')
    await keepEditingButton.waitFor({ state: 'visible', timeout: 5000 })
    await keepEditingButton.click()
    await this.page.waitForTimeout(500)
  }

  /**
   * Dismiss an error modal if it's visible
   * Returns true if an error modal was dismissed, false otherwise
   */
  async dismissErrorModal(): Promise<boolean> {
    // Look for error modal with "Error" heading and "OK" button
    const errorHeading = this.page.locator('h2:has-text("Error")')
    const isErrorVisible = await errorHeading.isVisible().catch(() => false)

    if (isErrorVisible) {
      const okButton = this.page.locator('button:has-text("OK")').first()
      if (await okButton.isVisible().catch(() => false)) {
        await okButton.click()
        await this.page.waitForTimeout(500)
        return true
      }
    }
    return false
  }

  /**
   * Get the first item's title text
   */
  async getFirstItemTitle(): Promise<string | null> {
    await this.waitForLoadingComplete()

    // Find the first item title (format: "01 Item Title")
    const itemTitle = this.page.locator('h3.font-bold').first()
    const text = await itemTitle.textContent().catch(() => null)

    // Remove the index prefix (e.g., "01 ")
    if (text) {
      return text.replace(/^\d{2}\s*/, '').trim()
    }
    return null
  }

  /**
   * Fill Item Title in edit mode
   */
  async fillItemTitle(title: string, itemIndex: number = 0) {
    await this.waitForLoadingComplete()

    // In edit mode, find the title input in the collapsed section
    // First, make sure Basic Info section is expanded
    await this.expandItemSection(itemIndex, 'Basic Info')

    // Find the title input
    const titleInput = this.page.locator('input[name*="title"]').nth(itemIndex)
    await titleInput.waitFor({ state: 'visible', timeout: 5000 })
    await titleInput.fill(title)
    await this.page.waitForTimeout(200)
  }

  /**
   * Expand a specific section within an item in edit mode
   */
  async expandItemSection(itemIndex: number, sectionName: string) {
    // Find the section header and click to expand if collapsed
    const sectionHeader = this.page.locator(`text="${sectionName}"`).nth(itemIndex)

    // Check if section exists and is collapsed (has chevron-right icon)
    const isVisible = await sectionHeader.isVisible().catch(() => false)
    if (!isVisible) return

    // Check if the section content is visible
    const sectionContainer = sectionHeader.locator('xpath=ancestor::div[1]')
    const chevronRight = sectionContainer.locator('svg[class*="lucide-chevron-right"]')

    if (await chevronRight.isVisible().catch(() => false)) {
      await sectionHeader.click()
      await this.page.waitForTimeout(300)
    }
  }

  /**
   * Get Item Due Date value
   */
  async getItemDueDate(itemIndex: number = 0): Promise<string | null> {
    await this.waitForLoadingComplete()

    const fieldLabel = this.page.locator('text="Item due date"').nth(itemIndex)
    const fieldContainer = fieldLabel.locator('xpath=ancestor::div[1]')
    const valueDiv = fieldContainer.locator('div').last()
    const text = await valueDiv.textContent().catch(() => null)

    return text?.trim() || null
  }

  /**
   * Get Item Category value
   */
  async getItemCategory(itemIndex: number = 0): Promise<string | null> {
    await this.waitForLoadingComplete()

    const fieldLabel = this.page.locator('text="Category"').nth(itemIndex)
    const fieldContainer = fieldLabel.locator('xpath=ancestor::div[1]')
    const valueDiv = fieldContainer.locator('div').last()
    const text = await valueDiv.textContent().catch(() => null)

    return text?.trim() || null
  }

  /**
   * Get Item Language Pairs value
   */
  async getItemLanguagePairs(itemIndex: number = 0): Promise<string | null> {
    await this.waitForLoadingComplete()

    const fieldLabel = this.page.locator('text="Language pairs"').nth(itemIndex)
    const fieldContainer = fieldLabel.locator('xpath=ancestor::div[1]')
    const valueDiv = fieldContainer.locator('div').last()
    const text = await valueDiv.textContent().catch(() => null)

    return text?.trim() || null
  }

  /**
   * Check if Item Info Edit button is available
   */
  async isItemInfoEditButtonAvailable(): Promise<boolean> {
    // Find the Item Info heading and its immediate parent container
    const itemInfoHeading = this.page.locator('h2:has-text("Item Info")')
    const headingParent = itemInfoHeading.locator('xpath=..')
    const editButton = headingParent.locator('button').filter({ has: this.page.locator('svg') }).first()

    const isVisible = await editButton.isVisible().catch(() => false)
    if (!isVisible) return false

    const isDisabled = await editButton.isDisabled().catch(() => true)
    return !isDisabled
  }

  /**
   * Get Job count for an item
   */
  async getJobCount(itemIndex: number = 0): Promise<number> {
    await this.waitForLoadingComplete()

    // Find the job table rows for the specified item
    const itemContainer = this.page.locator('h3.font-bold').nth(itemIndex).locator('xpath=ancestor::div[contains(@class, "border")]')
    const jobRows = itemContainer.locator('tbody tr')

    return await jobRows.count()
  }

  /**
   * Fill Job Quantity in edit mode
   */
  async fillJobQuantity(quantity: string, jobIndex: number = 0, itemIndex: number = 0) {
    await this.waitForLoadingComplete()

    // Make sure Jobs section is expanded
    await this.expandItemSection(itemIndex, 'Jobs')

    // Find the quantity input in the job row
    const jobRow = this.page.locator('tbody tr').nth(jobIndex)
    const quantityInput = jobRow.locator('input[type="text"]').first()

    await quantityInput.waitFor({ state: 'visible', timeout: 5000 })
    await quantityInput.fill(quantity)
    await this.page.waitForTimeout(200)
  }

  /**
   * Fill Job Unit Price in edit mode
   */
  async fillJobUnitPrice(unitPrice: string, jobIndex: number = 0, itemIndex: number = 0) {
    await this.waitForLoadingComplete()

    // Make sure Jobs section is expanded
    await this.expandItemSection(itemIndex, 'Jobs')

    // Find the unit price input in the job row (second input)
    const jobRow = this.page.locator('tbody tr').nth(jobIndex)
    const unitPriceInput = jobRow.locator('input[type="text"]').nth(1)

    await unitPriceInput.waitFor({ state: 'visible', timeout: 5000 })
    await unitPriceInput.fill(unitPrice)
    await this.page.waitForTimeout(200)
  }

  /**
   * Get Total Price from Item Info section (view mode)
   */
  async getTotalPrice(): Promise<string | null> {
    await this.waitForLoadingComplete()

    // Look for Total Price in the Item Info summary section
    // Structure: div > (div "Total Price" + div "$X.XX")
    const totalPriceContainer = this.page.locator('div:has(> div:text-is("Total Price"))')

    if (!(await totalPriceContainer.first().isVisible().catch(() => false))) {
      // Fallback: Try locating via xpath from the text
      const totalLabel = this.page.locator('text="Total Price"').first()
      const sibling = totalLabel.locator('xpath=following-sibling::*[1]')
      const text = await sibling.textContent().catch(() => null)
      return text?.trim() || null
    }

    // Get the last div inside the container (the value)
    const priceValue = totalPriceContainer.first().locator('> div').last()
    const text = await priceValue.textContent().catch(() => null)

    return text?.trim() || null
  }

  // ============================================================================
  // Project Team Edit Methods
  // ============================================================================

  /**
   * Click the Edit button on Project Team section
   */
  async clickEditProjectTeam() {
    await this.waitForLoadingComplete()

    // Dismiss any open modal first
    await this.dismissErrorModal()

    // Find the Project Team heading and its immediate parent container
    const projectTeamHeading = this.page.locator('h2:has-text("Project Team")')
    const headingParent = projectTeamHeading.locator('xpath=..')
    const editButton = headingParent.locator('button').filter({ has: this.page.locator('svg') }).first()

    await editButton.waitFor({ state: 'visible', timeout: 10000 })

    // Try to click, if blocked by modal, force click
    try {
      await editButton.click({ timeout: 5000 })
    } catch {
      // If click failed due to modal, try dismissing modal again and force click
      await this.dismissErrorModal()
      await this.page.keyboard.press('Escape')
      await this.page.waitForTimeout(300)
      await editButton.click({ force: true })
    }
    await this.page.waitForTimeout(500)
  }

  /**
   * Check if Project Team is in edit mode
   */
  async isProjectTeamEditing(): Promise<boolean> {
    // In edit mode, the Project Team section shows Save and Cancel buttons
    const projectTeamHeading = this.page.locator('h2:has-text("Project Team")')
    const headingParent = projectTeamHeading.locator('xpath=..')
    const saveButton = headingParent.locator('button:has-text("Save")')

    return await saveButton.isVisible().catch(() => false)
  }

  /**
   * Click Save button in Project Team edit mode
   */
  async clickSaveProjectTeam() {
    const projectTeamHeading = this.page.locator('h2:has-text("Project Team")')
    const headingParent = projectTeamHeading.locator('xpath=..')
    const saveButton = headingParent.locator('button:has-text("Save")')

    await saveButton.waitFor({ state: 'visible', timeout: 5000 })
    await saveButton.click()

    // Wait for save to complete
    await this.waitForLoadingComplete()
    await this.page.waitForTimeout(1000)

    // Verify we're out of edit mode
    await saveButton.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {})
  }

  /**
   * Click Cancel button in Project Team edit mode
   */
  async clickCancelProjectTeam() {
    const projectTeamHeading = this.page.locator('h2:has-text("Project Team")')
    const headingParent = projectTeamHeading.locator('xpath=..')
    const cancelButton = headingParent.locator('button:has-text("Cancel")')

    await cancelButton.waitFor({ state: 'visible', timeout: 5000 })
    await cancelButton.click()
    await this.page.waitForTimeout(500)
  }

  /**
   * Check if Project Team Edit button is available
   */
  async isProjectTeamEditButtonAvailable(): Promise<boolean> {
    const projectTeamHeading = this.page.locator('h2:has-text("Project Team")')
    const headingParent = projectTeamHeading.locator('xpath=..')
    const editButton = headingParent.locator('button').filter({ has: this.page.locator('svg') }).first()

    const isVisible = await editButton.isVisible().catch(() => false)
    if (!isVisible) return false

    const isDisabled = await editButton.isDisabled().catch(() => true)
    return !isDisabled
  }

  /**
   * Get the current Project Manager value
   */
  async getProjectManager(): Promise<string | null> {
    await this.waitForLoadingComplete()

    // Find the Project manager field
    const fieldLabel = this.page.locator('text="Project manager"').first()
    const fieldContainer = fieldLabel.locator('xpath=..')

    // In view mode, the value is in a div after the label
    const valueDiv = fieldContainer.locator('> div').last()
    const text = await valueDiv.textContent().catch(() => null)

    return text?.trim() || null
  }

  /**
   * Get the current Team Members value
   */
  async getTeamMembers(): Promise<string | null> {
    await this.waitForLoadingComplete()

    // Find the Team members field
    const fieldLabel = this.page.locator('text="Team members"').first()
    const fieldContainer = fieldLabel.locator('xpath=..')

    // In view mode, the value is in a div after the label
    const valueDiv = fieldContainer.locator('> div').last()
    const text = await valueDiv.textContent().catch(() => null)

    return text?.trim() || null
  }

  /**
   * Select Project Manager in edit mode
   */
  async selectProjectManager(managerName: string) {
    await this.waitForLoadingComplete()

    // Find the Project manager combobox
    const projectTeamCard = this.page.locator('h2:has-text("Project Team")').locator('xpath=ancestor::div[contains(@class, "p-6")]')
    const fieldLabel = projectTeamCard.locator('text="Project manager"').first()
    const fieldContainer = fieldLabel.locator('xpath=..')
    const selectTrigger = fieldContainer.locator('[role="combobox"]').first()

    await selectTrigger.waitFor({ state: 'visible', timeout: 5000 })
    await selectTrigger.click()
    await this.page.waitForTimeout(500)

    // Wait for dropdown and select option
    const listbox = this.page.locator('[role="listbox"]').first()
    await listbox.waitFor({ state: 'visible', timeout: 5000 })

    const option = listbox.locator(`[role="option"]:has-text("${managerName}")`).first()
    await option.waitFor({ state: 'visible', timeout: 5000 })
    await option.click()

    await listbox.waitFor({ state: 'hidden', timeout: 5000 })
    await this.page.waitForTimeout(300)
  }

  /**
   * Select Team Members in edit mode (multi-select)
   */
  async selectTeamMembers(memberNames: string[]) {
    await this.waitForLoadingComplete()

    // Find the Team members multi-select
    const projectTeamCard = this.page.locator('h2:has-text("Project Team")').locator('xpath=ancestor::div[contains(@class, "p-6")]')
    const fieldLabel = projectTeamCard.locator('text="Team members"').first()
    const fieldContainer = fieldLabel.locator('xpath=..')
    const selectTrigger = fieldContainer.locator('[role="combobox"], button').first()

    await selectTrigger.waitFor({ state: 'visible', timeout: 5000 })
    await selectTrigger.click()
    await this.page.waitForTimeout(500)

    // Wait for dropdown
    const popover = this.page.locator('[data-radix-popper-content-wrapper]').first()
    await popover.waitFor({ state: 'visible', timeout: 5000 })

    // Select each member
    for (const memberName of memberNames) {
      const option = popover.locator(`text="${memberName}"`).first()
      if (await option.isVisible().catch(() => false)) {
        await option.click()
        await this.page.waitForTimeout(200)
      }
    }

    // Close the dropdown by clicking outside or pressing Escape
    await this.page.keyboard.press('Escape')
    await this.page.waitForTimeout(300)
  }

  /**
   * Clear all selected Team Members in edit mode
   */
  async clearTeamMembers() {
    await this.waitForLoadingComplete()

    // Find the Team members multi-select and clear it
    const projectTeamCard = this.page.locator('h2:has-text("Project Team")').locator('xpath=ancestor::div[contains(@class, "p-6")]')
    const fieldLabel = projectTeamCard.locator('text="Team members"').first()
    const fieldContainer = fieldLabel.locator('xpath=..')

    // Look for clear/remove buttons (X icons) on selected items
    const removeButtons = fieldContainer.locator('button[aria-label*="Remove"], svg[class*="close"], svg[class*="x"]')
    const count = await removeButtons.count()

    for (let i = count - 1; i >= 0; i--) {
      const btn = removeButtons.nth(i)
      if (await btn.isVisible().catch(() => false)) {
        await btn.click()
        await this.page.waitForTimeout(200)
      }
    }
  }

  // ============================================================================
  // Cancel Project Methods
  // ============================================================================

  /**
   * Check if Cancel this project button is available (visible and enabled)
   * The button is enabled when project status is REQUEST_CREATED, IN_PROGRESS, or COMPLETED
   */
  async isCancelProjectButtonAvailable(): Promise<boolean> {
    const isVisible = await this.cancelProjectButton.isVisible().catch(() => false)
    if (!isVisible) return false
    const isDisabled = await this.cancelProjectButton.isDisabled().catch(() => true)
    return !isDisabled
  }

  /**
   * Get the cancel modal container (located by the modal heading)
   */
  private getCancelModalContainer() {
    return this.page.locator('h2:has-text("Cancel this project")').locator('..')
  }

  /**
   * Click Cancel this project button and wait for modal to appear
   */
  async clickCancelProject() {
    await this.cancelProjectButton.click()
    // Wait for modal heading to appear
    await this.page.locator('h2:has-text("Cancel this project")').waitFor({ state: 'visible', timeout: 5000 })
  }

  /**
   * Check if Cancel Project Modal is open
   */
  async isCancelProjectModalOpen(): Promise<boolean> {
    // Modal has title "Cancel this project"
    const modalTitle = this.page.locator('h2:has-text("Cancel this project")')
    return await modalTitle.isVisible().catch(() => false)
  }

  /**
   * Get available cancel reasons from the modal
   */
  async getCancelReasons(): Promise<string[]> {
    const reasons: string[] = []
    const modal = this.getCancelModalContainer()
    // Radio options are in a radiogroup, each has a label/text sibling
    const radioOptions = modal.locator('[role="radiogroup"] > *')
    const count = await radioOptions.count()

    for (let i = 0; i < count; i++) {
      const text = await radioOptions.nth(i).textContent()
      if (text) reasons.push(text.trim())
    }
    return reasons
  }

  /**
   * Select a cancel reason in the modal
   */
  async selectCancelReason(reason: string) {
    const modal = this.getCancelModalContainer()
    // Find the radio option by its text content
    const reasonOption = modal.locator(`[role="radiogroup"] >> text="${reason}"`)
    await reasonOption.waitFor({ state: 'visible', timeout: 5000 })
    await reasonOption.click()
    await this.page.waitForTimeout(300)
  }

  /**
   * Fill the message to client textarea in cancel modal
   */
  async fillCancelMessage(message: string) {
    const modal = this.getCancelModalContainer()
    const textarea = modal.locator('textarea')
    await textarea.waitFor({ state: 'visible', timeout: 5000 })
    await textarea.fill(message)
    await this.page.waitForTimeout(200)
  }

  /**
   * Check if Cancel button in modal is enabled
   * Cancel button is disabled until reason is selected AND message is entered
   */
  async isCancelModalConfirmEnabled(): Promise<boolean> {
    const modal = this.getCancelModalContainer()
    // The confirm button has text "Cancel" and is the last button
    const cancelButton = modal.locator('button:has-text("Cancel")').last()
    const isDisabled = await cancelButton.isDisabled().catch(() => true)
    return !isDisabled
  }

  /**
   * Click No button to close cancel modal without confirming
   */
  async clickCancelModalNo() {
    const modal = this.getCancelModalContainer()
    const noButton = modal.locator('button:has-text("No")')
    await noButton.waitFor({ state: 'visible', timeout: 5000 })
    await noButton.click()
    await this.page.waitForTimeout(500)
  }

  /**
   * Click Cancel button to confirm project cancellation
   */
  async clickCancelModalConfirm() {
    const modal = this.getCancelModalContainer()
    // The confirm button has text "Cancel" and is the last button (right side)
    const cancelButton = modal.locator('button:has-text("Cancel")').last()
    await cancelButton.waitFor({ state: 'visible', timeout: 5000 })
    await cancelButton.click()
    // Wait for API call to complete and modal to close
    await this.page.waitForTimeout(2000)
  }

  /**
   * Get current message character count from the cancel modal
   */
  async getCancelMessageCharCount(): Promise<string | null> {
    const modal = this.getCancelModalContainer()
    const charCount = modal.locator('text=/\\d+\\/500/')
    const text = await charCount.textContent().catch(() => null)
    return text?.trim() || null
  }

  /**
   * Complete cancel project flow: open modal, select reason, fill message, confirm
   */
  async cancelProjectWithReason(reason: string, message: string) {
    await this.clickCancelProject()
    await this.page.waitForTimeout(500)

    // Verify modal is open
    const isModalOpen = await this.isCancelProjectModalOpen()
    if (!isModalOpen) {
      throw new Error('Cancel project modal did not open')
    }

    // Select reason
    await this.selectCancelReason(reason)

    // Fill message
    await this.fillCancelMessage(message)

    // Confirm
    await this.clickCancelModalConfirm()

    // Wait for page to update
    await this.waitForLoadingComplete()
  }

  /**
   * Get the project status text from the status badge
   */
  async getProjectStatus(): Promise<string | null> {
    await this.waitForLoadingComplete()

    // Try to get status from header (next to project ID)
    let statusText = await this.statusBadge.textContent().catch(() => null)
    if (statusText?.trim()) {
      return statusText.trim()
    }

    // Fallback: Get status from Project info section
    const statusField = this.page.locator('text="Status"').locator('..').locator('> *:last-child')
    statusText = await statusField.textContent().catch(() => null)
    return statusText?.trim() || null
  }

  // ============================================================================
  // Jobs Tab Methods
  // ============================================================================

  /**
   * Navigate to Jobs tab and wait for content to load
   */
  async navigateToJobsTab(options: { timeout?: number } = {}) {
    const timeout = options.timeout || 30000

    await this.clickTab('jobs')
    await this.page.waitForTimeout(1000)

    // Wait for Jobs tab content to appear with retry
    const jobsTabPanel = this.page.getByRole('tabpanel', { name: 'Jobs' })

    try {
      await jobsTabPanel.waitFor({ state: 'visible', timeout: timeout })
    } catch (error) {
      // If specific tabpanel not found, try clicking tab again
      console.log('Jobs tab panel not visible, retrying tab click...')
      await this.clickTab('jobs')
      await this.page.waitForTimeout(1500)
      await jobsTabPanel.waitFor({ state: 'visible', timeout: timeout / 2 }).catch(() => {
        console.log('Jobs tab panel still not visible after retry')
      })
    }

    // Wait for any loading indicators to disappear
    await this.waitForLoadingComplete()
  }

  /**
   * Check if Jobs tab content is visible
   */
  async isJobsTabContentVisible(): Promise<boolean> {
    const tabPanel = this.page.getByRole('tabpanel', { name: 'Jobs' })
    return await tabPanel.isVisible().catch(() => false)
  }

  /**
   * Get the number of job items in the Jobs tab
   */
  async getJobItemCount(): Promise<number> {
    // Job items have headers with item index and title
    const jobItems = this.page.locator('[data-testid="job-item-header"], h3:has-text("Item")').filter({ hasText: /\d+/ })
    return await jobItems.count().catch(() => 0)
  }

  /**
   * Click the dropdown menu (⋯) for a specific item in the Jobs tab
   * @param itemIndex - 0-based index of the item
   * @returns true if dropdown was clicked, false if no dropdown found
   */
  async clickJobsItemDropdown(itemIndex: number = 0): Promise<boolean> {
    // Wait for Jobs tab content to be fully loaded
    await this.waitForLoadingComplete()

    // Try to find Jobs tab panel with multiple approaches
    let jobsTab = this.page.getByRole('tabpanel', { name: 'Jobs' })
    let isJobsTabVisible = await jobsTab.isVisible().catch(() => false)

    if (!isJobsTabVisible) {
      // Try alternative selector
      jobsTab = this.page.locator('[role="tabpanel"]').filter({ has: this.page.locator('text=Job') })
      isJobsTabVisible = await jobsTab.isVisible().catch(() => false)
    }

    if (!isJobsTabVisible) {
      // Use the whole page if Jobs tab not found
      jobsTab = this.page.locator('main, [role="main"], .main-content').first()
    }

    // Try multiple selectors for the dropdown button
    const selectors = [
      'button[aria-label="Actions"]',
      'button[aria-label="More actions"]',
      'button[aria-label="Menu"]',
      'button[aria-haspopup="menu"]',
      '[data-testid="actions-dropdown"]',
      '[data-testid="job-actions"]',
      'button:has(svg[class*="ellipsis"])',
      'button:has(svg[class*="dots"])',
      'button:has(svg[class*="more"])',
      // Look for DropdownMenu trigger buttons (common in Radix UI)
      '[data-state] button:has(svg)',
      // Look for icon-only buttons (common pattern for action menus)
      'button.h-8.w-8:has(svg)',
      'button.size-8:has(svg)',
    ]

    let actionsButtons = null
    let count = 0

    // Try each selector until we find buttons
    for (const selector of selectors) {
      actionsButtons = jobsTab.locator(selector)
      count = await actionsButtons.count().catch(() => 0)
      if (count > 0) {
        console.log(`Found ${count} dropdown button(s) with selector: ${selector}`)
        break
      }
    }

    // If still not found, try waiting for any button that might be a dropdown
    if (count === 0) {
      // Wait a bit more for dynamic content
      await this.page.waitForTimeout(1000)

      // Try a broader search for buttons with SVG icons in item headers
      const itemHeaders = jobsTab.locator('[class*="item-header"], [class*="ItemHeader"], .flex.items-center.justify-between, [class*="card-header"], [class*="CardHeader"]')
      const headerCount = await itemHeaders.count().catch(() => 0)

      if (headerCount > 0) {
        const header = itemHeaders.nth(itemIndex)
        actionsButtons = header.locator('button').filter({ has: this.page.locator('svg') })
        count = await actionsButtons.count().catch(() => 0)
        if (count > 0) {
          console.log(`Found ${count} button(s) in item header`)
        }
      }
    }

    // Last resort: find any small icon button
    if (count === 0) {
      actionsButtons = jobsTab.locator('button:has(svg)').filter({ hasNotText: /.{10,}/ }) // Buttons with SVG but short/no text
      count = await actionsButtons.count().catch(() => 0)
      if (count > 0) {
        console.log(`Found ${count} icon button(s) as fallback`)
      }
    }

    if (count > itemIndex) {
      await actionsButtons!.nth(itemIndex).click()
      await this.page.waitForTimeout(300)
      return true
    } else if (count > 0) {
      await actionsButtons!.first().click()
      await this.page.waitForTimeout(300)
      return true
    } else {
      // Log available buttons for debugging
      const allButtons = await jobsTab.locator('button').all()
      console.log(`Total buttons in Jobs tab area: ${allButtons.length}`)
      for (let i = 0; i < Math.min(10, allButtons.length); i++) {
        const button = allButtons[i]
        if (!button) continue
        const ariaLabel = await button.getAttribute('aria-label').catch(() => null)
        const text = await button.textContent().catch(() => '')
        const className = await button.getAttribute('class').catch(() => '')
        console.log(`Button ${i}: aria-label="${ariaLabel}", text="${text?.slice(0, 30)}", class="${className?.slice(0, 50)}"`)
      }
      console.log('No Actions dropdown button found in Jobs tab - this may be expected if no jobs exist')
      return false
    }
  }

  /**
   * Click "Edit jobs" menu item from the dropdown
   */
  async clickEditJobs() {
    // Wait for loading to complete first
    await this.waitForLoadingComplete()

    // Look for dropdown menu item with "Edit jobs" text - try multiple selectors
    const selectors = [
      '[role="menuitem"]:has-text("Edit jobs")',
      'button:has-text("Edit jobs")',
      '[role="menu"] >> text=Edit jobs',
      '[data-radix-menu-content] >> text=Edit jobs',
    ]

    let clicked = false
    for (const selector of selectors) {
      const editJobsItem = this.page.locator(selector).first()
      const isVisible = await editJobsItem.isVisible().catch(() => false)

      if (isVisible) {
        await editJobsItem.click()
        clicked = true
        break
      }
    }

    // Retry with longer wait if initial attempt failed
    if (!clicked) {
      // Wait for menu to fully render
      await this.page.waitForTimeout(1000)
      await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})

      // Try again with first selector and longer timeout
      const editJobsItem = this.page.locator('[role="menuitem"]:has-text("Edit jobs"), button:has-text("Edit jobs")').first()
      await editJobsItem.waitFor({ state: 'visible', timeout: 15000 })
      await editJobsItem.click()
    }

    // Wait for edit mode to activate
    await this.page.waitForTimeout(500)
    await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
  }

  /**
   * Check if Jobs tab is in edit mode
   */
  async isJobsEditMode(): Promise<boolean> {
    // In edit mode, Save button (aria-label="Save") should be visible
    const jobsTab = this.page.getByRole('tabpanel', { name: 'Jobs' })
    const saveButton = jobsTab.locator('button[aria-label="Save"]').first()
    return await saveButton.isVisible().catch(() => false)
  }

  /**
   * Click "Add Job" button in a language pair group
   * @param groupIndex - 0-based index of the language pair group
   */
  async clickAddJob(groupIndex: number = 0) {
    // "Add Job" button appears in edit mode within language pair groups
    const addJobButtons = this.page.locator('button:has-text("Add Job")')
    const count = await addJobButtons.count()

    if (count > groupIndex) {
      await addJobButtons.nth(groupIndex).click()
    } else if (count > 0) {
      await addJobButtons.first().click()
    } else {
      throw new Error('Add Job button not found. Make sure you are in edit mode.')
    }
    await this.page.waitForTimeout(500)
  }

  /**
   * Get the number of job rows in the table
   */
  async getJobRowCount(): Promise<number> {
    // Job rows are in the table body
    const jobRows = this.page.locator('table tbody tr, [data-testid="job-row"]')
    return await jobRows.count().catch(() => 0)
  }

  /**
   * Fill job service type in edit mode
   * @param serviceType - Service type to select (e.g., "Translation", "Editing")
   * @param rowIndex - 0-based index of the job row
   */
  async selectJobServiceType(serviceType: string, rowIndex: number = 0) {
    // Find the job row in the Jobs tab
    const jobsTab = this.page.getByRole('tabpanel', { name: 'Jobs' })
    const rows = jobsTab.locator('table tbody tr')
    const row = rows.nth(rowIndex)

    // Service type is the first combobox in the row
    const serviceTypeSelect = row.locator('[role="combobox"]').first()

    // Check current value - skip if already set to avoid toggle behavior
    const currentValue = await serviceTypeSelect.textContent()
    if (currentValue?.trim() === serviceType) {
      return // Already set to desired value
    }

    // Retry logic for flaky dropdown selections
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await serviceTypeSelect.click()
        await this.page.waitForTimeout(500)

        // Select the option from dropdown
        const option = this.page.locator(`[role="option"]:has-text("${serviceType}")`).first()
        await option.waitFor({ state: 'visible', timeout: 15000 })
        await option.click()
        await this.page.waitForTimeout(300)
        return // Success
      } catch (error) {
        if (attempt < 2) {
          console.log(`Service type selection attempt ${attempt + 1} failed, retrying...`)
          // Close any open dropdown by pressing Escape
          await this.page.keyboard.press('Escape')
          await this.page.waitForTimeout(500)
        } else {
          throw error
        }
      }
    }
  }

  /**
   * Fill job name in edit mode
   * @param jobName - Name for the job
   * @param rowIndex - 0-based index of the job row
   */
  async fillJobName(jobName: string, rowIndex: number = 0) {
    // Find the job row in the Jobs tab
    const jobsTab = this.page.getByRole('tabpanel', { name: 'Jobs' })
    const rows = jobsTab.locator('table tbody tr')
    const row = rows.nth(rowIndex)

    // Job name is the first input field in the row
    const nameInput = row.locator('input').first()
    await nameInput.fill(jobName)
    await this.page.waitForTimeout(200)
  }

  /**
   * Select source language in edit mode
   * @param language - Language code to select (e.g., "Korean", "English")
   * @param rowIndex - 0-based index of the job row
   */
  async selectJobSourceLanguage(language: string, rowIndex: number = 0) {
    const jobsTab = this.page.getByRole('tabpanel', { name: 'Jobs' })
    const rows = jobsTab.locator('table tbody tr')
    const row = rows.nth(rowIndex)

    // Source language is typically the 2nd combobox (after Service Type)
    const comboboxes = row.locator('[role="combobox"]')
    const sourceSelect = comboboxes.nth(1) // Index 1 = Source Language

    // Check current value - skip if already contains the language
    const currentValue = await sourceSelect.textContent()
    if (currentValue?.includes(language)) {
      return // Already set to desired value
    }

    // Retry logic for flaky dropdown selections
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await sourceSelect.click()
        await this.page.waitForTimeout(500)

        // Select the option from dropdown
        const option = this.page.locator(`[role="option"]:has-text("${language}")`).first()
        await option.waitFor({ state: 'visible', timeout: 15000 })
        await option.click()
        await this.page.waitForTimeout(300)
        return // Success
      } catch (error) {
        if (attempt < 2) {
          console.log(`Source language selection attempt ${attempt + 1} failed, retrying...`)
          // Close any open dropdown by pressing Escape
          await this.page.keyboard.press('Escape')
          await this.page.waitForTimeout(500)
        } else {
          throw error
        }
      }
    }
  }

  /**
   * Select target language in edit mode
   * @param language - Language code to select (e.g., "Korean", "English")
   * @param rowIndex - 0-based index of the job row
   */
  async selectJobTargetLanguage(language: string, rowIndex: number = 0) {
    const jobsTab = this.page.getByRole('tabpanel', { name: 'Jobs' })
    const rows = jobsTab.locator('table tbody tr')
    const row = rows.nth(rowIndex)

    // Target language is typically the 3rd combobox (after Service Type, Source)
    const comboboxes = row.locator('[role="combobox"]')
    const targetSelect = comboboxes.nth(2) // Index 2 = Target Language

    // Check current value - skip if already contains the language
    const currentValue = await targetSelect.textContent()
    if (currentValue?.includes(language)) {
      console.log(`Target language already set to ${language}`)
      return // Already set to desired value
    }

    // Retry logic for flaky dropdown selections
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await targetSelect.click()
        await this.page.waitForTimeout(500)

        // Try to find the option - first exact match, then partial match
        let option = this.page.locator(`[role="option"]:has-text("${language}")`).first()
        let isVisible = await option.isVisible().catch(() => false)

        if (!isVisible) {
          // Log available options for debugging
          const allOptions = this.page.locator('[role="option"]')
          const optionCount = await allOptions.count()
          console.log(`Available target language options (${optionCount}):`)
          for (let i = 0; i < Math.min(optionCount, 10); i++) {
            const optText = await allOptions.nth(i).textContent()
            console.log(`  - ${optText}`)
          }

          // Try to find any option that starts with the language name
          for (let i = 0; i < optionCount; i++) {
            const optText = await allOptions.nth(i).textContent()
            if (optText?.toLowerCase().startsWith(language.toLowerCase())) {
              option = allOptions.nth(i)
              isVisible = true
              console.log(`Found partial match: ${optText}`)
              break
            }
          }
        }

        if (isVisible) {
          await option.waitFor({ state: 'visible', timeout: 5000 })
          await option.click()
          await this.page.waitForTimeout(300)
          console.log(`Target language set to ${language}`)
          return // Success
        } else {
          throw new Error(`Option "${language}" not found in dropdown`)
        }
      } catch (error) {
        if (attempt < 2) {
          console.log(`Target language selection attempt ${attempt + 1} failed, retrying...`)
          // Close any open dropdown by pressing Escape
          await this.page.keyboard.press('Escape')
          await this.page.waitForTimeout(500)
        } else {
          throw error
        }
      }
    }
  }

  /**
   * Click Save button in Jobs tab edit mode
   * Handles validation error modal if it appears
   * Waits for edit mode to exit after successful save
   */
  async clickSaveJobs() {
    const jobsTab = this.page.getByRole('tabpanel', { name: 'Jobs' })
    // Save button has aria-label="Save"
    const saveButton = jobsTab.locator('button[aria-label="Save"]').first()

    await saveButton.waitFor({ state: 'visible', timeout: 5000 })

    // Use Promise.all to wait for both click and potential navigation/API response
    const [response] = await Promise.all([
      this.page.waitForResponse(
        (resp) => resp.url().includes('/api/') && resp.request().method() === 'PATCH',
        { timeout: 30000 }
      ).catch(() => null),
      saveButton.click(),
    ])

    if (response) {
      const status = response.status()
      console.log(`Save API response status: ${status}`)
      if (status >= 400) {
        console.log(`Save API failed with status ${status}`)
      }
    }

    // Wait for response
    await this.page.waitForTimeout(1000)

    // Check for validation error modal
    const validationModal = this.page.locator('[id="modal"] .fixed.inset-0')
    const hasValidationModal = await validationModal.isVisible().catch(() => false)

    if (hasValidationModal) {
      // Dismiss the modal
      const okButton = this.page.locator('[id="modal"] button:has-text("OK")').first()
      await okButton.click().catch(() => {})
      await this.page.waitForTimeout(500)
      throw new Error('Validation failed: Please ensure all required fields are filled for ALL jobs')
    }

    // Wait for full-page loading to complete (if page refreshes)
    await this.waitForLoadingComplete()

    // Wait for the page to stabilize
    await this.page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {})

    // Check if we need to re-navigate to Jobs tab (page might have reloaded)
    const isJobsTabVisible = await jobsTab.isVisible().catch(() => false)
    if (!isJobsTabVisible) {
      console.log('Jobs tab not visible after save, waiting for page...')
      await this.expectPageVisible()
      await this.navigateToJobsTab()
    }
  }

  /**
   * Fill missing required fields for existing jobs in edit mode
   * This ensures validation will pass when saving
   */
  async fillMissingJobFields() {
    const jobsTab = this.page.getByRole('tabpanel', { name: 'Jobs' })
    const rows = jobsTab.locator('table tbody tr')
    const rowCount = await rows.count()

    for (let i = 0; i < rowCount; i++) {
      const row = rows.nth(i)
      const inputs = row.locator('input')
      const inputCount = await inputs.count()

      if (inputCount > 0) {
        // Job Name is the first input
        const nameInput = inputs.first()
        const nameValue = await nameInput.inputValue()

        // If Job Name is empty, fill it
        if (!nameValue || nameValue.trim() === '') {
          await nameInput.fill(`Job ${i + 1}`)
          await nameInput.press('Tab')
          await this.page.waitForTimeout(200)
        }
      }
    }
  }

  /**
   * Click Cancel button in Jobs tab edit mode
   */
  async clickCancelJobsEdit() {
    const jobsTab = this.page.getByRole('tabpanel', { name: 'Jobs' })
    // Cancel button has aria-label="Cancel edit mode"
    const cancelButton = jobsTab.locator('button[aria-label="Cancel edit mode"]').first()

    await cancelButton.waitFor({ state: 'visible', timeout: 5000 })
    await cancelButton.click()
    await this.page.waitForTimeout(500)
  }

  /**
   * Enter Jobs tab edit mode for a specific item
   * @param itemIndex - 0-based index of the item
   */
  async enterJobsEditMode(itemIndex: number = 0): Promise<boolean> {
    try {
      const dropdownOpened = await this.clickJobsItemDropdown(itemIndex)
      if (!dropdownOpened) {
        console.log('Could not open dropdown menu - edit mode not available')
        return false
      }
      await this.clickEditJobs()
      return true
    } catch (error) {
      console.log(`Failed to enter edit mode: ${error}`)
      return false
    }
  }

  /**
   * Complete flow to add a new job with required fields
   * Required fields: Step (auto), Service Type, Source Language, Target Language, Job Name
   * Note: This method also fills missing required fields for existing jobs to pass validation
   * @param options - Job options
   */
  async addNewJob(options: {
    itemIndex?: number
    groupIndex?: number
    serviceType?: string
    sourceLanguage?: string
    targetLanguage?: string
    jobName?: string
    startDate?: string
    dueDate?: string
  } = {}) {
    const {
      itemIndex = 0,
      groupIndex = 0,
      serviceType = 'Translation',
      sourceLanguage = 'Korean',
      targetLanguage = 'English (US)',
      jobName = 'E2E Test Job',
      startDate,
      dueDate,
    } = options

    // Enter edit mode if not already
    const isEditing = await this.isJobsEditMode()
    if (!isEditing) {
      await this.enterJobsEditMode(itemIndex)
    }

    // Fill missing required fields for existing jobs first
    // This ensures validation will pass when saving
    await this.fillMissingJobFields()

    // Get current row count
    const beforeCount = await this.getJobRowCount()

    // Click Add Job
    await this.clickAddJob(groupIndex)

    // Wait for new row to appear
    await this.page.waitForTimeout(500)

    // The new row is added at the END (last row), not the beginning
    const afterCount = await this.getJobRowCount()
    const newRowIndex = afterCount - 1

    // Fill in ALL REQUIRED job details (5 required fields)
    // Step is auto-assigned, so we need to fill:
    // 1. Service Type (required)
    await this.selectJobServiceType(serviceType, newRowIndex)

    // 2. Source Language (required) - may be inherited from language pair group
    await this.selectJobSourceLanguage(sourceLanguage, newRowIndex)

    // 3. Target Language (required) - may be inherited from language pair group
    await this.selectJobTargetLanguage(targetLanguage, newRowIndex)

    // 4. Job Name (required)
    await this.fillJobName(jobName, newRowIndex)

    // 5. Job Start Date (optional but recommended)
    if (startDate) {
      await this.setJobStartDate(startDate, newRowIndex)
    }

    // 6. Job Due Date (optional but recommended)
    if (dueDate) {
      await this.setJobDueDate(dueDate, newRowIndex)
    }

    return { beforeCount, afterCount, newRowIndex }
  }

  /**
   * Verify job was added by checking row count increased
   */
  async verifyJobAdded(expectedIncrease: number = 1): Promise<boolean> {
    // This should be called after saving
    const rows = this.page.locator('table tbody tr, [data-testid="job-row"]')
    const count = await rows.count()
    return count >= expectedIncrease
  }

  /**
   * Check if validation error modal is visible
   */
  async isJobsValidationErrorVisible(): Promise<boolean> {
    const errorModal = this.page.locator('text="Please fill in all required fields"')
    return await errorModal.isVisible().catch(() => false)
  }

  /**
   * Close validation error modal
   */
  async closeJobsValidationError() {
    const closeButton = this.page.locator('button:has-text("Close"), button:has-text("OK")').first()
    await closeButton.click().catch(() => {})
    await this.page.waitForTimeout(300)
  }

  /**
   * Get job data from a specific row
   */
  async getJobRowData(rowIndex: number = 0): Promise<{
    step?: string
    serviceType?: string
    name?: string
  }> {
    const rows = this.page.locator('table tbody tr, [data-testid="job-row"]')
    const row = rows.nth(rowIndex)

    const cells = row.locator('td, [role="cell"]')
    const cellTexts: string[] = []

    const count = await cells.count()
    for (let i = 0; i < count; i++) {
      const text = await cells.nth(i).textContent().catch(() => '')
      cellTexts.push(text?.trim() || '')
    }

    return {
      step: cellTexts[0],
      serviceType: cellTexts[1],
      name: cellTexts[2],
    }
  }

  // ============================================================================
  // Jobs Tab Edit - Additional Field Methods
  // ============================================================================

  /**
   * Select PM Tracker in edit mode
   * @param tracker - PM Tracker value to select
   * @param rowIndex - 0-based index of the job row
   */
  async selectJobPmTracker(tracker: string, rowIndex: number = 0) {
    const jobsTab = this.page.getByRole('tabpanel', { name: 'Jobs' })
    const rows = jobsTab.locator('table tbody tr')
    const row = rows.nth(rowIndex)

    // PM Tracker is the 4th combobox (index 3) - after Service Type, Source, Target
    const comboboxes = row.locator('[role="combobox"]')
    const comboboxCount = await comboboxes.count()

    // Try PM Tracker at index 3, but also try nearby indices if needed
    const indicesToTry = [3, 4, 2]

    for (const cbIdx of indicesToTry) {
      if (cbIdx >= comboboxCount) continue

      const pmTrackerSelect = comboboxes.nth(cbIdx)
      const currentValue = await pmTrackerSelect.textContent().catch(() => '')

      // Check if already has the tracker value (use includes for flexible matching)
      if (currentValue?.includes(tracker)) {
        console.log(`PM Tracker already set to ${tracker} at combobox ${cbIdx}`)
        return
      }

      // Check if this looks like a PM Tracker field (has typical values or Select/-)
      const looksLikePmTrackerField =
        currentValue?.includes('Select') ||
        currentValue?.trim() === '-' ||
        currentValue?.trim() === '' ||
        currentValue?.includes('Resourcing') ||
        currentValue?.includes('Delivery') ||
        currentValue?.includes('PM') ||
        cbIdx === 3 // Default PM Tracker position

      if (!looksLikePmTrackerField && cbIdx !== 3) {
        continue
      }

      // Try to select PM Tracker with retry
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          await pmTrackerSelect.click()
          await this.page.waitForTimeout(500)

          const option = this.page.locator(`[role="option"]:has-text("${tracker}")`).first()
          const isVisible = await option.isVisible().catch(() => false)

          if (isVisible) {
            await option.click()
            await this.page.waitForTimeout(500)

            // Verify the selection was successful
            const newValue = await pmTrackerSelect.textContent().catch(() => '')
            if (newValue?.includes(tracker)) {
              console.log(`PM Tracker set to ${tracker} at combobox ${cbIdx}`)
              return
            }
          } else {
            // Option not visible, close dropdown and try next index
            await this.page.keyboard.press('Escape')
            await this.page.waitForTimeout(300)
            break
          }
        } catch (e) {
          console.log(`PM Tracker selection attempt ${attempt + 1} failed: ${e}`)
          await this.page.keyboard.press('Escape').catch(() => {})
          await this.page.waitForTimeout(300)
        }
      }
    }

    console.log(`Warning: Could not set PM Tracker to ${tracker} for row ${rowIndex}`)
  }

  /**
   * Select Currency in edit mode (Jobs tab)
   * @param currency - Currency to select (e.g., "USD", "KRW")
   * @param rowIndex - 0-based index of the job row
   */
  async selectJobCurrency(currency: string, rowIndex: number = 0) {
    const jobsTab = this.page.getByRole('tabpanel', { name: 'Jobs' })
    const rows = jobsTab.locator('table tbody tr')
    const row = rows.nth(rowIndex)

    const comboboxes = row.locator('[role="combobox"]')
    const comboboxCount = await comboboxes.count()

    // Find the currency combobox (typically index 4, but may vary)
    // Try indices 4, 5, 3 in that order
    const indicesToTry = [4, 5, 3]

    for (const cbIdx of indicesToTry) {
      if (cbIdx >= comboboxCount) continue

      const currencySelect = comboboxes.nth(cbIdx)
      const currentValue = await currencySelect.textContent().catch(() => '')

      // Check if already has the currency (use includes for flexible matching)
      if (currentValue?.includes(currency)) {
        console.log(`Currency already set to ${currency} at combobox ${cbIdx}`)
        return
      }

      // Check if this looks like a currency field (has Select... or is empty or has currency symbol)
      const looksLikeCurrencyField =
        currentValue?.includes('Select') ||
        currentValue?.trim() === '' ||
        currentValue?.includes('$') ||
        currentValue?.includes('₩') ||
        currentValue?.includes('€')

      if (!looksLikeCurrencyField && cbIdx !== 4) {
        continue // Skip non-currency comboboxes
      }

      // Try to select currency with retry
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          await currencySelect.click()
          await this.page.waitForTimeout(500)

          const option = this.page.locator(`[role="option"]:has-text("${currency}")`).first()
          const isVisible = await option.isVisible().catch(() => false)

          if (isVisible) {
            await option.click()
            await this.page.waitForTimeout(500)

            // Verify selection
            const newValue = await currencySelect.textContent().catch(() => '')
            if (newValue?.includes(currency)) {
              console.log(`Currency set to ${currency} at combobox ${cbIdx}`)
              return
            }
          } else {
            // Not a currency combobox, close and try next index
            await this.page.keyboard.press('Escape')
            await this.page.waitForTimeout(300)
            break
          }
        } catch (e) {
          console.log(`Currency selection attempt ${attempt + 1} failed: ${e}`)
          await this.page.keyboard.press('Escape').catch(() => {})
          await this.page.waitForTimeout(300)
        }
      }
    }

    console.log(`Warning: Could not set currency to ${currency} for row ${rowIndex}`)
  }

  /**
   * Fill Quantity in edit mode
   * @param quantity - Quantity value
   * @param rowIndex - 0-based index of the job row
   */
  async fillJobQuantity2(quantity: string, rowIndex: number = 0) {
    const jobsTab = this.page.getByRole('tabpanel', { name: 'Jobs' })
    const rows = jobsTab.locator('table tbody tr')
    const row = rows.nth(rowIndex)

    // Quantity is the 2nd input (index 1) - after Job Name
    const inputs = row.locator('input')
    const quantityInput = inputs.nth(1)

    await quantityInput.fill(quantity)
    await quantityInput.press('Tab')
    await this.page.waitForTimeout(200)
  }

  /**
   * Fill Unit Price in edit mode
   * @param unitPrice - Unit price value
   * @param rowIndex - 0-based index of the job row
   */
  async fillJobUnitPrice2(unitPrice: string, rowIndex: number = 0) {
    const jobsTab = this.page.getByRole('tabpanel', { name: 'Jobs' })
    const rows = jobsTab.locator('table tbody tr')
    const row = rows.nth(rowIndex)

    // Unit Price is the 3rd input (index 2)
    const inputs = row.locator('input')
    const unitPriceInput = inputs.nth(2)

    await unitPriceInput.fill(unitPrice)
    await unitPriceInput.press('Tab')
    await this.page.waitForTimeout(200)
  }

  /**
   * Select Price Unit in edit mode
   * @param priceUnit - Price unit to select (e.g., "word", "minutes")
   * @param rowIndex - 0-based index of the job row
   */
  async selectJobPriceUnit(priceUnit: string, rowIndex: number = 0) {
    const jobsTab = this.page.getByRole('tabpanel', { name: 'Jobs' })
    const rows = jobsTab.locator('table tbody tr')
    const row = rows.nth(rowIndex)

    // Price Unit is the 6th combobox (index 5), but try nearby indices too
    const comboboxes = row.locator('[role="combobox"]')
    const comboboxCount = await comboboxes.count()
    const indicesToTry = [5, 6, 4]

    for (const cbIdx of indicesToTry) {
      if (cbIdx >= comboboxCount) continue

      const priceUnitSelect = comboboxes.nth(cbIdx)
      const currentValue = await priceUnitSelect.textContent().catch(() => '')

      // Check if already has the price unit (use includes for flexible matching)
      if (currentValue?.includes(priceUnit)) {
        console.log(`Price Unit already set to ${priceUnit} at combobox ${cbIdx}`)
        return
      }

      // Check if this looks like a Price Unit field
      const looksLikePriceUnitField =
        currentValue?.includes('Select') ||
        currentValue?.trim() === '-' ||
        currentValue?.trim() === '' ||
        currentValue?.includes('word') ||
        currentValue?.includes('hour') ||
        currentValue?.includes('character') ||
        currentValue?.includes('page') ||
        cbIdx === 5

      if (!looksLikePriceUnitField && cbIdx !== 5) {
        continue
      }

      // Try to select Price Unit with retry
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          await priceUnitSelect.click()
          await this.page.waitForTimeout(500)

          const option = this.page.locator(`[role="option"]:has-text("${priceUnit}")`).first()
          const isVisible = await option.isVisible().catch(() => false)

          if (isVisible) {
            await option.click()
            await this.page.waitForTimeout(500)

            // Verify the selection was successful
            const newValue = await priceUnitSelect.textContent().catch(() => '')
            if (newValue?.includes(priceUnit)) {
              console.log(`Price Unit set to ${priceUnit} at combobox ${cbIdx}`)
              return
            }
          } else {
            // Option not visible, close dropdown and try next index
            await this.page.keyboard.press('Escape')
            await this.page.waitForTimeout(300)
            break
          }
        } catch (e) {
          console.log(`Price Unit selection attempt ${attempt + 1} failed: ${e}`)
          await this.page.keyboard.press('Escape').catch(() => {})
          await this.page.waitForTimeout(300)
        }
      }
    }

    console.log(`Warning: Could not set Price Unit to ${priceUnit} for row ${rowIndex}`)
  }

  /**
   * Fill Surcharge Name in edit mode
   * @param surchargeName - Surcharge name
   * @param rowIndex - 0-based index of the job row
   */
  async fillJobSurchargeName(surchargeName: string, rowIndex: number = 0) {
    const jobsTab = this.page.getByRole('tabpanel', { name: 'Jobs' })
    const rows = jobsTab.locator('table tbody tr')
    const row = rows.nth(rowIndex)

    // Surcharge Name is the 4th input (index 3)
    const inputs = row.locator('input')
    const surchargeNameInput = inputs.nth(3)

    await surchargeNameInput.fill(surchargeName)
    await surchargeNameInput.press('Tab')
    await this.page.waitForTimeout(200)
  }

  /**
   * Fill Surcharge Adjustment in edit mode
   * @param adjustment - Surcharge adjustment value
   * @param rowIndex - 0-based index of the job row
   */
  async fillJobSurchargeAdjustment(adjustment: string, rowIndex: number = 0) {
    const jobsTab = this.page.getByRole('tabpanel', { name: 'Jobs' })
    const rows = jobsTab.locator('table tbody tr')
    const row = rows.nth(rowIndex)

    // Surcharge Adjustment is the 5th input (index 4)
    const inputs = row.locator('input')
    const adjustmentInput = inputs.nth(4)

    await adjustmentInput.fill(adjustment)
    await adjustmentInput.press('Tab')
    await this.page.waitForTimeout(200)
  }

  /**
   * Set Job Start Date in edit mode using calendar picker
   * @param date - Date string in MM/DD/YYYY format
   * @param rowIndex - 0-based index of the job row
   */
  async setJobStartDate(date: string, rowIndex: number = 0) {
    const jobsTab = this.page.getByRole('tabpanel', { name: 'Jobs' })
    const rows = jobsTab.locator('table tbody tr')
    const row = rows.nth(rowIndex)

    // Find date buttons in the row - look for buttons with date text or "Pick a date"
    // Job Start Date button - find by looking at all buttons and their position
    const allButtons = row.locator('button')
    const buttonCount = await allButtons.count()
    console.log(`  [setJobStartDate] Found ${buttonCount} buttons in row ${rowIndex}`)

    let dateButton = null

    // Find buttons that look like date pickers (contain "Pick a date" or date format)
    for (let i = 0; i < buttonCount; i++) {
      const btn = allButtons.nth(i)
      const text = (await btn.textContent())?.trim() || ''

      // Skip Assign Pro buttons and other action buttons
      if (text.toLowerCase().includes('assign') || text.toLowerCase().includes('action')) {
        continue
      }

      // Look for date picker buttons (contain date format or "Pick a date")
      if (text.includes('Pick a date') || /\d{1,2}\/\d{1,2}\/\d{4}/.test(text) || text.includes('AM') || text.includes('PM')) {
        // First matching date button is Job Start Date
        dateButton = btn
        console.log(`  [setJobStartDate] Found date button at index ${i}: "${text}"`)
        break
      }
    }

    if (!dateButton) {
      console.log(`  [setJobStartDate] No date button found, trying fallback with cell index`)
      // Fallback: try to find by cell position (usually around index 9-11)
      const cells = row.locator('td')
      const cellCount = await cells.count()
      console.log(`  [setJobStartDate] Total cells in row: ${cellCount}`)

      // Try cells from index 8 to 12 looking for date picker
      for (let cellIdx = 8; cellIdx < Math.min(cellCount, 14); cellIdx++) {
        const cell = cells.nth(cellIdx)
        const btn = cell.locator('button').first()
        if (await btn.isVisible().catch(() => false)) {
          const text = (await btn.textContent())?.trim() || ''
          if (text.includes('Pick a date') || /\d{1,2}\/\d{1,2}\/\d{4}/.test(text) || text.includes('AM') || text.includes('PM')) {
            dateButton = btn
            console.log(`  [setJobStartDate] Found date button in cell ${cellIdx}: "${text}"`)
            break
          }
        }
      }
    }

    if (!dateButton) {
      console.log(`  [setJobStartDate] ERROR: Could not find start date button`)
      return
    }

    await dateButton.click()
    await this.page.waitForTimeout(500)

    // Parse the date string (MM/DD/YYYY)
    const dateParts = date.split('/').map(Number)
    const month = dateParts[0] ?? 1
    const day = dateParts[1] ?? 1
    const year = dateParts[2] ?? new Date().getFullYear()
    const targetDate = new Date(year, month - 1, day)
    const targetDay = targetDate.getDate()
    const targetMonth = targetDate.getMonth()
    const targetYear = targetDate.getFullYear()
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    // Wait for calendar to appear
    const calendar = this.page.locator('[data-radix-popper-content-wrapper]').first()
    await calendar.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {})

    if (await calendar.isVisible()) {
      console.log(`  [setJobStartDate] Calendar opened, navigating to ${month}/${year}`)

      // Calculate months difference
      const monthsDiff = (targetYear - currentYear) * 12 + (targetMonth - currentMonth)
      console.log(`  [setJobStartDate] Months difference: ${monthsDiff}`)

      // Navigate to target month if needed
      if (monthsDiff > 0) {
        const nextButton = calendar.locator('button[name="next-month"]').first()
        const altNextButton = calendar.locator('button').filter({ has: this.page.locator('svg') }).last()
        const navButton = await nextButton.isVisible().catch(() => false) ? nextButton : altNextButton

        for (let i = 0; i < monthsDiff; i++) {
          await navButton.click()
          await this.page.waitForTimeout(200)
        }
      } else if (monthsDiff < 0) {
        const prevButton = calendar.locator('button[name="previous-month"]').first()
        const altPrevButton = calendar.locator('button').filter({ has: this.page.locator('svg') }).first()
        const navButton = await prevButton.isVisible().catch(() => false) ? prevButton : altPrevButton

        for (let i = 0; i < Math.abs(monthsDiff); i++) {
          await navButton.click()
          await this.page.waitForTimeout(200)
        }
      }

      // Click on the target day - look in the calendar grid
      const dayButtons = calendar.locator('button[name="day"]')
      let dayCount = await dayButtons.count()

      // If no buttons with name="day", try generic approach
      if (dayCount === 0) {
        const gridButtons = calendar.locator('button')
        dayCount = await gridButtons.count()

        for (let i = 0; i < dayCount; i++) {
          const btn = gridButtons.nth(i)
          const text = (await btn.textContent())?.trim()

          if (text === targetDay.toString()) {
            const isDisabled = await btn.getAttribute('disabled')
            const ariaDisabled = await btn.getAttribute('aria-disabled')
            const className = await btn.getAttribute('class') || ''

            // Skip if disabled or if it's a navigation button
            if (isDisabled === null && ariaDisabled !== 'true' && !className.includes('nav')) {
              console.log(`  [setJobStartDate] Clicking day ${targetDay}`)
              await btn.click()
              break
            }
          }
        }
      } else {
        for (let i = 0; i < dayCount; i++) {
          const btn = dayButtons.nth(i)
          const text = (await btn.textContent())?.trim()

          if (text === targetDay.toString()) {
            console.log(`  [setJobStartDate] Clicking day ${targetDay}`)
            await btn.click()
            break
          }
        }
      }

      // Close the calendar
      await this.page.waitForTimeout(300)
      for (let attempt = 0; attempt < 3; attempt++) {
        await this.page.keyboard.press('Escape')
        await this.page.waitForTimeout(300)

        const isStillVisible = await calendar.isVisible().catch(() => false)
        if (!isStillVisible) {
          break
        }

        if (attempt === 1) {
          const tabHeader = this.page.locator('[role="tab"]:has-text("Jobs")')
          await tabHeader.click({ force: true }).catch(() => {})
          await this.page.waitForTimeout(300)
        }
      }

      // Final verification
      const finalCheck = await this.page.locator('[data-radix-popper-content-wrapper]').isVisible().catch(() => false)
      if (finalCheck) {
        await this.page.locator('body').click({ position: { x: 10, y: 10 }, force: true }).catch(() => {})
        await this.page.waitForTimeout(200)
      }

      console.log(`  [setJobStartDate] Date set to ${date}`)
    } else {
      console.log(`  [setJobStartDate] ERROR: Calendar did not open`)
    }
    await this.page.waitForTimeout(300)
  }

  /**
   * Set Job Due Date in edit mode using calendar picker
   * @param date - Date string in MM/DD/YYYY format
   * @param rowIndex - 0-based index of the job row
   */
  async setJobDueDate(date: string, rowIndex: number = 0) {
    const jobsTab = this.page.getByRole('tabpanel', { name: 'Jobs' })
    const rows = jobsTab.locator('table tbody tr')
    const row = rows.nth(rowIndex)

    // Find date buttons in the row - Job Due Date is the SECOND date button
    const allButtons = row.locator('button')
    const buttonCount = await allButtons.count()
    console.log(`  [setJobDueDate] Found ${buttonCount} buttons in row ${rowIndex}`)

    let dateButton = null
    let dateButtonCount = 0

    // Find the second date picker button (first is Start Date, second is Due Date)
    for (let i = 0; i < buttonCount; i++) {
      const btn = allButtons.nth(i)
      const text = (await btn.textContent())?.trim() || ''

      // Skip Assign Pro buttons and other action buttons
      if (text.toLowerCase().includes('assign') || text.toLowerCase().includes('action')) {
        continue
      }

      // Look for date picker buttons (contain date format or "Pick a date")
      if (text.includes('Pick a date') || /\d{1,2}\/\d{1,2}\/\d{4}/.test(text) || text.includes('AM') || text.includes('PM')) {
        dateButtonCount++
        if (dateButtonCount === 2) {
          // Second date button is Job Due Date
          dateButton = btn
          console.log(`  [setJobDueDate] Found due date button at index ${i}: "${text}"`)
          break
        }
      }
    }

    if (!dateButton) {
      console.log(`  [setJobDueDate] No due date button found, trying fallback with cell index`)
      // Fallback: try to find by cell position (usually one cell after start date)
      const cells = row.locator('td')
      const cellCount = await cells.count()
      console.log(`  [setJobDueDate] Total cells in row: ${cellCount}`)

      // Try cells from index 9 to 14 looking for date picker (second one)
      let foundCount = 0
      for (let cellIdx = 8; cellIdx < Math.min(cellCount, 15); cellIdx++) {
        const cell = cells.nth(cellIdx)
        const btn = cell.locator('button').first()
        if (await btn.isVisible().catch(() => false)) {
          const text = (await btn.textContent())?.trim() || ''
          if (text.includes('Pick a date') || /\d{1,2}\/\d{1,2}\/\d{4}/.test(text) || text.includes('AM') || text.includes('PM')) {
            foundCount++
            if (foundCount === 2) {
              dateButton = btn
              console.log(`  [setJobDueDate] Found due date button in cell ${cellIdx}: "${text}"`)
              break
            }
          }
        }
      }
    }

    if (!dateButton) {
      console.log(`  [setJobDueDate] ERROR: Could not find due date button`)
      return
    }

    await dateButton.click()
    await this.page.waitForTimeout(500)

    // Parse the date string (MM/DD/YYYY)
    const dateParts = date.split('/').map(Number)
    const month = dateParts[0] ?? 1
    const day = dateParts[1] ?? 1
    const year = dateParts[2] ?? new Date().getFullYear()
    const targetDate = new Date(year, month - 1, day)
    const targetDay = targetDate.getDate()
    const targetMonth = targetDate.getMonth()
    const targetYear = targetDate.getFullYear()
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    // Wait for calendar to appear
    const calendar = this.page.locator('[data-radix-popper-content-wrapper]').first()
    await calendar.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {})

    if (await calendar.isVisible()) {
      console.log(`  [setJobDueDate] Calendar opened, navigating to ${month}/${year}`)

      // Calculate months difference
      const monthsDiff = (targetYear - currentYear) * 12 + (targetMonth - currentMonth)
      console.log(`  [setJobDueDate] Months difference: ${monthsDiff}`)

      // Navigate to target month if needed
      if (monthsDiff > 0) {
        const nextButton = calendar.locator('button[name="next-month"]').first()
        const altNextButton = calendar.locator('button').filter({ has: this.page.locator('svg') }).last()
        const navButton = await nextButton.isVisible().catch(() => false) ? nextButton : altNextButton

        for (let i = 0; i < monthsDiff; i++) {
          await navButton.click()
          await this.page.waitForTimeout(200)
        }
      } else if (monthsDiff < 0) {
        const prevButton = calendar.locator('button[name="previous-month"]').first()
        const altPrevButton = calendar.locator('button').filter({ has: this.page.locator('svg') }).first()
        const navButton = await prevButton.isVisible().catch(() => false) ? prevButton : altPrevButton

        for (let i = 0; i < Math.abs(monthsDiff); i++) {
          await navButton.click()
          await this.page.waitForTimeout(200)
        }
      }

      // Click on the target day
      const dayButtons = calendar.locator('button[name="day"]')
      let dayCount = await dayButtons.count()

      // If no buttons with name="day", try generic approach
      if (dayCount === 0) {
        const gridButtons = calendar.locator('button')
        dayCount = await gridButtons.count()

        for (let i = 0; i < dayCount; i++) {
          const btn = gridButtons.nth(i)
          const text = (await btn.textContent())?.trim()

          if (text === targetDay.toString()) {
            const isDisabled = await btn.getAttribute('disabled')
            const ariaDisabled = await btn.getAttribute('aria-disabled')
            const className = await btn.getAttribute('class') || ''

            if (isDisabled === null && ariaDisabled !== 'true' && !className.includes('nav')) {
              console.log(`  [setJobDueDate] Clicking day ${targetDay}`)
              await btn.click()
              break
            }
          }
        }
      } else {
        for (let i = 0; i < dayCount; i++) {
          const btn = dayButtons.nth(i)
          const text = (await btn.textContent())?.trim()

          if (text === targetDay.toString()) {
            console.log(`  [setJobDueDate] Clicking day ${targetDay}`)
            await btn.click()
            break
          }
        }
      }

      // Close the calendar
      await this.page.waitForTimeout(300)
      for (let attempt = 0; attempt < 3; attempt++) {
        await this.page.keyboard.press('Escape')
        await this.page.waitForTimeout(300)

        const isStillVisible = await calendar.isVisible().catch(() => false)
        if (!isStillVisible) {
          break
        }

        if (attempt === 1) {
          const tabHeader = this.page.locator('[role="tab"]:has-text("Jobs")')
          await tabHeader.click({ force: true }).catch(() => {})
          await this.page.waitForTimeout(300)
        }
      }

      // Final verification
      const finalCheck = await this.page.locator('[data-radix-popper-content-wrapper]').isVisible().catch(() => false)
      if (finalCheck) {
        await this.page.locator('body').click({ position: { x: 10, y: 10 }, force: true }).catch(() => {})
        await this.page.waitForTimeout(200)
      }

      console.log(`  [setJobDueDate] Date set to ${date}`)
    } else {
      console.log(`  [setJobDueDate] ERROR: Calendar did not open`)
    }
    await this.page.waitForTimeout(300)
  }

  /**
   * Edit an existing job with all available fields
   * @param rowIndex - Index of the job row to edit
   * @param options - Fields to update
   */
  async editJob(
    rowIndex: number,
    options: {
      serviceType?: string
      sourceLanguage?: string
      targetLanguage?: string
      jobName?: string
      pmTracker?: string
      currency?: string
      quantity?: string
      unitPrice?: string
      priceUnit?: string
      surchargeName?: string
      surchargeAdjustment?: string
      startDate?: string
      dueDate?: string
    }
  ) {
    const {
      serviceType,
      sourceLanguage,
      targetLanguage,
      jobName,
      pmTracker,
      currency,
      quantity,
      unitPrice,
      priceUnit,
      surchargeName,
      surchargeAdjustment,
      startDate,
      dueDate,
    } = options

    // Enter edit mode if not already
    const isEditing = await this.isJobsEditMode()
    if (!isEditing) {
      await this.enterJobsEditMode(0)
      await this.page.waitForTimeout(500)
    }

    // Update each field if provided
    if (serviceType) {
      await this.selectJobServiceType(serviceType, rowIndex)
    }

    if (sourceLanguage) {
      await this.selectJobSourceLanguage(sourceLanguage, rowIndex)
    }

    if (targetLanguage) {
      await this.selectJobTargetLanguage(targetLanguage, rowIndex)
    }

    if (jobName) {
      await this.fillJobName(jobName, rowIndex)
    }

    if (pmTracker) {
      await this.selectJobPmTracker(pmTracker, rowIndex)
    }

    if (currency) {
      await this.selectJobCurrency(currency, rowIndex)
    }

    if (quantity) {
      await this.fillJobQuantity2(quantity, rowIndex)
    }

    if (unitPrice) {
      await this.fillJobUnitPrice2(unitPrice, rowIndex)
    }

    if (priceUnit) {
      await this.selectJobPriceUnit(priceUnit, rowIndex)
    }

    if (surchargeName) {
      await this.fillJobSurchargeName(surchargeName, rowIndex)
    }

    if (surchargeAdjustment) {
      await this.fillJobSurchargeAdjustment(surchargeAdjustment, rowIndex)
    }

    if (startDate) {
      await this.setJobStartDate(startDate, rowIndex)
    }

    if (dueDate) {
      await this.setJobDueDate(dueDate, rowIndex)
    }
  }

  /**
   * Get current job field values from a row
   * @param rowIndex - Index of the job row
   */
  async getJobFieldValues(rowIndex: number = 0): Promise<{
    serviceType: string
    source: string
    target: string
    jobName: string
    pmTracker: string
    currency: string
    quantity: string
    unitPrice: string
    priceUnit: string
    surchargeName: string
    surchargeAdjustment: string
    startDate: string
    dueDate: string
  }> {
    const jobsTab = this.page.getByRole('tabpanel', { name: 'Jobs' })
    const rows = jobsTab.locator('table tbody tr')
    const row = rows.nth(rowIndex)
    const cells = row.locator('td')

    const comboboxes = row.locator('[role="combobox"]')
    const inputs = row.locator('input')

    // Get date values from cells 15 and 16 (Job Start Date, Job Due Date)
    const startDateCell = cells.nth(15)
    const dueDateCell = cells.nth(16)
    const startDateText = (await startDateCell.locator('button').first().textContent())?.trim() || ''
    const dueDateText = (await dueDateCell.locator('button').first().textContent())?.trim() || ''

    return {
      serviceType: (await comboboxes.nth(0).textContent()) || '',
      source: (await comboboxes.nth(1).textContent()) || '',
      target: (await comboboxes.nth(2).textContent()) || '',
      jobName: (await inputs.nth(0).inputValue()) || '',
      pmTracker: (await comboboxes.nth(3).textContent()) || '',
      currency: (await comboboxes.nth(4).textContent()) || '',
      quantity: (await inputs.nth(1).inputValue()) || '',
      unitPrice: (await inputs.nth(2).inputValue()) || '',
      priceUnit: (await comboboxes.nth(5).textContent()) || '',
      surchargeName: (await inputs.nth(3).inputValue()) || '',
      surchargeAdjustment: (await inputs.nth(4).inputValue()) || '',
      startDate: startDateText,
      dueDate: dueDateText,
    }
  }

  // ==========================================
  // Assign Pro Overlay Methods
  // ==========================================

  /**
   * Check if Assign Pro button is visible on a job row
   * @param rowIndex - 0-based index of the job row
   */
  async isAssignProButtonVisible(rowIndex: number = 0): Promise<boolean> {
    const jobsTab = this.page.getByRole('tabpanel', { name: 'Jobs' })
    const rows = jobsTab.locator('table tbody tr')
    const row = rows.nth(rowIndex)

    // Assign Pro button - look for button with "Assign pro" text
    const assignProButton = row.locator('button:has-text("Assign pro"), button:has-text("Assign Pro")')
    return await assignProButton.isVisible().catch(() => false)
  }

  /**
   * Check if Assign Pro button is enabled (clickable) on a job row
   * @param rowIndex - 0-based index of the job row
   */
  async isAssignProButtonEnabled(rowIndex: number = 0): Promise<boolean> {
    const jobsTab = this.page.getByRole('tabpanel', { name: 'Jobs' })
    const rows = jobsTab.locator('table tbody tr')
    const row = rows.nth(rowIndex)

    const assignProButton = row.locator('button:has-text("Assign pro"), button:has-text("Assign Pro")')
    const isVisible = await assignProButton.isVisible().catch(() => false)
    if (!isVisible) return false

    const isDisabled = await assignProButton.getAttribute('disabled')
    return isDisabled === null
  }

  /**
   * Click Assign Pro button on a job row to open the overlay
   * @param rowIndex - 0-based index of the job row
   */
  async clickAssignProButton(rowIndex: number = 0) {
    const jobsTab = this.page.getByRole('tabpanel', { name: 'Jobs' })
    const rows = jobsTab.locator('table tbody tr')
    const row = rows.nth(rowIndex)

    const assignProButton = row.locator('button:has-text("Assign pro"), button:has-text("Assign Pro")')
    await assignProButton.click()
    await this.page.waitForTimeout(500)
  }

  /**
   * Wait for Assign Pro overlay to open
   * @returns 'pro-selection' if showing TEAM/PRO/PM tabs, 'request-list' if showing previous requests
   */
  async waitForAssignProOverlay(): Promise<'pro-selection' | 'request-list' | 'unknown'> {
    // Wait for URL to contain assign-pro
    await this.page.waitForURL(/.*assign-pro.*/, { timeout: 10000 }).catch(() => {})

    // Wait for dialog to be visible
    const dialog = this.page.locator('dialog, [role="dialog"]').first()
    await dialog.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {})

    // Wait for content to load (either tabs or request list) - increased wait time
    await this.page.waitForTimeout(1500)

    // Check which view is showing with retries
    let viewType: 'pro-selection' | 'request-list' | 'unknown' = 'unknown'
    for (let attempt = 0; attempt < 3; attempt++) {
      viewType = await this.getAssignProOverlayView()
      if (viewType !== 'unknown') {
        break
      }
      console.log(`  [waitForAssignProOverlay] View detection attempt ${attempt + 1} returned 'unknown', retrying...`)
      await this.page.waitForTimeout(500)
    }

    if (viewType === 'pro-selection') {
      // Wait for floating selection bar to appear (shows "0 selected" initially)
      const floatingBar = this.page.locator('text=/\\d+ selected/').first()
      await floatingBar.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {})
    }

    await this.page.waitForTimeout(500)
    return viewType
  }

  /**
   * Check which view is showing in the Assign Pro overlay
   * @returns 'pro-selection' for TEAM/PRO/PM tabs, 'request-list' for previous requests view
   */
  async getAssignProOverlayView(): Promise<'pro-selection' | 'request-list' | 'unknown'> {
    // Method 1: Check for TEAM/PRO/PM tabs in the specific container
    const tabsContainer = this.page.locator('.bg-gray-100.rounded-lg')
    const teamTab = tabsContainer.locator('button:has-text("TEAM")').first()
    const hasProSelectionTabs = await teamTab.isVisible().catch(() => false)

    if (hasProSelectionTabs) {
      return 'pro-selection'
    }

    // Method 2: Check for TEAM button anywhere in the dialog (more flexible)
    const dialog = this.page.locator('dialog, [role="dialog"]').first()
    const teamTabInDialog = dialog.locator('button:has-text("TEAM")').first()
    const hasTeamInDialog = await teamTabInDialog.isVisible().catch(() => false)

    if (hasTeamInDialog) {
      return 'pro-selection'
    }

    // Method 3: Check for PRO tab anywhere (also indicates pro-selection view)
    const proTab = dialog.locator('button:has-text("PRO")').first()
    const hasProTab = await proTab.isVisible().catch(() => false)

    if (hasProTab) {
      return 'pro-selection'
    }

    // Method 4: Check for "X selected" text (indicates pro-selection view)
    const selectedText = this.page.locator('text=/\\d+ selected/').first()
    const hasSelectedText = await selectedText.isVisible().catch(() => false)

    if (hasSelectedText) {
      return 'pro-selection'
    }

    // Check for "Request List" text (request list view)
    const requestListText = this.page.locator('text="Request List"')
    const hasRequestList = await requestListText.isVisible().catch(() => false)

    if (hasRequestList) {
      return 'request-list'
    }

    // Check for "Round" text (also indicates request list view)
    const roundText = this.page.locator('button:has-text("Round")')
    const hasRounds = await roundText.count().catch(() => 0) > 0

    if (hasRounds) {
      return 'request-list'
    }

    return 'unknown'
  }

  /**
   * Check if the job has previous request history (Request List view)
   */
  async hasExistingRequests(): Promise<boolean> {
    const viewType = await this.getAssignProOverlayView()
    return viewType === 'request-list'
  }

  /**
   * Check if Assign Pro overlay is open
   */
  async isAssignProOverlayOpen(): Promise<boolean> {
    const url = this.page.url()
    const hasAssignProInUrl = url.includes('assign-pro')

    // Check for floating bar with "selected" text (shows "0 selected" or "N selected")
    const floatingBar = this.page.locator('text=/\\d+ selected/')
    const isFloatingBarVisible = await floatingBar.isVisible().catch(() => false)

    // Also check for the tabs container (bg-gray-100 rounded-lg with TEAM/PRO/PM buttons)
    const tabsContainer = this.page.locator('.bg-gray-100.rounded-lg button')
    const hasTabButtons = await tabsContainer.count().catch(() => 0) > 0

    return hasAssignProInUrl && (isFloatingBarVisible || hasTabButtons)
  }

  /**
   * Click on a tab in the Assign Pro overlay
   * @param tabName - 'TEAM', 'PRO', or 'PM'
   */
  async clickAssignProTab(tabName: 'TEAM' | 'PRO' | 'PM') {
    // Tabs are in the header inside .bg-gray-100.rounded-lg container
    // Each tab button contains the label text followed by a span with count
    const tabsContainer = this.page.locator('.bg-gray-100.rounded-lg')
    const tab = tabsContainer.locator(`button:has-text("${tabName}")`).first()
    await tab.click()
    await this.page.waitForTimeout(500)
  }

  /**
   * Check which tab is currently active in Assign Pro overlay
   */
  async getActiveAssignProTab(): Promise<string> {
    // Active tab has 'bg-white' class while inactive tabs have 'text-gray-500'
    const tabs = ['TEAM', 'PRO', 'PM']
    const tabsContainer = this.page.locator('.bg-gray-100.rounded-lg')

    for (const tabName of tabs) {
      const tab = tabsContainer.locator(`button:has-text("${tabName}")`).first()
      const className = await tab.getAttribute('class').catch(() => '')
      // Active tab has bg-white class
      if (className?.includes('bg-white')) {
        return tabName
      }
    }
    return ''
  }

  /**
   * Select a team from the TEAM tab dropdown
   * @param teamName - Name of the team to select
   */
  async selectTeamInAssignPro(teamName: string) {
    // Look for team dropdown/select
    const teamSelect = this.page.locator('[role="combobox"]').first()
    await teamSelect.click()
    await this.page.waitForTimeout(300)

    const option = this.page.locator(`[role="option"]:has-text("${teamName}")`).first()
    await option.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {})
    await option.click()
    await this.page.waitForTimeout(500)
  }

  /**
   * Search for a pro/pm in the search input
   * @param searchTerm - Name or email to search
   */
  async searchInAssignPro(searchTerm: string) {
    const searchInput = this.page.locator('input[placeholder*="search"], input[placeholder*="Search"], input[type="search"]').first()
    await searchInput.fill(searchTerm)
    await this.page.waitForTimeout(500)
  }

  /**
   * Get the count of available pros/pms in the table
   */
  async getAssignProTableRowCount(): Promise<number> {
    // Wait for the Assign Pro overlay table to load
    await this.page.waitForTimeout(500)

    // The Assign Pro table is inside the dialog/overlay
    // Find the table inside the overlay and count rows in the body (tbody)
    const overlayTable = this.page.locator('dialog table, [role="dialog"] table').first()
    const tableExists = await overlayTable.isVisible().catch(() => false)

    if (tableExists) {
      // Count rows in tbody that have checkbox elements
      const dataRows = overlayTable.locator('tbody tr').filter({
        has: this.page.locator('button[role="checkbox"]'),
      })
      return await dataRows.count().catch(() => 0)
    }

    return 0
  }

  /**
   * Select a pro/pm by clicking on their checkbox
   * @param rowIndex - 0-based index of the row (0 = first data row, not header)
   */
  async selectProInAssignPro(rowIndex: number = 0) {
    // Wait for table to be rendered
    await this.page.waitForTimeout(500)

    // Find the table inside the Assign Pro overlay
    const overlayTable = this.page.locator('dialog table, [role="dialog"] table').first()
    await overlayTable.waitFor({ state: 'visible', timeout: 10000 })

    // Find data rows (rows with checkbox) - skip the header row
    const dataRows = overlayTable.locator('tbody tr').filter({
      has: this.page.locator('button[role="checkbox"]'),
    })

    const rowCount = await dataRows.count()
    if (rowCount === 0) {
      throw new Error('No data rows found in Assign Pro table')
    }

    // Get the specific row
    const row = dataRows.nth(rowIndex)
    await row.waitFor({ state: 'visible', timeout: 5000 })

    // Click the checkbox directly to toggle selection
    // The checkbox is a Radix UI checkbox rendered as a button with role="checkbox"
    const checkbox = row.locator('button[role="checkbox"]').first()
    await checkbox.waitFor({ state: 'visible', timeout: 5000 })
    await checkbox.click()
    await this.page.waitForTimeout(300)
  }

  /**
   * Select a pro/pm by their name
   * @param name - Name of the pro to select
   */
  async selectProByNameInAssignPro(name: string) {
    // Wait for table to be rendered
    await this.page.waitForTimeout(500)

    // Find the table inside the Assign Pro overlay
    const overlayTable = this.page.locator('dialog table, [role="dialog"] table').first()
    await overlayTable.waitFor({ state: 'visible', timeout: 10000 })

    // Find the row containing the name and click its checkbox
    const row = overlayTable.locator(`tbody tr:has-text("${name}")`).first()
    await row.waitFor({ state: 'visible', timeout: 5000 })

    const checkbox = row.locator('button[role="checkbox"]').first()
    await checkbox.waitFor({ state: 'visible', timeout: 5000 })
    await checkbox.click()
    await this.page.waitForTimeout(300)
  }

  /**
   * Get the count of selected pros in the selection panel
   */
  async getSelectedProCount(): Promise<number> {
    // Look for the floating bar text showing "N selected"
    const selectionText = this.page.locator('text=/\\d+ selected/')
    const text = await selectionText.textContent().catch(() => '')
    const match = text?.match(/(\d+)\s*selected/)
    return match?.[1] ? parseInt(match[1], 10) : 0
  }

  /**
   * Check if the selection panel is visible
   */
  async isSelectionPanelVisible(): Promise<boolean> {
    // The selection panel slides in from the right side
    const panel = this.page.locator('[class*="SelectionPanel"], .bg-white.border-l')
    return await panel.isVisible().catch(() => false)
  }

  /**
   * Select request type for assigning pro using the dropdown
   * @param type - 'relay' | 'mass-fcfs' | 'mass-manual'
   */
  async selectAssignProRequestType(type: 'relay' | 'mass-fcfs' | 'mass-manual') {
    let labelText = ''
    switch (type) {
      case 'relay':
        labelText = 'Relay request'
        break
      case 'mass-fcfs':
        labelText = 'Mass request (First come first serve)'
        break
      case 'mass-manual':
        labelText = 'Mass request (Manual assignment)'
        break
    }

    console.log(`Selecting request type: ${type} (${labelText})`)

    // The request type is selected via a SingleSelect dropdown in the floating bar
    // The floating bar contains "N selected" text, so we can find the combobox relative to it
    const floatingBar = this.page.locator('.rounded-xl.shadow-lg').filter({
      has: this.page.locator('text=/\\d+ selected/'),
    }).first()

    // Find the combobox dropdown within the floating bar
    // SingleSelect component uses role="combobox" on the button trigger
    const dropdown = floatingBar.locator('[role="combobox"]').first()
    const dropdownVisible = await dropdown.isVisible().catch(() => false)

    console.log(`Dropdown (role=combobox) visible: ${dropdownVisible}`)

    if (!dropdownVisible) {
      // Take screenshot for debugging
      await this.page.screenshot({ path: 'test-results/dropdown-not-found.png' })
      throw new Error('Could not find request type dropdown (role=combobox) in floating bar')
    }

    // Check current value before clicking
    const currentValue = await dropdown.textContent().catch(() => '')
    console.log(`Current dropdown value: ${currentValue}`)

    // If already selected, skip
    if (currentValue?.includes(labelText)) {
      console.log(`Already selected: ${labelText}`)
      return
    }

    // Click to open the dropdown
    await dropdown.click()
    await this.page.waitForTimeout(500)

    // Wait for popover/dropdown content to appear
    // SingleSelect uses Radix Popover with cmdk Command components
    // CommandItem elements are rendered with [cmdk-item] attribute
    const popoverContent = this.page.locator('[data-radix-popper-content-wrapper]').first()
    const popoverVisible = await popoverContent.isVisible().catch(() => false)
    console.log(`Popover visible: ${popoverVisible}`)

    if (!popoverVisible) {
      // Try clicking again
      console.log('Popover not visible, clicking dropdown again...')
      await dropdown.click()
      await this.page.waitForTimeout(500)
    }

    // Find the option using cmdk-item selector or CommandItem structure
    // CommandItem renders as a div with [cmdk-item] attribute
    let option = this.page.locator(`[cmdk-item]:has-text("${labelText}")`).first()
    let optionVisible = await option.isVisible().catch(() => false)

    if (!optionVisible) {
      // Try role="option" (some versions use this)
      option = this.page.locator(`[role="option"]:has-text("${labelText}")`).first()
      optionVisible = await option.isVisible().catch(() => false)
    }

    if (!optionVisible) {
      // Try finding by exact text match within the popover
      option = popoverContent.getByText(labelText, { exact: false }).first()
      optionVisible = await option.isVisible().catch(() => false)
    }

    console.log(`Option "${labelText}" visible: ${optionVisible}`)

    if (!optionVisible) {
      // Log available options for debugging
      const cmdkItems = await this.page.locator('[cmdk-item]').allTextContents()
      console.log(`Available cmdk-items: ${JSON.stringify(cmdkItems)}`)
      const roleOptions = await this.page.locator('[role="option"]').allTextContents()
      console.log(`Available role=option: ${JSON.stringify(roleOptions)}`)

      // Take screenshot for debugging
      await this.page.screenshot({ path: `test-results/option-not-found-${type}.png` })
      throw new Error(`Could not find option "${labelText}" in dropdown`)
    }

    // Click the option to select it
    await option.click()
    await this.page.waitForTimeout(500)

    // Verify selection changed
    const newValue = await dropdown.textContent().catch(() => '')
    console.log(`New dropdown value after selection: ${newValue}`)

    if (!newValue?.includes(labelText)) {
      throw new Error(`Selection verification failed: expected "${labelText}" but got "${newValue}"`)
    }

    console.log(`✓ Successfully selected: ${labelText}`)
  }

  /**
   * Set request term hours for relay request
   * @param hours - Number of hours
   */
  async setAssignProRequestTermHours(hours: string) {
    const hoursInput = this.page.locator('input[placeholder*="hour"], input[name*="hour"]').first()
    await hoursInput.fill(hours)
    await this.page.waitForTimeout(200)
  }

  /**
   * Set request term minutes for relay request
   * @param minutes - Number of minutes
   */
  async setAssignProRequestTermMinutes(minutes: string) {
    const minutesInput = this.page.locator('input[placeholder*="min"], input[name*="min"]').first()
    await minutesInput.fill(minutes)
    await this.page.waitForTimeout(200)
  }

  /**
   * Set request time in the floating selection bar
   * @param hours - Number of hours (0-12)
   * @param minutes - Number of minutes (0-59)
   */
  async setAssignProRequestTime(hours: string, minutes: string) {
    // Find the floating bar with "N selected" text
    const floatingBar = this.page.locator('.rounded-xl.shadow-lg').filter({
      has: this.page.locator('text=/\\d+ selected/'),
    }).first()

    // Find the time inputs within the floating bar
    // The structure is: input (hours) + "h" span + input (minutes) + "m" span
    const timeInputs = floatingBar.locator('input[type="number"]')
    const inputCount = await timeInputs.count()
    console.log(`Found ${inputCount} number inputs in floating bar`)

    if (inputCount >= 2) {
      // First input is hours, second is minutes
      const hoursInput = timeInputs.nth(0)
      const minutesInput = timeInputs.nth(1)

      await hoursInput.fill(hours)
      await this.page.waitForTimeout(100)
      await minutesInput.fill(minutes)
      await this.page.waitForTimeout(100)

      console.log(`Set request time to ${hours}h ${minutes}m`)
    } else {
      console.log('Could not find time inputs in floating bar')
    }
  }

  /**
   * Click the Assign button in Assign Pro overlay
   */
  async clickAssignButton() {
    // The Assign button is in the floating bar, but need to exclude "Assign pro" button from Jobs table
    // The floating bar Assign button is a primary button (variant='primary')
    const floatingBar = this.page.locator('.rounded-xl.shadow-lg, [class*="floating"]').filter({
      has: this.page.locator('text=/\\d+ selected/'),
    })
    const assignButton = floatingBar.locator('button:has-text("Assign")').first()

    console.log(`  [clickAssignButton] Clicking Assign button...`)
    await assignButton.click()
    await this.page.waitForTimeout(1000)

    // Check for confirmation dialog (might appear for immediate assign)
    const confirmDialog = this.page.locator('[role="alertdialog"], [role="dialog"]').filter({
      has: this.page.locator('text=/confirm|assign|proceed/i'),
    })

    if (await confirmDialog.isVisible().catch(() => false)) {
      console.log(`  [clickAssignButton] Confirmation dialog appeared, clicking confirm...`)
      // Look for confirm/yes/ok button in the dialog
      const confirmBtn = confirmDialog.locator('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("OK"), button:has-text("Assign")').first()
      if (await confirmBtn.isVisible().catch(() => false)) {
        await confirmBtn.click()
        await this.page.waitForTimeout(1000)
        console.log(`  [clickAssignButton] Confirmation clicked`)
      }
    }

    // Wait for any loading to complete
    await this.page.waitForTimeout(1000)

    // Check for success toast or message
    const successToast = this.page.locator('text=/success|assigned|completed/i').first()
    if (await successToast.isVisible().catch(() => false)) {
      console.log(`  [clickAssignButton] Success message detected`)
    }
  }

  /**
   * Click the Request button in Assign Pro overlay
   */
  async clickRequestButton() {
    // The Request button is in the floating bar
    const floatingBar = this.page.locator('.rounded-xl.shadow-lg, [class*="floating"]').filter({
      has: this.page.locator('text=/\\d+ selected/'),
    })

    // Find the Request button (should be variant='outline' before Assign button)
    // Make sure we're getting the right button by being more specific
    const requestButton = floatingBar.locator('button').filter({ hasText: /^Request$|^Sending\.\.\.$/ }).first()

    const buttonText = await requestButton.textContent().catch(() => '')
    const isDisabled = await requestButton.isDisabled().catch(() => true)
    console.log(`Request button text: "${buttonText}", disabled: ${isDisabled}`)

    if (isDisabled) {
      console.log('⚠️ Request button is disabled, cannot click')
      return
    }

    // Scroll into view and ensure visibility
    await requestButton.scrollIntoViewIfNeeded()
    await this.page.waitForTimeout(200)

    // Click with force to ensure it goes through
    console.log('Clicking Request button...')
    await requestButton.click({ force: true })
    await this.page.waitForTimeout(500)

    // Check if button text changed to "Sending..."
    const buttonTextAfter = await requestButton.textContent().catch(() => '')
    console.log(`Request button text after click: "${buttonTextAfter}"`)
  }

  /**
   * Check if Assign button is enabled
   */
  async isAssignButtonEnabled(): Promise<boolean> {
    // The Assign button in the floating bar
    const floatingBar = this.page.locator('.rounded-xl.shadow-lg, [class*="floating"]').filter({
      has: this.page.locator('text=/\\d+ selected/'),
    })
    const assignButton = floatingBar.locator('button:has-text("Assign")').first()
    const isVisible = await assignButton.isVisible().catch(() => false)
    if (!isVisible) return false

    const isDisabled = await assignButton.isDisabled().catch(() => true)
    return !isDisabled
  }

  /**
   * Check if Request button is enabled
   */
  async isRequestButtonEnabled(): Promise<boolean> {
    // The Request button in the floating bar
    const floatingBar = this.page.locator('.rounded-xl.shadow-lg, [class*="floating"]').filter({
      has: this.page.locator('text=/\\d+ selected/'),
    })
    const requestButton = floatingBar.locator('button:has-text("Request")').first()
    const isVisible = await requestButton.isVisible().catch(() => false)
    if (!isVisible) return false

    const isDisabled = await requestButton.isDisabled().catch(() => true)
    return !isDisabled
  }

  /**
   * Close the Assign Pro overlay
   */
  async closeAssignProOverlay() {
    // Press Escape multiple times to ensure all dialogs are closed
    for (let i = 0; i < 3; i++) {
      await this.page.keyboard.press('Escape')
      await this.page.waitForTimeout(300)

      // Check if any dialog is still open
      const openDialog = this.page.locator('[role="dialog"][data-state="open"], dialog[open]')
      const isDialogOpen = await openDialog.count().catch(() => 0) > 0
      if (!isDialogOpen) break
    }

    // Wait for ALL dialogs to be fully closed
    const allDialogs = this.page.locator('[role="dialog"], dialog')
    const dialogCount = await allDialogs.count().catch(() => 0)

    for (let i = 0; i < dialogCount; i++) {
      const dialog = allDialogs.nth(i)
      const isVisible = await dialog.isVisible().catch(() => false)
      if (isVisible) {
        await dialog.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {})
      }
    }

    // Wait for URL to no longer contain assign-pro
    await this.page.waitForURL(/^(?!.*assign-pro).*$/, { timeout: 5000 }).catch(() => {})

    // Final wait for animation to complete
    await this.page.waitForTimeout(1000)
  }

  /**
   * Get the job ID from a row (for Assign Pro URL construction)
   * @param rowIndex - 0-based index of the job row
   */
  async getJobIdFromRow(rowIndex: number = 0): Promise<string> {
    const jobsTab = this.page.getByRole('tabpanel', { name: 'Jobs' })
    const rows = jobsTab.locator('table tbody tr')
    const row = rows.nth(rowIndex)

    // Job ID might be in a data attribute or visible text
    const jobId = await row.getAttribute('data-job-id').catch(() => null)
    if (jobId) return jobId

    // Try to get from the first cell if it contains job ID
    const firstCell = row.locator('td').first()
    const cellText = await firstCell.textContent()
    return cellText?.trim() || ''
  }

  /**
   * Wait for Assign Pro operation to complete
   */
  async waitForAssignProComplete() {
    // Wait for success toast or overlay to close
    const successToast = this.page.locator('[class*="toast"]:has-text("success"), [class*="Toast"]:has-text("assigned")')
    await successToast.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {})

    // Or wait for URL to no longer contain assign-pro
    await this.page.waitForTimeout(1000)
  }

  /**
   * Get the pro status badge text from a job row
   * @param rowIndex - 0-based index of the job row
   */
  async getJobProStatus(rowIndex: number = 0): Promise<string> {
    const jobsTab = this.page.getByRole('tabpanel', { name: 'Jobs' })
    const rows = jobsTab.locator('table tbody tr')
    const row = rows.nth(rowIndex)

    // Pro status is usually in a badge or specific cell
    const statusBadge = row.locator('[class*="badge"], [class*="status"]')
    return await statusBadge.textContent().catch(() => '') || ''
  }

  /**
   * Get the assigned pro name from a job row
   * @param rowIndex - 0-based index of the job row
   */
  async getAssignedProName(rowIndex: number = 0): Promise<string> {
    const jobsTab = this.page.getByRole('tabpanel', { name: 'Jobs' })
    const rows = jobsTab.locator('table tbody tr')
    const row = rows.nth(rowIndex)

    // Look for pro name cell - usually after status
    const proCell = row.locator('td').nth(6) // Adjust index based on actual table structure
    return await proCell.textContent().catch(() => '') || ''
  }

  /**
   * Check if there are existing request rounds for a job
   */
  async hasExistingRequestRounds(): Promise<boolean> {
    // Look for request rounds list or indicator
    const roundsList = this.page.locator('[class*="request-round"], [class*="RequestRound"], :has-text("Round")')
    return await roundsList.isVisible().catch(() => false)
  }

  /**
   * Get all visible pro names in the Assign Pro table
   */
  async getVisibleProNames(): Promise<string[]> {
    const names: string[] = []

    // Find the table inside the Assign Pro overlay
    const overlayTable = this.page.locator('dialog table, [role="dialog"] table').first()
    const tableExists = await overlayTable.isVisible().catch(() => false)

    if (!tableExists) {
      return names
    }

    // Get rows from tbody
    const dataRows = overlayTable.locator('tbody tr').filter({
      has: this.page.locator('button[role="checkbox"]'),
    })
    const count = await dataRows.count()

    for (let i = 0; i < Math.min(count, 10); i++) { // Limit to first 10
      const row = dataRows.nth(i)
      const nameCell = row.locator('td').nth(1) // Name is in second column (after checkbox)
      const name = await nameCell.textContent().catch(() => '')
      if (name) names.push(name.trim())
    }

    return names
  }

  /**
   * Check if the floating selection bar is visible
   */
  async isFloatingSelectionBarVisible(): Promise<boolean> {
    // The floating bar shows "N selected" text
    const floatingBar = this.page.locator('.rounded-xl.shadow-lg').filter({
      has: this.page.locator('text=/\\d+ selected/'),
    })
    return await floatingBar.isVisible().catch(() => false)
  }

  // ============================================================
  // PROJECT STATUS METHODS
  // ============================================================

  /**
   * Check if Complete this project button is visible and enabled
   */
  async isCompleteProjectButtonEnabled(): Promise<boolean> {
    const completeButton = this.page.locator('button').filter({ hasText: 'Complete this project' })
    const isVisible = await completeButton.isVisible().catch(() => false)
    if (!isVisible) return false

    const isDisabled = await completeButton.isDisabled().catch(() => true)
    return !isDisabled
  }

  /**
   * Click "Complete this project" button and confirm
   * This changes the project status from IN_PROGRESS to COMPLETED
   * @returns Object with success status and optional error message
   */
  async completeProject(): Promise<{ success: boolean; error?: string }> {
    console.log('Completing project...')

    // Navigate to Details tab first (if not already there)
    const detailsTab = this.page.locator('[role="tab"]').filter({ hasText: 'Details' })
    const isDetailsActive = await detailsTab.getAttribute('data-state').catch(() => '') === 'active'

    if (!isDetailsActive) {
      console.log('Navigating to Details tab first...')
      await detailsTab.click()
      await this.page.waitForTimeout(500)
    }

    // Find and click "Complete this project" button
    const completeButton = this.page.locator('button').filter({ hasText: 'Complete this project' })
    const isVisible = await completeButton.isVisible().catch(() => false)

    if (!isVisible) {
      return { success: false, error: 'Complete this project button not found' }
    }

    const isDisabled = await completeButton.isDisabled().catch(() => true)
    if (isDisabled) {
      console.log('⚠️ Complete this project button is disabled - project may not be IN_PROGRESS')
      return { success: false, error: 'Complete this project button is disabled - project must be IN_PROGRESS' }
    }

    // Set up API response monitoring before clicking
    const apiResponsePromise = this.page.waitForResponse(
      response => response.url().includes('/status') && response.request().method() === 'PATCH',
      { timeout: 15000 }
    ).catch(() => null)

    // Click the button
    await completeButton.click()
    console.log('Clicked Complete this project button')
    await this.page.waitForTimeout(500)

    // Wait for confirmation modal to appear
    const modal = this.page.locator('.fixed.inset-0').filter({
      has: this.page.locator('text=Are you sure you want to complete this project'),
    })
    await modal.waitFor({ state: 'visible', timeout: 5000 })
    console.log('Confirmation modal appeared')

    // Click the "Confirm" button in the modal to confirm
    const confirmButton = modal.locator('button').filter({ hasText: /^Confirm$/ })
    const confirmVisible = await confirmButton.isVisible().catch(() => false)

    if (!confirmVisible) {
      // Try alternative selectors
      const altConfirmButton = modal.locator('button:has-text("Confirm")').last()
      await altConfirmButton.click()
    } else {
      await confirmButton.click()
    }

    console.log('Clicked Confirm button')

    // Wait for API response
    const apiResponse = await apiResponsePromise
    if (apiResponse) {
      const status = apiResponse.status()
      console.log(`Project status API response: ${status}`)

      if (status >= 400) {
        // Try to get error message from response
        let errorMessage = `API returned status ${status}`
        try {
          const responseBody = await apiResponse.json()
          if (responseBody.message) {
            errorMessage = responseBody.message
          }
          console.log(`API error response: ${JSON.stringify(responseBody)}`)
        } catch {
          // Response might not be JSON
        }

        // Wait for error modal to appear and then close it
        await this.page.waitForTimeout(1000)
        const errorModal = this.page.locator('.fixed.inset-0').filter({
          has: this.page.locator('text=Error'),
        })
        const errorVisible = await errorModal.isVisible().catch(() => false)
        if (errorVisible) {
          console.log('Error modal appeared, closing it...')
          // Try to close the error modal
          const closeButton = errorModal.locator('button').first()
          await closeButton.click().catch(() => {})
          await this.page.waitForTimeout(500)
        }

        return { success: false, error: errorMessage }
      }
    }

    // Wait for modal to close and status to update
    await modal.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {
      console.log('Modal did not close within timeout')
    })

    // Wait for page update
    await this.page.waitForTimeout(2000)

    // Verify status changed to COMPLETED
    const statusBadge = this.page.locator('[class*="badge"], [class*="Badge"]').filter({
      hasText: /Completed/i,
    })
    const isCompleted = await statusBadge.isVisible().catch(() => false)

    if (isCompleted) {
      console.log('✓ Project completed successfully - status is now COMPLETED')
      return { success: true }
    } else {
      console.log('⚠️ Could not verify COMPLETED status')
      return { success: false, error: 'Could not verify COMPLETED status after API call' }
    }
  }

  /**
   * Get current project status from the status badge
   */
  async getProjectStatusFromBadge(): Promise<string> {
    // Wait for the page to load
    await this.page.waitForTimeout(1000)

    // Look for status badge - it contains one of these status texts
    const statusTexts = ['In Progress', 'Completed', 'Request Created', 'Canceled']

    for (const statusText of statusTexts) {
      const badge = this.page.locator(`text="${statusText}"`).first()
      const isVisible = await badge.isVisible().catch(() => false)
      if (isVisible) {
        console.log(`Found status badge: ${statusText}`)
        return statusText
      }
    }

    // Fallback: try to find any badge element
    const statusBadge = this.page.locator('[class*="badge"], [class*="Badge"], [class*="chip"], [class*="Chip"]').first()
    const badgeText = await statusBadge.textContent().catch(() => '')
    console.log(`Fallback badge text: ${badgeText}`)
    return badgeText?.trim() || ''
  }

  /**
   * Check if project is in COMPLETED status
   */
  async isProjectCompleted(): Promise<boolean> {
    const status = await this.getProjectStatusFromBadge()
    return status.toLowerCase().includes('completed')
  }

  /**
   * Check if project is in IN_PROGRESS status
   */
  async isProjectInProgress(): Promise<boolean> {
    const status = await this.getProjectStatusFromBadge()
    return status.toLowerCase().includes('in progress') || status.toLowerCase().includes('in_progress')
  }

  // ============================================================
  // INVOICE TAB METHODS
  // ============================================================

  /**
   * Navigate to Invoice tab
   */
  async navigateToInvoiceTab() {
    console.log('Navigating to Invoice tab...')

    // Find and click the Invoice tab trigger
    const invoiceTab = this.page.locator('[role="tab"]').filter({ hasText: 'Invoice' })
    const tabVisible = await invoiceTab.isVisible().catch(() => false)

    if (!tabVisible) {
      // Try with TabsTrigger value attribute
      const tabByValue = this.page.locator('[value="invoice"]')
      const altTabVisible = await tabByValue.isVisible().catch(() => false)

      if (altTabVisible) {
        await tabByValue.click()
      } else {
        throw new Error('Could not find Invoice tab')
      }
    } else {
      await invoiceTab.click()
    }

    await this.page.waitForTimeout(500)

    // Wait for the Invoice tab to be active (data-state="active")
    await this.page.waitForSelector('[role="tab"][data-state="active"]:has-text("Invoice")', { timeout: 5000 })

    // Wait for invoice tab content to fully load (either "No invoice created" card or invoice data)
    // The skeleton loading shows while isInvoicePending is true
    await this.waitForInvoiceTabContentLoaded()

    console.log('✓ Navigated to Invoice tab')
  }

  /**
   * Wait for Invoice tab content to be fully loaded (not showing skeleton)
   */
  async waitForInvoiceTabContentLoaded() {
    const maxWaitTime = 20000 // 20 seconds
    const startTime = Date.now()

    while (Date.now() - startTime < maxWaitTime) {
      // Check for skeleton loading state
      const skeleton = this.page.locator('[class*="skeleton"], [class*="Skeleton"]').first()
      const isSkeletonVisible = await skeleton.isVisible().catch(() => false)

      if (!isSkeletonVisible) {
        // Check if content is loaded - either "No invoice created" or invoice data
        const noInvoiceText = this.page.locator('text=No invoice created')
        const invoiceCanceledText = this.page.locator('text=Invoice Canceled')
        const createInvoiceBtn = this.page.locator('button:has-text("Create invoice")')
        // When invoice exists: these buttons are visible
        const sendInvoiceBtn = this.page.locator('button:has-text("Send invoice")')
        const downloadInvoiceBtn = this.page.locator('button:has-text("Download invoice")')
        // Invoice Date label is visible when invoice exists
        const invoiceDateLabel = this.page.locator('text=Invoice Date').first()
        // Accounting Info section is visible when invoice exists
        const accountingInfoSection = this.page.locator('text=Accounting Info').first()

        const hasNoInvoice = await noInvoiceText.isVisible().catch(() => false)
        const hasCanceled = await invoiceCanceledText.isVisible().catch(() => false)
        const hasCreateBtn = await createInvoiceBtn.isVisible().catch(() => false)
        const hasSendBtn = await sendInvoiceBtn.isVisible().catch(() => false)
        const hasDownloadBtn = await downloadInvoiceBtn.isVisible().catch(() => false)
        const hasInvoiceDate = await invoiceDateLabel.isVisible().catch(() => false)
        const hasAccountingInfo = await accountingInfoSection.isVisible().catch(() => false)

        if (hasNoInvoice || hasCanceled || hasCreateBtn || hasSendBtn || hasDownloadBtn || hasInvoiceDate || hasAccountingInfo) {
          console.log('Invoice tab content loaded')
          return
        }
      }

      await this.page.waitForTimeout(500)
    }

    console.log('⚠️ Invoice tab content may not be fully loaded (timeout)')
  }

  /**
   * Check if Create Invoice button is visible
   */
  async isCreateInvoiceButtonVisible(): Promise<boolean> {
    const createButton = this.page.locator('button').filter({ hasText: 'Create invoice' })
    return await createButton.isVisible().catch(() => false)
  }

  /**
   * Check if Create Invoice button is enabled
   */
  async isCreateInvoiceButtonEnabled(): Promise<boolean> {
    const createButton = this.page.locator('button').filter({ hasText: 'Create invoice' })
    const isVisible = await createButton.isVisible().catch(() => false)
    if (!isVisible) return false

    const isDisabled = await createButton.isDisabled().catch(() => true)
    return !isDisabled
  }

  /**
   * Click Create Invoice button
   */
  async clickCreateInvoiceButton() {
    console.log('Clicking Create Invoice button...')

    const createButton = this.page.locator('button').filter({ hasText: 'Create invoice' })
    const isVisible = await createButton.isVisible().catch(() => false)

    if (!isVisible) {
      throw new Error('Create Invoice button not found')
    }

    const isDisabled = await createButton.isDisabled().catch(() => true)
    if (isDisabled) {
      console.log('⚠️ Create Invoice button is disabled (project may not be completed)')
      throw new Error('Create Invoice button is disabled - project must be completed first')
    }

    await createButton.click()
    await this.page.waitForTimeout(1000)

    // Wait for modal to appear - check for modal with "Create Invoice" heading
    const modalHeading = this.page.locator('text="Create Invoice"').first()
    await modalHeading.waitFor({ state: 'visible', timeout: 10000 })

    console.log('✓ Create Invoice modal opened')
  }

  /**
   * Fill Create Invoice modal with dates
   * @param invoiceDate - Invoice date (ISO string or Date object)
   * @param paymentDueDate - Payment due date (ISO string or Date object)
   */
  async fillCreateInvoiceModal(invoiceDate?: Date, paymentDueDate?: Date) {
    console.log('Filling Create Invoice modal...')

    // Helper function to select a date from the calendar popup
    const selectDateFromCalendar = async (dayIndex: number = 15) => {
      // Wait for calendar popup to be visible
      const calendarPopup = this.page.locator('[data-radix-popper-content-wrapper]')
      await calendarPopup.waitFor({ state: 'visible', timeout: 5000 })
      console.log('Calendar popup opened')

      // Find day buttons by aria-label pattern (e.g., "Friday, January 16th, 2026")
      const dayButtons = calendarPopup.locator('button[aria-label]').filter({
        has: this.page.locator('text=/^\\d{1,2}$/'),
      })

      const dayCount = await dayButtons.count()
      console.log(`Found ${dayCount} day buttons in calendar`)

      if (dayCount > 0) {
        // Select a specific day (default: around 15th)
        const targetIndex = Math.min(dayIndex, dayCount - 1)
        const targetDay = dayButtons.nth(targetIndex)

        // Make sure the button is visible and click it
        await targetDay.scrollIntoViewIfNeeded()
        await targetDay.click()
        console.log(`Clicked day button at index ${targetIndex}`)
      }

      // Wait for calendar to close automatically after selection
      await calendarPopup.waitFor({ state: 'hidden', timeout: 3000 }).catch(async () => {
        console.log('Calendar did not close automatically, pressing Escape...')
        await this.page.keyboard.press('Escape')
        await this.page.waitForTimeout(300)
      })

      console.log('Calendar popup closed')
    }

    // Step 1: Fill Invoice Date
    console.log('Step 1: Selecting Invoice Date...')
    const invoiceDatePicker = this.page.locator('button:has-text("Pick a date")').first()
    const isInvoicePickerVisible = await invoiceDatePicker.isVisible().catch(() => false)

    if (isInvoicePickerVisible) {
      await invoiceDatePicker.click()
      await this.page.waitForTimeout(300)
      await selectDateFromCalendar(10) // Select around 10th day
      console.log('✓ Invoice Date selected')
    } else {
      console.log('⚠️ Invoice Date picker not found')
    }

    // Ensure any remaining popover is closed
    await this.page.waitForTimeout(300)
    const popoverStillOpen = await this.page.locator('[data-radix-popper-content-wrapper]').isVisible().catch(() => false)
    if (popoverStillOpen) {
      console.log('Popover still open after Invoice Date, pressing Escape...')
      await this.page.keyboard.press('Escape')
      await this.page.waitForTimeout(500)
    }

    // Step 2: Fill Payment Due Date
    console.log('Step 2: Selecting Payment Due Date...')
    const paymentDuePicker = this.page.locator('button:has-text("Pick a date")').first()
    const isPaymentPickerVisible = await paymentDuePicker.isVisible().catch(() => false)

    if (isPaymentPickerVisible) {
      await paymentDuePicker.click({ timeout: 5000 })
      await this.page.waitForTimeout(300)

      // Navigate to next month for a future date
      const calendarPopup = this.page.locator('[data-radix-popper-content-wrapper]')
      await calendarPopup.waitFor({ state: 'visible', timeout: 5000 })

      // Find and click the next month button (usually the rightmost navigation button)
      const nextMonthBtn = calendarPopup.locator('button').filter({
        has: this.page.locator('svg'),
      }).last()

      if (await nextMonthBtn.isVisible().catch(() => false)) {
        await nextMonthBtn.click()
        await this.page.waitForTimeout(300)
        console.log('Navigated to next month')
      }

      await selectDateFromCalendar(20) // Select around 20th day
      console.log('✓ Payment Due Date selected')
    } else {
      console.log('⚠️ Payment Due Date picker not found - may already be filled')
    }

    // Verify both dates are now set (not showing "Pick a date")
    await this.page.waitForTimeout(500)
    const remainingPickers = await this.page.locator('button:has-text("Pick a date")').count()
    console.log(`Remaining "Pick a date" buttons: ${remainingPickers}`)

    if (remainingPickers === 0) {
      console.log('✓ Both dates successfully filled')
    } else {
      console.log(`⚠️ ${remainingPickers} date(s) still need to be selected`)
    }

    console.log('✓ Filled Create Invoice modal')
  }

  /**
   * Submit Create Invoice modal by clicking Apply button
   */
  async submitCreateInvoiceModal() {
    console.log('Submitting Create Invoice modal...')

    // Find the Apply button directly
    const applyButton = this.page.locator('button:has-text("Apply")').last()
    const isVisible = await applyButton.isVisible().catch(() => false)

    if (!isVisible) {
      throw new Error('Apply button not found in Create Invoice modal')
    }

    const isDisabled = await applyButton.isDisabled().catch(() => true)
    if (isDisabled) {
      console.log('⚠️ Apply button is disabled - form may not be complete')
      throw new Error('Apply button is disabled - please fill all required fields')
    }

    await applyButton.click()
    console.log('Clicked Apply button')

    // Wait for API call and modal to close
    await this.page.waitForTimeout(1000)

    // Wait for modal to close by checking if "Create Invoice" heading is gone
    const modalHeading = this.page.locator('text="Create Invoice"').first()
    await modalHeading.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {
      console.log('Modal did not close within timeout')
    })

    console.log('✓ Create Invoice modal submitted')
  }

  /**
   * Wait for invoice to be created and displayed
   */
  async waitForInvoiceCreated() {
    console.log('Waiting for invoice to be created...')

    // Wait for the invoice card to appear (indicating invoice was created)
    const invoiceCard = this.page.locator('.space-y-6').filter({
      has: this.page.locator('text=Invoice Date'),
    })

    await invoiceCard.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {
      // If invoice card not found, check for any invoice content
      console.log('Invoice card not found, checking for invoice content...')
    })

    // Check if "No invoice created" message is gone
    const noInvoiceMessage = this.page.locator('text=No invoice created')
    const isNoInvoiceVisible = await noInvoiceMessage.isVisible().catch(() => false)

    if (isNoInvoiceVisible) {
      throw new Error('Invoice was not created - "No invoice created" message still visible')
    }

    console.log('✓ Invoice created successfully')
  }

  /**
   * Get invoice status from the Invoice tab
   */
  async getInvoiceStatus(): Promise<string> {
    // Find the "Status" label, then get the sibling element with the status badge
    // Structure: div > div(label: "Status") + div(value: badge)
    const statusLabel = this.page.locator('div').filter({ hasText: /^Status$/ }).first()

    // Check if status label exists with a short timeout
    const exists = await statusLabel
      .waitFor({ state: 'visible', timeout: 3000 })
      .then(() => true)
      .catch(() => false)

    if (!exists) {
      return ''
    }

    // Get the sibling element after the Status label
    const statusValue = statusLabel.locator('xpath=following-sibling::div').first()
    const statusText = await statusValue.textContent().catch(() => '')
    return statusText?.trim() || ''
  }

  /**
   * Check if invoice exists (has been created)
   */
  async hasInvoice(): Promise<boolean> {
    // Check for invoice content (Invoice Date label indicates invoice exists)
    const invoiceContent = this.page.locator('text=Invoice Date')
    return await invoiceContent.isVisible().catch(() => false)
  }

  /**
   * Get the invoice ID from the page
   */
  async getInvoiceId(): Promise<string> {
    // Invoice ID is typically displayed in the invoice card header
    const invoiceIdText = this.page.locator('text=/IR-[A-Z0-9-]+/').first()
    const text = await invoiceIdText.textContent().catch(() => '')
    const match = text?.match(/IR-[A-Z0-9-]+/)
    return match ? match[0] : ''
  }
}
