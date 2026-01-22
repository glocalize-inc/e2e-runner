import type { TestProgress, TestResult, TestScenario, TestScenarioStatus } from './types'

interface ParseResult {
  type: 'progress' | 'result' | 'log' | 'scenario'
  progress?: TestProgress
  result?: TestResult
  scenario?: TestScenario
  log?: string
}

function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, '')
}

/**
 * Parser for Playwright test output.
 */
export class OutputParser {
  private totalTests = 0
  private passedTests = 0
  private failedTests = 0
  private skippedTests = 0
  private scenarios: Map<string, TestScenario> = new Map()
  private currentErrorScenarioId: string | null = null
  private errorBuffer: string[] = []

  parseLine(line: string): ParseResult {
    const cleanLine = stripAnsi(line)

    const runningMatch = cleanLine.match(/Running (\d+) tests? using/)
    if (runningMatch && runningMatch[1]) {
      this.totalTests = parseInt(runningMatch[1], 10)
      return {
        type: 'progress',
        progress: this.getProgress(),
      }
    }

    const testLineResult = this.parseTestLine(cleanLine)
    if (testLineResult) {
      return testLineResult
    }

    if (this.currentErrorScenarioId && cleanLine.trim()) {
      if (cleanLine.includes('Error:') || cleanLine.includes('expect(') ||
          cleanLine.includes('Timeout') || cleanLine.includes('at ') ||
          this.errorBuffer.length > 0) {
        this.errorBuffer.push(cleanLine)

        if (this.errorBuffer.length > 20) {
          this.flushErrorBuffer()
        }
      }
    }

    const resultMatch = cleanLine.match(/(\d+) passed|(\d+) failed/)
    if (resultMatch) {
      this.flushErrorBuffer()

      const passedMatch = cleanLine.match(/(\d+) passed/)
      const failedMatch = cleanLine.match(/(\d+) failed/)
      const skippedMatch = cleanLine.match(/(\d+) skipped/)

      if (passedMatch && passedMatch[1]) {
        this.passedTests = parseInt(passedMatch[1], 10)
      }
      if (failedMatch && failedMatch[1]) {
        this.failedTests = parseInt(failedMatch[1], 10)
      }
      if (skippedMatch && skippedMatch[1]) {
        this.skippedTests = parseInt(skippedMatch[1], 10)
      }

      const durationMatch = cleanLine.match(/\((\d+(?:\.\d+)?)(s|ms|m)\)/)
      if (durationMatch && durationMatch[1] && durationMatch[2]) {
        const result = this.getResult(durationMatch[1], durationMatch[2])
        return {
          type: 'result',
          result,
        }
      }

      return {
        type: 'progress',
        progress: this.getProgress(),
      }
    }

    return {
      type: 'log',
      log: line,
    }
  }

  private parseTestLine(line: string): ParseResult | null {
    const testPattern = /^\s*([✓✔✘✗×\-↻·○◌])\s+(\d+)\s+\[([^\]]+)\]\s+›\s+([^›]+\.spec\.ts[^\s]*)\s+›\s+(.+)$/
    let match = line.match(testPattern)

    if (!match) {
      const runningPattern = /^\s+(\d+)\s+\[([^\]]+)\]\s+›\s+([^›]+\.spec\.ts[^\s]*)\s+›\s+(.+)$/
      const runningMatch = line.match(runningPattern)
      if (runningMatch) {
        const [, , , filePath, rest] = runningMatch
        if (filePath && rest) {
          return this.createScenarioFromParts(null, filePath, rest)
        }
      }
      return null
    }

    const statusChar = match[1]
    const filePath = match[4]
    const rest = match[5]

    if (!filePath || !rest) return null

    return this.createScenarioFromParts(statusChar ?? null, filePath, rest)
  }

  private normalizeFilePath(filePath: string): string {
    let normalized = filePath
    if (normalized.startsWith('e2e/')) {
      normalized = normalized.slice(4)
    }
    normalized = normalized.replace(/\.spec\.ts:\d+:\d+$/, '.spec.ts')
    return normalized
  }

  private createScenarioFromParts(
    statusChar: string | null,
    filePath: string,
    rest: string
  ): ParseResult {
    const parts = rest.split(' › ')
    const testName = parts[parts.length - 1] ?? rest
    const suite = parts.length > 1 ? parts.slice(0, -1).join(' › ') : ''

    const durationMatch = testName.match(/\((\d+(?:\.\d+)?)(s|ms|m)\)/)
    let duration: number | undefined
    let cleanTestName = testName

    if (durationMatch && durationMatch[1] && durationMatch[2]) {
      duration = this.parseDuration(durationMatch[1], durationMatch[2])
      cleanTestName = testName.replace(/\s*\([^)]+\)\s*$/, '')
    }

    const retryMatch = testName.match(/\(retry #(\d+)\)/)
    const retries = retryMatch && retryMatch[1] ? parseInt(retryMatch[1], 10) : undefined
    if (retryMatch && cleanTestName) {
      cleanTestName = cleanTestName.replace(/\s*\(retry #\d+\)\s*/, '')
    }

    const isSkipped = testName.includes('[skipped]') || statusChar === '-'
    if (isSkipped && cleanTestName) {
      cleanTestName = cleanTestName.replace(/\s*\[skipped\]\s*/, '')
    }

    let status: TestScenarioStatus
    let shouldCountAsCompleted = false

    if (statusChar === null) {
      status = 'running'
    } else if (statusChar === '✓' || statusChar === '✔') {
      status = 'passed'
      shouldCountAsCompleted = true
    } else if (statusChar === '✘' || statusChar === '✗' || statusChar === '×') {
      status = 'failed'
      shouldCountAsCompleted = true
    } else if (statusChar === '↻') {
      status = 'running'
    } else if (isSkipped || statusChar === '-') {
      status = 'skipped'
      shouldCountAsCompleted = true
    } else if (statusChar === '·' || statusChar === '○' || statusChar === '◌') {
      status = 'running'
    } else {
      status = 'pending'
    }

    const finalTestName = cleanTestName?.trim() ?? testName.trim()
    const normalizedFilePath = this.normalizeFilePath(filePath.trim())
    const scenarioId = `${normalizedFilePath}:${finalTestName}`

    if (this.currentErrorScenarioId && this.currentErrorScenarioId !== scenarioId) {
      this.flushErrorBuffer()
    }

    let scenario = this.scenarios.get(scenarioId)
    const isNewScenario = !scenario

    if (!scenario) {
      scenario = {
        id: scenarioId,
        name: finalTestName,
        file: normalizedFilePath,
        suite: suite.trim(),
        status,
        duration,
        retries,
      }
      this.scenarios.set(scenarioId, scenario)
    } else {
      const wasRunning = scenario.status === 'running' || scenario.status === 'pending'
      scenario.status = status
      if (duration) scenario.duration = duration
      if (retries) scenario.retries = retries

      if (wasRunning && shouldCountAsCompleted) {
        if (status === 'passed') this.passedTests++
        else if (status === 'failed') this.failedTests++
        else if (status === 'skipped') this.skippedTests++
      }
    }

    if (isNewScenario && shouldCountAsCompleted) {
      if (status === 'passed') this.passedTests++
      else if (status === 'failed') this.failedTests++
      else if (status === 'skipped') this.skippedTests++
    }

    if (status === 'failed') {
      this.currentErrorScenarioId = scenarioId
    }

    return {
      type: 'scenario',
      scenario: { ...scenario },
      progress: this.getProgress(),
    }
  }

  private flushErrorBuffer(): void {
    if (this.currentErrorScenarioId && this.errorBuffer.length > 0) {
      const scenario = this.scenarios.get(this.currentErrorScenarioId)
      if (scenario) {
        scenario.error = this.errorBuffer.join('\n')
      }
    }
    this.errorBuffer = []
    this.currentErrorScenarioId = null
  }

  private parseDuration(value: string, unit: string): number {
    let duration = parseFloat(value)
    if (unit === 's') {
      duration *= 1000
    } else if (unit === 'm') {
      duration *= 60 * 1000
    }
    return Math.round(duration)
  }

  getProgress(): TestProgress {
    const completed = this.passedTests + this.failedTests + this.skippedTests
    return {
      passed: this.passedTests,
      failed: this.failedTests,
      pending: Math.max(0, this.totalTests - completed),
      total: this.totalTests,
    }
  }

  getScenarios(): TestScenario[] {
    return Array.from(this.scenarios.values())
  }

  getResult(durationValue: string, durationUnit: string): TestResult {
    this.flushErrorBuffer()

    let duration = parseFloat(durationValue)
    if (durationUnit === 's') {
      duration *= 1000
    } else if (durationUnit === 'm') {
      duration *= 60 * 1000
    }

    return {
      passed: this.passedTests,
      failed: this.failedTests,
      skipped: this.skippedTests,
      duration: Math.round(duration),
      scenarios: this.getScenarios(),
    }
  }

  reset(): void {
    this.totalTests = 0
    this.passedTests = 0
    this.failedTests = 0
    this.skippedTests = 0
    this.scenarios.clear()
    this.currentErrorScenarioId = null
    this.errorBuffer = []
  }
}
