/**
 * CommonMark Spec — 7 引擎通过率对比
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse } from '@pre-markdown/parser'
import { renderToHtml } from '@pre-markdown/renderer'
import { resetNodeIds } from '@pre-markdown/core'

// Benchmark libs (from benchmark/node_modules via vite alias)
import { marked } from 'marked'
import MarkdownIt from 'markdown-it'
import * as commonmark from 'commonmark'
import Showdown from 'showdown'
import { Remarkable } from 'remarkable'

interface SpecExample { markdown: string; html: string; example: number; section: string }
const specData: SpecExample[] = JSON.parse(readFileSync(resolve(__dirname, '../../harness/fixtures/commonmark-spec.json'), 'utf-8'))
const norm = (s: string) => s.replace(/\n+$/, '\n').replace(/\r\n/g, '\n').replace(/\s+\n/g, '\n')

// Engine renderers
const mdit = new MarkdownIt()
const cmReader = new commonmark.Parser()
const cmWriter = new commonmark.HtmlRenderer()
const sdConverter = new Showdown.Converter()
const remarkableInst = new Remarkable()

type RenderFn = (md: string) => string
const engines: { name: string; render: RenderFn }[] = [
  { name: 'PreMarkdown', render: (md) => { resetNodeIds(); return renderToHtml(parse(md), { sanitize: false }) } },
  { name: 'marked', render: (md) => marked(md) as string },
  { name: 'markdown-it', render: (md) => mdit.render(md) },
  { name: 'commonmark.js', render: (md) => cmWriter.render(cmReader.parse(md)) },
  { name: 'showdown', render: (md) => sdConverter.makeHtml(md) },
  { name: 'remarkable', render: (md) => remarkableInst.render(md) },
]

describe('CommonMark Spec — 7 Engine Comparison', () => {
  it('compare pass rates', () => {
    const results = new Map<string, { pass: number; total: number; sections: Map<string, { pass: number; total: number }> }>()

    for (const engine of engines) {
      results.set(engine.name, { pass: 0, total: 0, sections: new Map() })
    }

    for (const ex of specData) {
      for (const engine of engines) {
        const r = results.get(engine.name)!
        r.total++
        const s = r.sections.get(ex.section) ?? { pass: 0, total: 0 }
        s.total++

        try {
          const actual = engine.render(ex.markdown)
          if (norm(actual) === norm(ex.html)) {
            r.pass++
            s.pass++
          }
        } catch {
          // Engine error = fail
        }
        r.sections.set(ex.section, s)
      }
    }

    // Print overall results
    console.log('\n' + '='.repeat(80))
    console.log('CommonMark Spec 0.31.2 — 652 Cases — Engine Comparison')
    console.log('='.repeat(80))
    console.log('')

    // Sort by pass rate descending
    const sorted = [...results.entries()].sort((a, b) => b[1].pass - a[1].pass)
    for (const [name, r] of sorted) {
      const pct = ((r.pass / r.total) * 100).toFixed(1)
      const bar = '█'.repeat(Math.round(r.pass / r.total * 40)) + '░'.repeat(40 - Math.round(r.pass / r.total * 40))
      console.log(`  ${name.padEnd(15)} ${pct.padStart(5)}%  ${r.pass}/${r.total}  ${bar}`)
    }

    // Section breakdown comparison
    const sections = [...new Set(specData.map(e => e.section))]
    console.log('\n' + '-'.repeat(80))
    console.log('Section Breakdown:')
    console.log(`${'Section'.padEnd(40)} ${engines.map(e => e.name.slice(0,8).padStart(9)).join('')}`)
    console.log('-'.repeat(80))

    for (const section of sections) {
      const cells = engines.map(engine => {
        const r = results.get(engine.name)!
        const s = r.sections.get(section)
        if (!s || s.total === 0) return '   -    '
        const pct = Math.round((s.pass / s.total) * 100)
        return `${pct.toString().padStart(4)}%   `
      })
      console.log(`${section.padEnd(40)} ${cells.join('')}`)
    }

    console.log('='.repeat(80))

    expect(sorted.length).toBe(6)
  })
})
