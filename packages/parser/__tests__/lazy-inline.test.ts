/**
 * Lazy Inline Parsing Tests
 *
 * Verifies that lazyInline option defers inline parsing to render time.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { parse, parseInline } from '@pre-markdown/parser'
import { renderToHtml } from '@pre-markdown/renderer'
import { resetNodeIds } from '@pre-markdown/core'
import type { Heading, Paragraph, Table, TableCell, TableRow } from '@pre-markdown/core'

describe('Lazy Inline Parsing', () => {
  beforeEach(() => {
    resetNodeIds()
  })

  describe('parse with lazyInline: true', () => {
    it('paragraph should have _raw and empty children', () => {
      const doc = parse('Hello **world**', { lazyInline: true })
      const p = doc.children[0] as Paragraph
      expect(p.type).toBe('paragraph')
      expect(p.children).toHaveLength(0)
      expect(p._raw).toBe('Hello **world**')
    })

    it('ATX heading should have _raw and empty children', () => {
      const doc = parse('# Hello **world**', { lazyInline: true })
      const h = doc.children[0] as Heading
      expect(h.type).toBe('heading')
      expect(h.depth).toBe(1)
      expect(h.children).toHaveLength(0)
      expect(h._raw).toBe('Hello **world**')
    })

    it('setext heading should have _raw and empty children', () => {
      const doc = parse('Hello **world**\n===', { lazyInline: true })
      const h = doc.children[0] as Heading
      expect(h.type).toBe('heading')
      expect(h.depth).toBe(1)
      expect(h.children).toHaveLength(0)
      expect(h._raw).toBe('Hello **world**')
    })

    it('table cells should have _raw and empty children', () => {
      const doc = parse('| A | B |\n|---|---|\n| **x** | y |', { lazyInline: true })
      const table = doc.children[0] as Table
      const headerRow = table.children[0] as TableRow
      const cell = headerRow.children[0] as TableCell
      expect(cell.children).toHaveLength(0)
      expect(cell._raw).toBe('A')
    })

    it('empty heading should not have _raw', () => {
      const doc = parse('# ', { lazyInline: true })
      const h = doc.children[0] as Heading
      expect(h.children).toHaveLength(0)
      expect(h._raw).toBeUndefined()
    })

    it('code blocks and thematic breaks are unaffected', () => {
      const doc = parse('```\ncode\n```\n\n---', { lazyInline: true })
      expect(doc.children).toHaveLength(2)
      expect(doc.children[0]!.type).toBe('codeBlock')
      expect(doc.children[1]!.type).toBe('thematicBreak')
    })
  })

  describe('parse with lazyInline: false (default)', () => {
    it('paragraph should have parsed children and no _raw', () => {
      const doc = parse('Hello **world**')
      const p = doc.children[0] as Paragraph
      expect(p.children.length).toBeGreaterThan(0)
      expect(p._raw).toBeUndefined()
    })

    it('heading should have parsed children and no _raw', () => {
      const doc = parse('# Hello **world**')
      const h = doc.children[0] as Heading
      expect(h.children.length).toBeGreaterThan(0)
      expect(h._raw).toBeUndefined()
    })
  })

  describe('renderToHtml with lazy inline resolution', () => {
    it('should resolve lazy paragraphs at render time', () => {
      const doc = parse('Hello **world**', { lazyInline: true })
      const html = renderToHtml(doc, { inlineParser: parseInline })
      expect(html).toContain('<strong>world</strong>')
      expect(html).toContain('<p>')
    })

    it('should resolve lazy headings at render time', () => {
      const doc = parse('# Hello **world**', { lazyInline: true })
      const html = renderToHtml(doc, { inlineParser: parseInline })
      expect(html).toContain('<h1>')
      expect(html).toContain('<strong>world</strong>')
    })

    it('should resolve lazy table cells at render time', () => {
      const doc = parse('| **A** | B |\n|---|---|\n| x | y |', { lazyInline: true })
      const html = renderToHtml(doc, { inlineParser: parseInline })
      expect(html).toContain('<strong>A</strong>')
      expect(html).toContain('<table>')
    })

    it('should produce same HTML as eager parsing', () => {
      const input = `# Hello **world**

This is a **paragraph** with *emphasis* and \`code\`.

| Col A | Col B |
|-------|-------|
| **x** | *y*   |

> Blockquote with **bold**
`
      const eagerDoc = parse(input)
      const eagerHtml = renderToHtml(eagerDoc)

      const lazyDoc = parse(input, { lazyInline: true })
      const lazyHtml = renderToHtml(lazyDoc, { inlineParser: parseInline })

      expect(lazyHtml).toBe(eagerHtml)
    })

    it('should handle multi-paragraph document correctly', () => {
      const input = 'Para 1\n\nPara 2\n\nPara 3'
      const eagerDoc = parse(input)
      const eagerHtml = renderToHtml(eagerDoc)

      const lazyDoc = parse(input, { lazyInline: true })
      const lazyHtml = renderToHtml(lazyDoc, { inlineParser: parseInline })

      expect(lazyHtml).toBe(eagerHtml)
    })

    it('should cache resolved inline (no double parse)', () => {
      const doc = parse('Hello **world**', { lazyInline: true })
      const p = doc.children[0] as Paragraph
      expect(p._raw).toBe('Hello **world**')

      // First render resolves inline
      renderToHtml(doc, { inlineParser: parseInline })
      expect(p.children.length).toBeGreaterThan(0)
      expect(p._raw).toBeUndefined() // cleared after resolution

      // Second render uses cached children
      const html2 = renderToHtml(doc, { inlineParser: parseInline })
      expect(html2).toContain('<strong>world</strong>')
    })

    it('lazy parse without inlineParser falls back to empty content', () => {
      const doc = parse('Hello **world**', { lazyInline: true })
      const html = renderToHtml(doc) // no inlineParser
      expect(html).toBe('<p></p>\n')
    })
  })

  describe('performance: lazy parse is faster', () => {
    it('lazy parse should be faster than eager parse for large documents', () => {
      // Generate a large document
      const lines: string[] = []
      for (let i = 0; i < 500; i++) {
        lines.push(`Paragraph ${i} with **bold** and *italic* and [link](url) and \`code\`.`)
        lines.push('')
      }
      const input = lines.join('\n')

      // Warm up
      parse(input)
      parse(input, { lazyInline: true })

      // Benchmark eager
      const t0 = performance.now()
      for (let j = 0; j < 10; j++) {
        parse(input)
      }
      const eagerTime = performance.now() - t0

      // Benchmark lazy (parse only)
      const t1 = performance.now()
      for (let j = 0; j < 10; j++) {
        parse(input, { lazyInline: true })
      }
      const lazyTime = performance.now() - t1

      // Lazy parse should be significantly faster (skip inline parsing)
      console.log(`Eager parse: ${eagerTime.toFixed(2)}ms, Lazy parse: ${lazyTime.toFixed(2)}ms, Speedup: ${(eagerTime / lazyTime).toFixed(1)}x`)
      expect(lazyTime).toBeLessThan(eagerTime)
    })
  })
})
