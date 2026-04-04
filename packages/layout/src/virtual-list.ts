/**
 * @pre-markdown/layout — Virtual List
 *
 * Dynamic-height virtual list powered by pretext precise text measurement.
 * Unlike typical virtual lists that estimate item heights, this uses
 * pretext's exact layout computation for pixel-perfect scrolling.
 *
 * Key features:
 *  - Zero estimation error: every item height is precisely computed via pretext
 *  - Incremental updates: only recompute changed items
 *  - Binary search viewport: O(log n) item lookup
 *  - Configurable overscan: smooth scrolling with buffer items
 *  - Resize-aware: automatic relayout on width changes
 *  - Callback-driven: onViewportChange fires with visible item range
 */

import type { LayoutEngine, LayoutResult } from './index.js'

// ============================================================
// Types
// ============================================================

export interface VirtualListConfig {
  /** The LayoutEngine instance for text measurement */
  engine: LayoutEngine
  /** Viewport height in pixels */
  viewportHeight: number
  /** Number of extra items to render above/below viewport (default: 5) */
  overscan?: number
  /** Gap between items in pixels (default: 0) */
  itemGap?: number
}

export interface VirtualListItem {
  /** Index in the data array */
  index: number
  /** Y offset from document top (pixels) */
  offsetTop: number
  /** Item height in pixels (pretext-measured) */
  height: number
  /** The text content */
  text: string
}

export interface ViewportRange {
  /** First visible item index (inclusive) */
  startIndex: number
  /** Last visible item index (exclusive) */
  endIndex: number
  /** Items to render (including overscan) */
  items: VirtualListItem[]
  /** Total scroll height of all items */
  totalHeight: number
  /** Offset to position the visible container */
  offsetY: number
}

export type ViewportChangeCallback = (range: ViewportRange) => void

// ============================================================
// VirtualList
// ============================================================

export class VirtualList {
  private engine: LayoutEngine
  private viewportHeight: number
  private overscan: number
  private itemGap: number

  /** Item texts */
  private items: string[] = []
  /** Cached item heights (pretext-measured) */
  private heights: number[] = []
  /** Cumulative offsets (heights[0..i-1] + gaps) */
  private offsets: number[] = []
  /** Total height of all items */
  private totalHeight = 0

  /** Current scroll position */
  private scrollTop = 0
  /** Viewport change callback */
  private onViewportChange: ViewportChangeCallback | null = null

  constructor(config: VirtualListConfig) {
    this.engine = config.engine
    this.viewportHeight = config.viewportHeight
    this.overscan = config.overscan ?? 5
    this.itemGap = config.itemGap ?? 0
  }

  // --------------------------------------------------------
  // Data Management
  // --------------------------------------------------------

  /**
   * Set the full list of items. Computes all heights.
   * For incremental updates, use updateItems() instead.
   */
  setItems(texts: string[]): void {
    this.items = texts
    this.heights = new Array(texts.length)
    this.offsets = new Array(texts.length)

    let cumHeight = 0
    for (let i = 0; i < texts.length; i++) {
      this.offsets[i] = cumHeight
      const result = this.engine.computeLayout(texts[i]!)
      this.heights[i] = result.height
      cumHeight += result.height + this.itemGap
    }
    // Subtract the last gap (no gap after last item)
    this.totalHeight = texts.length > 0 ? cumHeight - this.itemGap : 0
  }

  /**
   * Incrementally update items. Only recomputes heights for changed items.
   * Much faster than setItems() for editing scenarios.
   *
   * @returns Indices of items that changed height
   */
  updateItems(texts: string[]): number[] {
    const prevItems = this.items
    const prevHeights = this.heights
    this.items = texts
    const len = texts.length
    const heights: number[] = new Array(len)
    const changedIndices: number[] = []

    for (let i = 0; i < len; i++) {
      if (i < prevItems.length && prevItems[i] === texts[i]) {
        heights[i] = prevHeights[i]!
      } else {
        heights[i] = this.engine.computeLayout(texts[i]!).height
        changedIndices.push(i)
      }
    }

    this.heights = heights

    // Rebuild offsets
    this.offsets = new Array(len)
    let cumHeight = 0
    for (let i = 0; i < len; i++) {
      this.offsets[i] = cumHeight
      cumHeight += heights[i]! + this.itemGap
    }
    this.totalHeight = len > 0 ? cumHeight - this.itemGap : 0

    return changedIndices
  }

  /**
   * Get the height of a specific item.
   */
  getItemHeight(index: number): number {
    return this.heights[index] ?? 0
  }

  /**
   * Get the offset of a specific item from the top.
   */
  getItemOffset(index: number): number {
    return this.offsets[index] ?? 0
  }

  // --------------------------------------------------------
  // Scroll & Viewport
  // --------------------------------------------------------

  /**
   * Set the scroll position and compute the visible range.
   * Fires the onViewportChange callback if registered.
   */
  setScrollTop(scrollTop: number): ViewportRange {
    this.scrollTop = Math.max(0, Math.min(scrollTop, this.totalHeight - this.viewportHeight))
    const range = this.computeViewport()
    if (this.onViewportChange) {
      this.onViewportChange(range)
    }
    return range
  }

  /**
   * Get the current scroll position.
   */
  getScrollTop(): number {
    return this.scrollTop
  }

  /**
   * Update viewport height (e.g., on window resize).
   */
  setViewportHeight(height: number): void {
    this.viewportHeight = height
  }

  /**
   * Scroll to make a specific item visible.
   * @param index - Item index to scroll to
   * @param align - 'start' | 'center' | 'end' (default: 'start')
   */
  scrollToItem(index: number, align: 'start' | 'center' | 'end' = 'start'): ViewportRange {
    if (index < 0 || index >= this.items.length) {
      return this.computeViewport()
    }

    const offset = this.offsets[index]!
    const height = this.heights[index]!

    let scrollTop: number
    switch (align) {
      case 'start':
        scrollTop = offset
        break
      case 'center':
        scrollTop = offset - (this.viewportHeight - height) / 2
        break
      case 'end':
        scrollTop = offset - this.viewportHeight + height
        break
    }

    return this.setScrollTop(scrollTop)
  }

  /**
   * Register a callback for viewport changes.
   */
  onViewport(callback: ViewportChangeCallback | null): void {
    this.onViewportChange = callback
  }

  // --------------------------------------------------------
  // Viewport Computation
  // --------------------------------------------------------

  /**
   * Compute the current visible range.
   */
  computeViewport(): ViewportRange {
    const len = this.items.length
    if (len === 0) {
      return {
        startIndex: 0,
        endIndex: 0,
        items: [],
        totalHeight: 0,
        offsetY: 0,
      }
    }

    const scrollTop = this.scrollTop
    const scrollBottom = scrollTop + this.viewportHeight

    // Binary search for the first visible item
    let startIndex = this.binarySearchOffset(scrollTop)
    // Binary search for the last visible item
    let endIndex = this.binarySearchOffset(scrollBottom)

    // Ensure endIndex is past the last partially visible item
    if (endIndex < len) endIndex++

    // Apply overscan
    startIndex = Math.max(0, startIndex - this.overscan)
    endIndex = Math.min(len, endIndex + this.overscan)

    // Build visible items
    const items: VirtualListItem[] = []
    for (let i = startIndex; i < endIndex; i++) {
      items.push({
        index: i,
        offsetTop: this.offsets[i]!,
        height: this.heights[i]!,
        text: this.items[i]!,
      })
    }

    return {
      startIndex,
      endIndex,
      items,
      totalHeight: this.totalHeight,
      offsetY: this.offsets[startIndex] ?? 0,
    }
  }

  // --------------------------------------------------------
  // Hit Testing
  // --------------------------------------------------------

  /**
   * Find which item is at a given Y position.
   * @returns Item index, or -1 if out of bounds
   */
  hitTest(y: number): number {
    if (this.items.length === 0 || y < 0) return -1
    if (y >= this.totalHeight) return -1
    return this.binarySearchOffset(y)
  }

  /**
   * Find the item and local Y offset within it.
   */
  hitTestDetailed(y: number): { index: number; localY: number } | null {
    const index = this.hitTest(y)
    if (index === -1) return null
    return {
      index,
      localY: y - this.offsets[index]!,
    }
  }

  // --------------------------------------------------------
  // Resize Handling
  // --------------------------------------------------------

  /**
   * Recompute all item heights (e.g., after maxWidth change).
   * Call this after engine.updateConfig({ maxWidth: newWidth }).
   *
   * @returns Time taken in milliseconds
   */
  relayout(): number {
    const start = performance.now()

    let cumHeight = 0
    for (let i = 0; i < this.items.length; i++) {
      this.offsets[i] = cumHeight
      const result = this.engine.computeLayout(this.items[i]!)
      this.heights[i] = result.height
      cumHeight += result.height + this.itemGap
    }
    this.totalHeight = this.items.length > 0 ? cumHeight - this.itemGap : 0

    return performance.now() - start
  }

  // --------------------------------------------------------
  // Getters
  // --------------------------------------------------------

  /** Total height of all items */
  getTotalHeight(): number {
    return this.totalHeight
  }

  /** Number of items */
  getItemCount(): number {
    return this.items.length
  }

  /** Get all item heights (readonly) */
  getHeights(): readonly number[] {
    return this.heights
  }

  /** Get all item offsets (readonly) */
  getOffsets(): readonly number[] {
    return this.offsets
  }

  // --------------------------------------------------------
  // Internal: Binary Search
  // --------------------------------------------------------

  /**
   * Binary search for the item at a given Y offset.
   * Returns the index of the item that contains the offset.
   */
  private binarySearchOffset(y: number): number {
    const offsets = this.offsets
    const len = offsets.length
    if (len === 0) return 0

    let lo = 0
    let hi = len - 1

    while (lo < hi) {
      const mid = (lo + hi + 1) >>> 1
      if (offsets[mid]! <= y) {
        lo = mid
      } else {
        hi = mid - 1
      }
    }

    return lo
  }
}
