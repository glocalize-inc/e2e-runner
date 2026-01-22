import { NextRequest } from 'next/server'
import { testRunManager } from '../../lib/test-run-manager'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const { runId } = await params

    const run = testRunManager.getRun(runId)
    if (!run) {
      return new Response(JSON.stringify({
        error: 'Run not found',
        message: 'The test run may have been lost due to server restart. Please try running the tests again.',
        runId
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      start(controller) {
        let isClosed = false

        const safeClose = () => {
          if (!isClosed) {
            isClosed = true
            try {
              controller.close()
            } catch {
              // Already closed
            }
          }
        }

        const sendEvent = (event: string, data: unknown) => {
          if (isClosed) return
          try {
            const eventData = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
            controller.enqueue(encoder.encode(eventData))
          } catch {
            isClosed = true
          }
        }

        if (run.logs) {
          for (const log of run.logs) {
            sendEvent('log', log)
          }
        }

        if (run.progress) {
          sendEvent('progress', run.progress)
        }

        if (run.scenarios) {
          for (const scenario of run.scenarios) {
            sendEvent('scenario', scenario)
          }
        }

        if (['completed', 'failed', 'cancelled'].includes(run.status)) {
          if (run.results) {
            sendEvent('complete', run.results)
          }
          sendEvent('status', { status: run.status })
          safeClose()
          return
        }

        const unsubscribe = testRunManager.subscribe(runId, (event, data) => {
          try {
            sendEvent(event, data)

            if (event === 'status') {
              const statusData = data as { status: string }
              if (['completed', 'failed', 'cancelled'].includes(statusData.status)) {
                setTimeout(() => {
                  safeClose()
                }, 100)
              }
            }
          } catch {
            unsubscribe()
          }
        })

        request.signal.addEventListener('abort', () => {
          unsubscribe()
          safeClose()
        })
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (error) {
    console.error('SSE stream error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
