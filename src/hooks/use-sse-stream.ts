import { useEffect, useRef, useCallback } from 'react'
import { useE2EDashboardStore } from '../store/e2e-store'
import type { LogEntry, TestProgress, TestResult, TestScenario } from '../types'

interface UseSSEStreamOptions {
  runId: string | null
  enabled?: boolean
}

const LOG_BATCH_SIZE = 50
const LOG_BATCH_INTERVAL = 100

export function useSSEStream({ runId, enabled = true }: UseSSEStreamOptions) {
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 3

  const logBufferRef = useRef<LogEntry[]>([])
  const flushTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const {
    addLogs,
    setProgress,
    setResults,
    setStatus,
    setConnected,
    updateScenario,
  } = useE2EDashboardStore()

  const flushLogs = useCallback(() => {
    if (logBufferRef.current.length > 0) {
      addLogs(logBufferRef.current)
      logBufferRef.current = []
    }
    if (flushTimeoutRef.current) {
      clearTimeout(flushTimeoutRef.current)
      flushTimeoutRef.current = null
    }
  }, [addLogs])

  const bufferLog = useCallback((log: LogEntry) => {
    logBufferRef.current.push(log)

    if (logBufferRef.current.length >= LOG_BATCH_SIZE) {
      flushLogs()
      return
    }

    if (!flushTimeoutRef.current) {
      flushTimeoutRef.current = setTimeout(flushLogs, LOG_BATCH_INTERVAL)
    }
  }, [flushLogs])

  const connect = useCallback(() => {
    if (!runId || !enabled) return

    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    const url = `/api/e2e/stream/${runId}`
    const eventSource = new EventSource(url)
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      setConnected(true)
      reconnectAttempts.current = 0
    }

    eventSource.onerror = () => {
      setConnected(false)
      flushLogs()

      if (reconnectAttempts.current < maxReconnectAttempts) {
        reconnectAttempts.current++
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000)

        reconnectTimeoutRef.current = setTimeout(() => {
          connect()
        }, delay)
      }
    }

    eventSource.addEventListener('log', (event) => {
      try {
        const log: LogEntry = JSON.parse(event.data)
        bufferLog(log)
      } catch (e) {
        console.error('Failed to parse log event:', e)
      }
    })

    eventSource.addEventListener('progress', (event) => {
      try {
        const progress: TestProgress = JSON.parse(event.data)
        setProgress(progress)
      } catch (e) {
        console.error('Failed to parse progress event:', e)
      }
    })

    eventSource.addEventListener('scenario', (event) => {
      try {
        const scenario: TestScenario = JSON.parse(event.data)
        updateScenario(scenario)
      } catch (e) {
        console.error('Failed to parse scenario event:', e)
      }
    })

    eventSource.addEventListener('complete', (event) => {
      try {
        const results: TestResult = JSON.parse(event.data)
        setResults(results)
        flushLogs()
      } catch (e) {
        console.error('Failed to parse complete event:', e)
      }
    })

    eventSource.addEventListener('status', (event) => {
      try {
        const { status } = JSON.parse(event.data)
        setStatus(status)

        if (['completed', 'failed', 'cancelled'].includes(status)) {
          flushLogs()
          eventSource.close()
          setConnected(false)
        }
      } catch (e) {
        console.error('Failed to parse status event:', e)
      }
    })

    eventSource.addEventListener('error', (event) => {
      try {
        const data = JSON.parse((event as MessageEvent).data)
        bufferLog({
          timestamp: new Date().toISOString(),
          type: 'error',
          content: data.message || 'An error occurred',
        })
      } catch {
        // Ignore parse errors for connection errors
      }
    })
  }, [runId, enabled, bufferLog, flushLogs, setProgress, setResults, setStatus, setConnected, updateScenario])

  useEffect(() => {
    if (runId && enabled) {
      connect()
    }

    return () => {
      if (logBufferRef.current.length > 0) {
        addLogs(logBufferRef.current)
        logBufferRef.current = []
      }

      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
      if (flushTimeoutRef.current) {
        clearTimeout(flushTimeoutRef.current)
        flushTimeoutRef.current = null
      }
      setConnected(false)
    }
  }, [runId, enabled, connect, setConnected, addLogs])

  const disconnect = useCallback(() => {
    flushLogs()
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    setConnected(false)
  }, [flushLogs, setConnected])

  return { disconnect }
}
