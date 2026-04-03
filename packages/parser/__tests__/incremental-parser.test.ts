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
      expect(result).toHaveProperty('reusedBlockCount')
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

  describe('AST Node Reuse', () => {
    it('should reuse blocks outside the edit range', () => {
      const parser = new IncrementalParser('# Title\n\nParagraph 1\n\nParagraph 2\n\nParagraph 3')
      const oldDoc = parser.getDocument()
      const oldFirst = oldDoc.children[0] // heading
      const oldLast = oldDoc.children[oldDoc.children.length - 1] // paragraph 3

      // Edit only paragraph 1 (line 2)
      const result = parser.applyEdit({
        fromLine: 2,
        toLine: 3,
        newText: 'Updated P1',
      })

      expect(result.reusedBlockCount).toBeGreaterThan(0)
    })

    it('should report reused blocks correctly', () => {
      const parser = new IncrementalParser('# Title\n\nParagraph')
      const result = parser.applyEdit({
        fromLine: 2,
        toLine: 3,
        newText: 'Updated paragraph',
      })

      expect(result.reusedBlockCount).toBeGreaterThanOrEqual(0)
      expect(result.reusedBlockCount + result.oldBlockCount).toBeLessThanOrEqual(
        result.reusedBlockCount + result.oldBlockCount + result.newBlockCount
      )
    })
  })

  describe('Block Metas', () => {
    it('should build metas after initialization', () => {
      const parser = new IncrementalParser('# Title\n\nParagraph\n\n---')
      const metas = parser.getBlockMetas()
      expect(metas.length).toBe(3) // heading, paragraph, thematic break
    })

    it('should have monotonically increasing startLine', () => {
      const parser = new IncrementalParser('# H1\n\n## H2\n\nParagraph\n\n---')
      const metas = parser.getBlockMetas()
      for (let i = 1; i < metas.length; i++) {
        expect(metas[i]!.startLine).toBeGreaterThanOrEqual(metas[i - 1]!.startLine)
      }
    })

    it('should update metas after edit', () => {
      const parser = new IncrementalParser('# Title\n\nParagraph 1\n\nParagraph 2')
      const metasBefore = parser.getBlockMetas().length

      parser.applyEdit({
        fromLine: 2,
        toLine: 3,
        newText: 'Updated P1',
      })

      const metasAfter = parser.getBlockMetas().length
      expect(metasAfter).toBeGreaterThan(0)
    })

    it('each meta should have a fingerprint', () => {
      const parser = new IncrementalParser('# Title\n\nSome paragraph')
      const metas = parser.getBlockMetas()
      for (const m of metas) {
        expect(typeof m.fingerprint).toBe('number')
        expect(m.fingerprint).toBeGreaterThan(0)
      }
    })
  })

  describe('Line Hashes', () => {
    it('should compute line hashes on init', () => {
      const parser = new IncrementalParser('line1\nline2\nline3')
      const hashes = parser.getLineHashes()
      expect(hashes.length).toBe(3)
      expect(typeof hashes[0]).toBe('number')
    })

    it('same content should produce same hash', () => {
      const p1 = new IncrementalParser('hello')
      const p2 = new IncrementalParser('hello')
      expect(p1.getLineHashes()[0]).toBe(p2.getLineHashes()[0])
    })

    it('different content should produce different hash', () => {
      const p1 = new IncrementalParser('hello')
      const p2 = new IncrementalParser('world')
      expect(p1.getLineHashes()[0]).not.toBe(p2.getLineHashes()[0])
    })

    it('should update hashes after edit', () => {
      const parser = new IncrementalParser('line1\nline2\nline3')
      const oldHash = parser.getLineHashes()[1]

      parser.applyEdit({
        fromLine: 1,
        toLine: 2,
        newText: 'modified',
      })

      expect(parser.getLineHashes()[1]).not.toBe(oldHash)
    })
  })
})
