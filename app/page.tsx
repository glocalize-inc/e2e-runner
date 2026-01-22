'use client'

import { useActiveRunId, useShowReport, useIsCompleted, useIsRunning, useSelectedCategory, useE2EDashboardStore } from '@/store/e2e-store'
import { useSSEStream } from '@/hooks/use-sse-stream'
import { useStartTest, useCancelTest, useResetTests } from '@/hooks/mutations'
import { TerminalViewer, TestScenarioList, TestReport } from '@/components'
import { Play, Server, Loader2, StopCircle, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TestCategory } from '@/types'

const CATEGORIES: { value: TestCategory; label: string }[] = [
  { value: 'all', label: 'All Tests' },
  { value: 'auth', label: 'Auth' },
  { value: 'home', label: 'Home' },
  { value: 'project', label: 'Project' },
]

export default function E2EDashboardPage() {
  const activeRunId = useActiveRunId()
  const showReport = useShowReport()
  const isCompleted = useIsCompleted()
  const isRunning = useIsRunning()
  const selectedCategory = useSelectedCategory()
  const { setCategory } = useE2EDashboardStore()

  const { mutate: startTest, isPending: isStartPending } = useStartTest()
  const { mutate: cancelTest, isPending: isCancelPending } = useCancelTest()
  const { mutate: resetTests, isPending: isResetPending } = useResetTests()

  useSSEStream({ runId: activeRunId, enabled: !!activeRunId })

  const handleRun = () => {
    startTest({ category: selectedCategory, config: 'staging' })
  }

  const handleStop = () => {
    if (activeRunId) {
      cancelTest(activeRunId)
    }
  }

  const handleReset = () => {
    if (confirm('Reset all stuck test runs?')) {
      resetTests()
    }
  }

  return (
    <div className="h-screen bg-gray-900 flex flex-col overflow-hidden">
      {/* Compact Header */}
      <div className="flex-shrink-0 bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Title + Category */}
          <div className="flex items-center gap-6">
            <h1 className="text-lg font-semibold text-white">E2E Test Dashboard</h1>

            {/* Category Selector */}
            <div className="flex items-center gap-1 bg-gray-700 rounded-lg p-1">
              {CATEGORIES.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setCategory(value)}
                  disabled={isRunning}
                  className={cn(
                    'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                    selectedCategory === value
                      ? 'bg-brand text-white'
                      : 'text-gray-300 hover:text-white hover:bg-gray-600',
                    isRunning && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Center: Environment Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 rounded-lg">
            <Server className="w-4 h-4 text-brand" />
            <span className="text-sm text-gray-300">Staging</span>
            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-green-500 text-white rounded">
              OK
            </span>
          </div>

          {/* Right: Run Button */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {isRunning ? (
                <button
                  onClick={handleStop}
                  disabled={isCancelPending}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors bg-red-600 hover:bg-red-700 text-white"
                >
                  {isCancelPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Stopping...
                    </>
                  ) : (
                    <>
                      <StopCircle className="w-4 h-4" />
                      Stop
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleRun}
                  disabled={isStartPending}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors',
                    isStartPending
                      ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                      : 'bg-brand hover:bg-brand/90 text-white'
                  )}
                >
                  {isStartPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Run Tests
                    </>
                  )}
                </button>
              )}

              {/* Reset Button */}
              <button
                onClick={handleReset}
                disabled={isResetPending}
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                title="Reset stuck runs"
              >
                {isResetPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RotateCcw className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Scenarios & Terminal */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Test Scenarios Panel */}
        <div className="w-[350px] flex-shrink-0 bg-gray-800 border-r border-gray-700 flex flex-col min-h-0 overflow-hidden">
          <TestScenarioList className="flex-1 min-h-0 overflow-hidden" />
        </div>

        {/* Terminal / Report Panel */}
        <div className="flex-1 bg-gray-900 flex flex-col min-h-0 overflow-hidden">
          {showReport && isCompleted ? (
            <TestReport className="flex-1 min-h-0 overflow-hidden" />
          ) : (
            <TerminalViewer className="flex-1 min-h-0 overflow-hidden" />
          )}
        </div>
      </div>
    </div>
  )
}
