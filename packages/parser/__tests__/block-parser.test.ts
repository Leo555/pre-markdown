/**
 * Block Parser Tests — CommonMark + Extensions
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { parse } from '@pre-markdown/parser'
import { resetNodeIds } from '@pre-markdown/core'
import type { Heading, Paragraph, CodeBlock, Blockquote, List, ThematicBreak, Table, MathBlock, Container, TOC, HtmlBlock, FootnoteDefinition } from '@pre-markdown/core'

describe('Block Parser', () => {
  beforeEach(() => {
    resetNodeIds()
  })

  describe('Headings', () => {
    it('should parse ATX headings h1-h6', () => {
      const doc = parse('# H1\n## H2\n### H3\n#### H4\n##### H5\n###### H6')
      expect(doc.children).toHaveLength(6)
      for (let i = 0; i < 6; i++) {
        const heading = doc.children[i] as Heading
        expect(heading.type).toBe('heading')
        expect(heading.depth).toBe(i + 1)
      }
    })

    it('should parse ATX heading with closing hashes', () => {
      const doc = parse('## Hello ##')
      const heading = doc.children[0] as Heading
      expect(heading.type).toBe('heading')
      expect(heading.depth).toBe(2)
    })

    it('should parse empty headings', () => {
      const doc = parse('#')
      const heading = doc.children[0] as Heading
      expect(heading.type).toBe('heading')
      expect(heading.depth).toBe(1)
      expect(heading.children).toHaveLength(0)
    })

    it('should parse setext h1 (=== underline)', () => {
      const doc = parse('Title\n===')
      const heading = doc.children[0] as Heading
      expect(heading.type).toBe('heading')
      expect(heading.depth).toBe(1)
    })

    it('should parse setext h2 (--- underline)', () => {
      const doc = parse('Title\n---')
      const heading = doc.children[0] as Heading
      expect(heading.type).toBe('heading')
      expect(heading.depth).toBe(2)
    })
  })

  describe('Paragraphs', () => {
    it('should parse a simple paragraph', () => {
      const doc = parse('Hello world')
      expect(doc.children).toHaveLength(1)
      const para = doc.children[0] as Paragraph
      expect(para.type).toBe('paragraph')
    })

    it('should separate paragraphs by blank lines', () => {
      const doc = parse('First paragraph\n\nSecond paragraph')
      expect(doc.children).toHaveLength(2)
      expect(doc.children[0]!.type).toBe('paragraph')
      expect(doc.children[1]!.type).toBe('paragraph')
    })

    it('should treat consecutive lines as one paragraph', () => {
      const doc = parse('Line 1\nLine 2\nLine 3')
      expect(doc.children).toHaveLength(1)
    })
  })

  describe('Code Blocks', () => {
    it('should parse fenced code block with backticks', () => {
      const doc = parse('```\ncode here\n```')
      const code = doc.children[0] as CodeBlock
      expect(code.type).toBe('codeBlock')
      expect(code.value).toBe('code here')
    })

    it('should parse fenced code block with language', () => {
      const doc = parse('```javascript\nconst x = 1\n```')
      const code = doc.children[0] as CodeBlock
      expect(code.lang).toBe('javascript')
      expect(code.value).toBe('const x = 1')
    })

    it('should parse fenced code block with tildes', () => {
      const doc = parse('~~~\ncode\n~~~')
      const code = doc.children[0] as CodeBlock
      expect(code.type).toBe('codeBlock')
      expect(code.value).toBe('code')
    })

    it('should parse indented code block', () => {
      const doc = parse('    indented code\n    more code')
      const code = doc.children[0] as CodeBlock
      expect(code.type).toBe('codeBlock')
      expect(code.value).toBe('indented code\nmore code')
    })

    it('should handle multi-line code blocks', () => {
      const doc = parse('```\nline 1\nline 2\nline 3\n```')
      const code = doc.children[0] as CodeBlock
      expect(code.value).toBe('line 1\nline 2\nline 3')
    })
  })

  describe('Blockquotes', () => {
    it('should parse simple blockquote', () => {
      const doc = parse('> Hello')
      const bq = doc.children[0] as Blockquote
      expect(bq.type).toBe('blockquote')
      expect(bq.children).toHaveLength(1)
    })

    it('should parse multi-line blockquote', () => {
      const doc = parse('> Line 1\n> Line 2')
      const bq = doc.children[0] as Blockquote
      expect(bq.type).toBe('blockquote')
    })

    it('should parse nested blockquotes', () => {
      const doc = parse('> > Nested')
      const outer = doc.children[0] as Blockquote
      expect(outer.type).toBe('blockquote')
      const inner = outer.children[0] as Blockquote
      expect(inner.type).toBe('blockquote')
    })
  })

  describe('Lists', () => {
    it('should parse unordered list with -', () => {
      const doc = parse('- Item 1\n- Item 2\n- Item 3')
      const list = doc.children[0] as List
      expect(list.type).toBe('list')
      expect(list.ordered).toBe(false)
      expect(list.children).toHaveLength(3)
    })

    it('should parse unordered list with *', () => {
      const doc = parse('* Item 1\n* Item 2')
      const list = doc.children[0] as List
      expect(list.ordered).toBe(false)
    })

    it('should parse ordered list', () => {
      const doc = parse('1. First\n2. Second\n3. Third')
      const list = doc.children[0] as List
      expect(list.type).toBe('list')
      expect(list.ordered).toBe(true)
      expect(list.children).toHaveLength(3)
    })

    it('should parse task list items', () => {
      const doc = parse('- [ ] Unchecked\n- [x] Checked')
      const list = doc.children[0] as List
      expect(list.children[0]!.checked).toBe(false)
      expect(list.children[1]!.checked).toBe(true)
    })
  })

  describe('Thematic Break', () => {
    it('should parse --- as thematic break', () => {
      const doc = parse('---')
      expect((doc.children[0] as ThematicBreak).type).toBe('thematicBreak')
    })

    it('should parse *** as thematic break', () => {
      const doc = parse('***')
      expect((doc.children[0] as ThematicBreak).type).toBe('thematicBreak')
    })

    it('should parse ___ as thematic break', () => {
      const doc = parse('___')
      expect((doc.children[0] as ThematicBreak).type).toBe('thematicBreak')
    })

    it('should parse thematic break with spaces', () => {
      const doc = parse('- - -')
      expect((doc.children[0] as ThematicBreak).type).toBe('thematicBreak')
    })
  })

  describe('Tables (GFM)', () => {
    it('should parse simple table', () => {
      const doc = parse('| A | B |\n|---|---|\n| 1 | 2 |')
      const table = doc.children[0] as Table
      expect(table.type).toBe('table')
      expect(table.children).toHaveLength(2)
      expect(table.children[0]!.isHeader).toBe(true)
      expect(table.children[1]!.isHeader).toBe(false)
    })

    it('should parse table alignments', () => {
      const doc = parse('| Left | Center | Right |\n|:---|:---:|---:|\n| L | C | R |')
      const table = doc.children[0] as Table
      expect(table.align).toEqual(['left', 'center', 'right'])
    })
  })

  describe('Math Block', () => {
    it('should parse math block', () => {
      const doc = parse('$$\nE = mc^2\n$$')
      const math = doc.children[0] as MathBlock
      expect(math.type).toBe('mathBlock')
      expect(math.value).toBe('E = mc^2')
    })
  })

  describe('Container', () => {
    it('should parse info container', () => {
      const doc = parse('::: info\nThis is info\n:::')
      const container = doc.children[0] as Container
      expect(container.type).toBe('container')
      expect(container.kind).toBe('info')
    })

    it('should parse container with title', () => {
      const doc = parse('::: warning Important Note\nBe careful\n:::')
      const container = doc.children[0] as Container
      expect(container.kind).toBe('warning')
      expect(container.title).toBe('Important Note')
    })
  })

  describe('TOC', () => {
    it('should parse [[toc]]', () => {
      const doc = parse('[[toc]]')
      const toc = doc.children[0] as TOC
      expect(toc.type).toBe('toc')
    })

    it('should be case-insensitive', () => {
      const doc = parse('[[TOC]]')
      expect(doc.children[0]!.type).toBe('toc')
    })
  })

  describe('HTML Blocks', () => {
    it('should parse block-level HTML', () => {
      const doc = parse('<div>\nHello\n</div>')
      const html = doc.children[0] as HtmlBlock
      expect(html.type).toBe('htmlBlock')
    })
  })

  describe('Mixed Content', () => {
    it('should parse a document with mixed block types', () => {
      const md = `# Title

This is a paragraph.

- Item 1
- Item 2

> A quote

\`\`\`javascript
const x = 1
\`\`\`

---`
      const doc = parse(md)
      expect(doc.children.length).toBeGreaterThanOrEqual(5)

      const types = doc.children.map((n) => n.type)
      expect(types).toContain('heading')
      expect(types).toContain('paragraph')
      expect(types).toContain('list')
      expect(types).toContain('blockquote')
      expect(types).toContain('codeBlock')
      expect(types).toContain('thematicBreak')
    })
  })

  describe('Footnote Definitions', () => {
    it('should parse a simple footnote definition', () => {
      const doc = parse('[^1]: This is a footnote.')
      expect(doc.children).toHaveLength(1)
      const fn = doc.children[0] as FootnoteDefinition
      expect(fn.type).toBe('footnoteDefinition')
      expect(fn.identifier).toBe('1')
      expect(fn.label).toBe('1')
      expect(fn.children).toHaveLength(1)
      expect(fn.children[0]!.type).toBe('paragraph')
    })

    it('should parse footnote with text identifier', () => {
      const doc = parse('[^note]: A footnote with text id.')
      const fn = doc.children[0] as FootnoteDefinition
      expect(fn.identifier).toBe('note')
    })

    it('should parse footnote with multi-line content', () => {
      const doc = parse('[^long]: First line.\n  Second line continuation.')
      const fn = doc.children[0] as FootnoteDefinition
      expect(fn.type).toBe('footnoteDefinition')
      expect(fn.children.length).toBeGreaterThanOrEqual(1)
    })

    it('should parse multiple footnote definitions', () => {
      const doc = parse('[^1]: First footnote.\n\n[^2]: Second footnote.')
      expect(doc.children).toHaveLength(2)
      expect((doc.children[0] as FootnoteDefinition).identifier).toBe('1')
      expect((doc.children[1] as FootnoteDefinition).identifier).toBe('2')
    })

    it('should not parse invalid footnote syntax', () => {
      const doc = parse('[1]: not a footnote')
      expect(doc.children[0]!.type).not.toBe('footnoteDefinition')
    })

    it('should parse footnote followed by other blocks', () => {
      const doc = parse('[^ref]: Footnote content.\n\n# Heading')
      expect(doc.children).toHaveLength(2)
      expect(doc.children[0]!.type).toBe('footnoteDefinition')
      expect(doc.children[1]!.type).toBe('heading')
    })
  })
})
