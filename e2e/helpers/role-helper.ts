import { Page } from '@playwright/test'

/**
 * Get current role from localStorage
 */
export async function getCurrentRole(page: Page): Promise<{ name: string; type: string } | null> {
  const value = await page.evaluate(() => {
    const stored = window.localStorage.getItem('currentRole')
    return stored ? JSON.parse(stored) : null
  })
  return value
}

/**
 * Ensure user is on LPM role by switching if necessary.
 * Returns true if user is now on LPM role, false otherwise.
 */
export async function ensureLpmRole(page: Page): Promise<boolean> {
  const currentRole = await getCurrentRole(page)

  if (currentRole?.name === 'LPM') {
    return true
  }

  console.log('Current role is not LPM, attempting to switch...')

  // Try to switch to LPM role using the role switch button
  const switchButton = page.locator('button[role="switch"]').first()
  const hasSwitchButton = await switchButton.isVisible({ timeout: 5000 }).catch(() => false)

  if (!hasSwitchButton) {
    console.log('Role switch not available - user may not have LPM role')
    return false
  }

  // Check if switch is currently on TAD (unchecked = TAD, checked = LPM)
  const switchState = await switchButton.getAttribute('data-state')
  if (switchState !== 'checked') {
    await switchButton.click()
    await page.waitForURL('**/home', { timeout: 10000 })
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})

    // Verify role changed to LPM
    const newRole = await getCurrentRole(page)

    if (newRole?.name === 'LPM') {
      console.log('✅ Successfully switched to LPM role')
      return true
    } else {
      console.log('Failed to switch to LPM role')
      return false
    }
  }

  return true
}

/**
 * Ensure user is on TAD role by switching if necessary.
 * Returns true if user is now on TAD role, false otherwise.
 */
export async function ensureTadRole(page: Page): Promise<boolean> {
  const currentRole = await getCurrentRole(page)

  if (currentRole?.name === 'TAD') {
    return true
  }

  console.log('Current role is not TAD, attempting to switch...')

  // Try to switch to TAD role using the role switch button
  const switchButton = page.locator('button[role="switch"]').first()
  const hasSwitchButton = await switchButton.isVisible({ timeout: 5000 }).catch(() => false)

  if (!hasSwitchButton) {
    console.log('Role switch not available - user may not have TAD role')
    return false
  }

  // Check if switch is currently on LPM (checked = LPM, unchecked = TAD)
  const switchState = await switchButton.getAttribute('data-state')
  if (switchState === 'checked') {
    await switchButton.click()
    await page.waitForURL('**/home', { timeout: 10000 })
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})

    // Verify role changed to TAD
    const newRole = await getCurrentRole(page)

    if (newRole?.name === 'TAD') {
      console.log('✅ Successfully switched to TAD role')
      return true
    } else {
      console.log('Failed to switch to TAD role')
      return false
    }
  }

  return true
}
