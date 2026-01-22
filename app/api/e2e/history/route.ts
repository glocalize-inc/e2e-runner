import { NextRequest, NextResponse } from 'next/server'
import { testRunManager } from '../lib/test-run-manager'
import type { TestRunSummary } from '../lib/types'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const limit = Math.min(
    parseInt(searchParams.get('limit') || '20', 10),
    50
  )

  const runs = testRunManager.getHistory(limit)

  const history: TestRunSummary[] = runs.map(run => ({
    runId: run.runId,
    status: run.status,
    category: run.category,
    config: run.config,
    startedAt: run.startedAt,
    completedAt: run.completedAt,
    results: run.results,
  }))

  return NextResponse.json(history)
}
