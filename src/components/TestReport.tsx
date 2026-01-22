'use client'

import { memo, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import {
  Check,
  X,
  Minus,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  FileText,
} from 'lucide-react'
import { useTestResults, useScenarios, useTestStatus, useE2EDashboardStore } from '@/store/e2e-store'
import type { TestScenario } from '@/types'

interface TestReportProps {
  className?: string
}

const ErrorSection = memo(function ErrorSection({
  scenario,
}: {
  scenario: TestScenario
}) {
  const [isExpanded, setIsExpanded] = useState(true)

  if (!scenario.error) return null

  return (
    <div className="mt-2 border border-red-200 rounded overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-red-50 text-red-700 text-sm font-medium hover:bg-red-100 transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
        <span>Error Details</span>
      </button>
      {isExpanded && (
        <div className="p-3 bg-red-50/50 overflow-x-auto">
          <pre className="text-xs text-red-800 font-mono whitespace-pre-wrap break-all">
            {scenario.error}
          </pre>
        </div>
      )}
    </div>
  )
})

const FailedTestItem = memo(function FailedTestItem({
  scenario,
}: {
  scenario: TestScenario
}) {
  return (
    <div className="p-3 bg-white border border-red-200 rounded-lg">
      <div className="flex items-start gap-2">
        <X className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-900">{scenario.name}</div>
          <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
            <FileText className="w-3 h-3" />
            <span className="truncate">{scenario.file}</span>
          </div>
          {scenario.suite && (
            <div className="text-sm text-gray-400 mt-0.5">{scenario.suite}</div>
          )}
          {scenario.retries && scenario.retries > 0 && (
            <div className="text-sm text-amber-600 mt-1">
              Retried {scenario.retries} time{scenario.retries > 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>
      <ErrorSection scenario={scenario} />
    </div>
  )
})

const SummaryCard = memo(function SummaryCard({
  title,
  count,
  icon: Icon,
  color,
  bgColor,
}: {
  title: string
  count: number
  icon: React.ComponentType<{ className?: string }>
  color: string
  bgColor: string
}) {
  return (
    <div className={cn('flex items-center gap-3 p-4 rounded-lg', bgColor)}>
      <Icon className={cn('w-8 h-8', color)} />
      <div>
        <div className={cn('text-2xl font-bold', color)}>{count}</div>
        <div className="text-sm text-gray-600">{title}</div>
      </div>
    </div>
  )
})

export function TestReport({ className }: TestReportProps) {
  const results = useTestResults()
  const scenarios = useScenarios()
  const status = useTestStatus()
  const { toggleReport } = useE2EDashboardStore()

  const failedScenarios = useMemo(
    () => scenarios.filter(s => s.status === 'failed'),
    [scenarios]
  )

  const skippedScenarios = useMemo(
    () => scenarios.filter(s => s.status === 'skipped'),
    [scenarios]
  )

  const duration = useMemo(() => {
    if (!results?.duration) return null
    const seconds = Math.floor(results.duration / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`
    }
    return `${seconds}s`
  }, [results?.duration])

  if (!results && status !== 'completed' && status !== 'failed') {
    return null
  }

  const isSuccess = status === 'completed' && failedScenarios.length === 0

  return (
    <div className={cn('flex flex-col h-full bg-white', className)}>
      <div
        className={cn(
          'px-6 py-4 border-b',
          isSuccess ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isSuccess ? (
              <Check className="w-8 h-8 text-green-500" />
            ) : (
              <X className="w-8 h-8 text-red-500" />
            )}
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {isSuccess ? 'All Tests Passed!' : 'Test Run Failed'}
              </h2>
              {duration && (
                <div className="flex items-center gap-1 text-sm text-gray-500 mt-0.5">
                  <Clock className="w-3 h-3" />
                  <span>Completed in {duration}</span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={toggleReport}
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      <div className="p-6 border-b">
        <div className="grid grid-cols-4 gap-4">
          <SummaryCard
            title="Passed"
            count={results?.passed ?? 0}
            icon={Check}
            color="text-green-600"
            bgColor="bg-green-50"
          />
          <SummaryCard
            title="Failed"
            count={results?.failed ?? 0}
            icon={X}
            color="text-red-600"
            bgColor="bg-red-50"
          />
          <SummaryCard
            title="Skipped"
            count={results?.skipped ?? 0}
            icon={Minus}
            color="text-gray-600"
            bgColor="bg-gray-50"
          />
          <SummaryCard
            title="Total"
            count={(results?.passed ?? 0) + (results?.failed ?? 0) + (results?.skipped ?? 0)}
            icon={FileText}
            color="text-blue-600"
            bgColor="bg-blue-50"
          />
        </div>
      </div>

      {failedScenarios.length > 0 && (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h3 className="text-lg font-semibold text-gray-900">
              Failed Tests ({failedScenarios.length})
            </h3>
          </div>
          <div className="space-y-3">
            {failedScenarios.map(scenario => (
              <FailedTestItem key={scenario.id} scenario={scenario} />
            ))}
          </div>

          {skippedScenarios.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center gap-2 mb-4">
                <Minus className="w-5 h-5 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-700">
                  Skipped Tests ({skippedScenarios.length})
                </h3>
              </div>
              <div className="space-y-2">
                {skippedScenarios.map(scenario => (
                  <div
                    key={scenario.id}
                    className="p-2 bg-gray-50 border border-gray-200 rounded text-sm"
                  >
                    <span className="font-medium text-gray-700">{scenario.name}</span>
                    <span className="text-gray-400 ml-2">({scenario.file})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {isSuccess && (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <Check className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Excellent Work!
            </h3>
            <p className="text-gray-500">
              All {results?.passed ?? 0} tests passed successfully.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
