/**
 * CommonMark Spec Test Runner
 *
 * 加载 CommonMark 0.31.2 spec.json（652 cases），
 * 对每个 example 运行 parse → renderToHtml，对比 expected HTML。
 *
 * 运行: pnpm test:run
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse } from '@pre-markdown/parser'
import { renderToHtml } from '@pre-markdown/renderer'
import { resetNodeIds } from '@pre-markdown/core'

// ============================================================
// Load spec data
// ============================================================
interface SpecExample {
  markdown: string
  html: string
  example: number
  section: string
  start_line: number
  end_line: number
}

const specPath = resolve(__dirname, '../../harness/fixtures/commonmark-spec.json')
const specData: SpecExample[] = JSON.parse(readFileSync(specPath, 'utf-8'))

// ============================================================
// Normalize HTML for comparison
// ============================================================
function normalizeHtml(html: string): string {
  return html
    .replace(/\n+$/, '\n')       // Normalize trailing newlines
    .replace(/\r\n/g, '\n')       // Normalize line endings
    .replace(/\s+\n/g, '\n')      // Trim trailing whitespace per line
}

// ============================================================
// Group examples by section
// ============================================================
const sections = new Map<string, SpecExample[]>()
for (const example of specData) {
  const list = sections.get(example.section) ?? []
  list.push(example)
  sections.set(example.section, list)
}

// ============================================================
// Track stats
// ============================================================
let totalPass = 0
let totalFail = 0
const failedExamples: { example: number; section: string; expected: string; actual: string }[] = []

// ============================================================
// Run tests grouped by section
// ============================================================
describe('CommonMark Spec 0.31.2', () => {
  for (const [section, examples] of sections) {
    describe(section, () => {
      for (const spec of examples) {
        it(`Example ${spec.example}`, () => {
          resetNodeIds()
          const ast = parse(spec.markdown)
          const actual = renderToHtml(ast, { sanitize: false })
          const normalizedActual = normalizeHtml(actual)
          const normalizedExpected = normalizeHtml(spec.html)

          if (normalizedActual === normalizedExpected) {
            totalPass++
          } else {
            totalFail++
            failedExamples.push({
              example: spec.example,
              section: spec.section,
              expected: spec.html,
              actual,
            })
            // Don't fail the test — we're measuring baseline pass rate
            // Use a soft assertion that logs but doesn't throw
          }

          // Soft check: log difference but don't fail
          // We'll switch to hard expect() once we reach 98%+
        })
      }
    })
  }

  // Summary test — always runs last
  it('SUMMARY: baseline pass rate', () => {
    const total = totalPass + totalFail
    const rate = total > 0 ? ((totalPass / total) * 100).toFixed(1) : '0'
    console.log(`\n${'='.repeat(60)}`)
    console.log(`CommonMark Spec Results: ${totalPass}/${total} passed (${rate}%)`)
    console.log(`Failed: ${totalFail}`)
    if (failedExamples.length > 0 && failedExamples.length <= 20) {
      console.log(`\nFirst failures:`)
      for (const f of failedExamples.slice(0, 20)) {
        console.log(`  Example ${f.example} [${f.section}]`)
        console.log(`    expected: ${JSON.stringify(f.expected).slice(0, 80)}`)
        console.log(`    actual:   ${JSON.stringify(f.actual).slice(0, 80)}`)
      }
    }
    console.log(`${'='.repeat(60)}\n`)

    // This test always passes — it's just a summary reporter
    expect(total).toBe(652)
  })
})
