/**
 * CommonMark Spec 差异分析
 * 运行此文件获取失败模式统计
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse } from '@pre-markdown/parser'
import { renderToHtml } from '@pre-markdown/renderer'
import { resetNodeIds } from '@pre-markdown/core'

interface SpecExample {
  markdown: string
  html: string
  example: number
  section: string
}

const specPath = resolve(__dirname, '../../harness/fixtures/commonmark-spec.json')
const specData: SpecExample[] = JSON.parse(readFileSync(specPath, 'utf-8'))

function norm(html: string): string {
  return html.replace(/\n+$/, '\n').replace(/\r\n/g, '\n')
}

describe('CommonMark Diff Analysis', () => {
  it('analyze failure patterns', () => {
    const sectionStats = new Map<string, { pass: number; fail: number }>()
    const patterns = new Map<string, number>()
    let pass = 0

    for (const ex of specData) {
      resetNodeIds()
      const actual = renderToHtml(parse(ex.markdown), { sanitize: false })
      const ok = norm(actual) === norm(ex.html)

      const s = sectionStats.get(ex.section) ?? { pass: 0, fail: 0 }
      if (ok) { s.pass++; pass++ } else { s.fail++ }
      sectionStats.set(ex.section, s)

      if (!ok) {
        // Classify failure pattern
        const expected = norm(ex.html)
        const got = norm(actual)
        if (got === '') patterns.set('empty output', (patterns.get('empty output') ?? 0) + 1)
        else if (!got.includes('\n') && expected.includes('\n')) patterns.set('missing newlines', (patterns.get('missing newlines') ?? 0) + 1)
        else if (got.includes('<p>') && !expected.includes('<p>')) patterns.set('extra <p> wrap', (patterns.get('extra <p> wrap') ?? 0) + 1)
        else if (!got.includes('<p>') && expected.includes('<p>')) patterns.set('missing <p> wrap', (patterns.get('missing <p> wrap') ?? 0) + 1)
        else patterns.set('html diff', (patterns.get('html diff') ?? 0) + 1)
      }
    }

    console.log('\n' + '='.repeat(60))
    console.log(`PASS: ${pass}/652 (${(pass/652*100).toFixed(1)}%)`)
    console.log('='.repeat(60))
    console.log('\nSection breakdown:')
    for (const [section, s] of sectionStats) {
      const pct = ((s.pass / (s.pass + s.fail)) * 100).toFixed(0)
      console.log(`  ${pct.padStart(3)}% ${section} (${s.pass}/${s.pass + s.fail})`)
    }
    console.log('\nFailure patterns:')
    for (const [pattern, count] of [...patterns.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${count.toString().padStart(4)}x ${pattern}`)
    }

    expect(pass + (652 - pass)).toBe(652)
  })
})
