/**
 * Inline Parser Tests
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { parseInline } from '@pre-markdown/parser'
import { resetNodeIds } from '@pre-markdown/core'
import type { Text, Emphasis, Strong, InlineCode, Link, Image, Strikethrough, MathInline, Highlight, Superscript, Subscript, Autolink, FootnoteReference } from '@pre-markdown/core'

describe('Inline Parser', () => {
  beforeEach(() => {
    resetNodeIds()
  })

  describe('Plain Text', () => {
    it('should parse plain text', () => {
      const nodes = parseInline('Hello world')
      expect(nodes).toHaveLength(1)
      expect((nodes[0] as Text).type).toBe('text')
      expect((nodes[0] as Text).value).toBe('Hello world')
    })

    it('should handle empty string', () => {
      const nodes = parseInline('')
      expect(nodes).toHaveLength(0)
    })
  })

  describe('Emphasis (*italic*)', () => {
    it('should parse single asterisk emphasis', () => {
      const nodes = parseInline('*italic*')
      expect(nodes).toHaveLength(1)
      const em = nodes[0] as Emphasis
      expect(em.type).toBe('emphasis')
      expect(em.children).toHaveLength(1)
      expect((em.children[0] as Text).value).toBe('italic')
    })

    it('should parse underscore emphasis', () => {
      const nodes = parseInline('_italic_')
      expect(nodes).toHaveLength(1)
      expect((nodes[0] as Emphasis).type).toBe('emphasis')
    })

    it('should handle emphasis within text', () => {
      const nodes = parseInline('Hello *world* there')
      expect(nodes).toHaveLength(3)
      expect((nodes[0] as Text).value).toBe('Hello ')
      expect(nodes[1]!.type).toBe('emphasis')
      expect((nodes[2] as Text).value).toBe(' there')
    })
  })

  describe('Strong (**bold**)', () => {
    it('should parse double asterisk strong', () => {
      const nodes = parseInline('**bold**')
      expect(nodes).toHaveLength(1)
      const strong = nodes[0] as Strong
      expect(strong.type).toBe('strong')
      expect((strong.children[0] as Text).value).toBe('bold')
    })

    it('should parse double underscore strong', () => {
      const nodes = parseInline('__bold__')
      expect(nodes).toHaveLength(1)
      expect((nodes[0] as Strong).type).toBe('strong')
    })
  })

  describe('Bold Italic (***text***)', () => {
    it('should parse triple asterisk as bold+italic', () => {
      const nodes = parseInline('***both***')
      expect(nodes).toHaveLength(1)
      const strong = nodes[0] as Strong
      expect(strong.type).toBe('strong')
      expect(strong.children).toHaveLength(1)
      expect(strong.children[0]!.type).toBe('emphasis')
    })
  })

  describe('Inline Code (`code`)', () => {
    it('should parse single backtick code', () => {
      const nodes = parseInline('`code`')
      expect(nodes).toHaveLength(1)
      const code = nodes[0] as InlineCode
      expect(code.type).toBe('inlineCode')
      expect(code.value).toBe('code')
    })

    it('should parse double backtick code', () => {
      const nodes = parseInline('`` code with `backtick` ``')
      expect(nodes).toHaveLength(1)
      expect((nodes[0] as InlineCode).value).toBe('code with `backtick`')
    })

    it('should handle code within text', () => {
      const nodes = parseInline('Use `const x = 1` here')
      expect(nodes).toHaveLength(3)
      expect((nodes[1] as InlineCode).value).toBe('const x = 1')
    })
  })

  describe('Links ([text](url))', () => {
    it('should parse simple link', () => {
      const nodes = parseInline('[Example](https://example.com)')
      expect(nodes).toHaveLength(1)
      const link = nodes[0] as Link
      expect(link.type).toBe('link')
      expect(link.url).toBe('https://example.com')
      expect((link.children[0] as Text).value).toBe('Example')
    })

    it('should parse link with title', () => {
      const nodes = parseInline('[Example](https://example.com "Title")')
      const link = nodes[0] as Link
      expect(link.title).toBe('Title')
    })

    it('should parse link with inline formatting', () => {
      const nodes = parseInline('[**Bold link**](https://example.com)')
      const link = nodes[0] as Link
      expect(link.children[0]!.type).toBe('strong')
    })
  })

  describe('Images (![alt](url))', () => {
    it('should parse simple image', () => {
      const nodes = parseInline('![Logo](logo.png)')
      expect(nodes).toHaveLength(1)
      const img = nodes[0] as Image
      expect(img.type).toBe('image')
      expect(img.url).toBe('logo.png')
      expect(img.alt).toBe('Logo')
    })

    it('should parse image with title', () => {
      const nodes = parseInline('![Alt](img.png "Image Title")')
      const img = nodes[0] as Image
      expect(img.title).toBe('Image Title')
    })
  })

  describe('Strikethrough (~~text~~)', () => {
    it('should parse strikethrough', () => {
      const nodes = parseInline('~~deleted~~')
      expect(nodes).toHaveLength(1)
      const strike = nodes[0] as Strikethrough
      expect(strike.type).toBe('strikethrough')
      expect((strike.children[0] as Text).value).toBe('deleted')
    })
  })

  describe('Math Inline ($formula$)', () => {
    it('should parse inline math', () => {
      const nodes = parseInline('$E=mc^2$')
      expect(nodes).toHaveLength(1)
      const math = nodes[0] as MathInline
      expect(math.type).toBe('mathInline')
      expect(math.value).toBe('E=mc^2')
    })

    it('should handle math within text', () => {
      const nodes = parseInline('The formula $x^2$ is important')
      expect(nodes).toHaveLength(3)
      expect(nodes[1]!.type).toBe('mathInline')
    })
  })

  describe('Highlight (==text==)', () => {
    it('should parse highlight', () => {
      const nodes = parseInline('==highlighted==')
      expect(nodes).toHaveLength(1)
      const hl = nodes[0] as Highlight
      expect(hl.type).toBe('highlight')
    })
  })

  describe('Superscript (^text^)', () => {
    it('should parse superscript', () => {
      const nodes = parseInline('^superscript^')
      expect(nodes).toHaveLength(1)
      expect((nodes[0] as Superscript).type).toBe('superscript')
    })
  })

  describe('Subscript (~text~)', () => {
    it('should parse subscript', () => {
      const nodes = parseInline('H~2~O')
      expect(nodes).toHaveLength(3)
      expect(nodes[1]!.type).toBe('subscript')
    })
  })

  describe('Autolinks', () => {
    it('should parse URL autolink', () => {
      const nodes = parseInline('<https://example.com>')
      expect(nodes).toHaveLength(1)
      const link = nodes[0] as Autolink
      expect(link.type).toBe('autolink')
      expect(link.url).toBe('https://example.com')
      expect(link.isEmail).toBe(false)
    })

    it('should parse email autolink', () => {
      const nodes = parseInline('<user@example.com>')
      expect(nodes).toHaveLength(1)
      const link = nodes[0] as Autolink
      expect(link.isEmail).toBe(true)
    })
  })

  describe('Footnote References', () => {
    it('should parse footnote reference', () => {
      const nodes = parseInline('[^1]')
      expect(nodes).toHaveLength(1)
      const fn = nodes[0] as FootnoteReference
      expect(fn.type).toBe('footnoteReference')
      expect(fn.identifier).toBe('1')
    })
  })

  describe('Escape Characters', () => {
    it('should handle escaped asterisks', () => {
      const nodes = parseInline('\\*not italic\\*')
      // Escaped asterisks produce two text nodes: "*not italic" and "*"
      // since the escape character produces text and the rest continues
      const text = nodes.map(n => n.type === 'text' ? (n as Text).value : '').join('')
      expect(text).toBe('*not italic*')
    })

    it('should handle escaped brackets', () => {
      const nodes = parseInline('\\[not a link\\]')
      const text = nodes.map(n => n.type === 'text' ? (n as Text).value : '').join('')
      expect(text).toBe('[not a link]')
    })
  })

  describe('Complex Inline Content', () => {
    it('should handle mixed inline formatting', () => {
      const nodes = parseInline('Hello **bold** and *italic* and `code`')
      expect(nodes.length).toBeGreaterThanOrEqual(5)

      const types = nodes.map((n) => n.type)
      expect(types).toContain('text')
      expect(types).toContain('strong')
      expect(types).toContain('emphasis')
      expect(types).toContain('inlineCode')
    })
  })
})
