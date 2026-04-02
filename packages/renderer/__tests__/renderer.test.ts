/**
 * Renderer Tests
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { parse } from '@pre-markdown/parser'
import { renderToHtml } from '@pre-markdown/renderer'
import { resetNodeIds } from '@pre-markdown/core'

describe('Renderer', () => {
  beforeEach(() => {
    resetNodeIds()
  })

  describe('Headings', () => {
    it('should render h1', () => {
      const doc = parse('# Hello')
      const html = renderToHtml(doc)
      expect(html).toContain('<h1')
      expect(html).toContain('Hello')
      expect(html).toContain('</h1>')
    })

    it('should render heading with id', () => {
      const doc = parse('## My Title')
      const headingId = (text: string) => text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '')
      const html = renderToHtml(doc, { headingId })
      expect(html).toContain('id="my-title"')
    })
  })

  describe('Paragraphs', () => {
    it('should render paragraph', () => {
      const doc = parse('Hello world')
      const html = renderToHtml(doc)
      expect(html).toContain('<p>')
      expect(html).toContain('Hello world')
      expect(html).toContain('</p>')
    })
  })

  describe('Emphasis & Strong', () => {
    it('should render emphasis', () => {
      const doc = parse('*italic*')
      const html = renderToHtml(doc)
      expect(html).toContain('<em>italic</em>')
    })

    it('should render strong', () => {
      const doc = parse('**bold**')
      const html = renderToHtml(doc)
      expect(html).toContain('<strong>bold</strong>')
    })
  })

  describe('Code', () => {
    it('should render inline code', () => {
      const doc = parse('Use `const x = 1`')
      const html = renderToHtml(doc)
      expect(html).toContain('<code>')
      expect(html).toContain('const x = 1')
    })

    it('should render code block', () => {
      const doc = parse('```javascript\nconst x = 1\n```')
      const html = renderToHtml(doc)
      expect(html).toContain('<pre>')
      expect(html).toContain('<code')
      expect(html).toContain('language-javascript')
    })
  })

  describe('Links & Images', () => {
    it('should render link', () => {
      const doc = parse('[Example](https://example.com)')
      const html = renderToHtml(doc)
      expect(html).toContain('<a href="https://example.com">')
      expect(html).toContain('Example')
    })

    it('should render image', () => {
      const doc = parse('![Alt](image.png)')
      const html = renderToHtml(doc)
      expect(html).toContain('<img')
      expect(html).toContain('src="image.png"')
      expect(html).toContain('alt="Alt"')
    })
  })

  describe('Lists', () => {
    it('should render unordered list', () => {
      const doc = parse('- Item 1\n- Item 2')
      const html = renderToHtml(doc)
      expect(html).toContain('<ul>')
      expect(html).toContain('<li>')
      expect(html).toContain('</ul>')
    })

    it('should render ordered list', () => {
      const doc = parse('1. First\n2. Second')
      const html = renderToHtml(doc)
      expect(html).toContain('<ol>')
    })

    it('should render task list', () => {
      const doc = parse('- [x] Done\n- [ ] Todo')
      const html = renderToHtml(doc)
      expect(html).toContain('type="checkbox"')
      expect(html).toContain('checked')
    })
  })

  describe('Blockquote', () => {
    it('should render blockquote', () => {
      const doc = parse('> Quote text')
      const html = renderToHtml(doc)
      expect(html).toContain('<blockquote>')
    })
  })

  describe('Table', () => {
    it('should render table', () => {
      const doc = parse('| A | B |\n|---|---|\n| 1 | 2 |')
      const html = renderToHtml(doc)
      expect(html).toContain('<table>')
      expect(html).toContain('<thead>')
      expect(html).toContain('<th>')
      expect(html).toContain('<tbody>')
      expect(html).toContain('<td>')
    })

    it('should render table with alignment', () => {
      const doc = parse('| L | C | R |\n|:---|:---:|---:|\n| 1 | 2 | 3 |')
      const html = renderToHtml(doc)
      expect(html).toContain('text-align:left')
      expect(html).toContain('text-align:center')
      expect(html).toContain('text-align:right')
    })
  })

  describe('Thematic Break', () => {
    it('should render hr', () => {
      const doc = parse('---')
      const html = renderToHtml(doc)
      expect(html).toContain('<hr />')
    })
  })

  describe('Math', () => {
    it('should render inline math', () => {
      const doc = parse('$E=mc^2$')
      const html = renderToHtml(doc)
      expect(html).toContain('math-inline')
    })

    it('should render block math', () => {
      const doc = parse('$$\nE = mc^2\n$$')
      const html = renderToHtml(doc)
      expect(html).toContain('math-block')
    })
  })

  describe('Strikethrough', () => {
    it('should render strikethrough', () => {
      const doc = parse('~~deleted~~')
      const html = renderToHtml(doc)
      expect(html).toContain('<del>deleted</del>')
    })
  })

  describe('Highlight', () => {
    it('should render highlight', () => {
      const doc = parse('==highlighted==')
      const html = renderToHtml(doc)
      expect(html).toContain('<mark>highlighted</mark>')
    })
  })

  describe('Container', () => {
    it('should render info container', () => {
      const doc = parse('::: info\nInfo text\n:::')
      const html = renderToHtml(doc)
      expect(html).toContain('container-info')
    })
  })

  describe('HTML Escaping', () => {
    it('should escape HTML in text content', () => {
      const doc = parse('Use `<div>` tag')
      const html = renderToHtml(doc)
      expect(html).toContain('&lt;div&gt;')
    })
  })

  describe('Full Document Rendering', () => {
    it('should render a complete document', () => {
      const md = `# Welcome

This is a **bold** statement with *italic* text.

## Features

- Fast parsing
- Great rendering
- [Links](https://example.com)

\`\`\`javascript
const editor = new PreMarkdown()
\`\`\`

> A thoughtful quote

---

| Feature | Status |
|---------|--------|
| Parse   | ✅     |
| Render  | ✅     |`

      const doc = parse(md)
      const html = renderToHtml(doc)

      expect(html).toContain('<h1')
      expect(html).toContain('<strong>bold</strong>')
      expect(html).toContain('<em>italic</em>')
      expect(html).toContain('<ul>')
      expect(html).toContain('<pre>')
      expect(html).toContain('<blockquote>')
      expect(html).toContain('<hr />')
      expect(html).toContain('<table>')
    })
  })
})
