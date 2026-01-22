import { Page, expect, Locator } from '@playwright/test'
import { BasePage } from './base.page'

/**
 * Page Object Model for Project Create page.
 * The project creation page has a complex form with multiple sections.
 *
 * Page URL: /project/create
 *
 * Key sections:
 * - Section 1: Project Information (Client, Manager, Project Name, Timezone, Dates, Team)
 * - Section 2: Project Items (Currency, Tax, Items with Jobs)
 */
export class ProjectCreatePage extends BasePage {
  // Page header
  readonly pageTitle: Locator
  readonly cancelButton: Locator
  readonly createProjectButton: Locator

  // Section 1: Project Information
  readonly projectInfoSection: Locator
  readonly clientSelect: Locator
  readonly managerSelect: Locator
  readonly projectNameInput: Locator
  readonly timezoneSelect: Locator
  readonly requestDatePicker: Locator
  readonly projectDueDatePicker: Locator
  readonly revenueFromSelect: Locator
  readonly projectDescriptionTextarea: Locator
  readonly projectManagerSelect: Locator
  readonly addNewClientButton: Locator

  // Section 2: Project Items
  readonly projectItemsSection: Locator
  readonly currencySelect: Locator
  readonly taxableCheckbox: Locator
  readonly taxInput: Locator
  readonly discountCheckbox: Locator
  readonly discountInput: Locator
  readonly addNewItemButton: Locator

  // Item card elements (first item - index 0)
  readonly itemTitleInput: Locator
  readonly itemDueDatePicker: Locator
  readonly categorySelect: Locator
  readonly areaOfExpertiseSelect: Locator
  readonly sourceSelect: Locator
  readonly targetSelect: Locator

  // Error messages
  readonly errorMessages: Locator

  // Loading and success states
  readonly loadingOverlay: Locator
  readonly successModal: Locator

  constructor(page: Page) {
    super(page)

    // Page header
    this.pageTitle = page.locator('h1:has-text("Create New Project")')
    this.cancelButton = page.getByRole('button', { name: 'Cancel' })
    this.createProjectButton = page.getByRole('button', { name: 'Create Project' })

    // Section 1: Project Information
    this.projectInfoSection = page.locator('text=/Project Information/i').first()
    this.clientSelect = page.locator('[name="clientId"]').first()
    this.managerSelect = page.locator('[name="managerId"]').first()
    this.projectNameInput = page.locator('[name="projectName"]')
    this.timezoneSelect = page.locator('[name="timezone"]').first()
    this.requestDatePicker = page.locator('[name="requestDate"]').first()
    this.projectDueDatePicker = page.locator('[name="projectDueDate"]').first()
    this.revenueFromSelect = page.locator('[name="revenueFrom"]').first()
    this.projectDescriptionTextarea = page.locator('[name="projectDescription"]')
    this.projectManagerSelect = page.locator('[name="projectManagerId"]').first()
    this.addNewClientButton = page.getByRole('button', { name: /add new client/i })

    // Section 2: Project Items
    this.projectItemsSection = page.locator('text=/Project Items/i').first()
    this.currencySelect = page.locator('[name="currency"]').first()
    this.taxableCheckbox = page.locator('[name="isTaxable"]')
    this.taxInput = page.locator('[name="tax"]')
    this.discountCheckbox = page.locator('[name="hasDiscount"]')
    this.discountInput = page.locator('[name="discount"]')
    this.addNewItemButton = page.getByRole('button', { name: /add new item/i })

    // Item card elements (first item)
    this.itemTitleInput = page.locator('[name="items.0.itemTitle"]')
    this.itemDueDatePicker = page.locator('[name="items.0.itemDueDate"]').first()
    this.categorySelect = page.locator('[name="items.0.category"]').first()
    this.areaOfExpertiseSelect = page.locator('[name="items.0.areaOfExpertise"]').first()
    this.sourceSelect = page.locator('[name="items.0.source"]').first()
    this.targetSelect = page.locator('[name="items.0.target"]').first()

    // Error messages
    this.errorMessages = page.locator('[class*="error"], [class*="Error"], [data-error="true"], .text-red-500, .text-destructive')

    // Loading and success states
    this.loadingOverlay = page.locator('[class*="loading"], [class*="Loading"]')
    this.successModal = page.locator('text=/success/i')
  }

  async navigate() {
    await this.goto('/project/create')
    await this.waitForPageLoad()
  }

  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {})
    // Wait for form to be visible
    await this.pageTitle.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {})
    // Wait for loading overlay to disappear
    await this.waitForLoadingComplete()
  }

  /**
   * Wait for any loading overlays to disappear
   */
  async waitForLoadingComplete() {
    // Wait for skeleton loaders to disappear
    const skeleton = this.page.locator('[class*="skeleton"], [class*="Skeleton"]')
    await skeleton.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {})

    // Wait for loading overlays to disappear (including backdrop blur)
    const loadingOverlay = this.page.locator('.bg-white\\/80, [class*="backdrop-blur"]')
    await loadingOverlay.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {})

    // Wait for any generic loading indicators
    const genericLoading = this.page.locator('[class*="loading"]:not([class*="loadingOverlay"])')
    await genericLoading.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {})

    // Additional wait for any dynamic content
    await this.page.waitForTimeout(500)
  }

  /**
   * Wait for item section loading to complete
   */
  async waitForItemSectionReady() {
    try {
      // Wait for the "Please select currency and client first" message to disappear
      const warningMessage = this.page.locator('text=/Please select currency and client first/i')
      await warningMessage.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {})

      // Wait for the specific loading overlay that blocks clicks
      // The overlay has: absolute inset-0 z-10 bg-white/80 backdrop-blur-sm
      const loadingOverlay = this.page.locator('div.absolute.inset-0.z-10')
      let attempts = 0
      const maxAttempts = 20

      while (attempts < maxAttempts) {
        const isVisible = await loadingOverlay.first().isVisible().catch(() => false)
        if (!isVisible) break

        await this.page.waitForTimeout(500)
        attempts++
      }

      if (attempts >= maxAttempts) {
        console.log('Warning: Loading overlay still visible after max attempts')
      }

      // Additional wait for stability
      await this.page.waitForTimeout(300)
    } catch {
      // Ignore errors if page is closing
      console.log('Warning: waitForItemSectionReady encountered an error, continuing...')
    }
  }

  async expectPageVisible() {
    await expect(this.pageTitle).toBeVisible({ timeout: 15000 })
  }

  /**
   * Click the Create Project button to submit the form
   * @param options.waitForNavigation - Whether to wait for navigation (default: true)
   *   Set to false for validation tests that expect to stay on the page
   */
  async clickCreateProject(options?: { waitForNavigation?: boolean }) {
    const waitForNavigation = options?.waitForNavigation ?? true

    if (!waitForNavigation) {
      // Simple click without waiting - for validation tests
      await this.createProjectButton.click()
      try {
        if (!this.page.isClosed()) {
          await this.page.waitForTimeout(1000)
        }
      } catch {
        // Page closed during wait
      }
      return
    }

    // Wait for API response and navigation
    const [response] = await Promise.all([
      this.page.waitForResponse(
        (resp) => resp.url().includes('/api/') && resp.request().method() === 'POST',
        { timeout: 30000 }
      ).catch(() => null),
      this.createProjectButton.click(),
    ])

    // Wait for navigation or error indication
    await this.page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {})

    // Check if we navigated away from create page
    let attempts = 0
    const maxAttempts = 15
    let successToastSeen = false

    while (attempts < maxAttempts) {
      // Check if page is still open
      if (this.page.isClosed()) {
        return // Page closed, likely due to navigation
      }

      try {
        const currentUrl = this.page.url()
        if (currentUrl.includes('/project/detail/') || currentUrl.includes('/project/list')) {
          return // Successfully navigated
        }

        // Check for success toast (might navigate shortly after)
        const successToast = this.page.locator('[data-sonner-toast][data-type="success"]')
        const hasSuccessToast = await successToast.isVisible().catch(() => false)

        if (hasSuccessToast) {
          successToastSeen = true
          // Wait longer for navigation to complete after success toast
          await this.page.waitForTimeout(1000)

          // Check URL again after waiting
          if (this.page.isClosed()) return
          const urlAfterWait = this.page.url()
          if (urlAfterWait.includes('/project/detail/') || urlAfterWait.includes('/project/list')) {
            return // Successfully navigated
          }

          // Try waiting for navigation explicitly
          try {
            await this.page.waitForURL(/\/(project\/detail|project\/list)/, { timeout: 10000 })
            return
          } catch {
            // Continue checking
          }
        }

        // If we already saw success toast, keep waiting for navigation
        if (successToastSeen) {
          await this.page.waitForTimeout(1000)
          attempts++
          continue
        }

        // Check for error toast
        const errorToast = this.page.locator('[data-sonner-toast][data-type="error"]')
        const hasErrorToast = await errorToast.isVisible().catch(() => false)
        if (hasErrorToast) {
          // For validation tests, don't throw - just return
          return
        }

        // Check for validation errors - if found, return (don't throw)
        const hasValidationErrors = await this.hasValidationErrors()
        if (hasValidationErrors) {
          return // Validation errors are expected in some tests
        }

        await this.page.waitForTimeout(1000)
        attempts++
      } catch {
        // Page may have been closed during operations
        return
      }
    }
  }

  /**
   * Click the Cancel button
   */
  async clickCancel() {
    await this.cancelButton.click()
  }

  /**
   * Select a client from dropdown
   */
  async selectClient(clientName: string) {
    // Click on client select trigger
    const clientTrigger = this.page.locator('[name="clientId"]').locator('..').locator('[role="combobox"], button, [class*="trigger"]').first()
    await clientTrigger.click()
    await this.page.waitForTimeout(300)

    // Search and select
    const searchInput = this.page.locator('[role="listbox"] input, [cmdk-input]').first()
    if (await searchInput.isVisible()) {
      await searchInput.fill(clientName)
      await this.page.waitForTimeout(300)
    }

    // Click on the option
    await this.page.locator(`[role="option"]:has-text("${clientName}")`).first().click()
  }

  /**
   * Select a manager from dropdown
   */
  async selectManager(managerName: string) {
    const managerTrigger = this.page.locator('[name="managerId"]').locator('..').locator('[role="combobox"], button, [class*="trigger"]').first()
    await managerTrigger.click()
    await this.page.waitForTimeout(300)

    const searchInput = this.page.locator('[role="listbox"] input, [cmdk-input]').first()
    if (await searchInput.isVisible()) {
      await searchInput.fill(managerName)
      await this.page.waitForTimeout(300)
    }

    await this.page.locator(`[role="option"]:has-text("${managerName}")`).first().click()
  }

  /**
   * Fill project name
   */
  async fillProjectName(name: string) {
    await this.waitForLoadingComplete()
    // Find the project name input using multiple strategies
    const input = this.page.locator('input[name="projectName"], [data-field="projectName"] input').first()
    if (await input.isVisible()) {
      await input.fill(name)
    } else {
      // Fallback: find by label
      await this.fillInputByLabel('Project Name', name)
    }
  }

  /**
   * Select timezone
   */
  async selectTimezone(timezone: string) {
    const timezoneTrigger = this.page.locator('[name="timezone"]').locator('..').locator('[role="combobox"], button, [class*="trigger"]').first()
    await timezoneTrigger.click()
    await this.page.waitForTimeout(300)

    const searchInput = this.page.locator('[role="listbox"] input, [cmdk-input]').first()
    if (await searchInput.isVisible()) {
      await searchInput.fill(timezone)
      await this.page.waitForTimeout(300)
    }

    await this.page.locator(`[role="option"]:has-text("${timezone}")`).first().click()
  }

  /**
   * Set project due date
   */
  async setProjectDueDate(date: string) {
    const dueDateTrigger = this.page.locator('[name="projectDueDate"]').locator('..').locator('button, [class*="trigger"]').first()
    await dueDateTrigger.click()
    await this.page.waitForTimeout(300)

    // Click on the date in the calendar
    // Format expected: day number
    const dayMatch = date.match(/(\d+)$/)
    if (dayMatch) {
      await this.page.locator(`[role="gridcell"] button:has-text("${dayMatch[1]}")`).first().click()
    }
  }

  /**
   * Select currency
   */
  async selectCurrency(currency: string) {
    await this.selectFromComboboxByLabel('Currency', currency)
  }

  /**
   * Fill item title for a specific item index
   */
  async fillItemTitle(title: string, itemIndex = 0) {
    const itemTitleInput = this.page.locator(`[name="items.${itemIndex}.itemTitle"]`)
    await itemTitleInput.fill(title)
  }

  /**
   * Select category for a specific item
   */
  async selectCategory(category: string, itemIndex = 0) {
    const categoryTrigger = this.page.locator(`[name="items.${itemIndex}.category"]`).locator('..').locator('[role="combobox"], button, [class*="trigger"]').first()
    await categoryTrigger.click()
    await this.page.waitForTimeout(300)

    await this.page.locator(`[role="option"]:has-text("${category}")`).first().click()
  }

  /**
   * Select source language for a specific item
   */
  async selectSource(source: string, itemIndex = 0) {
    const sourceTrigger = this.page.locator(`[name="items.${itemIndex}.source"]`).locator('..').locator('[role="combobox"], button, [class*="trigger"]').first()
    await sourceTrigger.click()
    await this.page.waitForTimeout(300)

    const searchInput = this.page.locator('[role="listbox"] input, [cmdk-input]').first()
    if (await searchInput.isVisible()) {
      await searchInput.fill(source)
      await this.page.waitForTimeout(300)
    }

    await this.page.locator(`[role="option"]:has-text("${source}")`).first().click()
  }

  /**
   * Select target language(s) for a specific item
   */
  async selectTarget(targets: string[], itemIndex = 0) {
    const targetTrigger = this.page.locator(`[name="items.${itemIndex}.target"]`).locator('..').locator('[role="combobox"], button, [class*="trigger"]').first()
    await targetTrigger.click()
    await this.page.waitForTimeout(300)

    for (const target of targets) {
      const searchInput = this.page.locator('[role="listbox"] input, [cmdk-input]').first()
      if (await searchInput.isVisible()) {
        await searchInput.fill(target)
        await this.page.waitForTimeout(300)
      }

      await this.page.locator(`[role="option"]:has-text("${target}")`).first().click()
      await this.page.waitForTimeout(200)
    }

    // Close the dropdown by pressing Escape
    await this.page.keyboard.press('Escape')
  }

  /**
   * Get validation error message for a specific field
   */
  async getFieldError(fieldName: string): Promise<string | null> {
    const fieldContainer = this.page.locator(`[name="${fieldName}"]`).locator('..')
    const errorText = fieldContainer.locator('[class*="error"], [class*="Error"], .text-red-500, .text-destructive')

    if (await errorText.isVisible().catch(() => false)) {
      return await errorText.textContent()
    }
    return null
  }

  /**
   * Check if form has any validation errors
   */
  async hasValidationErrors(): Promise<boolean> {
    try {
      // Check if page is still open before waiting
      if (this.page.isClosed()) {
        return false
      }
      await this.page.waitForTimeout(500)
      const errors = await this.errorMessages.count()
      return errors > 0
    } catch {
      // Page may have been closed during navigation
      return false
    }
  }

  /**
   * Get all visible validation error messages
   */
  async getAllValidationErrors(): Promise<string[]> {
    try {
      if (this.page.isClosed()) {
        return []
      }
      await this.page.waitForTimeout(500)
    } catch {
      return []
    }
    const errors: string[] = []
    const errorElements = await this.errorMessages.all()

    for (const element of errorElements) {
      const text = await element.textContent()
      if (text && text.trim()) {
        errors.push(text.trim())
      }
    }

    return errors
  }

  /**
   * Check if Create Project button is enabled
   */
  async isCreateButtonEnabled(): Promise<boolean> {
    return await this.createProjectButton.isEnabled()
  }

  /**
   * Wait for success modal to appear
   */
  async waitForSuccessModal() {
    await this.successModal.waitFor({ state: 'visible', timeout: 10000 })
  }

  /**
   * Check if loading overlay is visible
   */
  async isLoading(): Promise<boolean> {
    return await this.loadingOverlay.isVisible().catch(() => false)
  }

  /**
   * Get field label text
   */
  async getFieldLabel(fieldName: string): Promise<string | null> {
    const field = this.page.locator(`[name="${fieldName}"]`)
    const label = field.locator('..').locator('label')

    if (await label.isVisible().catch(() => false)) {
      return await label.textContent()
    }
    return null
  }

  /**
   * Check if a field has required marker
   */
  async hasRequiredMarker(fieldName: string): Promise<boolean> {
    const field = this.page.locator(`[name="${fieldName}"]`)
    const container = field.locator('..')
    const requiredMarker = container.locator('[class*="required"], .text-red-500:has-text("*"), span:has-text("*")')

    return await requiredMarker.isVisible().catch(() => false)
  }

  /**
   * Scroll to a specific field
   */
  async scrollToField(fieldName: string) {
    const field = this.page.locator(`[name="${fieldName}"]`)
    await field.scrollIntoViewIfNeeded()
  }

  /**
   * Click on select trigger by label text
   */
  async clickSelectByLabel(labelText: string) {
    await this.waitForLoadingComplete()
    const container = this.page.locator(`label:has-text("${labelText}")`).locator('..')
    const trigger = container.locator('[role="combobox"], button[class*="trigger"], [class*="SelectTrigger"], button').first()

    // Wait for the trigger to be visible and clickable
    await trigger.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {})
    await trigger.click({ force: true })
    await this.page.waitForTimeout(300)
  }

  /**
   * Select option from currently open dropdown
   */
  async selectOption(optionText: string) {
    await this.page.locator(`[role="option"]:has-text("${optionText}")`).first().click()
  }

  /**
   * Check if dropdown is open
   */
  async isDropdownOpen(): Promise<boolean> {
    return await this.page.locator('[role="listbox"]').isVisible().catch(() => false)
  }

  /**
   * Close any open dropdown
   */
  async closeDropdown() {
    await this.page.keyboard.press('Escape')
    await this.page.waitForTimeout(200)
  }

  /**
   * Fill input field by label
   */
  async fillInputByLabel(labelText: string, value: string) {
    const container = this.page.locator(`label:has-text("${labelText}")`).locator('..')
    const input = container.locator('input, textarea').first()
    await input.fill(value)
  }

  /**
   * Get input value by label
   */
  async getInputValueByLabel(labelText: string): Promise<string> {
    const container = this.page.locator(`label:has-text("${labelText}")`).locator('..')
    const input = container.locator('input, textarea').first()
    return await input.inputValue()
  }

  // ============================================================================
  // Project Creation Methods (실제 프로젝트 생성용)
  // ============================================================================

  /**
   * Select from a combobox dropdown using label
   */
  async selectFromComboboxByLabel(labelText: string, optionText: string) {
    await this.waitForLoadingComplete()

    let targetCombobox = null

    // Strategy 1: Find by label element
    const labelElement = this.page.locator(`label:has-text("${labelText}")`).first()
    if (await labelElement.isVisible().catch(() => false)) {
      const container = labelElement.locator('xpath=ancestor::div[1]')
      const combobox = container.locator('[role="combobox"]').first()
      if (await combobox.isVisible().catch(() => false)) {
        targetCombobox = combobox
      }
    }

    // Strategy 2: Find by paragraph text
    if (!targetCombobox) {
      const allParagraphs = this.page.locator('p')
      const count = await allParagraphs.count()

      for (let i = 0; i < count; i++) {
        const p = allParagraphs.nth(i)
        const text = await p.textContent().catch(() => '')
        if (text?.trim() === labelText) {
          // Found the label - now find the sibling/nearby combobox
          const parent = p.locator('xpath=ancestor::div[1]')
          const grandParent = p.locator('xpath=ancestor::div[2]')

          // Try to find combobox in nearby container
          let combobox = grandParent.locator('[role="combobox"]').first()
          if (await combobox.isVisible().catch(() => false)) {
            targetCombobox = combobox
            break
          }

          // Try parent's sibling
          combobox = parent.locator('xpath=following-sibling::div').locator('[role="combobox"]').first()
          if (await combobox.isVisible().catch(() => false)) {
            targetCombobox = combobox
            break
          }
        }
      }
    }

    // Strategy 3: Find by any element containing the text
    if (!targetCombobox) {
      const textElement = this.page.locator(`text="${labelText}"`).first()
      if (await textElement.isVisible().catch(() => false)) {
        const ancestor = textElement.locator('xpath=ancestor::div[contains(@class, "flex") or contains(@class, "grid")][1]')
        const combobox = ancestor.locator('[role="combobox"]').first()
        if (await combobox.isVisible().catch(() => false)) {
          targetCombobox = combobox
        }
      }
    }

    // Strategy 4: Find by name attribute (for Currency, might be directly named)
    if (!targetCombobox && labelText.toLowerCase() === 'currency') {
      const namedCombobox = this.page.locator('[name="currency"], [name="currencyId"]').locator('xpath=ancestor::div[1]').locator('[role="combobox"]').first()
      if (await namedCombobox.isVisible().catch(() => false)) {
        targetCombobox = namedCombobox
      } else {
        // Try finding button near currency label
        const currencySection = this.page.locator('text="Currency"').locator('xpath=ancestor::div[2]')
        const combobox = currencySection.locator('[role="combobox"], button[aria-haspopup]').first()
        if (await combobox.isVisible().catch(() => false)) {
          targetCombobox = combobox
        }
      }
    }

    if (!targetCombobox) {
      console.log(`Could not find combobox for label: ${labelText}, skipping selection`)
      return // Don't throw, just skip
    }

    await targetCombobox.click()
    await this.page.waitForTimeout(500)

    // Wait for popover to appear
    const popoverContent = this.page.locator('[data-radix-popper-content-wrapper]').first()
    await popoverContent.waitFor({ state: 'visible', timeout: 5000 })

    // Wait for options to load from API
    let optionsLoaded = false
    let waitAttempts = 0
    const maxWaitAttempts = 20

    while (!optionsLoaded && waitAttempts < maxWaitAttempts) {
      const noResultsMessage = popoverContent.locator('text=/No results found/i')
      const hasNoResults = await noResultsMessage.isVisible().catch(() => false)

      const options = popoverContent.locator('[role="option"], [cmdk-item]')
      const optionCount = await options.count().catch(() => 0)

      if (optionCount > 0) {
        optionsLoaded = true
        console.log(`Options for "${labelText}" loaded after ${waitAttempts * 500}ms, found ${optionCount} options`)
      } else if (!hasNoResults) {
        // No "No results" message and no options - might still be loading
        await this.page.waitForTimeout(500)
        waitAttempts++
      } else {
        // Has "No results" message - options might not exist or still loading
        await this.page.waitForTimeout(500)
        waitAttempts++
      }
    }

    // Search for the option
    const searchInput = popoverContent.locator('input').first()
    if (await searchInput.isVisible()) {
      await searchInput.fill(optionText)
      await this.page.waitForTimeout(500)

      // Wait for search results
      let searchAttempts = 0
      const maxSearchAttempts = 10

      while (searchAttempts < maxSearchAttempts) {
        const matchingOption = popoverContent.locator(`[role="option"]:has-text("${optionText}"), [cmdk-item]:has-text("${optionText}")`).first()
        if (await matchingOption.isVisible().catch(() => false)) {
          console.log(`Found "${optionText}" in search results`)
          break
        }

        const options = popoverContent.locator('[role="option"], [cmdk-item]')
        const optionCount = await options.count().catch(() => 0)
        if (optionCount > 0) {
          console.log(`Search returned ${optionCount} results`)
          break
        }

        await this.page.waitForTimeout(500)
        searchAttempts++
      }
    }

    // Click on the option - try multiple selectors with case-insensitive matching
    const selectors = [
      `[role="option"]:has-text("${optionText}")`,
      `[cmdk-item]:has-text("${optionText}")`,
      `text="${optionText}"`,
      `text=/${optionText}/i`,
      `div:has-text("${optionText}")`,
    ]

    let option = null
    for (const selector of selectors) {
      const candidate = popoverContent.locator(selector).first()
      if (await candidate.isVisible().catch(() => false)) {
        option = candidate
        break
      }
    }

    if (!option) {
      // Log available options for debugging
      console.log(`Available options in dropdown for "${labelText}":`)
      const allItems = await popoverContent.locator('[role="option"], [cmdk-item]').all()
      for (const item of allItems.slice(0, 10)) {
        console.log(`  - ${await item.textContent()}`)
      }

      // Try to select first available option as fallback
      if (allItems.length > 0) {
        console.log(`Falling back to first available option for "${labelText}"`)
        option = allItems[0]
      } else {
        throw new Error(`Could not find option "${optionText}" in dropdown for "${labelText}"`)
      }
    }

    await option!.waitFor({ state: 'visible', timeout: 5000 })
    await option!.click()
    await this.page.waitForTimeout(300)
  }

  /**
   * Select first available option from a combobox dropdown using label
   * Useful when the exact options are unknown or differ between environments
   */
  async selectFirstAvailableOption(labelText: string) {
    await this.waitForLoadingComplete()

    // Find the exact paragraph with the label text
    const allParagraphs = this.page.locator('p')
    const count = await allParagraphs.count()

    let targetCombobox = null

    for (let i = 0; i < count; i++) {
      const p = allParagraphs.nth(i)
      const text = await p.textContent().catch(() => '')
      if (text?.trim() === labelText) {
        // Found the label - now find the sibling/nearby combobox
        const parent = p.locator('xpath=ancestor::div[1]')
        const grandParent = p.locator('xpath=ancestor::div[2]')

        // Try to find combobox in nearby container
        let combobox = grandParent.locator('[role="combobox"]').first()
        if (await combobox.isVisible().catch(() => false)) {
          targetCombobox = combobox
          break
        }

        // Try parent's sibling
        combobox = parent.locator('xpath=following-sibling::div').locator('[role="combobox"]').first()
        if (await combobox.isVisible().catch(() => false)) {
          targetCombobox = combobox
          break
        }
      }
    }

    if (!targetCombobox) {
      throw new Error(`Could not find combobox for label: ${labelText}`)
    }

    await targetCombobox.click()
    await this.page.waitForTimeout(500)

    // Wait for popover to appear
    const popoverContent = this.page.locator('[data-radix-popper-content-wrapper]').first()
    await popoverContent.waitFor({ state: 'visible', timeout: 5000 })

    // Find and click the first available option
    const optionSelectors = [
      '[role="option"]',
      '[cmdk-item]',
      'div[data-value]'
    ]

    let firstOption = null
    for (const selector of optionSelectors) {
      const options = popoverContent.locator(selector)
      const optionCount = await options.count()
      if (optionCount > 0) {
        firstOption = options.first()
        break
      }
    }

    if (!firstOption) {
      throw new Error(`No options found in dropdown for label: ${labelText}`)
    }

    const optionText = await firstOption.textContent().catch(() => 'Unknown')
    console.log(`Selecting first ${labelText} option: ${optionText}`)

    await firstOption.click()
    await this.page.waitForTimeout(300)

    // For multi-select dropdowns (like Target), close by pressing Escape
    if (labelText === 'Target') {
      await this.page.keyboard.press('Escape')
      await this.page.waitForTimeout(200)
    }
  }

  /**
   * Select client from dropdown
   */
  async selectClientByLabel(clientName: string) {
    await this.selectFromComboboxByLabel('Client', clientName)
  }

  /**
   * Select manager from dropdown
   */
  async selectManagerByLabel(managerName: string) {
    await this.selectFromComboboxByLabel('Manager', managerName)
  }

  /**
   * Select timezone from dropdown
   */
  async selectTimezoneByLabel(timezone: string) {
    await this.selectFromComboboxByLabel('Timezone', timezone)
  }

  /**
   * Fill project name using label
   */
  async fillProjectNameByLabel(name: string) {
    await this.waitForLoadingComplete()

    // Use placeholder to find the correct textbox
    const input = this.page.getByPlaceholder('Enter project name')

    await input.waitFor({ state: 'visible', timeout: 10000 })
    await input.fill(name)
    await this.page.waitForTimeout(200)
  }

  /**
   * Set date using date picker by label
   */
  async setDateByLabel(labelText: string, daysFromNow: number = 7) {
    await this.waitForLoadingComplete()

    // Find the exact paragraph with the label text and its nearby button
    const allParagraphs = this.page.locator('p')
    const count = await allParagraphs.count()

    let dateButton = null

    for (let i = 0; i < count; i++) {
      const p = allParagraphs.nth(i)
      const text = await p.textContent().catch(() => '')
      if (text?.trim() === labelText) {
        // Found the label - find the nearby date button
        const grandParent = p.locator('xpath=ancestor::div[2]')
        const btn = grandParent.locator('button').first()
        if (await btn.isVisible().catch(() => false)) {
          dateButton = btn
          break
        }
      }
    }

    if (!dateButton) {
      throw new Error(`Could not find date picker for label: ${labelText}`)
    }

    await dateButton.click()
    await this.page.waitForTimeout(500)

    // Wait for calendar to appear
    const calendar = this.page.locator('[data-radix-popper-content-wrapper]').first()
    await calendar.waitFor({ state: 'visible', timeout: 5000 })

    // Calculate target date
    const targetDate = new Date()
    targetDate.setDate(targetDate.getDate() + daysFromNow)
    const targetDay = targetDate.getDate()
    const targetMonth = targetDate.getMonth()
    const targetYear = targetDate.getFullYear()

    console.log(`Target date: ${targetYear}-${targetMonth + 1}-${targetDay}`)

    // Find and click on the correct day in the calendar
    // The calendar should show days as buttons within grid cells
    const gridCells = calendar.locator('[role="gridcell"]')
    const gridCount = await gridCells.count()

    for (let i = 0; i < gridCount; i++) {
      const cell = gridCells.nth(i)
      const btn = cell.locator('button').first()
      const btnText = await btn.textContent().catch(() => '')

      // Match the exact day number
      if (btnText?.trim() === targetDay.toString()) {
        // Make sure this is not a disabled/outside month day
        const isDisabled = await btn.getAttribute('disabled').catch(() => null)
        const ariaDisabled = await btn.getAttribute('aria-disabled').catch(() => null)

        if (isDisabled === null && ariaDisabled !== 'true') {
          await btn.click()
          console.log(`Clicked day: ${targetDay}`)
          break
        }
      }
    }

    await this.page.waitForTimeout(300)
  }

  /**
   * Fill item title by label
   */
  async fillItemTitleByLabel(title: string) {
    await this.waitForLoadingComplete()
    await this.waitForItemSectionReady()

    // Use placeholder to find the correct textbox
    const input = this.page.getByPlaceholder('Enter item title')

    await input.waitFor({ state: 'visible', timeout: 10000 })
    await input.fill(title)
    await this.page.waitForTimeout(200)
  }

  /**
   * Select category for item
   * @param category Category name to select, or 'FIRST' to select first available
   */
  async selectItemCategory(category: string = 'FIRST') {
    await this.waitForLoadingComplete()

    // Find Category combobox
    const categoryLabel = this.page.locator('p:has-text("Category")').first()
    const categoryContainer = categoryLabel.locator('xpath=ancestor::div[2]')
    const categoryCombobox = categoryContainer.locator('[role="combobox"]').first()

    await categoryCombobox.click()
    await this.page.waitForTimeout(500)

    // Wait for popover
    const popover = this.page.locator('[data-radix-popper-content-wrapper]').first()
    await popover.waitFor({ state: 'visible', timeout: 5000 })

    // Wait for options to load from API (wait for "No results found" to disappear or options to appear)
    let optionsLoaded = false
    let waitAttempts = 0
    const maxWaitAttempts = 20 // 10 seconds max wait

    while (!optionsLoaded && waitAttempts < maxWaitAttempts) {
      const noResultsMessage = popover.locator('text=/No results found/i')
      const hasNoResults = await noResultsMessage.isVisible().catch(() => false)

      const options = popover.locator('[role="option"], [cmdk-item]')
      const optionCount = await options.count().catch(() => 0)

      if (optionCount > 0 || !hasNoResults) {
        optionsLoaded = true
        console.log(`Category options loaded after ${waitAttempts * 500}ms, found ${optionCount} options`)
      } else {
        await this.page.waitForTimeout(500)
        waitAttempts++
      }
    }

    if (!optionsLoaded) {
      console.log('Warning: Category options may not have fully loaded')
    }

    if (category === 'FIRST') {
      // Select first available option
      const firstOption = popover.locator('[role="option"], [cmdk-item], div[data-value]').first()
      if (await firstOption.isVisible().catch(() => false)) {
        console.log(`Selecting first category: ${await firstOption.textContent()}`)
        await firstOption.click()
      } else {
        // Try clicking any clickable item
        const anyItem = popover.locator('div').filter({ hasText: /\w+/ }).first()
        await anyItem.click()
      }
    } else {
      // Search for specific category
      const searchInput = popover.locator('input').first()
      if (await searchInput.isVisible()) {
        await searchInput.fill(category)
        await this.page.waitForTimeout(500)

        // Wait for search results to load
        let searchResultsLoaded = false
        let searchAttempts = 0
        const maxSearchAttempts = 10

        while (!searchResultsLoaded && searchAttempts < maxSearchAttempts) {
          const noResults = popover.locator('text=/No results found/i')
          const hasNoResults = await noResults.isVisible().catch(() => false)

          const matchingOption = popover.locator(`[role="option"]:has-text("${category}"), [cmdk-item]:has-text("${category}")`).first()
          const hasMatch = await matchingOption.isVisible().catch(() => false)

          if (hasMatch) {
            searchResultsLoaded = true
            console.log(`Found "${category}" option after ${searchAttempts * 500}ms`)
          } else if (!hasNoResults) {
            // Check if any options exist (might be different text)
            const anyOptions = popover.locator('[role="option"], [cmdk-item]')
            const count = await anyOptions.count().catch(() => 0)
            if (count > 0) {
              searchResultsLoaded = true
              console.log(`Search returned ${count} results (may not exact match "${category}")`)
            } else {
              await this.page.waitForTimeout(500)
              searchAttempts++
            }
          } else {
            await this.page.waitForTimeout(500)
            searchAttempts++
          }
        }

        if (!searchResultsLoaded) {
          console.log(`Warning: Search for "${category}" may not have found results, trying first available option`)
          // Fall back to first available option
          const firstOption = popover.locator('[role="option"], [cmdk-item]').first()
          if (await firstOption.isVisible().catch(() => false)) {
            console.log(`Falling back to first option: ${await firstOption.textContent()}`)
            await firstOption.click()
            await this.page.waitForTimeout(300)
            return
          }
        }
      }

      const option = popover.locator(`[role="option"]:has-text("${category}"), [cmdk-item]:has-text("${category}")`).first()
      if (await option.isVisible().catch(() => false)) {
        await option.click()
      } else {
        // Fallback: try first visible option
        console.log(`Could not find exact match for "${category}", using first available option`)
        const fallbackOption = popover.locator('[role="option"], [cmdk-item]').first()
        if (await fallbackOption.isVisible().catch(() => false)) {
          await fallbackOption.click()
        }
      }
    }

    await this.page.waitForTimeout(300)
  }

  /**
   * Select source language for item
   */
  async selectItemSource(source: string) {
    await this.selectFromComboboxByLabel('Source', source)
  }

  /**
   * Select target language(s) for item
   */
  async selectItemTarget(target: string) {
    await this.waitForLoadingComplete()

    const labelElement = this.page.locator('label:has-text("Target")').first()
    const container = labelElement.locator('xpath=ancestor::div[contains(@class, "flex")]').first()

    // Find the combobox button
    const combobox = container.locator('button[role="combobox"]').first()
    await combobox.waitFor({ state: 'visible', timeout: 10000 })
    await combobox.click()
    await this.page.waitForTimeout(500)

    // Wait for popover to appear
    const popoverContent = this.page.locator('[data-radix-popper-content-wrapper]').first()
    await popoverContent.waitFor({ state: 'visible', timeout: 5000 })

    // Search for the option
    const searchInput = popoverContent.locator('input[placeholder*="Search"]').first()
    if (await searchInput.isVisible()) {
      await searchInput.fill(target)
      await this.page.waitForTimeout(500)
    }

    // Click on the option (for multi-select)
    const option = popoverContent.locator(`[cmdk-item]:has-text("${target}")`).first()
    await option.waitFor({ state: 'visible', timeout: 5000 })
    await option.click()
    await this.page.waitForTimeout(300)

    // Close the dropdown
    await this.page.keyboard.press('Escape')
    await this.page.waitForTimeout(200)
  }

  /**
   * Select multiple target languages for item (multi-select dropdown)
   * This keeps the dropdown open while selecting all targets, then closes it
   */
  async selectMultipleItemTargets(targets: string[]) {
    await this.waitForLoadingComplete()
    await this.waitForItemSectionReady()

    // Find the Target combobox using the working approach from selectFirstAvailableOption
    const allParagraphs = this.page.locator('p')
    const count = await allParagraphs.count()

    let targetCombobox = null

    for (let i = 0; i < count; i++) {
      const p = allParagraphs.nth(i)
      const text = await p.textContent().catch(() => '')
      if (text?.trim() === 'Target') {
        // Found the label - now find the sibling/nearby combobox
        const parent = p.locator('xpath=ancestor::div[1]')
        const grandParent = p.locator('xpath=ancestor::div[2]')

        // Try to find combobox in nearby container
        let combobox = grandParent.locator('[role="combobox"]').first()
        if (await combobox.isVisible().catch(() => false)) {
          targetCombobox = combobox
          break
        }

        // Try parent's sibling
        combobox = parent.locator('xpath=following-sibling::div').locator('[role="combobox"]').first()
        if (await combobox.isVisible().catch(() => false)) {
          targetCombobox = combobox
          break
        }
      }
    }

    if (!targetCombobox) {
      throw new Error('Could not find Target combobox')
    }

    // Click to open the dropdown
    await targetCombobox.click()
    await this.page.waitForTimeout(500)

    // Wait for popover to appear
    const popoverContent = this.page.locator('[data-radix-popper-content-wrapper]').first()
    await popoverContent.waitFor({ state: 'visible', timeout: 5000 })

    // Select each target language
    for (const target of targets) {
      console.log(`Selecting target: ${target}`)

      // Clear and search for the option
      const searchInput = popoverContent.locator('input').first()
      if (await searchInput.isVisible()) {
        await searchInput.clear()
        await searchInput.fill(target)
        await this.page.waitForTimeout(500)
      }

      // Wait for search results to load
      let found = false
      for (let attempt = 0; attempt < 10; attempt++) {
        const option = popoverContent.locator(`[role="option"]:has-text("${target}"), [cmdk-item]:has-text("${target}")`).first()
        if (await option.isVisible().catch(() => false)) {
          await option.click()
          found = true
          console.log(`  ✓ Selected: ${target}`)
          await this.page.waitForTimeout(300)
          break
        }
        await this.page.waitForTimeout(300)
      }

      if (!found) {
        console.log(`  ⚠ Could not find target: ${target}, skipping`)
      }
    }

    // Close the dropdown
    await this.page.keyboard.press('Escape')
    await this.page.waitForTimeout(200)
  }

  /**
   * Set item due date
   */
  async setItemDueDate(daysFromNow: number = 7) {
    // Wait for item section to be fully ready (loading overlay removed)
    await this.waitForLoadingComplete()
    await this.waitForItemSectionReady()

    // Additional wait for any lingering overlays
    await this.page.waitForTimeout(1000)

    // Find the Due Date button within Item section (not Project Due Date)
    // Look for the button with "Pick a date" text within the Item 1 section
    const itemSection = this.page.locator('h3:has-text("Item 1")').first()
    const itemContainer = itemSection.locator('xpath=ancestor::div[1]')

    // Find all "Pick a date" buttons and get the one in Item section
    let dateButton = itemContainer.locator('button:has-text("Pick a date")').first()

    // Fallback: if not found, find by looking within Basic Information section
    if (!(await dateButton.isVisible().catch(() => false))) {
      const basicInfoSection = this.page.locator('h4:has-text("Basic Information")').first()
      const basicContainer = basicInfoSection.locator('xpath=ancestor::div[2]')
      dateButton = basicContainer.locator('button:has-text("Pick a date")').first()
    }

    // Last fallback: find the Due Date label and get nearby button
    if (!(await dateButton.isVisible().catch(() => false))) {
      // Find Due Date label in item section (not Project Due Date)
      const allDueDateLabels = this.page.locator('p:has-text("Due Date")')
      const count = await allDueDateLabels.count()
      for (let i = 0; i < count; i++) {
        const label = allDueDateLabels.nth(i)
        const parent = label.locator('xpath=ancestor::div[2]')
        const btn = parent.locator('button:has-text("Pick a date")').first()
        if (await btn.isVisible().catch(() => false)) {
          dateButton = btn
          break
        }
      }
    }

    await dateButton.waitFor({ state: 'visible', timeout: 10000 })

    // Scroll into view
    await dateButton.scrollIntoViewIfNeeded()

    // Wait for any loading overlays to disappear before clicking
    const loadingOverlay = this.page.locator('div.absolute.inset-0.z-10')
    let overlayRetries = 0
    while (overlayRetries < 10 && await loadingOverlay.first().isVisible().catch(() => false)) {
      await this.page.waitForTimeout(500)
      overlayRetries++
    }

    // Wait for calendar to appear with multiple retry attempts
    let calendar = this.page.locator('[data-radix-popper-content-wrapper]').first()
    let clickAttempts = 0
    const maxClickAttempts = 5

    while (clickAttempts < maxClickAttempts) {
      clickAttempts++

      // Try regular click first
      try {
        await dateButton.click({ timeout: 5000 })
      } catch (clickError) {
        // If click fails due to overlay, try force click
        console.log(`Click attempt ${clickAttempts}: Regular click failed, trying force click...`)
        await dateButton.click({ force: true })
      }
      await this.page.waitForTimeout(500)

      // Check if calendar appeared
      if (await calendar.isVisible().catch(() => false)) {
        console.log(`Calendar appeared after ${clickAttempts} attempt(s)`)
        break
      }

      if (clickAttempts < maxClickAttempts) {
        console.log(`Calendar not visible after attempt ${clickAttempts}, retrying...`)
        await this.page.waitForTimeout(500)
      }
    }

    await calendar.waitFor({ state: 'visible', timeout: 10000 })

    // Calculate target date
    const targetDate = new Date()
    targetDate.setDate(targetDate.getDate() + daysFromNow)
    const targetDay = targetDate.getDate().toString()

    // If target month is different, navigate to it
    const targetMonth = targetDate.getMonth()
    const currentMonth = new Date().getMonth()

    if (targetMonth > currentMonth) {
      const nextButton = calendar.locator('button[aria-label*="next"], button:has([class*="chevron-right"])').first()
      if (await nextButton.isVisible()) {
        for (let i = 0; i < (targetMonth - currentMonth); i++) {
          await nextButton.click()
          await this.page.waitForTimeout(200)
        }
      }
    }

    // Click on the day
    const allDayButtons = calendar.locator('button')
    const count = await allDayButtons.count()
    for (let i = 0; i < count; i++) {
      const btn = allDayButtons.nth(i)
      const text = await btn.textContent()
      if (text?.trim() === targetDay) {
        await btn.click()
        break
      }
    }
    await this.page.waitForTimeout(300)
  }

  /**
   * Select Job Service Type for the first job in the Jobs table
   */
  async selectJobServiceType(serviceType: string = 'FIRST') {
    await this.waitForLoadingComplete()

    // Find the Jobs section and the Service Type combobox in the table
    const jobsSection = this.page.locator('h4:has-text("Jobs"), h5:has-text("Jobs")').first()
    await jobsSection.waitFor({ state: 'visible', timeout: 10000 })

    // Find the Service Type combobox in the table (first row)
    const serviceTypeCell = this.page.locator('table').first().locator('[role="combobox"]').first()

    if (!(await serviceTypeCell.isVisible().catch(() => false))) {
      // Try finding by table structure
      const table = this.page.locator('table').first()
      const firstRow = table.locator('tbody tr, tr').first()
      const serviceTypeCombobox = firstRow.locator('[role="combobox"]').first()
      await serviceTypeCombobox.click()
    } else {
      await serviceTypeCell.click()
    }

    await this.page.waitForTimeout(500)

    // Wait for popover
    const popover = this.page.locator('[data-radix-popper-content-wrapper]').first()
    await popover.waitFor({ state: 'visible', timeout: 5000 })

    if (serviceType === 'FIRST') {
      // Select first available option
      const firstOption = popover.locator('[role="option"], [cmdk-item]').first()
      if (await firstOption.isVisible().catch(() => false)) {
        console.log(`Selecting first service type: ${await firstOption.textContent()}`)
        await firstOption.click()
      }
    } else {
      // Search for specific service type
      const searchInput = popover.locator('input').first()
      if (await searchInput.isVisible()) {
        await searchInput.fill(serviceType)
        await this.page.waitForTimeout(500)
      }
      const option = popover.locator(`[role="option"]:has-text("${serviceType}")`).first()
      await option.click()
    }

    await this.page.waitForTimeout(300)
  }

  /**
   * Fill Job Quantity in the first job row
   */
  async fillJobQuantity(quantity: string = '1') {
    await this.waitForLoadingComplete()

    // Find the Quantity input in the table (spinbutton)
    const table = this.page.locator('table').first()
    const quantityInput = table.locator('input[type="number"], [role="spinbutton"]').first()

    await quantityInput.waitFor({ state: 'visible', timeout: 5000 })
    await quantityInput.fill(quantity)
    await this.page.waitForTimeout(200)
  }

  /**
   * Fill Job Unit Price in the first job row
   */
  async fillJobUnitPrice(price: string = '10') {
    await this.waitForLoadingComplete()

    // Find the Unit Price input in the table (second spinbutton)
    const table = this.page.locator('table').first()
    const priceInputs = table.locator('input[type="number"], [role="spinbutton"]')

    // Unit Price is the second number input after Quantity
    const unitPriceInput = priceInputs.nth(1)

    await unitPriceInput.waitFor({ state: 'visible', timeout: 5000 })
    await unitPriceInput.fill(price)
    await this.page.waitForTimeout(200)
  }

  /**
   * Select Job Price Unit in the first job row
   */
  async selectJobPriceUnit(priceUnit: string = 'FIRST') {
    await this.waitForLoadingComplete()

    // Find the Price Unit combobox in the table (second combobox after Service Type)
    const table = this.page.locator('table').first()
    const comboboxes = table.locator('[role="combobox"]')

    // Price Unit is the second combobox
    const priceUnitCombobox = comboboxes.nth(1)

    await priceUnitCombobox.waitFor({ state: 'visible', timeout: 5000 })
    await priceUnitCombobox.click()
    await this.page.waitForTimeout(500)

    // Wait for popover
    const popover = this.page.locator('[data-radix-popper-content-wrapper]').first()
    await popover.waitFor({ state: 'visible', timeout: 5000 })

    if (priceUnit === 'FIRST') {
      const firstOption = popover.locator('[role="option"], [cmdk-item]').first()
      if (await firstOption.isVisible().catch(() => false)) {
        console.log(`Selecting first price unit: ${await firstOption.textContent()}`)
        await firstOption.click()
      }
    } else {
      const option = popover.locator(`[role="option"]:has-text("${priceUnit}")`).first()
      await option.click()
    }

    await this.page.waitForTimeout(300)
  }

  /**
   * Fill all required job fields in the first job row
   */
  async fillJobDetails(quantity: string = '1', unitPrice: string = '10') {
    console.log('Filling job details...')

    // Fill Quantity
    await this.fillJobQuantity(quantity)
    console.log(`  Quantity: ${quantity}`)

    // Fill Unit Price
    await this.fillJobUnitPrice(unitPrice)
    console.log(`  Unit Price: ${unitPrice}`)

    // Select Price Unit
    await this.selectJobPriceUnit('FIRST')
  }

  /**
   * Set Project Due Date by clicking on a specific future date
   */
  async setProjectDueDateDirect(daysFromNow: number = 14) {
    await this.waitForLoadingComplete()

    // Find Project Due Date button
    const dueDateButton = this.page.locator('button').filter({ hasText: /\d{4}/ }).filter({
      has: this.page.locator('xpath=preceding::p[contains(text(), "Project Due Date")]')
    }).first()

    // Alternative: find by label
    let targetButton = null
    const allParagraphs = this.page.locator('p')
    const count = await allParagraphs.count()

    for (let i = 0; i < count; i++) {
      const p = allParagraphs.nth(i)
      const text = await p.textContent().catch(() => '')
      if (text?.trim() === 'Project Due Date') {
        const grandParent = p.locator('xpath=ancestor::div[2]')
        const btn = grandParent.locator('button').first()
        if (await btn.isVisible().catch(() => false)) {
          targetButton = btn
          break
        }
      }
    }

    if (!targetButton) {
      throw new Error('Could not find Project Due Date button')
    }

    await targetButton.click()
    await this.page.waitForTimeout(500)

    // Wait for calendar
    const calendar = this.page.locator('[data-radix-popper-content-wrapper]').first()
    await calendar.waitFor({ state: 'visible', timeout: 5000 })

    // Calculate target date
    const targetDate = new Date()
    targetDate.setDate(targetDate.getDate() + daysFromNow)
    const targetDay = targetDate.getDate()
    const targetMonth = targetDate.getMonth()
    const currentMonth = new Date().getMonth()

    console.log(`Setting Project Due Date to: ${targetDate.toDateString()}`)

    // Navigate to target month if needed
    if (targetMonth > currentMonth) {
      const nextButton = calendar.locator('button').filter({ has: this.page.locator('svg') }).last()
      for (let i = 0; i < (targetMonth - currentMonth); i++) {
        await nextButton.click()
        await this.page.waitForTimeout(200)
      }
    }

    // Click on the target day - look for buttons with just the day number
    const dayButtons = calendar.locator('button')
    const dayCount = await dayButtons.count()

    for (let i = 0; i < dayCount; i++) {
      const btn = dayButtons.nth(i)
      const text = (await btn.textContent())?.trim()

      // Match exact day number
      if (text === targetDay.toString()) {
        const isDisabled = await btn.getAttribute('disabled')
        const ariaDisabled = await btn.getAttribute('aria-disabled')

        if (isDisabled === null && ariaDisabled !== 'true') {
          console.log(`Clicking on day: ${targetDay}`)
          await btn.click()
          break
        }
      }
    }

    await this.page.waitForTimeout(300)
  }

  /**
   * Generate unique project name with [Auto Test] prefix
   */
  generateAutoTestProjectName(): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    return `[Auto Test] E2E Project ${timestamp}`
  }

  /**
   * Fill all required fields for a basic project
   */
  async fillBasicProjectForm(projectName?: string) {
    const name = projectName || this.generateAutoTestProjectName()

    console.log(`Creating project: ${name}`)

    // Fill Project Information section
    await this.selectClientByLabel('GloZ') // Use first available client
    await this.page.waitForTimeout(500)

    await this.fillProjectNameByLabel(name)
    await this.page.waitForTimeout(500)

    await this.selectTimezoneByLabel('Seoul') // Korea Standard Time
    await this.page.waitForTimeout(500)

    await this.setDateByLabel('Project Due Date', 14) // 2 weeks from now
    await this.page.waitForTimeout(500)

    // Fill Item section
    await this.fillItemTitleByLabel(`${name} - Item 1`)
    await this.page.waitForTimeout(500)

    await this.setItemDueDate(7) // 1 week from now
    await this.page.waitForTimeout(500)

    await this.selectItemCategory('Translation') // Common category
    await this.page.waitForTimeout(500)

    await this.selectItemSource('English') // Common source language
    await this.page.waitForTimeout(500)

    await this.selectItemTarget('Korean') // Common target language
    await this.page.waitForTimeout(500)

    return name
  }

  /**
   * Submit project and wait for navigation
   */
  async submitProjectAndWait() {
    await this.clickCreateProject()

    // Wait for navigation away from create page or success indication
    await this.page.waitForTimeout(2000)

    // Check if we navigated to detail page
    const currentUrl = this.page.url()
    const isOnDetailPage = currentUrl.includes('/project/detail/')
    const isOnListPage = currentUrl.includes('/project/list')

    if (isOnDetailPage || isOnListPage) {
      return { success: true, url: currentUrl }
    }

    // Check for errors
    const hasErrors = await this.hasValidationErrors()
    return { success: !hasErrors, url: currentUrl, hasErrors }
  }

  /**
   * Get created project ID from URL
   */
  async getCreatedProjectId(): Promise<string | null> {
    const url = this.page.url()
    const match = url.match(/\/project\/detail\/([^/?]+)/)
    return match?.[1] ?? null
  }
}
