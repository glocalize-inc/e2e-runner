import { NextRequest, NextResponse } from 'next/server'
import { testRunManager } from '../lib/test-run-manager'
import { executePlaywrightTests, canExecuteTests } from '../lib/playwright-executor'
import type { TestCategory, TestConfig, TestRunResponse } from '../lib/types'

const VALID_CATEGORIES: TestCategory[] = ['auth', 'home', 'project', 'all']
const VALID_CONFIGS: TestConfig[] = ['local', 'staging', 'hub']

export async function POST(request: NextRequest) {
  try {
    const canExecute = canExecuteTests()
    if (!canExecute.allowed) {
      return NextResponse.json(
        { error: canExecute.reason },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { category, config } = body as { category?: TestCategory; config?: TestConfig }

    if (!category || !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}` },
        { status: 400 }
      )
    }

    if (!config || !VALID_CONFIGS.includes(config)) {
      return NextResponse.json(
        { error: `Invalid config. Must be one of: ${VALID_CONFIGS.join(', ')}` },
        { status: 400 }
      )
    }

    const run = testRunManager.createRun(category, config)

    executePlaywrightTests(run.runId).catch(error => {
      console.error(`Test execution failed for run ${run.runId}:`, error)
    })

    const response: TestRunResponse = {
      runId: run.runId,
      status: run.status,
      streamUrl: `/api/e2e/stream/${run.runId}`,
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('Failed to create test run:', error)

    if (error instanceof Error && error.message.includes('already in progress')) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create test run' },
      { status: 500 }
    )
  }
}
