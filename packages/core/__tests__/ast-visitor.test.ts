/**
 * Core AST Visitor Tests
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
  createBlockquote,
  createList,
  createListItem,
  walk,
  findAll,
  findFirst,
  isBlockNode,
  isInlineNode,
  getTextContent,
} from '@pre-markdown/core'
import type { ASTNode, Heading, Text } from '@pre-markdown/core'

describe('AST Visitor', () => {
  beforeEach(() => {
    resetNodeIds()
  })

  describe('walk()', () => {
    it('should visit all nodes in depth-first order', () => {
      const doc = createDocument([
        createHeading(1, [createText('Title')]),
        createParagraph([createText('Hello '), createStrong([createText('world')])]),
      ])

      const visited: string[] = []
      walk(doc, (node) => {
        visited.push(node.type)
      })

      expect(visited).toEqual([
        'document',
        'heading',
        'text',
        'paragraph',
        'text',
        'strong',
        'text',
      ])
    })

    it('should stop walking when visitor returns false', () => {
      const doc = createDocument([
        createHeading(1, [createText('Title')]),
        createParagraph([createText('Content')]),
      ])

      const visited: string[] = []
      walk(doc, (node) => {
        visited.push(node.type)
        if (node.type === 'heading') return false
      })

      // false stops entire traversal, so paragraph is never reached
      expect(visited).toEqual(['document', 'heading'])
    })

    it('should handle deeply nested structures', () => {
      const doc = createDocument([
        createBlockquote([
          createList(false, false, [
            createListItem([
              createParagraph([
                createEmphasis([createStrong([createText('deep')])]),
              ]),
            ]),
          ]),
        ]),
      ])

      const visited: string[] = []
      walk(doc, (node) => {
        visited.push(node.type)
      })

      expect(visited).toContain('emphasis')
      expect(visited).toContain('strong')
      expect(visited).toContain('text')
    })
  })

  describe('findAll()', () => {
    it('should find all nodes of a given type', () => {
      const doc = createDocument([
        createHeading(1, [createText('Title 1')]),
        createParagraph([createText('Content')]),
        createHeading(2, [createText('Title 2')]),
      ])

      const headings = findAll(doc, (n): n is Heading => n.type === 'heading')
      expect(headings).toHaveLength(2)
      expect(headings[0]!.depth).toBe(1)
      expect(headings[1]!.depth).toBe(2)
    })

    it('should find all text nodes', () => {
      const doc = createDocument([
        createParagraph([createText('Hello '), createEmphasis([createText('world')])]),
      ])

      const texts = findAll(doc, (n): n is Text => n.type === 'text')
      expect(texts).toHaveLength(2)
      expect(texts[0]!.value).toBe('Hello ')
      expect(texts[1]!.value).toBe('world')
    })
  })

  describe('findFirst()', () => {
    it('should find the first matching node', () => {
      const doc = createDocument([
        createParagraph([createText('First')]),
        createParagraph([createText('Second')]),
      ])

      const first = findFirst(doc, (n): n is Text => n.type === 'text')
      expect(first).toBeDefined()
      expect(first!.value).toBe('First')
    })

    it('should return undefined when no match', () => {
      const doc = createDocument([createParagraph([createText('Hello')])])
      const result = findFirst(doc, (n): n is Heading => n.type === 'heading')
      expect(result).toBeUndefined()
    })
  })

  describe('Type guards', () => {
    it('isBlockNode should identify block nodes', () => {
      expect(isBlockNode(createHeading(1))).toBe(true)
      expect(isBlockNode(createParagraph())).toBe(true)
      expect(isBlockNode(createText('text'))).toBe(false)
    })

    it('isInlineNode should identify inline nodes', () => {
      expect(isInlineNode(createText('text'))).toBe(true)
      expect(isInlineNode(createEmphasis())).toBe(true)
      expect(isInlineNode(createHeading(1))).toBe(false)
    })
  })

  describe('getTextContent()', () => {
    it('should extract plain text from inline nodes', () => {
      const nodes = [
        createText('Hello '),
        createStrong([createText('bold')]),
        createText(' world'),
      ]
      expect(getTextContent(nodes)).toBe('Hello bold world')
    })

    it('should handle nested emphasis', () => {
      const nodes = [
        createEmphasis([createStrong([createText('nested')])]),
      ]
      expect(getTextContent(nodes)).toBe('nested')
    })

    it('should handle inline code', () => {
      const nodes = [
        createText('Use '),
        { type: 'inlineCode' as const, value: 'const x', id: 1 },
        createText(' here'),
      ]
      expect(getTextContent(nodes)).toBe('Use const x here')
    })
  })
})
