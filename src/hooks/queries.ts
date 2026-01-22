import { queryOptions, useQuery } from '@tanstack/react-query'
import type { TestRunSummary, TestCategory } from '../types'

interface TestInfo {
  id: string
  name: string
  file: string
  suite: string
}

interface TestListResponse {
  category: TestCategory
  total: number
  tests: TestInfo[]
}

const E2E_QUERY_KEYS = {
  all: ['e2e'] as const,
  history: () => [...E2E_QUERY_KEYS.all, 'history'] as const,
  status: (runId: string) => [...E2E_QUERY_KEYS.all, 'status', runId] as const,
  tests: (category: TestCategory) => [...E2E_QUERY_KEYS.all, 'tests', category] as const,
}

async function fetchHistory(limit = 20): Promise<TestRunSummary[]> {
  const response = await fetch(`/api/e2e/history?limit=${limit}`)
  if (!response.ok) {
    throw new Error('Failed to fetch history')
  }
  return response.json()
}

async function fetchStatus(runId: string) {
  const response = await fetch(`/api/e2e/status/${runId}`)
  if (!response.ok) {
    throw new Error('Failed to fetch status')
  }
  return response.json()
}

async function fetchTests(category: TestCategory): Promise<TestListResponse> {
  const response = await fetch(`/api/e2e/tests?category=${category}`)
  if (!response.ok) {
    throw new Error('Failed to fetch tests')
  }
  return response.json()
}

export const e2eQueries = {
  history: (limit = 20) =>
    queryOptions({
      queryKey: E2E_QUERY_KEYS.history(),
      queryFn: () => fetchHistory(limit),
      staleTime: 30 * 1000,
    }),

  status: (runId: string) =>
    queryOptions({
      queryKey: E2E_QUERY_KEYS.status(runId),
      queryFn: () => fetchStatus(runId),
      enabled: !!runId,
      refetchInterval: (query) => {
        const status = query.state.data?.status
        if (['completed', 'failed', 'cancelled'].includes(status)) {
          return false
        }
        return 2000
      },
    }),

  tests: (category: TestCategory) =>
    queryOptions({
      queryKey: E2E_QUERY_KEYS.tests(category),
      queryFn: () => fetchTests(category),
      staleTime: 5 * 60 * 1000,
    }),
}

export function useTestHistory(limit = 20) {
  return useQuery(e2eQueries.history(limit))
}

export function useTestStatus(runId: string | null) {
  return useQuery({
    ...e2eQueries.status(runId || ''),
    enabled: !!runId,
  })
}

export function useTestList(category: TestCategory) {
  return useQuery(e2eQueries.tests(category))
}
