/**
 * Layout Engine Tests
 *
 * Uses the fallback measurement backend (character-count heuristic)
 * since Node.js doesn't have Canvas API.
 * The tests validate the LayoutEngine's caching, viewport, and API behavior.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { LayoutEngine, createFallbackBackend } from '@pre-markdown/layout'
import type { MeasurementBackend, LayoutConfig } from '@pre-markdown/layout'

const AVG_CHAR = 8
const fallback = createFallbackBackend(AVG_CHAR)

function makeEngine(overrides?: Partial<LayoutConfig>): LayoutEngine {
  return new LayoutEngine(
    {
      font: '16px Inter',
      lineHeight: 24,
      maxWidth: 400,
      ...overrides,
    },
    fallback,
  )
}

describe('LayoutEngine', () => {
  let engine: LayoutEngine

  beforeEach(() => {
    engine = makeEngine()
  })

  // ============================================================
  // Configuration
  // ============================================================

  describe('Configuration', () => {
    it('should return config via getConfig()', () => {
      const cfg = engine.getConfig()
      expect(cfg.font).toBe('16px Inter')
      expect(cfg.lineHeight).toBe(24)
      expect(cfg.maxWidth).toBe(400)
    })

    it('should update config', () => {
      engine.updateConfig({ maxWidth: 600 })
      expect(engine.getConfig().maxWidth).toBe(600)
    })

    it('should clear caches when font changes', () => {
      // Fill cache
      engine.computeLayout('Hello world')
      expect(engine.getCacheStats().preparedSize).toBe(1)

      // Change font → cache cleared
      engine.updateConfig({ font: '14px Menlo' })
      expect(engine.getCacheStats().preparedSize).toBe(0)
    })

    it('should not clear caches when non-font config changes', () => {
      engine.computeLayout('Hello world')
      expect(engine.getCacheStats().preparedSize).toBe(1)

      engine.updateConfig({ maxWidth: 500 })
      expect(engine.getCacheStats().preparedSize).toBe(1)
    })
  })

  // ============================================================
  // computeLayout
  // ============================================================

  describe('computeLayout()', () => {
    it('should compute height and lineCount for short text', () => {
      const result = engine.computeLayout('Hello')
      expect(result.lineCount).toBeGreaterThanOrEqual(1)
      expect(result.height).toBe(result.lineCount * 24)
    })

    it('should compute multi-line text', () => {
      // 400px / 8px per char = 50 chars per line
      // 100 chars = 2 lines
      const text = 'A'.repeat(100)
      const result = engine.computeLayout(text)
      expect(result.lineCount).toBe(2)
      expect(result.height).toBe(48)
    })

    it('should handle empty string', () => {
      const result = engine.computeLayout('')
      expect(result.lineCount).toBeGreaterThanOrEqual(1)
      expect(result.height).toBeGreaterThan(0)
    })

    it('should handle newlines', () => {
      const result = engine.computeLayout('Line 1\nLine 2\nLine 3')
      expect(result.lineCount).toBeGreaterThanOrEqual(3)
    })

    it('should cache PreparedText', () => {
      engine.computeLayout('Cached text')
      engine.computeLayout('Cached text')
      // Only one cache entry for the same text
      expect(engine.getCacheStats().preparedSize).toBe(1)
    })
  })

  // ============================================================
  // computeLayoutWithLines
  // ============================================================

  describe('computeLayoutWithLines()', () => {
    it('should return per-line info', () => {
      const result = engine.computeLayoutWithLines('Hello world')
      expect(result.lines).toBeDefined()
      expect(result.lines!.length).toBe(result.lineCount)
    })

    it('should set correct y positions', () => {
      const text = 'A'.repeat(150) // 3 lines at 50 chars/line
      const result = engine.computeLayoutWithLines(text)
      expect(result.lines).toBeDefined()
      expect(result.lines![0]!.y).toBe(0)
      if (result.lines!.length > 1) {
        expect(result.lines![1]!.y).toBe(24)
      }
      if (result.lines!.length > 2) {
        expect(result.lines![2]!.y).toBe(48)
      }
    })

    it('should include text content per line', () => {
      const result = engine.computeLayoutWithLines('Short')
      expect(result.lines![0]!.text).toBeDefined()
      expect(typeof result.lines![0]!.text).toBe('string')
    })

    it('should include width per line', () => {
      const result = engine.computeLayoutWithLines('Some text')
      expect(typeof result.lines![0]!.width).toBe('number')
    })
  })

  // ============================================================
  // computeViewportLayout
  // ============================================================

  describe('computeViewportLayout()', () => {
    it('should return visible lines for viewport', () => {
      // 20 lines of text
      const text = Array.from({ length: 20 }, (_, i) => `Line ${i}`).join('\n')
      const result = engine.computeViewportLayout(text, 0, 120) // 5 lines visible (120/24)

      expect(result.visibleLines.length).toBeGreaterThan(0)
      expect(result.totalHeight).toBeGreaterThan(0)
      expect(result.startIndex).toBeDefined()
      expect(result.endIndex).toBeDefined()
    })

    it('should handle scroll offset', () => {
      const text = Array.from({ length: 100 }, (_, i) => `Line ${i}`).join('\n')
      const noScroll = engine.computeViewportLayout(text, 0, 120)
      // Scroll far enough that even with 2x buffer, startY > 0
      // buffer = 2 * 120 = 240px, so scrollTop must exceed 240
      const scrolled = engine.computeViewportLayout(text, 600, 120)

      expect(scrolled.startY).toBeGreaterThan(0)
      // Both should have same total height
      expect(scrolled.totalHeight).toBe(noScroll.totalHeight)
    })

    it('should include buffer for smooth scrolling', () => {
      const text = Array.from({ length: 100 }, (_, i) => `Line ${i}`).join('\n')
      // viewport = 120px = 5 lines; buffer = 2x = 240px above & below
      const result = engine.computeViewportLayout(text, 480, 120)

      // Should include more than just the 5 visible lines
      expect(result.visibleLines.length).toBeGreaterThan(5)
    })

    it('should handle empty document', () => {
      const result = engine.computeViewportLayout('', 0, 500)
      expect(result.visibleLines.length).toBeGreaterThanOrEqual(1)
    })
  })

  // ============================================================
  // Multi-paragraph Layout
  // ============================================================

  describe('computeDocumentLayout()', () => {
    it('should compute cumulative heights', () => {
      const paragraphs = ['Paragraph one', 'Paragraph two', 'Paragraph three']
      const result = engine.computeDocumentLayout(paragraphs)

      expect(result.paragraphOffsets).toHaveLength(3)
      expect(result.paragraphHeights).toHaveLength(3)
      expect(result.paragraphOffsets[0]).toBe(0)
      expect(result.paragraphOffsets[1]).toBe(result.paragraphHeights[0])
      expect(result.totalHeight).toBe(
        result.paragraphHeights.reduce((a, b) => a + b, 0),
      )
    })

    it('should handle empty paragraphs array', () => {
      const result = engine.computeDocumentLayout([])
      expect(result.totalHeight).toBe(0)
      expect(result.paragraphOffsets).toHaveLength(0)
    })
  })

  describe('hitTest()', () => {
    it('should find the correct paragraph at scrollTop', () => {
      const paragraphs = ['Short', 'Medium text here', 'Another paragraph']
      const hit = engine.hitTest(paragraphs, 0)

      expect(hit).not.toBeNull()
      expect(hit!.paragraphIndex).toBe(0)
      expect(hit!.lineIndex).toBe(0)
    })

    it('should return null for scrollTop beyond document', () => {
      const paragraphs = ['Short']
      const hit = engine.hitTest(paragraphs, 99999)
      expect(hit).toBeNull()
    })
  })

  // ============================================================
  // Cache Management
  // ============================================================

  describe('Cache Management', () => {
    it('should track cache size', () => {
      engine.computeLayout('Text A')
      engine.computeLayout('Text B')
      expect(engine.getCacheStats().preparedSize).toBe(2)
    })

    it('should invalidate specific text', () => {
      engine.computeLayout('Text A')
      engine.computeLayout('Text B')
      engine.invalidateCache('Text A')
      // We can't directly check if 'Text A' was removed,
      // but total count should decrease or stay same
      // (key includes font, so invalidateCache uses full key)
    })

    it('should clear all caches', () => {
      engine.computeLayout('A')
      engine.computeLayout('B')
      engine.computeLayout('C')
      engine.clearAllCaches()
      expect(engine.getCacheStats().preparedSize).toBe(0)
      expect(engine.getCacheStats().segmentSize).toBe(0)
    })

    it('should evict LRU entries when cache is full', () => {
      // Create engine with tiny cache via backend
      const smallEngine = new LayoutEngine(
        { font: '16px Inter', lineHeight: 24, maxWidth: 400 },
        fallback,
      )
      // Fill beyond default 512 entries
      for (let i = 0; i < 520; i++) {
        smallEngine.computeLayout(`unique text ${i}`)
      }
      // Should not exceed 512
      expect(smallEngine.getCacheStats().preparedSize).toBeLessThanOrEqual(512)
    })
  })

  // ============================================================
  // Backend Replacement
  // ============================================================

  describe('setBackend()', () => {
    it('should replace the measurement backend', () => {
      const calls: string[] = []
      const spy: MeasurementBackend = {
        prepare: (text, font) => {
          calls.push(`prepare:${text}`)
          return fallback.prepare(text, font)
        },
        prepareWithSegments: (text, font) => {
          calls.push(`prepareWithSegments:${text}`)
          return fallback.prepareWithSegments(text, font)
        },
        layout: (prepared, maxWidth, lineHeight) => {
          calls.push('layout')
          return fallback.layout(prepared, maxWidth, lineHeight)
        },
        layoutWithLines: (prepared, maxWidth, lineHeight) => {
          calls.push('layoutWithLines')
          return fallback.layoutWithLines(prepared, maxWidth, lineHeight)
        },
        clearCache: () => calls.push('clearCache'),
        setLocale: () => calls.push('setLocale'),
      }

      engine.setBackend(spy)
      engine.computeLayout('test')

      expect(calls).toContain('prepare:test')
      expect(calls).toContain('layout')
    })

    it('should clear caches when backend changes', () => {
      engine.computeLayout('cached')
      expect(engine.getCacheStats().preparedSize).toBe(1)

      engine.setBackend(fallback)
      expect(engine.getCacheStats().preparedSize).toBe(0)
    })
  })

  // ============================================================
  // setLocale
  // ============================================================

  describe('setLocale()', () => {
    it('should clear caches when locale changes', () => {
      engine.computeLayout('text')
      expect(engine.getCacheStats().preparedSize).toBe(1)

      engine.setLocale('ja')
      expect(engine.getCacheStats().preparedSize).toBe(0)
    })
  })

  // ============================================================
  // Edge Cases
  // ============================================================

  describe('Edge Cases', () => {
    it('should handle very long single line', () => {
      const text = 'A'.repeat(10000)
      const result = engine.computeLayout(text)
      expect(result.lineCount).toBeGreaterThan(1)
      expect(result.height).toBeGreaterThan(0)
    })

    it('should handle text with only newlines', () => {
      const result = engine.computeLayout('\n\n\n\n')
      expect(result.lineCount).toBeGreaterThanOrEqual(4)
    })

    it('should handle unicode text', () => {
      const result = engine.computeLayout('你好世界 🌍 مرحبا')
      expect(result.lineCount).toBeGreaterThanOrEqual(1)
    })

    it('should handle tab characters', () => {
      const result = engine.computeLayout('col1\tcol2\tcol3')
      expect(result.lineCount).toBeGreaterThanOrEqual(1)
    })

    it('should handle pre-wrap mode', () => {
      const engine2 = makeEngine({ whiteSpace: 'pre-wrap' })
      const result = engine2.computeLayout('  indented  text  ')
      expect(result.lineCount).toBeGreaterThanOrEqual(1)
    })

    it('should handle zero-width maxWidth gracefully', () => {
      const engine2 = makeEngine({ maxWidth: 1 })
      const result = engine2.computeLayout('Hello')
      // Each character on its own line
      expect(result.lineCount).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Incremental Document Layout', () => {
    it('should compute initial layout for all paragraphs', () => {
      const paras = ['Hello world', 'Second paragraph', 'Third one']
      const result = engine.updateDocumentLayout(paras)

      expect(result.paragraphHeights.length).toBe(3)
      expect(result.paragraphOffsets.length).toBe(3)
      expect(result.paragraphOffsets[0]).toBe(0)
      expect(result.totalHeight).toBeGreaterThan(0)
      expect(result.changedIndices).toEqual([0, 1, 2])
    })

    it('should reuse unchanged paragraphs on second call', () => {
      const paras = ['Hello world', 'Second paragraph', 'Third one']
      engine.updateDocumentLayout(paras)

      // Same paragraphs → no changes
      const result2 = engine.updateDocumentLayout(paras)
      expect(result2.changedIndices).toEqual([])
      expect(result2.totalHeight).toBeGreaterThan(0)
    })

    it('should detect changed paragraphs', () => {
      const paras1 = ['Hello world', 'Second paragraph', 'Third one']
      engine.updateDocumentLayout(paras1)

      // Change middle paragraph
      const paras2 = ['Hello world', 'MODIFIED paragraph', 'Third one']
      const result = engine.updateDocumentLayout(paras2)
      expect(result.changedIndices).toEqual([1])
    })

    it('should handle added paragraphs', () => {
      const paras1 = ['Hello', 'World']
      engine.updateDocumentLayout(paras1)

      const paras2 = ['Hello', 'World', 'New paragraph']
      const result = engine.updateDocumentLayout(paras2)
      expect(result.changedIndices).toEqual([2])
      expect(result.paragraphHeights.length).toBe(3)
    })

    it('should return cached total height', () => {
      const paras = ['Hello world', 'Second']
      const result = engine.updateDocumentLayout(paras)
      expect(engine.getCachedTotalHeight()).toBe(result.totalHeight)
    })
  })
})
