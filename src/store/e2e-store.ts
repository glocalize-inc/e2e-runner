import { create } from 'zustand'
import type {
  TestCategory,
  TestConfig,
  TestStatus,
  TestProgress,
  TestResult,
  LogEntry,
  TestScenario,
} from '../types'

// Constants for performance optimization
const MAX_LOGS = 5000
const LOG_TRIM_AMOUNT = 1000

interface E2EDashboardState {
  // Selection state
  selectedCategory: TestCategory
  selectedConfig: TestConfig

  // Active run state
  activeRunId: string | null
  status: TestStatus | null
  progress: TestProgress | null
  results: TestResult | null
  logs: LogEntry[]
  scenarios: TestScenario[]

  // UI state
  autoScroll: boolean
  isConnected: boolean
  showReport: boolean

  // Actions
  setCategory: (category: TestCategory) => void
  setConfig: (config: TestConfig) => void
  startRun: (runId: string) => void
  addLog: (log: LogEntry) => void
  addLogs: (logs: LogEntry[]) => void
  setProgress: (progress: TestProgress) => void
  setResults: (results: TestResult) => void
  setStatus: (status: TestStatus) => void
  setConnected: (connected: boolean) => void
  updateScenario: (scenario: TestScenario) => void
  toggleAutoScroll: () => void
  toggleReport: () => void
  clearLogs: () => void
  reset: () => void
}

const initialState = {
  selectedCategory: 'all' as TestCategory,
  selectedConfig: 'staging' as TestConfig,
  activeRunId: null as string | null,
  status: null as TestStatus | null,
  progress: null as TestProgress | null,
  results: null as TestResult | null,
  logs: [] as LogEntry[],
  scenarios: [] as TestScenario[],
  autoScroll: true,
  isConnected: false,
  showReport: false,
}

function trimLogs(logs: LogEntry[]): LogEntry[] {
  if (logs.length > MAX_LOGS) {
    return logs.slice(LOG_TRIM_AMOUNT)
  }
  return logs
}

export const useE2EDashboardStore = create<E2EDashboardState>((set) => ({
  ...initialState,

  setCategory: (category) => set({ selectedCategory: category }),

  setConfig: (config) => set({ selectedConfig: config }),

  startRun: (runId) =>
    set({
      activeRunId: runId,
      status: 'queued',
      progress: { passed: 0, failed: 0, pending: 0, total: 0 },
      results: null,
      logs: [],
      scenarios: [],
      showReport: false,
    }),

  addLog: (log) =>
    set((state) => ({
      logs: trimLogs([...state.logs, log]),
    })),

  addLogs: (newLogs) =>
    set((state) => ({
      logs: trimLogs([...state.logs, ...newLogs]),
    })),

  setProgress: (progress) => set({ progress }),

  setResults: (results) => set({ results, showReport: true }),

  setStatus: (status) => set({ status }),

  setConnected: (isConnected) => set({ isConnected }),

  updateScenario: (scenario) =>
    set((state) => {
      const existingIndex = state.scenarios.findIndex(s => s.id === scenario.id)
      if (existingIndex >= 0) {
        const newScenarios = [...state.scenarios]
        newScenarios[existingIndex] = scenario
        return { scenarios: newScenarios }
      }
      return { scenarios: [...state.scenarios, scenario] }
    }),

  toggleAutoScroll: () =>
    set((state) => ({ autoScroll: !state.autoScroll })),

  toggleReport: () =>
    set((state) => ({ showReport: !state.showReport })),

  clearLogs: () => set({ logs: [] }),

  reset: () =>
    set({
      activeRunId: null,
      status: null,
      progress: null,
      results: null,
      logs: [],
      scenarios: [],
      isConnected: false,
      showReport: false,
    }),
}))

// Selector hooks
export const useSelectedCategory = () => useE2EDashboardStore((s) => s.selectedCategory)
export const useSelectedConfig = () => useE2EDashboardStore((s) => s.selectedConfig)
export const useActiveRunId = () => useE2EDashboardStore((s) => s.activeRunId)
export const useTestStatus = () => useE2EDashboardStore((s) => s.status)
export const useTestProgress = () => useE2EDashboardStore((s) => s.progress)
export const useTestResults = () => useE2EDashboardStore((s) => s.results)
export const useLogs = () => useE2EDashboardStore((s) => s.logs)
export const useScenarios = () => useE2EDashboardStore((s) => s.scenarios)
export const useAutoScroll = () => useE2EDashboardStore((s) => s.autoScroll)
export const useIsConnected = () => useE2EDashboardStore((s) => s.isConnected)
export const useShowReport = () => useE2EDashboardStore((s) => s.showReport)
export const useIsRunning = () => {
  const status = useE2EDashboardStore((s) => s.status)
  return status === 'queued' || status === 'running'
}
export const useIsCompleted = () => {
  const status = useE2EDashboardStore((s) => s.status)
  return status === 'completed' || status === 'failed' || status === 'cancelled'
}
