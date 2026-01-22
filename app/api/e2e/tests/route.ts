import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'
import type { TestCategory } from '../lib/types'

interface TestInfo {
  id: string
  name: string
  file: string
  suite: string
}

interface TestListData {
  total: number
  tests: TestInfo[]
}

function loadStaticTestList(): Record<string, TestListData> | null {
  try {
    const staticFilePath = path.join(process.cwd(), 'public', 'e2e', 'test-list.json')

    if (fs.existsSync(staticFilePath)) {
      const content = fs.readFileSync(staticFilePath, 'utf-8')
      return JSON.parse(content)
    }
  } catch (error) {
    console.error('[E2E Tests API] Failed to load static test list:', error)
  }
  return null
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const category = (searchParams.get('category') || 'all') as TestCategory

  const staticData = loadStaticTestList()

  if (staticData && staticData[category]) {
    return NextResponse.json({
      category,
      total: staticData[category].total,
      tests: staticData[category].tests,
      source: 'static',
    })
  }

  return NextResponse.json({
    category,
    total: 0,
    tests: [],
    source: 'empty',
    message: 'Test list not available. Run "npm run e2e:generate-list" to generate the test list.',
  })
}
