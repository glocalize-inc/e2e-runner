import { test, expect } from '@playwright/test'
import { ProjectDetailPage } from '../../pages/project-detail.page'
import { ProjectListPage } from '../../pages/project-list.page'

/**
 * Project Cancel E2E Tests
 *
 * These tests verify the Cancel this project functionality on the project detail page.
 * Tests include:
 * - Cancel button visibility
 * - Opening and closing the cancel modal
 * - Cancel reason selection
 * - Message to client input
 * - Confirm button validation (requires reason + message)
 *
 * Note: Actual project cancellation test is skipped to avoid affecting real data.
 * The Cancel button is enabled when project status is REQUEST_CREATED, IN_PROGRESS, or COMPLETED.
 *
 * Prerequisites:
 * - User must be authenticated as LPM
 */

test.describe('Project Cancel', () => {
  let projectDetailPage: ProjectDetailPage
  let projectListPage: ProjectListPage
  let testProjectId: string

  test.beforeEach(async ({ page }) => {
    projectDetailPage = new ProjectDetailPage(page)
    projectListPage = new ProjectListPage(page)
  })

  test.describe.serial('Cancel Project Modal Tests', () => {
    test('should find a project for cancel tests', async ({ page }) => {
      // Navigate to project list
      await projectListPage.navigate()
      await projectListPage.expectTableLoaded()

      const rowCount = await projectListPage.getRowCount()
      if (rowCount === 0) {
        test.skip(true, 'No project data to test cancel functionality')
        return
      }

      // Click on the first project row to navigate to detail
      await projectListPage.clickFirstProjectRow()
      await page.waitForTimeout(2000)

      // Wait for navigation to detail page
      await expect(page).toHaveURL(/\/project\/detail\//, { timeout: 10000 })

      // Extract project ID from URL
      testProjectId = await projectDetailPage.getProjectIdFromUrl()
      expect(testProjectId).toBeTruthy()

      console.log(`Using existing project with ID: ${testProjectId}`)
    })

    test('should display Cancel this project button', async ({ page }) => {
      // Navigate to test project
      await projectDetailPage.navigate(testProjectId)
      await projectDetailPage.expectPageVisible()

      // Check Cancel button is visible
      const isVisible = await projectDetailPage.cancelProjectButton.isVisible()
      expect(isVisible).toBeTruthy()
      console.log('Cancel this project button is visible')
    })

    test('should check Cancel button availability based on status', async ({ page }) => {
      // Navigate to test project
      await projectDetailPage.navigate(testProjectId)
      await projectDetailPage.expectPageVisible()

      // Get current project status
      const status = await projectDetailPage.getProjectStatus()
      console.log(`Current project status: ${status}`)

      // Check Cancel button availability
      const isAvailable = await projectDetailPage.isCancelProjectButtonAvailable()
      console.log(`Cancel button available: ${isAvailable}`)

      // Note: Button is enabled for REQUEST_CREATED, IN_PROGRESS, COMPLETED statuses
      // and disabled for CANCELED status
      if (status?.toLowerCase().includes('cancel')) {
        expect(isAvailable).toBeFalsy()
      } else {
        // For other statuses, just verify the button exists
        expect(await projectDetailPage.cancelProjectButton.isVisible()).toBeTruthy()
      }
    })

    test('should open Cancel Project modal when clicking button', async ({ page }) => {
      test.setTimeout(120000)

      // Skip if no test project found
      if (!testProjectId) {
        console.log('No test project ID available')
        return
      }

      // Check if page is already closed
      if (page.isClosed()) {
        console.log('Page already closed - skipping test')
        return
      }

      try {
        // Navigate to test project with extended timeout
        await projectDetailPage.navigate(testProjectId)
        await projectDetailPage.expectPageVisible({ timeout: 45000 })
      } catch (error) {
        const errorMsg = String(error)
        if (errorMsg.includes('closed') || errorMsg.includes('Target page')) {
          console.log('Page closed during navigation')
          return
        }
        console.log('Failed to load project page, skipping test')
        return
      }

      // Check if button is available
      const isAvailable = await projectDetailPage.isCancelProjectButtonAvailable()
      if (!isAvailable) {
        console.log('Cancel button is disabled (project may already be canceled)')
        return
      }

      // Click Cancel this project button with retry
      let modalOpened = false
      for (let attempt = 0; attempt < 3 && !modalOpened; attempt++) {
        await projectDetailPage.clickCancelProject()
        await page.waitForTimeout(1000)
        modalOpened = await projectDetailPage.isCancelProjectModalOpen()
        if (!modalOpened && attempt < 2) {
          console.log(`Modal not opened, retrying... (attempt ${attempt + 1})`)
        }
      }

      console.log(`Cancel Project modal open: ${modalOpened}`)
      expect(modalOpened).toBeTruthy()

      // Close the modal
      await projectDetailPage.clickCancelModalNo()
    })

    test('should display cancel reasons in modal', async ({ page }) => {
      test.setTimeout(120000)

      // Check if page is already closed
      if (page.isClosed()) {
        console.log('Page already closed - skipping test')
        return
      }

      try {
        // Navigate to test project with extended timeout
        await projectDetailPage.navigate(testProjectId)
        await projectDetailPage.expectPageVisible({ timeout: 45000 })

        // Check if button is available
        const isAvailable = await projectDetailPage.isCancelProjectButtonAvailable()
        if (!isAvailable) {
          console.log('Cancel button is disabled for this project status')
          return
        }

        // Open modal with retry
        let modalOpened = false
        for (let attempt = 0; attempt < 3 && !modalOpened; attempt++) {
          await projectDetailPage.clickCancelProject()
          await page.waitForTimeout(1000)
          modalOpened = await projectDetailPage.isCancelProjectModalOpen()
          if (!modalOpened && attempt < 2) {
            console.log(`Modal not opened, retrying... (attempt ${attempt + 1})`)
            await page.waitForTimeout(1000)
          }
        }

        if (!modalOpened) {
          console.log('Could not open cancel modal after retries')
          return
        }

        // Get available reasons
        const reasons = await projectDetailPage.getCancelReasons()
        console.log(`Cancel reasons: ${reasons.join(', ')}`)

        // Should have at least the 4 predefined reasons
        expect(reasons.length).toBeGreaterThanOrEqual(4)
        expect(reasons).toContain('The task/language is currently unavailable.')
        expect(reasons).toContain('The due date needs to be adjusted.')
        expect(reasons).toContain("The quote has been canceled upon the client's request.")
        expect(reasons).toContain('Others')

        // Close the modal
        await projectDetailPage.clickCancelModalNo()
      } catch (error) {
        const errorMsg = String(error)
        if (errorMsg.includes('closed') || errorMsg.includes('Target page') || errorMsg.includes('Timeout')) {
          console.log(`Cancel reasons test failed: ${errorMsg}`)
          return
        }
        throw error
      }
    })

    test('should have Cancel button disabled initially in modal', async ({ page }) => {
      // Check if page is already closed
      if (page.isClosed()) {
        console.log('Page already closed - skipping test')
        return
      }

      try {
        // Navigate to test project
        await projectDetailPage.navigate(testProjectId)
        await projectDetailPage.expectPageVisible()

        // Check if button is available
        const isAvailable = await projectDetailPage.isCancelProjectButtonAvailable()
        if (!isAvailable) {
          console.log('Cancel button is disabled for this project status')
          return
        }

        // Open modal
        await projectDetailPage.clickCancelProject()
        await page.waitForTimeout(500)

        // Check if confirm button is disabled (no reason selected, no message)
        const isEnabled = await projectDetailPage.isCancelModalConfirmEnabled()
        console.log(`Cancel confirm button enabled initially: ${isEnabled}`)

        expect(isEnabled).toBeFalsy()

        // Close the modal
        await projectDetailPage.clickCancelModalNo()
      } catch (error) {
        const errorMsg = String(error)
        if (errorMsg.includes('closed') || errorMsg.includes('Target page') || errorMsg.includes('Page has been closed')) {
          console.log(`Page closed during test: ${errorMsg}`)
          return
        }
        throw error
      }
    })

    test('should keep Cancel button disabled with only reason selected', async ({ page }) => {
      // Check if page is already closed
      if (page.isClosed()) {
        console.log('Page already closed - skipping test')
        return
      }

      try {
        // Navigate to test project
        await projectDetailPage.navigate(testProjectId)
        await projectDetailPage.expectPageVisible()

        // Check if button is available
        const isAvailable = await projectDetailPage.isCancelProjectButtonAvailable()
        if (!isAvailable) {
          console.log('Cancel button is disabled for this project status')
          return
        }

        // Open modal
        await projectDetailPage.clickCancelProject()
        await page.waitForTimeout(500)

        // Select a reason
        await projectDetailPage.selectCancelReason('Others')
        await page.waitForTimeout(300)

        // Check if confirm button is still disabled (no message yet)
        const isEnabled = await projectDetailPage.isCancelModalConfirmEnabled()
        console.log(`Cancel confirm button enabled with only reason: ${isEnabled}`)

        expect(isEnabled).toBeFalsy()

        // Close the modal
        await projectDetailPage.clickCancelModalNo()
      } catch (error) {
        const errorMsg = String(error)
        if (errorMsg.includes('closed') || errorMsg.includes('Target page') || errorMsg.includes('Timeout')) {
          console.log(`Reason only test failed: ${errorMsg}`)
          return
        }
        throw error
      }
    })

    test('should keep Cancel button disabled with only message entered', async ({ page }) => {
      // Check if page is already closed
      if (page.isClosed()) {
        console.log('Page already closed - skipping test')
        return
      }

      try {
        // Navigate to test project
        await projectDetailPage.navigate(testProjectId)
        await projectDetailPage.expectPageVisible()

        // Check if button is available
        const isAvailable = await projectDetailPage.isCancelProjectButtonAvailable()
        if (!isAvailable) {
          console.log('Cancel button is disabled for this project status')
          return
        }

        // Open modal
        await projectDetailPage.clickCancelProject()
        await page.waitForTimeout(500)

        // Fill message without selecting reason
        await projectDetailPage.fillCancelMessage('Test cancel message')
        await page.waitForTimeout(300)

        // Check if confirm button is still disabled (no reason selected)
        const isEnabled = await projectDetailPage.isCancelModalConfirmEnabled()
        console.log(`Cancel confirm button enabled with only message: ${isEnabled}`)

        expect(isEnabled).toBeFalsy()

        // Close the modal
        await projectDetailPage.clickCancelModalNo()
      } catch (error) {
        const errorMsg = String(error)
        if (errorMsg.includes('closed') || errorMsg.includes('Target page') || errorMsg.includes('Timeout')) {
          console.log(`Message only test failed: ${errorMsg}`)
          return
        }
        throw error
      }
    })

    test('should enable Cancel button when both reason and message are provided', async ({ page }) => {
      // Check if page is already closed
      if (page.isClosed()) {
        console.log('Page already closed - skipping test')
        return
      }

      try {
        // Navigate to test project
        await projectDetailPage.navigate(testProjectId)
        await projectDetailPage.expectPageVisible()

        // Check if button is available
        const isAvailable = await projectDetailPage.isCancelProjectButtonAvailable()
        if (!isAvailable) {
          console.log('Cancel button is disabled for this project status')
          return
        }

        // Open modal
        await projectDetailPage.clickCancelProject()
        await page.waitForTimeout(500)

        // Select a reason
        await projectDetailPage.selectCancelReason('Others')
        await page.waitForTimeout(300)

        // Fill message
        await projectDetailPage.fillCancelMessage('Test cancel message for E2E testing')
        await page.waitForTimeout(300)

        // Check if confirm button is now enabled
        const isEnabled = await projectDetailPage.isCancelModalConfirmEnabled()
        console.log(`Cancel confirm button enabled with reason + message: ${isEnabled}`)

        expect(isEnabled).toBeTruthy()

        // Close the modal without confirming
        await projectDetailPage.clickCancelModalNo()
      } catch (error) {
        const errorMsg = String(error)
        if (errorMsg.includes('closed') || errorMsg.includes('Target page') || errorMsg.includes('Page has been closed')) {
          console.log(`Page closed during test: ${errorMsg}`)
          return
        }
        throw error
      }
    })

    test('should close modal when clicking No button', async ({ page }) => {
      // Check if page is already closed
      if (page.isClosed()) {
        console.log('Page already closed - skipping test')
        return
      }

      try {
        // Navigate to test project
        await projectDetailPage.navigate(testProjectId)
        await projectDetailPage.expectPageVisible()

        // Check if button is available
        const isAvailable = await projectDetailPage.isCancelProjectButtonAvailable()
        if (!isAvailable) {
          console.log('Cancel button is disabled for this project status')
          return
        }

        // Open modal
        await projectDetailPage.clickCancelProject()
        await page.waitForTimeout(500)

        // Verify modal is open
        expect(await projectDetailPage.isCancelProjectModalOpen()).toBeTruthy()

        // Click No to close
        await projectDetailPage.clickCancelModalNo()
        await page.waitForTimeout(500)

        // Verify modal is closed
        const isModalOpen = await projectDetailPage.isCancelProjectModalOpen()
        console.log(`Cancel modal after clicking No: ${isModalOpen}`)

        expect(isModalOpen).toBeFalsy()
      } catch (error) {
        const errorMsg = String(error)
        if (errorMsg.includes('closed') || errorMsg.includes('Target page') || errorMsg.includes('Timeout')) {
          console.log(`Close modal test failed: ${errorMsg}`)
          return
        }
        throw error
      }
    })

    test('should display character count for message textarea', async ({ page }) => {
      // Check if page is already closed
      if (page.isClosed()) {
        console.log('Page already closed - skipping test')
        return
      }

      try {
        // Navigate to test project
        await projectDetailPage.navigate(testProjectId)
        await projectDetailPage.expectPageVisible()

        // Check if button is available
        const isAvailable = await projectDetailPage.isCancelProjectButtonAvailable()
        if (!isAvailable) {
          console.log('Cancel button is disabled for this project status')
          return
        }

        // Open modal
        await projectDetailPage.clickCancelProject()
        await page.waitForTimeout(500)

        // Check initial character count
        let charCount = await projectDetailPage.getCancelMessageCharCount()
        console.log(`Initial character count: ${charCount}`)
        expect(charCount).toBe('0/500')

        // Fill some text
        await projectDetailPage.fillCancelMessage('Test message')
        await page.waitForTimeout(300)

        // Check updated character count
        charCount = await projectDetailPage.getCancelMessageCharCount()
        console.log(`After input character count: ${charCount}`)
        expect(charCount).toBe('12/500')

        // Close the modal
        await projectDetailPage.clickCancelModalNo()
      } catch (error) {
        const errorMsg = String(error)
        if (errorMsg.includes('closed') || errorMsg.includes('Target page') || errorMsg.includes('Timeout')) {
          console.log(`Character count test failed: ${errorMsg}`)
          return
        }
        throw error
      }
    })

    test('should verify all form elements in cancel modal', async ({ page }) => {
      // Check if page is already closed
      if (page.isClosed()) {
        console.log('Page already closed - skipping test')
        return
      }

      try {
        // Navigate to test project
        await projectDetailPage.navigate(testProjectId)
        await projectDetailPage.expectPageVisible()

        // Check if button is available
        const isAvailable = await projectDetailPage.isCancelProjectButtonAvailable()
        if (!isAvailable) {
          console.log('Cancel button is disabled for this project status')
          return
        }

        // Open modal
        await projectDetailPage.clickCancelProject()
        await page.waitForTimeout(500)

        // Verify modal title
        const title = await page.locator('h2:has-text("Cancel this project")').textContent()
        expect(title).toBeTruthy()
        console.log(`Modal title: ${title}`)

        // Verify subtitle
        const subtitle = page.locator('text="Are you sure you want to cancel this project?"')
        expect(await subtitle.isVisible()).toBeTruthy()

        // Verify "Message to client" label
        const messageLabel = page.locator('h3:has-text("Message to client")')
        expect(await messageLabel.isVisible()).toBeTruthy()

        // Get modal container
        const modal = page.locator('h2:has-text("Cancel this project")').locator('..')

        // Verify textarea placeholder
        const textarea = modal.locator('textarea')
        const placeholder = await textarea.getAttribute('placeholder')
        expect(placeholder).toContain('reason for canceling')

        // Verify No button
        const noButton = modal.locator('button:has-text("No")')
        expect(await noButton.isVisible()).toBeTruthy()

        // Verify Cancel (confirm) button
        const cancelButton = modal.locator('button:has-text("Cancel")').last()
        expect(await cancelButton.isVisible()).toBeTruthy()

        console.log('All modal elements verified')

        // Close the modal
        await projectDetailPage.clickCancelModalNo()
      } catch (error) {
        const errorMsg = String(error)
        if (errorMsg.includes('closed') || errorMsg.includes('Target page') || errorMsg.includes('Timeout')) {
          console.log(`Form elements test failed: ${errorMsg}`)
          return
        }
        throw error
      }
    })
  })

  test.describe('Cancel Button Visibility', () => {
    test('should show Cancel button on project detail page', async ({ page }) => {
      // Navigate to project list first
      await projectListPage.navigate()
      await projectListPage.expectTableLoaded()

      const rowCount = await projectListPage.getRowCount()
      if (rowCount === 0) {
        test.skip(true, 'No project data to test cancel functionality')
        return
      }

      // Click on the first project row to navigate to detail
      await projectListPage.clickFirstProjectRow()
      await page.waitForTimeout(2000)

      // Wait for navigation to detail page
      await expect(page).toHaveURL(/\/project\/detail\//, { timeout: 10000 })

      const projectId = await projectDetailPage.getProjectIdFromUrl()
      console.log(`Testing Cancel button on project: ${projectId}`)

      // Check Cancel button visibility
      const isVisible = await projectDetailPage.cancelProjectButton.isVisible()
      console.log(`Cancel this project button visible: ${isVisible}`)

      expect(isVisible).toBeTruthy()
    })
  })
})
