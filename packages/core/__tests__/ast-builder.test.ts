/**
 * Core AST Builder Tests
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  resetNodeIds,
  createDocument,
  createHeading,
  createParagraph,
  createText,
  createEmphasis,
  createStrong,
  createLink,
  createImage,
  createCodeBlock,
  createList,
  createListItem,
  createBlockquote,
  createThematicBreak,
  createTable,
  createTableRow,
  createTableCell,
  createMathBlock,
  createMathInline,
  createInlineCode,
  createStrikethrough,
  createHighlight,
  createSuperscript,
  createSubscript,
  createContainer,
  createDetails,
  createTOC,
  createBreak,
  createSoftBreak,
  createAutolink,
  createFootnoteReference,
} from '@pre-markdown/core'

describe('AST Builder', () => {
  beforeEach(() => {
    resetNodeIds()
  })

  describe('Block-level nodes', () => {
    it('should create a document node', () => {
      const doc = createDocument()
      expect(doc.type).toBe('document')
      expect(doc.children).toEqual([])
      expect(doc.id).toBe(1)
    })

    it('should create heading nodes with correct depth', () => {
      const h1 = createHeading(1, [createText('Title')])
      expect(h1.type).toBe('heading')
      expect(h1.depth).toBe(1)
      expect(h1.children).toHaveLength(1)
      expect(h1.children[0]!.type).toBe('text')
    })

    it('should create paragraph nodes', () => {
      const p = createParagraph([createText('Hello')])
      expect(p.type).toBe('paragraph')
      expect(p.children).toHaveLength(1)
    })

    it('should create code block nodes', () => {
      const code = createCodeBlock('const x = 1', 'typescript')
      expect(code.type).toBe('codeBlock')
      expect(code.value).toBe('const x = 1')
      expect(code.lang).toBe('typescript')
    })

    it('should create blockquote nodes', () => {
      const bq = createBlockquote([createParagraph([createText('Quote')])])
      expect(bq.type).toBe('blockquote')
      expect(bq.children).toHaveLength(1)
    })

    it('should create list nodes', () => {
      const list = createList(false, false, [
        createListItem([createParagraph([createText('Item 1')])]),
        createListItem([createParagraph([createText('Item 2')])]),
      ])
      expect(list.type).toBe('list')
      expect(list.ordered).toBe(false)
      expect(list.children).toHaveLength(2)
    })

    it('should create ordered list nodes with start number', () => {
      const list = createList(true, false, [], 3)
      expect(list.ordered).toBe(true)
      expect(list.start).toBe(3)
    })

    it('should create task list items', () => {
      const item = createListItem([], false, true)
      expect(item.checked).toBe(true)
    })

    it('should create thematic break', () => {
      const hr = createThematicBreak()
      expect(hr.type).toBe('thematicBreak')
    })

    it('should create table nodes', () => {
      const table = createTable(
        ['left', 'center', 'right'],
        [
          createTableRow(true, [
            createTableCell([createText('Header 1')]),
            createTableCell([createText('Header 2')]),
            createTableCell([createText('Header 3')]),
          ]),
        ],
      )
      expect(table.type).toBe('table')
      expect(table.align).toEqual(['left', 'center', 'right'])
      expect(table.children).toHaveLength(1)
    })

    it('should create math block nodes', () => {
      const math = createMathBlock('E = mc^2')
      expect(math.type).toBe('mathBlock')
      expect(math.value).toBe('E = mc^2')
    })

    it('should create container nodes', () => {
      const container = createContainer('info', [], 'Note')
      expect(container.type).toBe('container')
      expect(container.kind).toBe('info')
      expect(container.title).toBe('Note')
    })

    it('should create details nodes', () => {
      const details = createDetails('Click to expand')
      expect(details.type).toBe('details')
      expect(details.summary).toBe('Click to expand')
    })

    it('should create TOC nodes', () => {
      const toc = createTOC()
      expect(toc.type).toBe('toc')
    })
  })

  describe('Inline-level nodes', () => {
    it('should create text nodes', () => {
      const text = createText('Hello world')
      expect(text.type).toBe('text')
      expect(text.value).toBe('Hello world')
    })

    it('should create emphasis nodes', () => {
      const em = createEmphasis([createText('italic')])
      expect(em.type).toBe('emphasis')
    })

    it('should create strong nodes', () => {
      const strong = createStrong([createText('bold')])
      expect(strong.type).toBe('strong')
    })

    it('should create link nodes', () => {
      const link = createLink('https://example.com', [createText('Example')], 'Title')
      expect(link.type).toBe('link')
      expect(link.url).toBe('https://example.com')
      expect(link.title).toBe('Title')
    })

    it('should create image nodes', () => {
      const img = createImage('logo.png', 'Logo', 'Logo Title')
      expect(img.type).toBe('image')
      expect(img.url).toBe('logo.png')
      expect(img.alt).toBe('Logo')
    })

    it('should create inline code nodes', () => {
      const code = createInlineCode('const x = 1')
      expect(code.type).toBe('inlineCode')
      expect(code.value).toBe('const x = 1')
    })

    it('should create strikethrough nodes', () => {
      const strike = createStrikethrough([createText('deleted')])
      expect(strike.type).toBe('strikethrough')
    })

    it('should create highlight nodes', () => {
      const hl = createHighlight([createText('highlighted')])
      expect(hl.type).toBe('highlight')
    })

    it('should create superscript nodes', () => {
      const sup = createSuperscript([createText('2')])
      expect(sup.type).toBe('superscript')
    })

    it('should create subscript nodes', () => {
      const sub = createSubscript([createText('2')])
      expect(sub.type).toBe('subscript')
    })

    it('should create math inline nodes', () => {
      const math = createMathInline('x^2')
      expect(math.type).toBe('mathInline')
      expect(math.value).toBe('x^2')
    })

    it('should create autolink nodes', () => {
      const link = createAutolink('https://example.com', false)
      expect(link.type).toBe('autolink')
      expect(link.isEmail).toBe(false)
    })

    it('should create footnote reference nodes', () => {
      const fn = createFootnoteReference('1', '1')
      expect(fn.type).toBe('footnoteReference')
      expect(fn.identifier).toBe('1')
    })

    it('should create break nodes', () => {
      expect(createBreak().type).toBe('break')
      expect(createSoftBreak().type).toBe('softBreak')
    })
  })

  describe('Node IDs', () => {
    it('should assign unique incrementing IDs', () => {
      const n1 = createText('a')
      const n2 = createText('b')
      const n3 = createText('c')
      expect(n1.id).toBe(1)
      expect(n2.id).toBe(2)
      expect(n3.id).toBe(3)
    })

    it('should reset IDs with resetNodeIds()', () => {
      createText('a')
      createText('b')
      resetNodeIds()
      const n = createText('c')
      expect(n.id).toBe(1)
    })
  })
})
