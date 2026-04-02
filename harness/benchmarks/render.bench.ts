/**
 * Renderer Performance Benchmarks
 */
import { bench, describe } from 'vitest'
import { parse } from '@pre-markdown/parser'
import { renderToHtml } from '@pre-markdown/renderer'
import { resetNodeIds } from '@pre-markdown/core'

// Generate test documents of various sizes
function generateMarkdown(paragraphs: number): string {
  const lines: string[] = ['# Benchmark Document\n']
  for (let i = 0; i < paragraphs; i++) {
    if (i % 50 === 0 && i > 0) {
      lines.push(`## Section ${Math.ceil(i / 50)}\n`)
    }
    if (i % 20 === 0) {
      lines.push('```javascript')
      lines.push(`function test_${i}() { return ${i} }`)
      lines.push('```\n')
    } else if (i % 15 === 0) {
      lines.push('| Col A | Col B | Col C |')
      lines.push('|-------|-------|-------|')
      lines.push(`| ${i} | data | value |`)
      lines.push('')
    } else if (i % 10 === 0) {
      lines.push(`> Blockquote ${i}: The quick brown fox.\n`)
    } else {
      lines.push(`Paragraph ${i}: **Bold** and *italic* with \`code\` and [link](url). ~~strike~~ and ==highlight==.\n`)
    }
  }
  return lines.join('\n')
}

const small = generateMarkdown(50)
const medium = generateMarkdown(500)
const large = generateMarkdown(2000)

// Pre-parse for render-only benchmarks
const smallDoc = parse(small)
const mediumDoc = parse(medium)
const largeDoc = parse(large)

describe('Renderer Benchmarks', () => {
  describe('Parse + Render (end-to-end)', () => {
    bench('50 blocks (parse + render)', () => {
      resetNodeIds()
      const doc = parse(small)
      renderToHtml(doc)
    })

    bench('500 blocks (parse + render)', () => {
      resetNodeIds()
      const doc = parse(medium)
      renderToHtml(doc)
    })

    bench('2000 blocks (parse + render)', () => {
      resetNodeIds()
      const doc = parse(large)
      renderToHtml(doc)
    })
  })

  describe('Render Only', () => {
    bench('renderToHtml — 50 blocks', () => {
      renderToHtml(smallDoc)
    })

    bench('renderToHtml — 500 blocks', () => {
      renderToHtml(mediumDoc)
    })

    bench('renderToHtml — 2000 blocks', () => {
      renderToHtml(largeDoc)
    })
  })

  describe('Render with highlight callback', () => {
    bench('renderToHtml — 500 blocks with highlight', () => {
      renderToHtml(mediumDoc, {
        highlight: (code, lang) => `<span class="hl-${lang}">${code}</span>`,
      })
    })
  })
})
