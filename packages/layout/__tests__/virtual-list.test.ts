/**
 * VirtualList Tests
 *
 * Uses the fallback measurement backend (character-count heuristic)
 * since Node.js doesn't have Canvas API.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { LayoutEngine, createFallbackBackend, VirtualList } from '@pre-markdown/layout'
import type { VirtualListConfig, ViewportRange } from '@pre-markdown/layout'

const AVG_CHAR = 8
const fallback = createFallbackBackend(AVG_CHAR)

function makeEngine(): LayoutEngine {
  return new LayoutEngine(
    {
      font: '16px Inter',
      lineHeight: 24,
      maxWidth: 400,
    },
    fallback,
  )
}

function makeList(overrides?: Partial<VirtualListConfig>): VirtualList {
  return new VirtualList({
    engine: makeEngine(),
    viewportHeight: 240, // 10 lines
    overscan: 3,
    ...overrides,
  })
}

describe('VirtualList', () => {
  let list: VirtualList

  beforeEach(() => {
    list = makeList()
  })

  // ============================================================
  // setItems
  // ============================================================

  describe('setItems()', () => {
    it('should compute heights for all items', () => {
      const texts = ['Hello', 'World', 'Test']
      list.setItems(texts)

      expect(list.getItemCount()).toBe(3)
      expect(list.getTotalHeight()).toBeGreaterThan(0)

      for (let i = 0; i < 3; i++) {
        expect(list.getItemHeight(i)).toBeGreaterThan(0)
      }
    })

    it('should compute correct offsets', () => {
      const texts = ['Hello', 'World', 'Test']
      list.setItems(texts)

      expect(list.getItemOffset(0)).toBe(0)
      expect(list.getItemOffset(1)).toBe(list.getItemHeight(0))
      expect(list.getItemOffset(2)).toBe(
        list.getItemHeight(0) + list.getItemHeight(1),
      )
    })

    it('should handle empty items', () => {
      list.setItems([])
      expect(list.getItemCount()).toBe(0)
      expect(list.getTotalHeight()).toBe(0)
    })

    it('should handle single item', () => {
      list.setItems(['Solo'])
      expect(list.getItemCount()).toBe(1)
      expect(list.getTotalHeight()).toBe(list.getItemHeight(0))
    })

    it('should handle item gap', () => {
      const listWithGap = makeList({ itemGap: 10 })
      listWithGap.setItems(['A', 'B', 'C'])

      const heightA = listWithGap.getItemHeight(0)
      const heightB = listWithGap.getItemHeight(1)

      // Offset of second item = height of first + gap
      expect(listWithGap.getItemOffset(1)).toBe(heightA + 10)
      // Offset of third item = height of first + gap + height of second + gap
      expect(listWithGap.getItemOffset(2)).toBe(heightA + 10 + heightB + 10)
    })
  })

  // ============================================================
  // updateItems (incremental)
  // ============================================================

  describe('updateItems()', () => {
    it('should detect changed items', () => {
      list.setItems(['Hello', 'World', 'Test'])

      const changed = list.updateItems(['Hello', 'Changed', 'Test'])
      expect(changed).toEqual([1])
    })

    it('should detect all items as changed on initial', () => {
      const changed = list.updateItems(['A', 'B', 'C'])
      expect(changed).toEqual([0, 1, 2])
    })

    it('should handle added items', () => {
      list.setItems(['A', 'B'])
      const changed = list.updateItems(['A', 'B', 'C'])
      expect(changed).toEqual([2])
      expect(list.getItemCount()).toBe(3)
    })

    it('should handle removed items', () => {
      list.setItems(['A', 'B', 'C'])
      const changed = list.updateItems(['A'])
      expect(changed).toEqual([])
      expect(list.getItemCount()).toBe(1)
    })

    it('should return no changes for identical items', () => {
      list.setItems(['A', 'B', 'C'])
      const changed = list.updateItems(['A', 'B', 'C'])
      expect(changed).toEqual([])
    })
  })

  // ============================================================
  // computeViewport
  // ============================================================

  describe('computeViewport()', () => {
    it('should return visible items for small list', () => {
      list.setItems(['A', 'B', 'C'])
      const range = list.computeViewport()

      expect(range.startIndex).toBe(0)
      expect(range.items.length).toBeGreaterThan(0)
      expect(range.totalHeight).toBeGreaterThan(0)
    })

    it('should return all items when list fits in viewport', () => {
      list.setItems(['A', 'B'])
      const range = list.computeViewport()

      expect(range.startIndex).toBe(0)
      expect(range.endIndex).toBe(2)
    })

    it('should handle large list with scroll', () => {
      // Create 100 items
      const texts = Array.from({ length: 100 }, (_, i) => `Item ${i}`)
      list.setItems(texts)

      // Scroll to middle
      const range = list.setScrollTop(list.getTotalHeight() / 2)

      expect(range.startIndex).toBeGreaterThan(0)
      expect(range.endIndex).toBeLessThanOrEqual(100)
      expect(range.items.length).toBeLessThan(100)
    })

    it('should include overscan items', () => {
      const texts = Array.from({ length: 100 }, (_, i) => `Item ${i}`)
      list.setItems(texts)

      // Scroll to a position in the middle
      const scrollTop = list.getItemOffset(50)
      const range = list.setScrollTop(scrollTop)

      // Start should be before item 50 due to overscan
      expect(range.startIndex).toBeLessThan(50)
    })

    it('should handle empty list', () => {
      list.setItems([])
      const range = list.computeViewport()

      expect(range.items).toEqual([])
      expect(range.totalHeight).toBe(0)
    })
  })

  // ============================================================
  // setScrollTop
  // ============================================================

  describe('setScrollTop()', () => {
    it('should clamp to valid range', () => {
      list.setItems(['A', 'B'])
      list.setScrollTop(-100)
      expect(list.getScrollTop()).toBe(0)
    })

    it('should fire viewport change callback', () => {
      const texts = Array.from({ length: 50 }, (_, i) => `Item ${i}`)
      list.setItems(texts)

      let callCount = 0
      let lastRange: ViewportRange | null = null
      list.onViewport((range) => {
        callCount++
        lastRange = range
      })

      list.setScrollTop(100)
      expect(callCount).toBe(1)
      expect(lastRange).not.toBeNull()
    })
  })

  // ============================================================
  // scrollToItem
  // ============================================================

  describe('scrollToItem()', () => {
    it('should scroll to item start', () => {
      const texts = Array.from({ length: 50 }, (_, i) => `Item ${i}`)
      list.setItems(texts)

      const range = list.scrollToItem(20, 'start')
      expect(list.getScrollTop()).toBe(list.getItemOffset(20))
    })

    it('should handle out-of-bounds index', () => {
      list.setItems(['A', 'B'])
      const range = list.scrollToItem(999)
      expect(range.items.length).toBeGreaterThanOrEqual(0)
    })
  })

  // ============================================================
  // hitTest
  // ============================================================

  describe('hitTest()', () => {
    it('should find item at y position', () => {
      list.setItems(['Hello', 'World', 'Test'])

      const index = list.hitTest(0)
      expect(index).toBe(0)
    })

    it('should find correct item in middle', () => {
      list.setItems(['Hello', 'World', 'Test'])

      const offset = list.getItemOffset(2)
      const index = list.hitTest(offset)
      expect(index).toBe(2)
    })

    it('should return -1 for negative y', () => {
      list.setItems(['Hello'])
      expect(list.hitTest(-10)).toBe(-1)
    })

    it('should return -1 for y beyond total height', () => {
      list.setItems(['Hello'])
      expect(list.hitTest(99999)).toBe(-1)
    })

    it('should return -1 for empty list', () => {
      list.setItems([])
      expect(list.hitTest(0)).toBe(-1)
    })
  })

  // ============================================================
  // hitTestDetailed
  // ============================================================

  describe('hitTestDetailed()', () => {
    it('should return local Y offset', () => {
      list.setItems(['Hello', 'World', 'Test'])

      const result = list.hitTestDetailed(list.getItemOffset(1) + 5)
      expect(result).not.toBeNull()
      expect(result!.index).toBe(1)
      expect(result!.localY).toBe(5)
    })

    it('should return null for out of bounds', () => {
      list.setItems(['Hello'])
      expect(list.hitTestDetailed(-1)).toBeNull()
    })
  })

  // ============================================================
  // relayout
  // ============================================================

  describe('relayout()', () => {
    it('should recompute all heights', () => {
      list.setItems(['Hello', 'World'])
      const oldHeight = list.getTotalHeight()

      // relayout should produce same heights (same config)
      const time = list.relayout()
      expect(list.getTotalHeight()).toBe(oldHeight)
      expect(time).toBeGreaterThanOrEqual(0)
    })
  })

  // ============================================================
  // Edge Cases
  // ============================================================

  describe('Edge Cases', () => {
    it('should handle very long text items', () => {
      list.setItems(['A'.repeat(10000)])
      expect(list.getItemHeight(0)).toBeGreaterThan(24) // multiple lines
    })

    it('should handle items with newlines', () => {
      list.setItems(['Line1\nLine2\nLine3'])
      expect(list.getItemHeight(0)).toBeGreaterThanOrEqual(72) // 3 lines * 24
    })

    it('should handle 10000 items', () => {
      const texts = Array.from({ length: 10000 }, (_, i) => `Item number ${i}`)
      list.setItems(texts)

      expect(list.getItemCount()).toBe(10000)
      expect(list.getTotalHeight()).toBeGreaterThan(0)

      // Viewport computation should be fast
      const start = performance.now()
      list.setScrollTop(list.getTotalHeight() / 2)
      const elapsed = performance.now() - start
      expect(elapsed).toBeLessThan(50) // should be very fast with binary search
    })
  })
})
