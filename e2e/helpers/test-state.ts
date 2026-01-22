import * as fs from 'fs'
import * as path from 'path'

const STATE_FILE = path.join(__dirname, '..', '.test-state.json')

interface TestState {
  createdProjectId?: string
  createdAt?: string
}

/**
 * Save test state to file for sharing between test files
 */
export function saveTestState(state: Partial<TestState>): void {
  let currentState: TestState = {}

  if (fs.existsSync(STATE_FILE)) {
    try {
      currentState = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'))
    } catch {
      currentState = {}
    }
  }

  const newState = { ...currentState, ...state }
  fs.writeFileSync(STATE_FILE, JSON.stringify(newState, null, 2))
  console.log(`[TestState] Saved: ${JSON.stringify(state)}`)
}

/**
 * Load test state from file
 */
export function loadTestState(): TestState {
  if (!fs.existsSync(STATE_FILE)) {
    console.log('[TestState] No state file found')
    return {}
  }

  try {
    const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'))
    console.log(`[TestState] Loaded: ${JSON.stringify(state)}`)
    return state
  } catch {
    console.log('[TestState] Failed to parse state file')
    return {}
  }
}

/**
 * Clear test state file
 */
export function clearTestState(): void {
  if (fs.existsSync(STATE_FILE)) {
    fs.unlinkSync(STATE_FILE)
    console.log('[TestState] Cleared state file')
  }
}

/**
 * Get created project ID from test state
 */
export function getCreatedProjectId(): string | undefined {
  const state = loadTestState()
  return state.createdProjectId
}

/**
 * Set created project ID in test state
 */
export function setCreatedProjectId(projectId: string): void {
  saveTestState({
    createdProjectId: projectId,
    createdAt: new Date().toISOString()
  })
}
