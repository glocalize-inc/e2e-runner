import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { TestCategory, TestConfig, TestRunResponse } from '../types'
import { useE2EDashboardStore } from '../store/e2e-store'

interface StartTestParams {
  category: TestCategory
  config: TestConfig
}

async function startTestRun(params: StartTestParams): Promise<TestRunResponse> {
  const response = await fetch('/api/e2e/run', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to start test run')
  }

  return response.json()
}

async function cancelTestRun(runId: string): Promise<{ success: boolean; status: string }> {
  const response = await fetch(`/api/e2e/cancel/${runId}`, {
    method: 'POST',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to cancel test run')
  }

  return response.json()
}

async function resetTestRuns(): Promise<{ success: boolean; cleared: boolean; clearedRunId?: string }> {
  const response = await fetch('/api/e2e/reset', {
    method: 'POST',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to reset test runs')
  }

  return response.json()
}

export function useStartTest() {
  const queryClient = useQueryClient()
  const { startRun, selectedCategory, selectedConfig } = useE2EDashboardStore()

  return useMutation({
    mutationFn: (params?: Partial<StartTestParams>) =>
      startTestRun({
        category: params?.category || selectedCategory,
        config: params?.config || selectedConfig,
      }),
    onSuccess: (data) => {
      startRun(data.runId)
      queryClient.invalidateQueries({ queryKey: ['e2e', 'history'] })
    },
  })
}

export function useCancelTest() {
  const queryClient = useQueryClient()
  const { setStatus } = useE2EDashboardStore()

  return useMutation({
    mutationFn: cancelTestRun,
    onSuccess: () => {
      setStatus('cancelled')
      queryClient.invalidateQueries({ queryKey: ['e2e', 'history'] })
    },
  })
}

export function useResetTests() {
  const queryClient = useQueryClient()
  const { reset } = useE2EDashboardStore()

  return useMutation({
    mutationFn: resetTestRuns,
    onSuccess: () => {
      reset()
      queryClient.invalidateQueries({ queryKey: ['e2e', 'history'] })
    },
  })
}
