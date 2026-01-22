import { spawn, ChildProcess } from 'child_process'
import path from 'path'
import fs from 'fs'
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

function getPlaywrightBinary(projectRoot: string): string {
  // Try to find the playwright binary in node_modules
  const localBin = path.join(projectRoot, 'node_modules', '.bin', 'playwright')
  if (fs.existsSync(localBin)) {
    return localBin
  }
  // Fallback to npx (for local development)
  return 'npx'
}

function isVercelEnvironment(): boolean {
  return !!process.env.VERCEL || !!process.env.VERCEL_ENV
}

async function ensureBrowsersInstalled(projectRoot: string): Promise<{ success: boolean; message: string }> {
  if (!isVercelEnvironment()) {
    return { success: true, message: 'Local environment - browsers assumed to be installed' }
  }

  const browsersPath = '/tmp/pw-browsers'

  // Check if browsers are already installed in /tmp
  if (fs.existsSync(browsersPath) && fs.readdirSync(browsersPath).length > 0) {
    return { success: true, message: 'Browsers already installed in /tmp' }
  }

  // Install browsers to /tmp
  return new Promise((resolve) => {
    const playwrightBin = getPlaywrightBinary(projectRoot)
    const useNpx = playwrightBin === 'npx'

    const args = useNpx
      ? ['playwright', 'install', 'chromium']
      : ['install', 'chromium']

    const installProcess = spawn(playwrightBin, args, {
      cwd: projectRoot,
      env: {
        ...process.env,
        HOME: '/tmp',
        PLAYWRIGHT_BROWSERS_PATH: browsersPath,
      },
    })

    let output = ''
    installProcess.stdout?.on('data', (data) => {
      output += data.toString()
    })
    installProcess.stderr?.on('data', (data) => {
      output += data.toString()
    })

    installProcess.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, message: 'Browsers installed successfully' })
      } else {
        resolve({ success: false, message: `Browser installation failed: ${output}` })
      }
    })

    installProcess.on('error', (err) => {
      resolve({ success: false, message: `Browser installation error: ${err.message}` })
    })
  })
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
      baseEnv.PLAYWRIGHT_BASE_URL = process.env.NEXT_PUBLIC_E2E_STAGING_URL || 'https://gloz-dev.gloground.com'
      break
    case 'hub':
      baseEnv.PLAYWRIGHT_BASE_URL = process.env.NEXT_PUBLIC_E2E_HUB_URL || 'http://localhost:3000'
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

  // Ensure browsers are installed (especially for Vercel)
  if (isVercelEnvironment()) {
    testRunManager.addLog(runId, 'info', 'Vercel environment detected - checking browsers...')
    const browserResult = await ensureBrowsersInstalled(projectRoot)
    testRunManager.addLog(runId, 'info', browserResult.message)
    if (!browserResult.success) {
      testRunManager.addLog(runId, 'error', 'Failed to install browsers')
      testRunManager.updateStatus(runId, 'failed')
      return
    }
  }

  testRunManager.addLog(runId, 'info', '─'.repeat(60))

  const playwrightBin = getPlaywrightBinary(projectRoot)
  const useNpx = playwrightBin === 'npx'

  const args = useNpx
    ? ['playwright', 'test', testPattern, '--reporter=list']
    : ['test', testPattern, '--reporter=list']

  if (run.config === 'staging') {
    args.push('--config=playwright.staging.config.ts')
  } else if (run.config === 'hub') {
    args.push('--config=playwright.hub.config.ts')
  }

  if (run.category !== 'all') {
    args.push('--project=chromium')
  }

  // Environment setup for Vercel serverless
  const execEnv: Record<string, string | undefined> = {
    ...process.env,
    ...configEnv,
    FORCE_COLOR: '1',
    CI: 'true',
  }

  // In Vercel, we need to use /tmp for writable directories
  if (isVercelEnvironment()) {
    execEnv.HOME = '/tmp'
    execEnv.npm_config_cache = '/tmp/.npm'
    execEnv.PLAYWRIGHT_BROWSERS_PATH = '/tmp/pw-browsers'
  }

  testRunManager.addLog(runId, 'info', `Using playwright: ${playwrightBin}`)

  const child = spawn(playwrightBin, args, {
    cwd: projectRoot,
    env: execEnv as NodeJS.ProcessEnv,
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
