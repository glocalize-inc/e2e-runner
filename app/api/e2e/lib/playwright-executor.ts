import { spawn, ChildProcess } from 'child_process'
import path from 'path'
import type { TestCategory, TestConfig } from './types'
import { testRunManager } from './test-run-manager'
import { OutputParser } from './output-parser'

// Build version for cache invalidation
const globalForProcesses = globalThis as unknown as {
  activePlaywrightProcesses: Map<string, ChildProcess> | undefined
}

function getActiveProcesses(): Map<string, ChildProcess> {
  if (!globalForProcesses.activePlaywrightProcesses) {
    globalForProcesses.activePlaywrightProcesses = new Map()
  }
  return globalForProcesses.activePlaywrightProcesses
}

function getTestPattern(category: TestCategory): string {
  switch (category) {
    case 'auth':
      return 'e2e/tests/auth/'
    case 'home':
      return 'e2e/tests/home/'
    case 'project':
      return 'e2e/tests/project/'
    case 'all':
    default:
      return 'e2e/tests/'
  }
}

function getConfigEnv(config: TestConfig): Record<string, string> {
  const baseEnv: Record<string, string> = {}

  switch (config) {
    case 'staging':
      baseEnv.PLAYWRIGHT_BASE_URL = process.env.E2E_STAGING_URL || 'https://gloz-dev.gloground.com'
      break
    case 'hub':
      baseEnv.PLAYWRIGHT_BASE_URL = process.env.E2E_HUB_URL || 'http://localhost:3000'
      break
    case 'local':
    default:
      baseEnv.PLAYWRIGHT_BASE_URL = 'http://localhost:3001'
      break
  }

  return baseEnv
}

export async function executePlaywrightTests(runId: string): Promise<void> {
  const run = testRunManager.getRun(runId)
  if (!run) {
    throw new Error(`Run ${runId} not found`)
  }

  const testPattern = getTestPattern(run.category)
  const configEnv = getConfigEnv(run.config)
  const parser = new OutputParser()

  const projectRoot = process.cwd()

  testRunManager.updateStatus(runId, 'running')
  testRunManager.addLog(runId, 'info', `Starting E2E tests for category: ${run.category}`)
  testRunManager.addLog(runId, 'info', `Config: ${run.config}`)
  testRunManager.addLog(runId, 'info', `Test pattern: ${testPattern}`)
  testRunManager.addLog(runId, 'info', '─'.repeat(60))

  const args = [
    'playwright',
    'test',
    testPattern,
    '--reporter=list',
  ]

  if (run.config === 'staging') {
    args.push('--config=playwright.staging.config.ts')
  } else if (run.config === 'hub') {
    args.push('--config=playwright.hub.config.ts')
  }

  if (run.category !== 'all') {
    args.push('--project=chromium')
  }

  const child = spawn('npx', args, {
    cwd: projectRoot,
    env: {
      ...process.env,
      ...configEnv,
      FORCE_COLOR: '1',
      CI: 'true',
    },
    detached: true,
  })

  getActiveProcesses().set(runId, child)

  child.stdout?.on('data', (data: Buffer) => {
    const output = data.toString()
    const lines = output.split('\n')

    for (const line of lines) {
      if (!line.trim()) continue

      const parseResult = parser.parseLine(line)
      testRunManager.addLog(runId, 'stdout', line)

      if (parseResult.progress) {
        testRunManager.updateProgress(runId, parseResult.progress)
      }

      if (parseResult.type === 'scenario' && parseResult.scenario) {
        testRunManager.updateScenario(runId, parseResult.scenario)
      }

      if (parseResult.type === 'result' && parseResult.result) {
        testRunManager.setResults(runId, parseResult.result)
      }
    }
  })

  child.stderr?.on('data', (data: Buffer) => {
    const output = data.toString()
    const lines = output.split('\n')

    for (const line of lines) {
      if (!line.trim()) continue
      testRunManager.addLog(runId, 'stderr', line)
    }
  })

  return new Promise((resolve, reject) => {
    child.on('close', (code) => {
      getActiveProcesses().delete(runId)

      const progress = parser.getProgress()

      if (code === 0) {
        testRunManager.addLog(runId, 'info', '─'.repeat(60))
        testRunManager.addLog(runId, 'info', `✓ All tests passed!`)
        testRunManager.updateStatus(runId, 'completed')

        const currentRun = testRunManager.getRun(runId)
        if (!currentRun?.results) {
          testRunManager.setResults(runId, {
            passed: progress.passed,
            failed: progress.failed,
            skipped: progress.total - progress.passed - progress.failed,
            duration: Date.now() - new Date(currentRun!.startedAt).getTime(),
            scenarios: parser.getScenarios(),
          })
        }

        resolve()
      } else if (code === null) {
        testRunManager.addLog(runId, 'info', '─'.repeat(60))
        testRunManager.addLog(runId, 'info', 'Test run was cancelled')
        testRunManager.updateStatus(runId, 'cancelled')
        resolve()
      } else {
        testRunManager.addLog(runId, 'info', '─'.repeat(60))
        testRunManager.addLog(runId, 'error', `Tests failed with exit code: ${code}`)
        testRunManager.updateStatus(runId, 'failed')

        const currentRun = testRunManager.getRun(runId)
        if (!currentRun?.results) {
          testRunManager.setResults(runId, {
            passed: progress.passed,
            failed: progress.failed,
            skipped: progress.total - progress.passed - progress.failed,
            duration: Date.now() - new Date(currentRun!.startedAt).getTime(),
            scenarios: parser.getScenarios(),
          })
        }

        resolve()
      }
    })

    child.on('error', (error) => {
      getActiveProcesses().delete(runId)
      testRunManager.addLog(runId, 'error', `Failed to start tests: ${error.message}`)
      testRunManager.updateStatus(runId, 'failed')
      reject(error)
    })
  })
}

export function cancelTest(runId: string): boolean {
  const activeProcesses = getActiveProcesses()
  const childProcess = activeProcesses.get(runId)
  if (childProcess) {
    try {
      if (childProcess.pid) {
        process.kill(-childProcess.pid, 'SIGKILL')
      } else {
        childProcess.kill('SIGKILL')
      }
    } catch (e) {
      childProcess.kill('SIGKILL')
    }
    activeProcesses.delete(runId)
    return true
  }
  return false
}

export function canExecuteTests(): { allowed: boolean; reason?: string } {
  const nodeEnv = process.env.NODE_ENV
  const allowExecution = process.env.NEXT_PUBLIC_E2E_ALLOW_EXECUTION === 'true'

  if (nodeEnv === 'production' && !allowExecution) {
    return {
      allowed: false,
      reason: 'E2E tests cannot be run in production. Set E2E_ALLOW_EXECUTION=true to enable.',
    }
  }

  const activeRun = testRunManager.getActiveRun()
  if (activeRun && ['queued', 'running'].includes(activeRun.status)) {
    return {
      allowed: false,
      reason: `A test run is already in progress (${activeRun.runId})`,
    }
  }

  return { allowed: true }
}
