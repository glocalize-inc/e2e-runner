// E2E Dashboard Types

export type TestCategory = 'auth' | 'home' | 'project' | 'all'
export type TestConfig = 'local' | 'staging' | 'hub'
export type TestStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
export type TestScenarioStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped'

export interface TestRunRequest {
  category: TestCategory
  config: TestConfig
}

export interface TestRunResponse {
  runId: string
  status: TestStatus
  streamUrl: string
}

export interface TestProgress {
  passed: number
  failed: number
  pending: number
  total: number
}

export interface TestScenario {
  id: string
  name: string
  file: string
  suite: string
  status: TestScenarioStatus
  duration?: number
  error?: string
  retries?: number
}

export interface TestResult {
  passed: number
  failed: number
  skipped: number
  duration: number
  scenarios?: TestScenario[]
}

export interface LogEntry {
  timestamp: string
  type: 'stdout' | 'stderr' | 'info' | 'error'
  content: string
}

export interface TestRun {
  runId: string
  status: TestStatus
  category: TestCategory
  config: TestConfig
  startedAt: string
  completedAt?: string
  progress: TestProgress
  results?: TestResult
  logs: LogEntry[]
  scenarios: TestScenario[]
}

// SSE Event Types
export interface SSELogEvent {
  type: 'log'
  data: LogEntry
}

export interface SSEProgressEvent {
  type: 'progress'
  data: TestProgress
}

export interface SSEScenarioEvent {
  type: 'scenario'
  data: TestScenario
}

export interface SSECompleteEvent {
  type: 'complete'
  data: TestResult
}

export interface SSEErrorEvent {
  type: 'error'
  data: { message: string }
}

export type SSEEvent = SSELogEvent | SSEProgressEvent | SSEScenarioEvent | SSECompleteEvent | SSEErrorEvent

// History
export interface TestRunSummary {
  runId: string
  status: TestStatus
  category: TestCategory
  config: TestConfig
  startedAt: string
  completedAt?: string
  results?: TestResult
}

export interface TestInfo {
  id: string
  name: string
  file: string
  suite: string
}

export interface TestListResponse {
  category: TestCategory
  total: number
  tests: TestInfo[]
}
