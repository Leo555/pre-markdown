/**
 * Performance Benchmark Harness for PreMarkdown
 *
 * Run with: pnpm bench
 */
import { describe, bench } from 'vitest'
import { parse } from '@pre-markdown/parser'
import { renderToHtml } from '@pre-markdown/renderer'
import { resetNodeIds } from '@pre-markdown/core'

// ============================================================
// Test Document Generators
// ============================================================

function generateMarkdown(lineCount: number): string {
  const lines: string[] = []
  for (let i = 0; i < lineCount; i++) {
    const mod = i % 20
    if (mod === 0) {
      lines.push(`# Heading ${Math.floor(i / 20) + 1}`)
    } else if (mod === 1) {
      lines.push('')
    } else if (mod === 2) {
      lines.push(`This is paragraph ${i}. It contains **bold text**, *italic text*, and \`inline code\`.`)
    } else if (mod === 3) {
      lines.push(`More text with a [link](https://example.com) and an ![image](img.png).`)
    } else if (mod === 4) {
      lines.push('')
    } else if (mod === 5) {
      lines.push('- List item one')
    } else if (mod === 6) {
      lines.push('- List item two')
    } else if (mod === 7) {
      lines.push('- List item three')
    } else if (mod === 8) {
      lines.push('')
    } else if (mod === 9) {
      lines.push('> This is a blockquote with some content.')
    } else if (mod === 10) {
      lines.push('')
    } else if (mod === 11) {
      lines.push('```javascript')
    } else if (mod === 12) {
      lines.push(`const value_${i} = ${i};`)
    } else if (mod === 13) {
      lines.push('```')
    } else if (mod === 14) {
      lines.push('')
    } else if (mod === 15) {
      lines.push('| Column A | Column B | Column C |')
    } else if (mod === 16) {
      lines.push('|----------|----------|----------|')
    } else if (mod === 17) {
      lines.push(`| Cell ${i}-1 | Cell ${i}-2 | Cell ${i}-3 |`)
    } else if (mod === 18) {
      lines.push('')
    } else {
      lines.push('---')
    }
  }
  return lines.join('\n')
}

function generateInlineHeavy(lineCount: number): string {
  const lines: string[] = []
  for (let i = 0; i < lineCount; i++) {
    lines.push(
      `This **bold ${i}** text has *italic* and ~~strike~~ plus \`code\` and [link ${i}](url${i}) and $x^${i}$ math.`,
    )
  }
  return lines.join('\n\n')
}

// ============================================================
// Benchmarks
// ============================================================

const doc100 = generateMarkdown(100)
const doc1K = generateMarkdown(1000)
const doc10K = generateMarkdown(10000)
const inlineHeavy1K = generateInlineHeavy(1000)

describe('Parse Benchmarks', () => {
  bench('Parse 100 lines (mixed content)', () => {
    resetNodeIds()
    parse(doc100)
  })

  bench('Parse 1K lines (mixed content)', () => {
    resetNodeIds()
    parse(doc1K)
  })

  bench('Parse 10K lines (mixed content)', () => {
    resetNodeIds()
    parse(doc10K)
  })

  bench('Parse 1K lines (inline-heavy)', () => {
    resetNodeIds()
    parse(inlineHeavy1K)
  })
})

describe('Render Benchmarks', () => {
  const ast100 = parse(doc100)
  const ast1K = parse(doc1K)

  bench('Render 100 lines to HTML', () => {
    renderToHtml(ast100)
  })

  bench('Render 1K lines to HTML', () => {
    renderToHtml(ast1K)
  })
})

describe('Parse + Render Pipeline', () => {
  bench('Full pipeline: 100 lines', () => {
    resetNodeIds()
    const ast = parse(doc100)
    renderToHtml(ast)
  })

  bench('Full pipeline: 1K lines', () => {
    resetNodeIds()
    const ast = parse(doc1K)
    renderToHtml(ast)
  })
})
