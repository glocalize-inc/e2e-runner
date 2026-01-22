import { NextRequest, NextResponse } from 'next/server'
import { testRunManager } from '../../lib/test-run-manager'
import { cancelTest } from '../../lib/playwright-executor'

export async function POST(
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

  if (!testRunManager.canCancel(runId)) {
    return NextResponse.json(
      { error: 'Run cannot be cancelled (already completed or cancelled)' },
      { status: 400 }
    )
  }

  const cancelled = cancelTest(runId)

  if (cancelled) {
    testRunManager.updateStatus(runId, 'cancelled')
    return NextResponse.json({ success: true, status: 'cancelled' })
  } else {
    return NextResponse.json(
      { error: 'Failed to cancel run (process may have already finished)' },
      { status: 400 }
    )
  }
}
