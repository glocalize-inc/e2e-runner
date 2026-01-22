import { v4 as uuidv4 } from 'uuid'
import type {
  TestCategory,
  TestConfig,
  TestStatus,
  TestRun,
  TestProgress,
  TestResult,
  LogEntry,
  TestScenario,
} from './types'

type EventCallback = (event: string, data: unknown) => void

// Use global to persist across hot reloads and API route boundaries
const MANAGER_VERSION = 1
const globalForTestRuns = globalThis as unknown as {
  testRunManagerInstance: TestRunManager | undefined
  testRunManagerVersion: number | undefined
}

/**
 * Singleton class to manage E2E test runs in memory.
 */
class TestRunManager {
  private runs: Map<string, TestRun> = new Map()
  private subscriptions: Map<string, Set<EventCallback>> = new Map()
  private activeRunId: string | null = null
  private maxHistorySize = 50

  constructor() {}

  static getInstance(): TestRunManager {
    if (globalForTestRuns.testRunManagerVersion !== MANAGER_VERSION) {
      globalForTestRuns.testRunManagerInstance = undefined
      globalForTestRuns.testRunManagerVersion = MANAGER_VERSION
    }
    if (!globalForTestRuns.testRunManagerInstance) {
      globalForTestRuns.testRunManagerInstance = new TestRunManager()
    }
    return globalForTestRuns.testRunManagerInstance
  }

  createRun(category: TestCategory, config: TestConfig): TestRun {
    if (this.activeRunId) {
      const activeRun = this.runs.get(this.activeRunId)
      if (activeRun && ['queued', 'running'].includes(activeRun.status)) {
        throw new Error('A test run is already in progress')
      }
    }

    const runId = uuidv4()
    const run: TestRun = {
      runId,
      status: 'queued',
      category,
      config,
      startedAt: new Date().toISOString(),
      progress: { passed: 0, failed: 0, pending: 0, total: 0 },
      logs: [],
      scenarios: [],
    }

    this.runs.set(runId, run)
    this.activeRunId = runId
    this.cleanupOldRuns()

    return run
  }

  getRun(runId: string): TestRun | undefined {
    return this.runs.get(runId)
  }

  getActiveRun(): TestRun | null {
    if (!this.activeRunId) return null
    return this.runs.get(this.activeRunId) ?? null
  }

  updateStatus(runId: string, status: TestStatus): void {
    const run = this.runs.get(runId)
    if (!run) return

    run.status = status
    if (status === 'completed' || status === 'failed' || status === 'cancelled') {
      run.completedAt = new Date().toISOString()
      if (this.activeRunId === runId) {
        this.activeRunId = null
      }
    }

    this.emit(runId, 'status', { status })
  }

  addLog(runId: string, type: LogEntry['type'], content: string): void {
    const run = this.runs.get(runId)
    if (!run) return

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      type,
      content,
    }

    run.logs.push(logEntry)
    this.emit(runId, 'log', logEntry)
  }

  updateProgress(runId: string, progress: Partial<TestProgress>): void {
    const run = this.runs.get(runId)
    if (!run) return

    run.progress = { ...run.progress, ...progress }
    this.emit(runId, 'progress', run.progress)
  }

  updateScenario(runId: string, scenario: TestScenario): void {
    const run = this.runs.get(runId)
    if (!run) return

    const existingIndex = run.scenarios.findIndex(s => s.id === scenario.id)
    if (existingIndex >= 0) {
      run.scenarios[existingIndex] = scenario
    } else {
      run.scenarios.push(scenario)
    }

    this.emit(runId, 'scenario', scenario)
  }

  setResults(runId: string, results: TestResult): void {
    const run = this.runs.get(runId)
    if (!run) return

    run.results = results
    this.emit(runId, 'complete', results)
  }

  subscribe(runId: string, callback: EventCallback): () => void {
    if (!this.subscriptions.has(runId)) {
      this.subscriptions.set(runId, new Set())
    }
    this.subscriptions.get(runId)!.add(callback)

    return () => {
      const subs = this.subscriptions.get(runId)
      if (subs) {
        subs.delete(callback)
        if (subs.size === 0) {
          this.subscriptions.delete(runId)
        }
      }
    }
  }

  private emit(runId: string, event: string, data: unknown): void {
    const subs = this.subscriptions.get(runId)
    if (subs) {
      subs.forEach(callback => callback(event, data))
    }
  }

  getHistory(limit = 20): TestRun[] {
    const allRuns = Array.from(this.runs.values())
    return allRuns
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
      .slice(0, limit)
  }

  canCancel(runId: string): boolean {
    const run = this.runs.get(runId)
    if (!run) return false
    return ['queued', 'running'].includes(run.status)
  }

  forceReset(): { cleared: boolean; runId?: string } {
    if (this.activeRunId) {
      const run = this.runs.get(this.activeRunId)
      if (run && ['queued', 'running'].includes(run.status)) {
        run.status = 'failed'
        run.completedAt = new Date().toISOString()
        const clearedRunId = this.activeRunId
        this.activeRunId = null
        return { cleared: true, runId: clearedRunId }
      }
    }
    this.activeRunId = null
    return { cleared: false }
  }

  private cleanupOldRuns(): void {
    const allRuns = Array.from(this.runs.entries())
    if (allRuns.length <= this.maxHistorySize) return

    allRuns.sort((a, b) =>
      new Date(a[1].startedAt).getTime() - new Date(b[1].startedAt).getTime()
    )

    const toRemove = allRuns.slice(0, allRuns.length - this.maxHistorySize)
    toRemove.forEach(([runId]) => {
      this.runs.delete(runId)
      this.subscriptions.delete(runId)
    })
  }
}

export const testRunManager = TestRunManager.getInstance()
