'use client'

import { memo, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { Check, X, Loader2, Clock, ChevronDown, ChevronRight } from 'lucide-react'
import { useScenarios, useSelectedCategory, useActiveRunId } from '@/store/e2e-store'
import { useTestList } from '@/hooks/queries'
import type { TestScenario, TestScenarioStatus } from '@/types'

interface TestScenarioListProps {
  className?: string
}

const StatusDot = memo(function StatusDot({ status }: { status: TestScenarioStatus }) {
  const styles: Record<TestScenarioStatus, string> = {
    passed: 'bg-emerald-400',
    failed: 'bg-red-400',
    skipped: 'bg-gray-500',
    running: 'bg-blue-400 animate-pulse',
    pending: 'bg-gray-600',
  }
  return <div className={cn('w-2 h-2 rounded-full flex-shrink-0', styles[status])} />
})

const ScenarioRow = memo(function ScenarioRow({ scenario }: { scenario: TestScenario }) {
  const statusColors: Record<TestScenarioStatus, string> = {
    passed: 'text-emerald-400',
    failed: 'text-red-400',
    skipped: 'text-gray-500',
    running: 'text-blue-400',
    pending: 'text-gray-500',
  }

  const bgColors: Record<TestScenarioStatus, string> = {
    passed: 'hover:bg-emerald-500/10',
    failed: 'bg-red-500/10 hover:bg-red-500/20',
    skipped: 'hover:bg-gray-500/10',
    running: 'bg-blue-500/10',
    pending: 'hover:bg-gray-700/50',
  }

  return (
    <div className={cn('flex items-center gap-2 px-2 py-1 rounded transition-colors', bgColors[scenario.status])}>
      <StatusDot status={scenario.status} />
      <span className={cn('text-xs truncate flex-1', statusColors[scenario.status])}>
        {scenario.name}
      </span>
      {scenario.duration && (
        <span className="text-[10px] text-gray-600 flex-shrink-0">
          {scenario.duration >= 1000 ? `${(scenario.duration / 1000).toFixed(1)}s` : `${scenario.duration}ms`}
        </span>
      )}
    </div>
  )
})

const FileGroup = memo(function FileGroup({
  file,
  scenarios,
  defaultExpanded = true,
}: {
  file: string
  scenarios: TestScenario[]
  defaultExpanded?: boolean
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  const passedCount = scenarios.filter(s => s.status === 'passed').length
  const failedCount = scenarios.filter(s => s.status === 'failed').length
  const runningCount = scenarios.filter(s => s.status === 'running').length
  const totalCount = scenarios.length

  const hasFailures = failedCount > 0
  const allPassed = passedCount === totalCount
  const isRunning = runningCount > 0

  const headerBg = hasFailures
    ? 'bg-red-500/20 border-l-red-400'
    : allPassed
    ? 'bg-emerald-500/20 border-l-emerald-400'
    : isRunning
    ? 'bg-blue-500/20 border-l-blue-400'
    : 'bg-gray-700/50 border-l-gray-500'

  return (
    <div className="mb-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs font-medium transition-colors border-l-2',
          headerBg
        )}
      >
        {isExpanded ? (
          <ChevronDown className="w-3 h-3 text-gray-400" />
        ) : (
          <ChevronRight className="w-3 h-3 text-gray-400" />
        )}
        <span className="text-gray-300 truncate flex-1 text-left">{file}</span>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {passedCount > 0 && (
            <span className="flex items-center gap-0.5 text-emerald-400">
              <Check className="w-3 h-3" />
              {passedCount}
            </span>
          )}
          {failedCount > 0 && (
            <span className="flex items-center gap-0.5 text-red-400">
              <X className="w-3 h-3" />
              {failedCount}
            </span>
          )}
          {runningCount > 0 && (
            <span className="flex items-center gap-0.5 text-blue-400">
              <Loader2 className="w-3 h-3 animate-spin" />
              {runningCount}
            </span>
          )}
          <span className="text-gray-500">/{totalCount}</span>
        </div>
      </button>
      {isExpanded && (
        <div className="ml-3 mt-1 space-y-0.5">
          {scenarios.map(scenario => (
            <ScenarioRow key={scenario.id} scenario={scenario} />
          ))}
        </div>
      )}
    </div>
  )
})

function groupByFile<T extends { file: string }>(items: T[]): Map<string, T[]> {
  const groups = new Map<string, T[]>()
  for (const item of items) {
    const file = item.file.replace(/^e2e\/tests\//, '').replace(/\.spec\.ts.*$/, '')
    const existing = groups.get(file) || []
    existing.push(item)
    groups.set(file, existing)
  }
  return groups
}

export function TestScenarioList({ className }: TestScenarioListProps) {
  const scenarios = useScenarios()
  const activeRunId = useActiveRunId()
  const selectedCategory = useSelectedCategory()

  const { data: testListData, isLoading: isLoadingTests } = useTestList(selectedCategory)

  const hasActiveRun = !!activeRunId

  const scenarioMap = useMemo(() => {
    const map = new Map<string, TestScenario>()
    for (const s of scenarios) {
      map.set(s.id, s)
    }
    return map
  }, [scenarios])

  const mergedScenarios = useMemo(() => {
    if (!testListData?.tests) return []

    return testListData.tests.map((item): TestScenario => {
      const realScenario = scenarioMap.get(item.id)
      if (realScenario) {
        return realScenario
      }
      return {
        id: item.id,
        name: item.name,
        file: item.file,
        suite: item.suite,
        status: 'pending' as TestScenarioStatus,
      }
    })
  }, [testListData?.tests, scenarioMap])

  const groupedMerged = useMemo(() => groupByFile(mergedScenarios), [mergedScenarios])

  const summary = useMemo(() => {
    const passed = mergedScenarios.filter(s => s.status === 'passed').length
    const failed = mergedScenarios.filter(s => s.status === 'failed').length
    const skipped = mergedScenarios.filter(s => s.status === 'skipped').length
    const running = mergedScenarios.filter(s => s.status === 'running').length
    const pending = mergedScenarios.filter(s => s.status === 'pending').length
    return { passed, failed, skipped, running, pending, total: mergedScenarios.length }
  }, [mergedScenarios])

  if (isLoadingTests) {
    return (
      <div className={cn('flex flex-col h-full min-h-0 overflow-hidden', className)}>
        <div className="px-3 py-2 border-b border-gray-700 flex-shrink-0">
          <span className="text-sm font-medium text-gray-300">Scenarios</span>
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
          Loading...
        </div>
      </div>
    )
  }

  if (!testListData?.tests || testListData.tests.length === 0) {
    return (
      <div className={cn('flex flex-col h-full min-h-0 overflow-hidden', className)}>
        <div className="px-3 py-2 border-b border-gray-700 flex-shrink-0">
          <span className="text-sm font-medium text-gray-300">Scenarios</span>
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
          No tests found
        </div>
      </div>
    )
  }

  if (hasActiveRun) {
    return (
      <div className={cn('flex flex-col h-full min-h-0 overflow-hidden', className)}>
        <div className="px-3 py-2 border-b border-gray-700 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-300">Scenarios</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              {summary.passed > 0 && (
                <span className="flex items-center gap-1 text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded">
                  <Check className="w-3 h-3" />
                  {summary.passed}
                </span>
              )}
              {summary.failed > 0 && (
                <span className="flex items-center gap-1 text-red-400 bg-red-500/20 px-1.5 py-0.5 rounded">
                  <X className="w-3 h-3" />
                  {summary.failed}
                </span>
              )}
              {(summary.running > 0 || summary.pending > 0) && (
                <span className="flex items-center gap-1 text-gray-400 bg-gray-700 px-1.5 py-0.5 rounded">
                  <Clock className="w-3 h-3" />
                  {summary.running + summary.pending}
                </span>
              )}
              <span className="text-gray-500">/ {summary.total}</span>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 min-h-0 max-h-full">
          {Array.from(groupedMerged.entries()).map(([file, fileScenarios]) => (
            <FileGroup key={file} file={file} scenarios={fileScenarios} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col h-full min-h-0 overflow-hidden', className)}>
      <div className="px-3 py-2 border-b border-gray-700 flex-shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-300">Scenarios</span>
          <span className="text-xs text-gray-500 bg-gray-700 px-1.5 py-0.5 rounded">
            {testListData.total} tests
          </span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 min-h-0 max-h-full">
        {Array.from(groupedMerged.entries()).map(([file, fileScenarios], index) => (
          <FileGroup key={file} file={file} scenarios={fileScenarios} defaultExpanded={index < 2} />
        ))}
      </div>
    </div>
  )
}
