/**
 * Edge Cases Tests — Deep nesting, malformed input, Unicode
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { parse, parseInline } from '@pre-markdown/parser'
import { resetNodeIds } from '@pre-markdown/core'
import type {
  Heading,
  Paragraph,
  Blockquote,
  List,
  CodeBlock,
  Table,
  Text,
  Strong,
  Emphasis,
  InlineNode,
} from '@pre-markdown/core'

describe('Edge Cases', () => {
  beforeEach(() => {
    resetNodeIds()
  })

  // ================================================================
  // Deep Nesting
  // ================================================================
  describe('Deep Nesting', () => {
    it('should parse deeply nested blockquotes (5 levels)', () => {
      const input = '> L1\n> > L2\n> > > L3\n> > > > L4\n> > > > > L5'
      const doc = parse(input)
      expect(doc.children.length).toBeGreaterThanOrEqual(1)
      const bq1 = doc.children[0]!
      expect(bq1.type).toBe('blockquote')
    })

    it('should parse nested lists (3 levels)', () => {
      const input = '- L1\n  - L2\n    - L3'
      const doc = parse(input)
      expect(doc.children).toHaveLength(1)
      expect(doc.children[0]!.type).toBe('list')
    })

    it('should parse blockquote containing list', () => {
      const input = '> - item 1\n> - item 2'
      const doc = parse(input)
      expect(doc.children).toHaveLength(1)
      const bq = doc.children[0] as Blockquote
      expect(bq.type).toBe('blockquote')
      expect(bq.children.length).toBeGreaterThanOrEqual(1)
    })

    it('should parse nested inline: bold > italic > code', () => {
      const nodes = parseInline('***~~`code`~~***')
      expect(nodes.length).toBeGreaterThanOrEqual(1)
    })

    it('should handle triple emphasis (bold + italic)', () => {
      const nodes = parseInline('***bold italic***')
      expect(nodes).toHaveLength(1)
      expect(nodes[0]!.type).toBe('strong')
      const strong = nodes[0] as Strong
      expect(strong.children).toHaveLength(1)
      expect(strong.children[0]!.type).toBe('emphasis')
    })

    it('should parse list inside blockquote', () => {
      const doc = parse('> 1. First\n> 2. Second\n> 3. Third')
      const bq = doc.children[0] as Blockquote
      expect(bq.type).toBe('blockquote')
    })

    it('should parse code block inside blockquote', () => {
      const doc = parse('> ```js\n> const x = 1\n> ```')
      expect(doc.children.length).toBeGreaterThanOrEqual(1)
    })
  })

  // ================================================================
  // Malformed Input
  // ================================================================
  describe('Malformed Input', () => {
    it('should handle empty input', () => {
      const doc = parse('')
      expect(doc.type).toBe('document')
      expect(doc.children).toHaveLength(0)
    })

    it('should handle whitespace-only input', () => {
      const doc = parse('   \n  \n   ')
      expect(doc.children).toHaveLength(0)
    })

    it('should handle single newline', () => {
      const doc = parse('\n')
      expect(doc.children).toHaveLength(0)
    })

    it('should handle unclosed code block', () => {
      const doc = parse('```js\nconst x = 1')
      expect(doc.children.length).toBeGreaterThanOrEqual(1)
      const code = doc.children[0] as CodeBlock
      expect(code.type).toBe('codeBlock')
      expect(code.value).toContain('const x = 1')
    })

    it('should handle unclosed emphasis', () => {
      const nodes = parseInline('*unclosed emphasis')
      expect(nodes.length).toBeGreaterThanOrEqual(1)
      // Should fall back to text
      const textContent = nodes.map(n => n.type === 'text' ? (n as Text).value : '').join('')
      expect(textContent).toContain('*')
    })

    it('should handle unclosed bold', () => {
      const nodes = parseInline('**unclosed bold')
      expect(nodes.length).toBeGreaterThanOrEqual(1)
    })

    it('should handle unclosed strikethrough', () => {
      const nodes = parseInline('~~unclosed strike')
      expect(nodes.length).toBeGreaterThanOrEqual(1)
    })

    it('should handle unclosed link bracket', () => {
      const nodes = parseInline('[unclosed link')
      expect(nodes.length).toBeGreaterThanOrEqual(1)
      expect(nodes[0]!.type).toBe('text')
    })

    it('should handle link with no url', () => {
      const nodes = parseInline('[text]()')
      expect(nodes.length).toBeGreaterThanOrEqual(1)
    })

    it('should handle image with no url', () => {
      const nodes = parseInline('![alt]()')
      expect(nodes.length).toBeGreaterThanOrEqual(1)
    })

    it('should handle nested unclosed markers', () => {
      const nodes = parseInline('***not** closed*')
      expect(nodes.length).toBeGreaterThanOrEqual(1)
    })

    it('should handle excessive heading levels', () => {
      const doc = parse('####### Not a heading')
      // 7 hashes is not a valid heading
      expect(doc.children[0]!.type).toBe('paragraph')
    })

    it('should handle tab characters in code block', () => {
      const doc = parse('```\n\tindented with tab\n```')
      const code = doc.children[0] as CodeBlock
      expect(code.value).toContain('\tindented with tab')
    })

    it('should handle consecutive blank lines', () => {
      const doc = parse('para 1\n\n\n\n\npara 2')
      expect(doc.children).toHaveLength(2)
      expect(doc.children[0]!.type).toBe('paragraph')
      expect(doc.children[1]!.type).toBe('paragraph')
    })

    it('should handle very long line', () => {
      const longLine = 'a'.repeat(10000)
      const doc = parse(longLine)
      expect(doc.children).toHaveLength(1)
      expect(doc.children[0]!.type).toBe('paragraph')
    })

    it('should handle line with only special chars', () => {
      const doc = parse('!@#$%^&*()')
      expect(doc.children.length).toBeGreaterThanOrEqual(1)
    })

    it('should handle unclosed math block', () => {
      const doc = parse('$$\nx^2 + y^2')
      expect(doc.children.length).toBeGreaterThanOrEqual(1)
    })

    it('should handle unclosed container', () => {
      const doc = parse('::: info\nsome content')
      expect(doc.children.length).toBeGreaterThanOrEqual(1)
    })

    it('should handle table with mismatched columns', () => {
      const input = '| A | B | C |\n|---|---|\n| 1 | 2 | 3 | 4 |'
      const doc = parse(input)
      expect(doc.children.length).toBeGreaterThanOrEqual(1)
    })

    it('should handle empty table cells', () => {
      const input = '| A | B |\n|---|---|\n|   |   |'
      const doc = parse(input)
      const table = doc.children[0] as Table
      expect(table.type).toBe('table')
    })

    it('should handle backslash at end of line', () => {
      const nodes = parseInline('text\\')
      expect(nodes.length).toBeGreaterThanOrEqual(1)
    })

    it('should handle only backticks', () => {
      const nodes = parseInline('````')
      expect(nodes.length).toBeGreaterThanOrEqual(1)
    })
  })

  // ================================================================
  // Unicode
  // ================================================================
  describe('Unicode', () => {
    it('should parse CJK text in paragraph', () => {
      const doc = parse('这是一段中文文本')
      expect(doc.children).toHaveLength(1)
      const p = doc.children[0] as Paragraph
      expect(p.children[0]!.type).toBe('text')
      expect((p.children[0] as Text).value).toBe('这是一段中文文本')
    })

    it('should parse bold CJK text', () => {
      const nodes = parseInline('**粗体文本**')
      expect(nodes).toHaveLength(1)
      expect(nodes[0]!.type).toBe('strong')
    })

    it('should parse italic CJK text', () => {
      const nodes = parseInline('*斜体文本*')
      expect(nodes).toHaveLength(1)
      expect(nodes[0]!.type).toBe('emphasis')
    })

    it('should parse Japanese text with formatting', () => {
      const doc = parse('# 日本語の見出し\n\n**太字テキスト**')
      expect(doc.children).toHaveLength(2)
      expect(doc.children[0]!.type).toBe('heading')
      expect(doc.children[1]!.type).toBe('paragraph')
    })

    it('should parse Korean text', () => {
      const doc = parse('한국어 텍스트입니다.')
      expect(doc.children).toHaveLength(1)
    })

    it('should parse emoji in paragraph', () => {
      const doc = parse('Hello 🌍! Test 🚀 emoji 😀')
      expect(doc.children).toHaveLength(1)
      const p = doc.children[0] as Paragraph
      expect((p.children[0] as Text).value).toContain('🌍')
    })

    it('should parse combined emoji (ZWJ sequences)', () => {
      const doc = parse('Family: 👨‍👩‍👧‍👦')
      expect(doc.children).toHaveLength(1)
      const p = doc.children[0] as Paragraph
      expect((p.children[0] as Text).value).toContain('👨‍👩‍👧‍👦')
    })

    it('should parse mixed scripts in one paragraph', () => {
      const doc = parse('English mixed with 中文 and العربية together.')
      expect(doc.children).toHaveLength(1)
    })

    it('should parse CJK in code block', () => {
      const doc = parse('```\nconst 变量 = "值"\n```')
      const code = doc.children[0] as CodeBlock
      expect(code.value).toBe('const 变量 = "值"')
    })

    it('should parse CJK in inline code', () => {
      const nodes = parseInline('`const 变量 = "值"`')
      expect(nodes).toHaveLength(1)
      expect(nodes[0]!.type).toBe('inlineCode')
    })

    it('should parse mathematical symbols', () => {
      const doc = parse('∀x ∈ ℝ: x² ≥ 0')
      expect(doc.children).toHaveLength(1)
    })

    it('should parse CJK heading', () => {
      const doc = parse('# 第一章 介绍')
      const heading = doc.children[0] as Heading
      expect(heading.depth).toBe(1)
    })

    it('should parse CJK in table', () => {
      const input = '| 名称 | 值 |\n|------|----|\n| 测试 | 通过 |'
      const doc = parse(input)
      const table = doc.children[0] as Table
      expect(table.type).toBe('table')
    })

    it('should parse CJK in list items', () => {
      const doc = parse('- 第一项\n- 第二项\n- 第三项')
      const list = doc.children[0] as List
      expect(list.children).toHaveLength(3)
    })

    it('should parse CJK in blockquote', () => {
      const doc = parse('> 这是一段引用文本')
      expect(doc.children[0]!.type).toBe('blockquote')
    })

    it('should handle RTL text (Arabic)', () => {
      const doc = parse('مرحبا بالعالم')
      expect(doc.children).toHaveLength(1)
    })

    it('should handle mixed BiDi text', () => {
      const doc = parse('The word "مرحبا" means hello.')
      expect(doc.children).toHaveLength(1)
    })

    it('should parse link with CJK text', () => {
      const nodes = parseInline('[中文链接](https://example.com)')
      expect(nodes).toHaveLength(1)
      expect(nodes[0]!.type).toBe('link')
    })

    it('should parse image with CJK alt', () => {
      const nodes = parseInline('![中文替代文本](image.png)')
      expect(nodes).toHaveLength(1)
      expect(nodes[0]!.type).toBe('image')
    })
  })

  // ================================================================
  // Combination / Integration
  // ================================================================
  describe('Complex Combinations', () => {
    it('should parse full document with mixed elements', () => {
      const input = `# Title

Paragraph with **bold** and *italic*.

> Blockquote with \`code\`

- List item 1
- List item 2

\`\`\`js
const x = 1
\`\`\`

| A | B |
|---|---|
| 1 | 2 |

---

$$
E = mc^2
$$

[^1]: Footnote content`
      const doc = parse(input)
      const types = doc.children.map(n => n.type)
      expect(types).toContain('heading')
      expect(types).toContain('paragraph')
      expect(types).toContain('blockquote')
      expect(types).toContain('list')
      expect(types).toContain('codeBlock')
      expect(types).toContain('table')
      expect(types).toContain('thematicBreak')
      expect(types).toContain('mathBlock')
      expect(types).toContain('footnoteDefinition')
    })

    it('should handle all inline types in one paragraph', () => {
      const input = '**bold** *italic* ~~strike~~ `code` ==highlight== ^sup^ ~sub~ $x^2$ [link](url) ![img](src) [^ref]'
      const nodes = parseInline(input)
      const types = nodes.map(n => n.type)
      expect(types).toContain('strong')
      expect(types).toContain('emphasis')
      expect(types).toContain('strikethrough')
      expect(types).toContain('inlineCode')
      expect(types).toContain('highlight')
      expect(types).toContain('superscript')
      expect(types).toContain('subscript')
      expect(types).toContain('mathInline')
      expect(types).toContain('link')
      expect(types).toContain('image')
      expect(types).toContain('footnoteReference')
    })

    it('should parse large document without error', () => {
      const lines: string[] = []
      for (let i = 0; i < 1000; i++) {
        lines.push(`Line ${i}: The quick brown fox jumps over the lazy dog.`)
      }
      const doc = parse(lines.join('\n\n'))
      expect(doc.children.length).toBe(1000)
    })

    it('should parse repeated thematic breaks', () => {
      const doc = parse('---\n\n---\n\n---')
      expect(doc.children).toHaveLength(3)
      doc.children.forEach(n => expect(n.type).toBe('thematicBreak'))
    })

    it('should handle heading followed immediately by code block', () => {
      const doc = parse('# Title\n```\ncode\n```')
      expect(doc.children).toHaveLength(2)
      expect(doc.children[0]!.type).toBe('heading')
      expect(doc.children[1]!.type).toBe('codeBlock')
    })
  })
})
