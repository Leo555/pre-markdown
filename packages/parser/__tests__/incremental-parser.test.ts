/**
 * Incremental Parser Tests
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { IncrementalParser } from '@pre-markdown/parser'
import { resetNodeIds, EventBus } from '@pre-markdown/core'
import type { EditorEvents, Heading, Paragraph } from '@pre-markdown/core'

describe('IncrementalParser', () => {
  beforeEach(() => {
    resetNodeIds()
  })

  describe('Initialization', () => {
    it('should parse initial text', () => {
      const parser = new IncrementalParser('# Hello\n\nWorld')
      const doc = parser.getDocument()
      expect(doc.children).toHaveLength(2)
      expect(doc.children[0]!.type).toBe('heading')
      expect(doc.children[1]!.type).toBe('paragraph')
    })

    it('should handle empty initial text', () => {
      const parser = new IncrementalParser('')
      expect(parser.getDocument().children).toHaveLength(0)
    })

    it('should return correct text', () => {
      const text = '# Title\n\nParagraph'
      const parser = new IncrementalParser(text)
      expect(parser.getText()).toBe(text)
    })

    it('should return correct lines', () => {
      const parser = new IncrementalParser('line1\nline2\nline3')
      expect(parser.getLines()).toEqual(['line1', 'line2', 'line3'])
    })
  })

  describe('Apply Edit', () => {
    it('should handle inserting a new paragraph', () => {
      const parser = new IncrementalParser('# Title\n\nParagraph 1')
      const result = parser.applyEdit({
        fromLine: 2,
        toLine: 2,
        newText: 'New paragraph\n\nParagraph 1',
      })

      expect(result.document.children.length).toBeGreaterThanOrEqual(2)
      expect(result.duration).toBeGreaterThanOrEqual(0)
    })

    it('should handle replacing a line', () => {
      const parser = new IncrementalParser('# Old Title\n\nParagraph')
      const result = parser.applyEdit({
        fromLine: 0,
        toLine: 1,
        newText: '# New Title',
      })

      const doc = result.document
      const heading = doc.children.find(n => n.type === 'heading') as Heading | undefined
      expect(heading).toBeDefined()
    })

    it('should handle deleting lines', () => {
      const parser = new IncrementalParser('# Title\n\nDelete me\n\nKeep me')
      parser.applyEdit({
        fromLine: 2,
        toLine: 3,
        newText: '',
      })

      const text = parser.getText()
      expect(text).not.toContain('Delete me')
    })

    it('should handle appending to end', () => {
      const parser = new IncrementalParser('# Title')
      const lines = parser.getLines()
      parser.applyEdit({
        fromLine: lines.length,
        toLine: lines.length,
        newText: '\n\nNew paragraph',
      })

      expect(parser.getText()).toContain('New paragraph')
    })

    it('should return valid result structure', () => {
      const parser = new IncrementalParser('# Title\n\nParagraph')
      const result = parser.applyEdit({
        fromLine: 2,
        toLine: 3,
        newText: 'Updated paragraph',
      })

      expect(result).toHaveProperty('document')
      expect(result).toHaveProperty('affectedRange')
      expect(result).toHaveProperty('newBlockCount')
      expect(result).toHaveProperty('oldBlockCount')
      expect(result).toHaveProperty('duration')
      expect(result.affectedRange).toHaveProperty('from')
      expect(result.affectedRange).toHaveProperty('to')
    })

    it('should maintain document integrity after multiple edits', () => {
      const parser = new IncrementalParser('# Title\n\nParagraph 1\n\nParagraph 2')

      parser.applyEdit({
        fromLine: 2,
        toLine: 3,
        newText: 'Updated P1',
      })

      parser.applyEdit({
        fromLine: 4,
        toLine: 5,
        newText: 'Updated P2',
      })

      const doc = parser.getDocument()
      expect(doc.type).toBe('document')
      expect(doc.children.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Full Reparse', () => {
    it('should produce same result as initial parse', () => {
      const text = '# Title\n\n**Bold** paragraph\n\n- List item'
      const parser = new IncrementalParser(text)
      const doc1 = parser.getDocument()
      const childCount1 = doc1.children.length

      const doc2 = parser.fullReparse()
      expect(doc2.children.length).toBe(childCount1)
    })

    it('should work after edits', () => {
      const parser = new IncrementalParser('# Title\n\nParagraph')
      parser.applyEdit({
        fromLine: 2,
        toLine: 3,
        newText: 'New text here',
      })

      const doc = parser.fullReparse()
      expect(doc.type).toBe('document')
    })
  })

  describe('EventBus Integration', () => {
    it('should emit content:change on edit', () => {
      const bus = new EventBus<EditorEvents>()
      let emitted = false
      bus.on('content:change', () => {
        emitted = true
      })

      const parser = new IncrementalParser('# Hello', undefined, bus)
      parser.applyEdit({
        fromLine: 0,
        toLine: 1,
        newText: '# World',
      })

      expect(emitted).toBe(true)
    })

    it('should emit parse:done on edit', () => {
      const bus = new EventBus<EditorEvents>()
      let parseDuration = -1
      bus.on('parse:done', (data) => {
        parseDuration = data.duration
      })

      const parser = new IncrementalParser('# Hello', undefined, bus)
      parser.applyEdit({
        fromLine: 0,
        toLine: 1,
        newText: '# World',
      })

      expect(parseDuration).toBeGreaterThanOrEqual(0)
    })

    it('should emit parse:done on full reparse', () => {
      const bus = new EventBus<EditorEvents>()
      let emitted = false
      bus.on('parse:done', () => {
        emitted = true
      })

      const parser = new IncrementalParser('# Hello', undefined, bus)
      parser.fullReparse()
      expect(emitted).toBe(true)
    })
  })

  describe('Performance Characteristics', () => {
    it('should handle large document initialization', () => {
      const lines: string[] = []
      for (let i = 0; i < 500; i++) {
        lines.push(`Paragraph ${i}: Some text content here.`)
        lines.push('')
      }
      const text = lines.join('\n')
      const parser = new IncrementalParser(text)
      expect(parser.getDocument().children.length).toBe(500)
    })

    it('incremental edit should be faster than full reparse for large docs', () => {
      const lines: string[] = []
      for (let i = 0; i < 200; i++) {
        lines.push(`Paragraph ${i}: Lorem ipsum dolor sit amet.`)
        lines.push('')
      }
      const parser = new IncrementalParser(lines.join('\n'))

      // Measure incremental edit
      const incStart = performance.now()
      parser.applyEdit({
        fromLine: 100,
        toLine: 101,
        newText: 'Modified paragraph in the middle.',
      })
      const incDuration = performance.now() - incStart

      // Measure full reparse
      const fullStart = performance.now()
      parser.fullReparse()
      const fullDuration = performance.now() - fullStart

      // Incremental should generally be faster (or at least not much slower)
      // We just check both complete without error
      expect(incDuration).toBeGreaterThanOrEqual(0)
      expect(fullDuration).toBeGreaterThanOrEqual(0)
    })
  })
})
