/**
 * Script to generate a static test list JSON file from Playwright test files.
 * This is used by the E2E dashboard to display available tests before running.
 *
 * Usage: npx tsx scripts/generate-test-list.ts
 */

import * as fs from 'fs'
import * as path from 'path'

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

const E2E_DIR = path.join(process.cwd(), 'e2e', 'tests')
const OUTPUT_FILE = path.join(process.cwd(), 'public', 'e2e', 'test-list.json')

const CATEGORIES = ['auth', 'home', 'project'] as const

function extractTestsFromFile(filePath: string, category: string): TestInfo[] {
  const content = fs.readFileSync(filePath, 'utf-8')
  const tests: TestInfo[] = []
  const fileName = path.basename(filePath)
  const relativePath = `tests/${category}/${fileName}`

  // Match test.describe blocks for suite names
  const describeMatches = content.matchAll(/test\.describe\s*\(\s*['"`]([^'"`]+)['"`]/g)
  const suites = Array.from(describeMatches).map(m => m[1])
  const currentSuite = suites[0] || ''

  // Match test() or test.skip() calls
  const testMatches = content.matchAll(/test(?:\.skip)?\s*\(\s*['"`]([^'"`]+)['"`]/g)

  for (const match of testMatches) {
    const testName = match[1]
    if (testName && !testName.includes('describe')) {
      const id = `${relativePath}:${testName}`
      tests.push({
        id,
        name: testName,
        file: relativePath,
        suite: currentSuite,
      })
    }
  }

  return tests
}

function generateTestList(): Record<string, TestListData> {
  const result: Record<string, TestListData> = {
    all: { total: 0, tests: [] },
    auth: { total: 0, tests: [] },
    home: { total: 0, tests: [] },
    project: { total: 0, tests: [] },
  }

  for (const category of CATEGORIES) {
    const categoryDir = path.join(E2E_DIR, category)

    if (!fs.existsSync(categoryDir)) {
      console.log(`Category directory not found: ${categoryDir}`)
      continue
    }

    const files = fs.readdirSync(categoryDir).filter(f => f.endsWith('.spec.ts'))

    for (const file of files) {
      const filePath = path.join(categoryDir, file)
      const tests = extractTestsFromFile(filePath, category)

      result[category].tests.push(...tests)
      result.all.tests.push(...tests)
    }

    result[category].total = result[category].tests.length
    console.log(`Found ${result[category].total} tests in ${category}`)
  }

  result.all.total = result.all.tests.length
  console.log(`Total tests: ${result.all.total}`)

  return result
}

function main() {
  console.log('Generating test list...')

  // Ensure output directory exists
  const outputDir = path.dirname(OUTPUT_FILE)
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  const testList = generateTestList()
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(testList, null, 2))

  console.log(`\nTest list written to: ${OUTPUT_FILE}`)
}

main()
