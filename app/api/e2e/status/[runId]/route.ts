import { NextRequest, NextResponse } from 'next/server'
import { testRunManager } from '../../lib/test-run-manager'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params

  const run = testRunManager.getRun(runId)
  if (!run) {
    return NextResponse.json(
      { error: 'Run not found' },
      { status: 404 }
    )
  }

  return NextResponse.json({
    runId: run.runId,
    status: run.status,
    category: run.category,
    config: run.config,
    startedAt: run.startedAt,
    completedAt: run.completedAt,
    progress: run.progress,
    results: run.results,
  })
}
