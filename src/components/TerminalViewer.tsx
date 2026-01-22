'use client'

import { useEffect, useRef, useCallback, memo } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { cn } from '@/lib/utils'
import { useLogs, useAutoScroll, useE2EDashboardStore } from '@/store/e2e-store'
import type { LogEntry } from '@/types'

interface TerminalViewerProps {
  className?: string
}

const colorMap: Record<string, string> = {
  '30': '#2e2e2e',
  '31': '#ff5f57',
  '32': '#28c941',
  '33': '#febc2e',
  '34': '#28c0de',
  '35': '#d88fd8',
  '36': '#19bbd2',
  '37': '#dcdfe4',
  '90': '#6d7681',
  '91': '#ff8785',
  '92': '#56d364',
  '93': '#e3b341',
  '94': '#58a6ff',
  '95': '#bc8cff',
  '96': '#39c5cf',
  '97': '#ffffff',
}

function parseAnsiLine(line: string): React.ReactNode {
  const ansiRegex = /\x1b\[([0-9;]+)m/g

  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  let currentStyle: React.CSSProperties = {}

  while ((match = ansiRegex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <span key={parts.length} style={currentStyle}>
          {line.slice(lastIndex, match.index)}
        </span>
      )
    }

    const matchGroup = match[1]
    if (!matchGroup) continue
    const codes = matchGroup.split(';')
    for (const code of codes) {
      if (code === '0') {
        currentStyle = {}
      } else if (code === '1') {
        currentStyle = { ...currentStyle, fontWeight: 'bold' }
      } else if (code === '2') {
        currentStyle = { ...currentStyle, opacity: 0.7 }
      } else if (colorMap[code]) {
        currentStyle = { ...currentStyle, color: colorMap[code] }
      } else if (code.startsWith('4') && colorMap[code.slice(1)]) {
        currentStyle = { ...currentStyle, backgroundColor: colorMap[code.slice(1)] }
      }
    }

    lastIndex = match.index + match[0].length
  }

  if (lastIndex < line.length) {
    parts.push(
      <span key={parts.length} style={currentStyle}>
        {line.slice(lastIndex)}
      </span>
    )
  }

  return parts.length > 0 ? parts : line
}

function getLineColor(type: LogEntry['type']): string {
  switch (type) {
    case 'error':
      return 'text-red-400'
    case 'stderr':
      return 'text-yellow-400'
    case 'info':
      return 'text-blue-400'
    default:
      return 'text-gray-200'
  }
}

const LogLine = memo(function LogLine({
  log,
}: {
  log: LogEntry
}) {
  return (
    <div
      className={cn(
        'py-0.5 px-4 leading-relaxed',
        getLineColor(log.type)
      )}
    >
      <pre className="whitespace-pre-wrap break-all font-mono text-sm m-0">
        {parseAnsiLine(log.content)}
      </pre>
    </div>
  )
})

export function TerminalViewer({ className }: TerminalViewerProps) {
  const logs = useLogs()
  const autoScroll = useAutoScroll()
  const { toggleAutoScroll, clearLogs } = useE2EDashboardStore()
  const parentRef = useRef<HTMLDivElement>(null)
  const isUserScrolling = useRef(false)
  const lastLogCount = useRef(0)

  const virtualizer = useVirtualizer({
    count: logs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 28,
    overscan: 10,
    measureElement: (element) => {
      return element.getBoundingClientRect().height
    },
  })

  useEffect(() => {
    if (autoScroll && logs.length > lastLogCount.current && !isUserScrolling.current) {
      requestAnimationFrame(() => {
        virtualizer.scrollToIndex(logs.length - 1, { align: 'end' })
      })
    }
    lastLogCount.current = logs.length
  }, [logs.length, autoScroll, virtualizer])

  const handleScroll = useCallback(() => {
    if (!parentRef.current) return

    const { scrollTop, scrollHeight, clientHeight } = parentRef.current
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100

    isUserScrolling.current = !isAtBottom

    if (!isAtBottom && autoScroll) {
      toggleAutoScroll()
    }
  }, [autoScroll, toggleAutoScroll])

  useEffect(() => {
    if (isUserScrolling.current) {
      const timer = setTimeout(() => {
        isUserScrolling.current = false
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [logs.length])

  const items = virtualizer.getVirtualItems()

  return (
    <div className={cn('flex flex-col h-full min-h-0 overflow-hidden', className)}>
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-800 border-b border-zinc-700 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-400">Terminal</span>
          <span className="text-xs text-zinc-500">
            {logs.length.toLocaleString()} lines
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleAutoScroll}
            className={cn(
              'px-2 py-1 text-xs rounded transition-colors',
              autoScroll
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
            )}
          >
            Auto-scroll {autoScroll ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={clearLogs}
            className="px-2 py-1 text-xs bg-zinc-700 text-zinc-300 rounded hover:bg-zinc-600 transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      <div
        ref={parentRef}
        onScroll={handleScroll}
        className="flex-1 overflow-auto bg-zinc-900 min-h-0"
      >
        {logs.length === 0 ? (
          <div className="p-4 text-zinc-500 italic font-mono text-sm">
            No logs yet. Start a test run to see output.
          </div>
        ) : (
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {items.map((virtualRow) => {
              const log = logs[virtualRow.index]
              if (!log) return null
              return (
                <div
                  key={virtualRow.key}
                  data-index={virtualRow.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <LogLine log={log} />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
