import { NextRequest, NextResponse } from 'next/server'
import { testRunManager } from '../lib/test-run-manager'

export async function POST(request: NextRequest) {
  try {
    const result = testRunManager.forceReset()

    return NextResponse.json({
      success: true,
      cleared: result.cleared,
      clearedRunId: result.runId,
      message: result.cleared
        ? `Cleared stuck run: ${result.runId}`
        : 'No stuck runs to clear',
    })
  } catch (error) {
    console.error('Failed to reset test runs:', error)
    return NextResponse.json(
      { error: 'Failed to reset test runs' },
      { status: 500 }
    )
  }
}
