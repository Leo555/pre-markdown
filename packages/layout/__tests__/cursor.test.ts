/**
 * Tests for CursorEngine — pretext-based cursor positioning and selection
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { LayoutEngine, createFallbackBackend, CursorEngine } from '../src/index'

describe('CursorEngine', () => {
  let engine: LayoutEngine
  let cursor: CursorEngine

  beforeEach(() => {
    const backend = createFallbackBackend(8)
    engine = new LayoutEngine(
      { font: '14px monospace', lineHeight: 24, maxWidth: 400 },
      backend,
    )
    cursor = new CursorEngine(engine)
  })

  describe('setText', () => {
    it('should handle empty string', () => {
      cursor.setText('')
      expect(cursor.getSourceLineCount()).toBe(1)
      expect(cursor.getVisualLineCount()).toBeGreaterThanOrEqual(1)
      expect(cursor.getTotalHeight()).toBeGreaterThan(0)
    })

    it('should handle single line', () => {
      cursor.setText('Hello world')
      expect(cursor.getSourceLineCount()).toBe(1)
      expect(cursor.getVisualLineCount()).toBeGreaterThanOrEqual(1)
    })

    it('should handle multiple lines', () => {
      cursor.setText('Line 1\nLine 2\nLine 3')
      expect(cursor.getSourceLineCount()).toBe(3)
      expect(cursor.getVisualLineCount()).toBeGreaterThanOrEqual(3)
    })

    it('should handle trailing newline', () => {
      cursor.setText('Hello\n')
      expect(cursor.getSourceLineCount()).toBe(2) // 'Hello' and ''
    })

    it('should handle long lines that wrap', () => {
      // With avgCharWidth=8, maxWidth=400, charsPerLine=50
      const longLine = 'a'.repeat(100) // should wrap to 2 visual lines
      cursor.setText(longLine)
      expect(cursor.getSourceLineCount()).toBe(1)
      expect(cursor.getVisualLineCount()).toBe(2) // wrapped
    })
  })

  describe('offsetToPosition', () => {
    it('should return (0,0) for offset 0', () => {
      cursor.setText('Hello world')
      const pos = cursor.offsetToPosition(0)
      expect(pos.offset).toBe(0)
      expect(pos.x).toBe(0)
      expect(pos.y).toBe(0)
      expect(pos.visualLine).toBe(0)
    })

    it('should return correct position for middle of line', () => {
      cursor.setText('Hello world')
      const pos = cursor.offsetToPosition(5) // after 'Hello'
      expect(pos.offset).toBe(5)
      expect(pos.x).toBeGreaterThan(0)
      expect(pos.y).toBe(0)
    })

    it('should return correct position on second line', () => {
      cursor.setText('Line 1\nLine 2')
      const pos = cursor.offsetToPosition(7) // start of 'Line 2'
      expect(pos.offset).toBe(7)
      expect(pos.y).toBe(24) // second line
    })

    it('should clamp negative offset to 0', () => {
      cursor.setText('Hello')
      const pos = cursor.offsetToPosition(-5)
      expect(pos.offset).toBe(0)
    })

    it('should clamp offset beyond text length', () => {
      cursor.setText('Hello')
      const pos = cursor.offsetToPosition(100)
      expect(pos.offset).toBe(5)
    })

    it('should return lineHeight from config', () => {
      cursor.setText('Test')
      const pos = cursor.offsetToPosition(0)
      expect(pos.lineHeight).toBe(24)
    })
  })

  describe('xyToOffset', () => {
    it('should return 0 for (0, 0)', () => {
      cursor.setText('Hello world')
      const offset = cursor.xyToOffset(0, 0)
      expect(offset).toBe(0)
    })

    it('should return offset on correct line for y coordinate', () => {
      cursor.setText('Line 1\nLine 2\nLine 3')
      // Click on the second line
      const offset = cursor.xyToOffset(0, 24)
      expect(offset).toBe(7) // start of 'Line 2'
    })

    it('should return offset on third line', () => {
      cursor.setText('Line 1\nLine 2\nLine 3')
      const offset = cursor.xyToOffset(0, 48)
      expect(offset).toBe(14) // start of 'Line 3'
    })

    it('should handle click beyond last line', () => {
      cursor.setText('Hello')
      const offset = cursor.xyToOffset(0, 1000)
      // Should clamp to last visual line
      expect(offset).toBeGreaterThanOrEqual(0)
      expect(offset).toBeLessThanOrEqual(5)
    })

    it('should handle click at end of line', () => {
      cursor.setText('Hello')
      // Click far to the right
      const offset = cursor.xyToOffset(9999, 0)
      expect(offset).toBe(5) // end of text
    })
  })

  describe('getSelectionRects', () => {
    it('should return empty array for same start and end', () => {
      cursor.setText('Hello world')
      const rects = cursor.getSelectionRects(3, 3)
      expect(rects).toHaveLength(0)
    })

    it('should return one rect for single-line selection', () => {
      cursor.setText('Hello world')
      const rects = cursor.getSelectionRects(0, 5)
      expect(rects.length).toBeGreaterThanOrEqual(1)
      expect(rects[0]!.y).toBe(0)
      expect(rects[0]!.width).toBeGreaterThan(0)
      expect(rects[0]!.height).toBe(24)
    })

    it('should return multiple rects for multi-line selection', () => {
      cursor.setText('Line 1\nLine 2\nLine 3')
      const rects = cursor.getSelectionRects(0, 20) // select all
      expect(rects.length).toBeGreaterThanOrEqual(3)
    })

    it('should handle reversed selection (end < start)', () => {
      cursor.setText('Hello world')
      const rects = cursor.getSelectionRects(5, 0)
      expect(rects.length).toBeGreaterThanOrEqual(1)
    })

    it('should handle selection on empty line', () => {
      cursor.setText('Hello\n\nWorld')
      const rects = cursor.getSelectionRects(5, 7) // includes empty line
      expect(rects.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('getLineNumbers', () => {
    it('should return one entry per source line', () => {
      cursor.setText('Line 1\nLine 2\nLine 3')
      const lineNums = cursor.getLineNumbers()
      expect(lineNums).toHaveLength(3)
      expect(lineNums[0]!.lineNumber).toBe(1)
      expect(lineNums[1]!.lineNumber).toBe(2)
      expect(lineNums[2]!.lineNumber).toBe(3)
    })

    it('should track visual line count per source line', () => {
      // Short lines — each should be 1 visual line
      cursor.setText('a\nb\nc')
      const lineNums = cursor.getLineNumbers()
      expect(lineNums[0]!.visualLineCount).toBe(1)
      expect(lineNums[1]!.visualLineCount).toBe(1)
    })

    it('should report multiple visual lines for wrapped text', () => {
      const longLine = 'a'.repeat(100)
      cursor.setText(longLine)
      const lineNums = cursor.getLineNumbers()
      expect(lineNums).toHaveLength(1)
      expect(lineNums[0]!.visualLineCount).toBe(2) // 100 chars / 50 per line = 2
    })

    it('should have correct Y positions', () => {
      cursor.setText('Line 1\nLine 2\nLine 3')
      const lineNums = cursor.getLineNumbers()
      expect(lineNums[0]!.y).toBe(0)
      expect(lineNums[1]!.y).toBe(24)
      expect(lineNums[2]!.y).toBe(48)
    })

    it('should account for wrapped lines in Y positions', () => {
      const longLine = 'a'.repeat(100) // wraps to 2 visual lines
      cursor.setText(longLine + '\nShort')
      const lineNums = cursor.getLineNumbers()
      expect(lineNums[0]!.y).toBe(0)
      expect(lineNums[0]!.height).toBe(48) // 2 visual lines * 24px
      expect(lineNums[1]!.y).toBe(48) // starts after wrapped line
    })
  })

  describe('getLineNumberAtOffset', () => {
    it('should return 1 for offset 0', () => {
      cursor.setText('Hello\nWorld')
      expect(cursor.getLineNumberAtOffset(0)).toBe(1)
    })

    it('should return correct line for offset on second line', () => {
      cursor.setText('Hello\nWorld')
      expect(cursor.getLineNumberAtOffset(6)).toBe(2)
    })
  })

  describe('getWordBoundary', () => {
    it('should find word boundaries for simple word', () => {
      cursor.setText('Hello world test')
      const [start, end] = cursor.getWordBoundary(2) // inside 'Hello'
      expect(start).toBe(0)
      expect(end).toBe(5)
    })

    it('should handle word at end', () => {
      cursor.setText('Hello world')
      const [start, end] = cursor.getWordBoundary(8) // inside 'world'
      expect(start).toBe(6)
      expect(end).toBe(11)
    })

    it('should handle non-word characters', () => {
      cursor.setText('Hello, world')
      const [start, end] = cursor.getWordBoundary(5) // on comma
      expect(start).toBe(5)
      expect(end).toBe(6) // just the comma
    })

    it('should handle empty string', () => {
      cursor.setText('')
      const [start, end] = cursor.getWordBoundary(0)
      expect(start).toBe(0)
      expect(end).toBe(0)
    })
  })

  describe('recompute', () => {
    it('should update after maxWidth change', () => {
      const longLine = 'a'.repeat(100)
      cursor.setText(longLine)

      const countBefore = cursor.getVisualLineCount()

      // Make width smaller — more wrapping
      engine.updateConfig({ maxWidth: 200 })
      cursor.recompute()

      const countAfter = cursor.getVisualLineCount()
      expect(countAfter).toBeGreaterThan(countBefore)
    })
  })

  describe('getVisualLineAtY', () => {
    it('should return first line at y=0', () => {
      cursor.setText('Hello\nWorld')
      const vl = cursor.getVisualLineAtY(0)
      expect(vl).not.toBeNull()
      expect(vl!.sourceLine).toBe(0)
    })

    it('should return second line at y=24', () => {
      cursor.setText('Hello\nWorld')
      const vl = cursor.getVisualLineAtY(24)
      expect(vl).not.toBeNull()
      expect(vl!.sourceLine).toBe(1)
    })
  })

  describe('getVisualLinesForSourceLine', () => {
    it('should return one visual line for short text', () => {
      cursor.setText('Hello\nWorld')
      const lines = cursor.getVisualLinesForSourceLine(0)
      expect(lines).toHaveLength(1)
      expect(lines[0]!.text).toBe('Hello')
    })

    it('should return multiple visual lines for wrapped text', () => {
      cursor.setText('a'.repeat(100))
      const lines = cursor.getVisualLinesForSourceLine(0)
      expect(lines.length).toBe(2)
    })
  })

  describe('visual line offsets', () => {
    it('should have correct start/end offsets for multi-line text', () => {
      cursor.setText('Hello\nWorld')
      const lines = cursor.getVisualLines()
      // Line 0: 'Hello' offsets 0-5
      expect(lines[0]!.startOffset).toBe(0)
      expect(lines[0]!.endOffset).toBe(5)
      // Line 1: 'World' offsets 6-11
      expect(lines[1]!.startOffset).toBe(6)
      expect(lines[1]!.endOffset).toBe(11)
    })

    it('should account for \\n in offsets', () => {
      cursor.setText('ab\ncd\nef')
      const lines = cursor.getVisualLines()
      expect(lines[0]!.startOffset).toBe(0)
      expect(lines[0]!.endOffset).toBe(2)
      expect(lines[1]!.startOffset).toBe(3) // after 'ab\n'
      expect(lines[1]!.endOffset).toBe(5)
      expect(lines[2]!.startOffset).toBe(6) // after 'ab\ncd\n'
      expect(lines[2]!.endOffset).toBe(8)
    })
  })

  describe('performance', () => {
    it('should handle large documents', () => {
      const lines = Array.from({ length: 10000 }, (_, i) => `Line ${i + 1}: some content here`)
      cursor.setText(lines.join('\n'))

      expect(cursor.getSourceLineCount()).toBe(10000)

      // offsetToPosition should be fast
      const t0 = performance.now()
      for (let i = 0; i < 100; i++) {
        cursor.offsetToPosition(i * 100)
      }
      const elapsed = performance.now() - t0
      expect(elapsed).toBeLessThan(500) // should complete in < 500ms
    })

    it('should recompute efficiently', () => {
      const lines = Array.from({ length: 5000 }, (_, i) => `Line ${i}`)
      cursor.setText(lines.join('\n'))

      const t0 = performance.now()
      cursor.recompute()
      const elapsed = performance.now() - t0
      expect(elapsed).toBeLessThan(2000) // should complete in < 2s
    })
  })
})
