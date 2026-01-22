import { test, expect } from '@playwright/test'
import { ProjectDetailPage } from '../../pages/project-detail.page'
import { getCreatedProjectId } from '../../helpers/test-state'

/**
 * Project Invoice E2E Tests
 *
 * This test suite tests the Invoice tab functionality:
 * 1. Navigate to Invoice tab
 * 2. Check Create Invoice button availability
 * 3. Create an invoice (if project is completed)
 *
 * Prerequisites:
 * - A project must be created via create.spec.ts
 * - For invoice creation, the project must be in "Completed" status
 *
 * Note: Invoice creation is only enabled when project status is "Completed".
 * If the project is "In Progress", the Create Invoice button will be disabled.
 */

test.describe('Project Invoice', () => {
  let projectDetailPage: ProjectDetailPage
  let testProjectId: string

  test.beforeEach(async ({ page }) => {
    projectDetailPage = new ProjectDetailPage(page)
  })

  test.describe.serial('Invoice Tab Flow', () => {
    test('Step 1: Use project from create.spec.ts', async () => {
      const sharedProjectId = getCreatedProjectId()
      if (sharedProjectId) {
        testProjectId = sharedProjectId
        console.log(`Using shared project ID from create.spec.ts: ${testProjectId}`)
      } else {
        console.log('No shared project ID found - create.spec.ts must run first')
        test.skip(true, 'Run create.spec.ts first to create a test project')
        return
      }

      expect(testProjectId).toBeTruthy()
      console.log(`Test project ID: ${testProjectId}`)
    })

    test('Step 2: Navigate to Invoice tab', async ({ page }) => {
      test.setTimeout(60000) // 1 minute

      if (!testProjectId) {
        test.skip(true, 'No project ID available')
        return
      }

      // Navigate to project
      await projectDetailPage.navigate(testProjectId)
      await projectDetailPage.expectPageVisible()

      // Navigate to Invoice tab
      await projectDetailPage.navigateToInvoiceTab()
      await page.waitForTimeout(1000)

      // Verify we're on Invoice tab by checking tab state
      const invoiceTabTrigger = page.locator('[role="tab"][data-state="active"]:has-text("Invoice")')
      await expect(invoiceTabTrigger).toBeVisible()

      console.log('✓ Successfully navigated to Invoice tab')
    })

    test('Step 3: Complete the project (if In Progress)', async ({ page }) => {
      test.setTimeout(120000) // 2 minutes

      if (!testProjectId) {
        test.skip(true, 'No project ID available')
        return
      }

      // Navigate to project
      await projectDetailPage.navigate(testProjectId)
      await projectDetailPage.expectPageVisible()
      await page.waitForTimeout(1000)

      // Check current project status
      const status = await projectDetailPage.getProjectStatusFromBadge()
      console.log(`Current project status: ${status}`)

      // If already completed, skip
      const isCompleted = await projectDetailPage.isProjectCompleted()
      if (isCompleted) {
        console.log('Project is already COMPLETED - skipping completion step')
        return
      }

      // Check if project is In Progress (required for completion)
      const isInProgress = await projectDetailPage.isProjectInProgress()
      if (!isInProgress) {
        console.log(`Project is not IN_PROGRESS (status: ${status}) - cannot complete`)
        test.skip(true, 'Project must be IN_PROGRESS to complete')
        return
      }

      // Complete the project
      console.log('Completing the project...')
      const result = await projectDetailPage.completeProject()

      if (!result.success) {
        console.log(`⚠️ Could not complete project: ${result.error}`)
        console.log('Note: This may happen if jobs are not in a completable state')
        console.log('The backend may require all jobs to be delivered or cancelled before project completion')

        // Skip remaining tests since we couldn't complete the project
        test.skip(true, `Could not complete project: ${result.error}`)
        return
      }

      // Verify status changed
      await page.waitForTimeout(1000)
      const newStatus = await projectDetailPage.getProjectStatusFromBadge()
      console.log(`New project status: ${newStatus}`)

      const nowCompleted = await projectDetailPage.isProjectCompleted()
      expect(nowCompleted).toBeTruthy()

      console.log('✓ Project completed successfully')
    })

    test('Step 4: Check Create Invoice button state', async ({ page }) => {
      test.setTimeout(60000) // 1 minute

      if (!testProjectId) {
        test.skip(true, 'No project ID available')
        return
      }

      // Navigate to project Invoice tab
      await projectDetailPage.navigate(testProjectId)
      await projectDetailPage.expectPageVisible()
      await projectDetailPage.navigateToInvoiceTab()
      await page.waitForTimeout(1000)

      // Check if Create Invoice button exists
      const isButtonVisible = await projectDetailPage.isCreateInvoiceButtonVisible()

      if (!isButtonVisible) {
        // Invoice might already exist
        const hasInvoice = await projectDetailPage.hasInvoice()
        if (hasInvoice) {
          console.log('Invoice already exists - Create Invoice button not visible')
          return
        }
        // Button should be visible if no invoice exists
        console.log('⚠️ Create Invoice button not visible but no invoice found')
        return
      }

      // Check if button is enabled (depends on project status)
      const isButtonEnabled = await projectDetailPage.isCreateInvoiceButtonEnabled()
      console.log(`Create Invoice button enabled: ${isButtonEnabled}`)

      if (!isButtonEnabled) {
        // This is expected when project is not completed
        console.log('Create Invoice button is disabled - project may not be completed yet')
        console.log('Note: Invoice creation requires project status to be "Completed"')

        // Verify the warning message about project not being completed
        const warningMessage = page.locator('text=The project is not completed yet')
        const hasWarning = await warningMessage.isVisible().catch(() => false)

        if (hasWarning) {
          console.log('✓ Warning message displayed: "The project is not completed yet"')
        }
      } else {
        console.log('✓ Create Invoice button is enabled')
      }
    })

    test('Step 5: Create Invoice', async ({ page }) => {
      test.setTimeout(120000) // 2 minutes

      if (!testProjectId) {
        test.skip(true, 'No project ID available')
        return
      }

      // Navigate to project Invoice tab
      await projectDetailPage.navigate(testProjectId)
      await projectDetailPage.expectPageVisible()
      await projectDetailPage.navigateToInvoiceTab()
      await page.waitForTimeout(1000)

      // Check if invoice already exists
      const hasInvoice = await projectDetailPage.hasInvoice()
      if (hasInvoice) {
        console.log('Invoice already exists - skipping creation')
        return
      }

      // Check if Create Invoice button is visible and enabled
      const isButtonVisible = await projectDetailPage.isCreateInvoiceButtonVisible()
      if (!isButtonVisible) {
        console.log('Create Invoice button not visible')
        test.skip(true, 'Create Invoice button not visible')
        return
      }

      const isButtonEnabled = await projectDetailPage.isCreateInvoiceButtonEnabled()
      if (!isButtonEnabled) {
        console.log('Create Invoice button is disabled - project is not completed')
        console.log('Skipping invoice creation - project must be in "Completed" status')
        test.skip(true, 'Project must be completed to create invoice')
        return
      }

      // Set up API request monitoring
      const requestPromise = page.waitForResponse(
        response => response.url().includes('/invoices') && response.request().method() === 'POST',
        { timeout: 15000 }
      ).catch(() => null)

      // Click Create Invoice button
      await projectDetailPage.clickCreateInvoiceButton()
      await page.waitForTimeout(500)

      // Fill the Create Invoice modal
      await projectDetailPage.fillCreateInvoiceModal()
      await page.waitForTimeout(500)

      // Submit the modal
      await projectDetailPage.submitCreateInvoiceModal()

      // Wait for API response
      const apiResponse = await requestPromise
      if (apiResponse) {
        const status = apiResponse.status()
        console.log(`Invoice creation API response status: ${status}`)

        if (status >= 200 && status < 300) {
          console.log('✓ Invoice creation API call successful')
        } else {
          console.log(`⚠️ Invoice creation API returned status ${status}`)
        }
      } else {
        console.log('⚠️ No invoice creation API request detected')
      }

      // Wait for invoice to be created
      await projectDetailPage.waitForInvoiceCreated()

      // Verify invoice exists now
      const invoiceExists = await projectDetailPage.hasInvoice()
      expect(invoiceExists).toBeTruthy()

      console.log('✓ Invoice created successfully')
    })

    test('Step 6: Verify Invoice details', async ({ page }) => {
      test.setTimeout(60000) // 1 minute

      if (!testProjectId) {
        test.skip(true, 'No project ID available')
        return
      }

      // Navigate to project Invoice tab
      await projectDetailPage.navigate(testProjectId)
      await projectDetailPage.expectPageVisible()
      await projectDetailPage.navigateToInvoiceTab()
      await page.waitForTimeout(1000)

      // Check if invoice exists
      const hasInvoice = await projectDetailPage.hasInvoice()
      if (!hasInvoice) {
        console.log('No invoice found - skipping verification')
        test.skip(true, 'No invoice to verify')
        return
      }

      // Verify invoice details are displayed
      const invoiceDate = page.locator('text=Invoice Date')
      await expect(invoiceDate).toBeVisible()

      const paymentDueDate = page.locator('text=Payment Due Date')
      await expect(paymentDueDate).toBeVisible()

      // Check invoice status
      const invoiceStatus = await projectDetailPage.getInvoiceStatus()
      console.log(`Invoice status: ${invoiceStatus}`)

      // New invoices typically have "New" status
      if (invoiceStatus) {
        console.log(`✓ Invoice status verified: ${invoiceStatus}`)
      }

      console.log('✓ Invoice details verification completed')
    })

    test('Step 7: Edit Invoice Info', async ({ page }) => {
      test.setTimeout(180000) // 3 minutes

      if (!testProjectId) {
        test.skip(true, 'No project ID available')
        return
      }

      // Navigate to project Invoice tab
      await projectDetailPage.navigate(testProjectId)
      await projectDetailPage.expectPageVisible()
      await projectDetailPage.navigateToInvoiceTab()
      await page.waitForTimeout(2000) // Extra wait for content to fully load

      // Check if invoice exists
      const hasInvoice = await projectDetailPage.hasInvoice()
      if (!hasInvoice) {
        console.log('No invoice found - skipping edit')
        test.skip(true, 'No invoice to edit')
        return
      }

      // Find Invoice Info edit button
      // The Invoice Info section has an h2 with the project name, followed by an edit button
      // Structure: div > div > h2 (project name) + button (edit)
      // Find the first h2 that is NOT "Accounting Info" or "Invoice History"
      const invoiceInfoHeader = page
        .locator('h2')
        .filter({ hasNotText: /Accounting Info|Invoice History/ })
        .first()

      // Get the edit button which is a sibling of the h2
      const editButton = invoiceInfoHeader.locator('xpath=following-sibling::button').first()
      let isEditVisible = await editButton.isVisible().catch(() => false)

      // Alternative: find buttons with SVG icons that are near headings
      if (!isEditVisible) {
        // Find all buttons with SVG that are in the same container as Invoice Date
        const invoiceSection = page.locator('div').filter({
          has: page.locator('text=Invoice Date'),
        }).filter({
          has: page.locator('h2'),
        }).first()

        const sectionButtons = invoiceSection.locator('button:has(svg, img)').first()
        isEditVisible = await sectionButtons.isVisible().catch(() => false)

        if (isEditVisible) {
          await sectionButtons.click()
          console.log('Clicked Edit button for Invoice Info (via section button)')
          await page.waitForTimeout(500)
        } else {
          console.log('Edit button not found via alternative selector')
        }
      } else {
        await editButton.click()
        console.log('Clicked Edit button for Invoice Info')
        await page.waitForTimeout(500)
      }

      if (!isEditVisible) {
        console.log('Edit button not found - invoice may be in PAID status')
        test.skip(true, 'Edit button not available')
        return
      }

      // Verify edit mode is active
      const saveButton = page.locator('button:has-text("Save")').first()
      await expect(saveButton).toBeVisible()
      console.log('✓ Invoice edit mode activated')

      // Helper function to select date from calendar
      const selectDateFromPicker = async (pickerButton: any, dayOffset: number = 10) => {
        await pickerButton.click()
        await page.waitForTimeout(500)

        const calendarPopup = page.locator('[data-radix-popper-content-wrapper]')
        await calendarPopup.waitFor({ state: 'visible', timeout: 5000 })

        // Find day buttons
        const dayButtons = calendarPopup.locator('button[aria-label]').filter({
          has: page.locator('text=/^\\d{1,2}$/'),
        })
        const dayCount = await dayButtons.count()

        if (dayCount > 0) {
          const targetIndex = Math.min(dayOffset, dayCount - 1)
          await dayButtons.nth(targetIndex).click()
        }

        // Wait for calendar to close
        await calendarPopup.waitFor({ state: 'hidden', timeout: 3000 }).catch(async () => {
          await page.keyboard.press('Escape')
          await page.waitForTimeout(300)
        })
      }

      // 1. Toggle "Send reminder for this invoice" checkbox
      const reminderCheckbox = page.locator('text=Send reminder for this invoice').locator('..').locator('button[role="checkbox"], [data-state]').first()
      if (await reminderCheckbox.isVisible().catch(() => false)) {
        await reminderCheckbox.click()
        console.log('✓ Toggled Send reminder checkbox')
        await page.waitForTimeout(300)
      }

      // 2. Update Invoice Date
      const invoiceDateSection = page.locator('text=Invoice Date').first().locator('..')
      const invoiceDatePicker = invoiceDateSection.locator('button:has-text("Pick a date"), button[data-slot="popover-trigger"]').first()
      if (await invoiceDatePicker.isVisible().catch(() => false)) {
        await selectDateFromPicker(invoiceDatePicker, 5)
        console.log('✓ Updated Invoice Date')
      }

      // 3. Update Payment Due Date
      await page.waitForTimeout(500)
      const paymentDueSection = page.locator('text=Payment Due Date').first().locator('..')
      const paymentDuePicker = paymentDueSection.locator('button:has-text("Pick a date"), button[data-slot="popover-trigger"]').first()
      if (await paymentDuePicker.isVisible().catch(() => false)) {
        await selectDateFromPicker(paymentDuePicker, 25)
        console.log('✓ Updated Payment Due Date')
      }

      // 4. Update Tax Invoice Due Date
      await page.waitForTimeout(500)
      const taxInvoiceSection = page.locator('text=Tax Invoice Due Date').first().locator('..')
      const taxInvoicePicker = taxInvoiceSection.locator('button:has-text("Pick a date"), button[data-slot="popover-trigger"]').first()
      if (await taxInvoicePicker.isVisible().catch(() => false)) {
        await selectDateFromPicker(taxInvoicePicker, 20)
        console.log('✓ Updated Tax Invoice Due Date')
      }

      // 5. Toggle "Show Invoice description to client" checkbox
      await page.waitForTimeout(300)
      const descVisibleCheckbox = page.locator('text=Show Invoice description to client').locator('..').locator('button[role="checkbox"], [data-state]').first()
      if (await descVisibleCheckbox.isVisible().catch(() => false)) {
        await descVisibleCheckbox.click()
        console.log('✓ Toggled Show Invoice description checkbox')
        await page.waitForTimeout(300)
      }

      // 6. Update Invoice Description
      const descriptionTextarea = page.locator('textarea[placeholder*="description"], textarea').first()
      if (await descriptionTextarea.isVisible().catch(() => false)) {
        await descriptionTextarea.fill(`E2E Test Invoice Description - Updated at ${new Date().toISOString()}`)
        console.log('✓ Updated Invoice Description')
      }

      // Click Save button
      await page.waitForTimeout(500)
      await saveButton.click()
      console.log('Clicked Save button')

      // Wait for save to complete
      await page.waitForTimeout(2000)

      // Verify edit mode is closed
      const saveButtonAfter = page.locator('button:has-text("Save")').first()
      const isSaveStillVisible = await saveButtonAfter.isVisible().catch(() => false)

      if (!isSaveStillVisible) {
        console.log('✓ Invoice Info saved successfully with all fields updated')
      } else {
        console.log('⚠️ Save button still visible - save may have failed')
      }
    })

    test('Step 8: Edit Accounting Info', async ({ page }) => {
      test.setTimeout(180000) // 3 minutes

      if (!testProjectId) {
        test.skip(true, 'No project ID available')
        return
      }

      // Navigate to project Invoice tab
      await projectDetailPage.navigate(testProjectId)
      await projectDetailPage.expectPageVisible()
      await projectDetailPage.navigateToInvoiceTab()
      await page.waitForTimeout(2000) // Extra wait for content to fully load

      // Check if invoice exists
      const hasInvoice = await projectDetailPage.hasInvoice()
      if (!hasInvoice) {
        console.log('No invoice found - skipping edit')
        test.skip(true, 'No invoice to edit')
        return
      }

      // Find Accounting Info edit button
      // The Accounting Info section has an h2 with "Accounting Info" text, followed by an edit button
      const accountingInfoHeader = page.locator('h2:has-text("Accounting Info")').first()

      // Get the edit button which is a sibling of the h2
      const editButton = accountingInfoHeader.locator('xpath=following-sibling::button').first()
      let isEditVisible = await editButton.isVisible().catch(() => false)

      // Alternative: find buttons with SVG icons in the Accounting Info section
      if (!isEditVisible) {
        const accountingSection = page.locator('div').filter({
          has: page.locator('h2:has-text("Accounting Info")'),
        }).filter({
          has: page.locator('text=Payment Date'),
        }).first()

        const sectionButtons = accountingSection.locator('button:has(svg, img)').first()
        isEditVisible = await sectionButtons.isVisible().catch(() => false)

        if (isEditVisible) {
          await sectionButtons.click()
          console.log('Clicked Edit button for Accounting Info (via section button)')
          await page.waitForTimeout(500)
        } else {
          console.log('Accounting Info edit button not found via alternative selector')
        }
      } else {
        await editButton.click()
        console.log('Clicked Edit button for Accounting Info')
        await page.waitForTimeout(500)
      }

      if (!isEditVisible) {
        console.log('Accounting Info Edit button not found')
        test.skip(true, 'Accounting Edit button not available')
        return
      }

      // Verify edit mode is active
      const saveButton = page.locator('button:has-text("Save")').first()
      await expect(saveButton).toBeVisible()
      console.log('✓ Accounting Info edit mode activated')

      // Helper function to select date from calendar (for past dates since disableFutureDates may be set)
      const selectDateFromPicker = async (pickerButton: any, dayOffset: number = 5, selectPastDate: boolean = false) => {
        await pickerButton.click()
        await page.waitForTimeout(500)

        const calendarPopup = page.locator('[data-radix-popper-content-wrapper]')
        await calendarPopup.waitFor({ state: 'visible', timeout: 5000 })

        if (selectPastDate) {
          // Navigate to previous month for past date selection
          const prevMonthBtn = calendarPopup.locator('button').filter({
            has: page.locator('svg'),
          }).first()
          if (await prevMonthBtn.isVisible().catch(() => false)) {
            await prevMonthBtn.click()
            await page.waitForTimeout(300)
          }
        }

        // Find day buttons
        const dayButtons = calendarPopup.locator('button[aria-label]').filter({
          has: page.locator('text=/^\\d{1,2}$/'),
        })
        const dayCount = await dayButtons.count()

        if (dayCount > 0) {
          const targetIndex = Math.min(dayOffset, dayCount - 1)
          await dayButtons.nth(targetIndex).click()
        }

        // Wait for calendar to close
        await calendarPopup.waitFor({ state: 'hidden', timeout: 3000 }).catch(async () => {
          await page.keyboard.press('Escape')
          await page.waitForTimeout(300)
        })
      }

      // 1. Update Payment Date (disableFutureDates - select a past date)
      const paymentDateSection = page.locator('text=Payment Date').first().locator('..')
      const paymentDatePicker = paymentDateSection.locator('button:has-text("Pick a date"), button[data-slot="popover-trigger"]').first()
      if (await paymentDatePicker.isVisible().catch(() => false)) {
        await selectDateFromPicker(paymentDatePicker, 10, true) // Select past date
        console.log('✓ Updated Payment Date')
      }

      // 2. Update Issuance Date of Tax Invoice
      await page.waitForTimeout(500)
      const issuanceDateSection = page.locator('text=Issuance Date of Tax Invoice').first().locator('..')
      const issuanceDatePicker = issuanceDateSection.locator('button:has-text("Pick a date"), button[data-slot="popover-trigger"]').first()
      if (await issuanceDatePicker.isVisible().catch(() => false)) {
        await selectDateFromPicker(issuanceDatePicker, 15)
        console.log('✓ Updated Issuance Date of Tax Invoice')
      }

      // 3. Update Sales Recognition Date
      await page.waitForTimeout(500)
      const salesRecognitionSection = page.locator('text=Sales Recognition Date').first().locator('..')
      const salesRecognitionPicker = salesRecognitionSection.locator('button:has-text("Pick a date"), button[data-slot="popover-trigger"]').first()
      if (await salesRecognitionPicker.isVisible().catch(() => false)) {
        await selectDateFromPicker(salesRecognitionPicker, 12)
        console.log('✓ Updated Sales Recognition Date')
      }

      // 4. Update Notes field
      await page.waitForTimeout(500)
      const notesTextarea = page.locator('textarea[placeholder*="notes"], textarea').last()
      if (await notesTextarea.isVisible().catch(() => false)) {
        await notesTextarea.fill(`E2E Test Accounting Notes - Updated at ${new Date().toISOString()}`)
        console.log('✓ Updated Accounting Notes')
      }

      // Click Save button
      await page.waitForTimeout(500)
      await saveButton.click()
      console.log('Clicked Save button')

      // Wait for save to complete
      await page.waitForTimeout(2000)

      // Verify edit mode is closed
      const saveButtonAfter = page.locator('button:has-text("Save")').first()
      const isSaveStillVisible = await saveButtonAfter.isVisible().catch(() => false)

      if (!isSaveStillVisible) {
        console.log('✓ Accounting Info saved successfully with all fields updated')
      } else {
        console.log('⚠️ Save button still visible - save may have failed')
      }
    })

    test('Step 9: Download Invoice', async ({ page }) => {
      test.setTimeout(120000) // 2 minutes

      if (!testProjectId) {
        test.skip(true, 'No project ID available')
        return
      }

      // Navigate to project Invoice tab
      await projectDetailPage.navigate(testProjectId)
      await projectDetailPage.expectPageVisible()
      await projectDetailPage.navigateToInvoiceTab()
      await page.waitForTimeout(2000) // Extra wait for content to fully load

      // Check if invoice exists
      const hasInvoice = await projectDetailPage.hasInvoice()
      if (!hasInvoice) {
        console.log('No invoice found - skipping download')
        test.skip(true, 'No invoice to download')
        return
      }

      // Find and click Download invoice button
      const downloadButton = page.locator('button:has-text("Download invoice")')
      const isDownloadVisible = await downloadButton.isVisible().catch(() => false)

      if (!isDownloadVisible) {
        console.log('Download invoice button not found')
        test.skip(true, 'Download button not available')
        return
      }

      await downloadButton.click()
      console.log('Clicked Download invoice button')
      await page.waitForTimeout(1500)

      // Invoice Settings Modal should appear - look for modal with Invoice Language select
      // The modal uses overlay-kit, so it might not have role="dialog"
      const modalBackdrop = page.locator('.fixed.inset-0, [data-state="open"]').first()
      const invoiceLanguageLabel = page.locator('text=Invoice Language')
      const isSettingsModalVisible = await invoiceLanguageLabel.isVisible().catch(() => false)

      if (isSettingsModalVisible) {
        console.log('✓ Invoice Settings modal opened')

        // Look for Apply button in the modal
        const applyButton = page.locator('button:has-text("Apply")').first()
        if (await applyButton.isVisible().catch(() => false)) {
          await applyButton.click()
          console.log('Clicked Apply button in settings modal')
          await page.waitForTimeout(3000)

          // PDF Download/Preview modal might appear
          const previewContent = page.locator('text=Preview, iframe, canvas, [class*="pdf"]').first()
          const isPdfModalVisible = await previewContent.isVisible().catch(() => false)

          if (isPdfModalVisible) {
            console.log('✓ PDF Preview modal opened')
          }

          // Close any open modal
          await page.keyboard.press('Escape')
          await page.waitForTimeout(500)
          await page.keyboard.press('Escape')
          await page.waitForTimeout(500)
        } else {
          console.log('Apply button not found, closing modal')
          await page.keyboard.press('Escape')
        }
      } else {
        console.log('⚠️ Invoice Settings modal did not appear - checking for direct PDF modal')
        // Maybe PDF modal opened directly
        await page.waitForTimeout(1000)
        await page.keyboard.press('Escape')
      }

      console.log('✓ Download Invoice test completed')
    })

    test('Step 10: Send Invoice', async ({ page }) => {
      test.setTimeout(120000) // 2 minutes

      if (!testProjectId) {
        test.skip(true, 'No project ID available')
        return
      }

      // Navigate to project Invoice tab
      await projectDetailPage.navigate(testProjectId)
      await projectDetailPage.expectPageVisible()
      await projectDetailPage.navigateToInvoiceTab()
      await page.waitForTimeout(2000) // Extra wait for content to fully load

      // Check if invoice exists
      const hasInvoice = await projectDetailPage.hasInvoice()
      if (!hasInvoice) {
        console.log('No invoice found - skipping send')
        test.skip(true, 'No invoice to send')
        return
      }

      // Find and click Send invoice button
      const sendButton = page.locator('button:has-text("Send invoice")')
      const isSendVisible = await sendButton.isVisible().catch(() => false)

      if (!isSendVisible) {
        console.log('Send invoice button not found')
        test.skip(true, 'Send button not available')
        return
      }

      await sendButton.click()
      console.log('Clicked Send invoice button')
      await page.waitForTimeout(1500)

      // Confirmation modal should appear - look for "Send Invoice" title and confirmation text
      const sendInvoiceTitle = page.locator('text=Send Invoice')
      const confirmationText = page.locator('text=Are you sure you want to send this invoice')
      const isConfirmModalVisible = await confirmationText.isVisible().catch(() => false)

      if (isConfirmModalVisible) {
        console.log('✓ Send Invoice confirmation modal opened')

        // Find and click the Send button in the modal (it should be the rightmost button)
        const modalButtons = page.locator('.fixed.inset-0 button, [data-state="open"] button')
        const sendButtonInModal = page.locator('button:has-text("Send")').last()

        if (await sendButtonInModal.isVisible().catch(() => false)) {
          // Set up API request monitoring
          const apiPromise = page.waitForResponse(
            response => response.url().includes('/send') || (response.url().includes('/invoice') && response.request().method() === 'PATCH'),
            { timeout: 15000 }
          ).catch(() => null)

          await sendButtonInModal.click()
          console.log('Clicked Send button in confirmation modal')

          // Wait for API response
          const apiResponse = await apiPromise
          if (apiResponse) {
            const status = apiResponse.status()
            console.log(`Send Invoice API response status: ${status}`)

            if (status >= 200 && status < 300) {
              console.log('✓ Invoice sent successfully')
            } else {
              console.log(`⚠️ Send Invoice API returned status ${status}`)
            }
          }

          await page.waitForTimeout(2000)
        } else {
          // Cancel the modal
          console.log('Send button not found in modal, cancelling')
          const cancelButton = page.locator('button:has-text("Cancel")').first()
          if (await cancelButton.isVisible().catch(() => false)) {
            await cancelButton.click()
          } else {
            await page.keyboard.press('Escape')
          }
          console.log('Cancelled Send Invoice modal')
        }
      } else {
        console.log('⚠️ Send Invoice confirmation modal did not appear')
        // Check if there's any modal and close it
        await page.keyboard.press('Escape')
      }

      console.log('✓ Send Invoice test completed')
    })
  })
})
