/**
 * @pre-markdown/layout
 *
 * Pretext-based text layout engine.
 * Handles text measurement, line breaking, and virtual viewport layout.
 *
 * Uses @chenglou/pretext for zero-DOM-reflow text measurement:
 *   prepare()  → one-time text analysis (cached)
 *   layout()   → pure-arithmetic line breaking (hot path)
 */

import {
  prepare,
  prepareWithSegments,
  layout,
  layoutWithLines,
  clearCache as pretextClearCache,
  setLocale as pretextSetLocale,
} from '@chenglou/pretext'

import type {
  PreparedText,
  PreparedTextWithSegments,
  LayoutResult as PretextLayoutResult,
  LayoutLinesResult as PretextLinesResult,
  LayoutLine as PretextLine,
  PrepareOptions,
} from '@chenglou/pretext'

// Re-export pretext types for consumers
export type { PreparedText, PreparedTextWithSegments, PretextLine }

// ============================================================
// Configuration Types
// ============================================================

export interface LayoutConfig {
  /** CSS font string (e.g., '16px Inter'). Must be loaded before use. */
  font: string
  /** Line height in pixels (must match CSS line-height) */
  lineHeight: number
  /** Maximum width for text wrapping (pixels) */
  maxWidth: number
  /** White-space mode: 'normal' (default) or 'pre-wrap' */
  whiteSpace?: 'normal' | 'pre-wrap'
  /** Viewport buffer multiplier (default 2 = 2x viewport above & below) */
  viewportBuffer?: number
  /** Font for code blocks / inline code (defaults to main font) */
  codeFont?: string
  /** Line height for code blocks (defaults to main lineHeight) */
  codeLineHeight?: number
}

// ============================================================
// Result Types
// ============================================================

export interface LayoutLine {
  /** Line text content */
  text: string
  /** Measured width in pixels */
  width: number
  /** Y position from top */
  y: number
  /** Source line index (in document paragraphs) */
  sourceIndex: number
}

export interface LayoutResult {
  /** Total height of all lines */
  height: number
  /** Total number of visual lines */
  lineCount: number
  /** Individual line layouts (only populated when requested) */
  lines?: LayoutLine[]
}

export interface ViewportLayoutResult {
  /** Lines visible in the viewport */
  visibleLines: LayoutLine[]
  /** Total height of the entire document */
  totalHeight: number
  /** Y offset of the first visible line */
  startY: number
  /** Index of first visible line */
  startIndex: number
  /** Index of last visible line (exclusive) */
  endIndex: number
}

// ============================================================
// LRU Cache
// ============================================================

interface CacheEntry<T> {
  value: T
}

class LRUCache<T> {
  private map = new Map<string, CacheEntry<T>>()
  private maxSize: number

  constructor(maxSize = 512) {
    this.maxSize = maxSize
  }

  get(key: string): T | undefined {
    const entry = this.map.get(key)
    if (!entry) return undefined
    // Move to end (most recently used) — Map preserves insertion order
    this.map.delete(key)
    this.map.set(key, entry)
    return entry.value
  }

  set(key: string, value: T): void {
    if (this.map.has(key)) {
      this.map.delete(key)
    } else if (this.map.size >= this.maxSize) {
      // Evict oldest (first entry in Map — O(1))
      const first = this.map.keys().next().value
      if (first !== undefined) this.map.delete(first)
    }
    this.map.set(key, { value })
  }

  has(key: string): boolean {
    return this.map.has(key)
  }

  delete(key: string): boolean {
    return this.map.delete(key)
  }

  clear(): void {
    this.map.clear()
  }

  get size(): number {
    return this.map.size
  }
}

// ============================================================
// Measurement Backend (pluggable for Node.js testing)
// ============================================================

export interface MeasurementBackend {
  /** One-time text analysis (expensive, cache result) */
  prepare(text: string, font: string, options?: PrepareOptions): PreparedText
  /** One-time text analysis with segment info */
  prepareWithSegments(text: string, font: string, options?: PrepareOptions): PreparedTextWithSegments
  /** Pure-arithmetic layout (cheap, can call per frame) */
  layout(prepared: PreparedText, maxWidth: number, lineHeight: number): PretextLayoutResult
  /** Layout with per-line info */
  layoutWithLines(prepared: PreparedTextWithSegments, maxWidth: number, lineHeight: number): PretextLinesResult
  /** Clear internal caches */
  clearCache(): void
  /** Set locale for text segmentation */
  setLocale(locale?: string): void
}

/** Default backend: real @chenglou/pretext (requires Canvas) */
const pretextBackend: MeasurementBackend = {
  prepare,
  prepareWithSegments,
  layout,
  layoutWithLines,
  clearCache: pretextClearCache,
  setLocale: pretextSetLocale,
}

/**
 * Fallback backend for environments without Canvas (e.g. Node.js tests).
 * Uses character-count heuristic for approximate measurement.
 */
export function createFallbackBackend(avgCharWidth = 8): MeasurementBackend {
  return {
    prepare(text: string, _font: string, _options?: PrepareOptions): PreparedText {
      // Return a fake PreparedText that stores the text
      return { __fallback: true, text } as unknown as PreparedText
    },
    prepareWithSegments(text: string, _font: string, _options?: PrepareOptions): PreparedTextWithSegments {
      return { __fallback: true, text, segments: text.split(/(\s+)/).filter(Boolean) } as unknown as PreparedTextWithSegments
    },
    layout(prepared: PreparedText, maxWidth: number, lineHeight: number): PretextLayoutResult {
      const text = (prepared as unknown as { text: string }).text ?? ''
      const lines = estimateLines(text, maxWidth, avgCharWidth)
      return { height: lines * lineHeight, lineCount: lines }
    },
    layoutWithLines(prepared: PreparedTextWithSegments, maxWidth: number, lineHeight: number): PretextLinesResult {
      const text = (prepared as unknown as { text: string }).text ?? ''
      const wrappedLines = wrapText(text, maxWidth, avgCharWidth)
      const lines = wrappedLines.map((line, i) => ({
        text: line,
        width: line.length * avgCharWidth,
        start: { segmentIndex: 0, graphemeIndex: 0 },
        end: { segmentIndex: 0, graphemeIndex: 0 },
      }))
      return {
        height: lines.length * lineHeight,
        lineCount: lines.length,
        lines,
      }
    },
    clearCache() { /* no-op */ },
    setLocale() { /* no-op */ },
  }
}

function estimateLines(text: string, maxWidth: number, avgCharWidth: number): number {
  if (text.length === 0) return 1
  const hardLines = text.split('\n')
  let total = 0
  const charsPerLine = Math.max(1, Math.floor(maxWidth / avgCharWidth))
  for (const line of hardLines) {
    total += Math.max(1, Math.ceil(line.length / charsPerLine))
  }
  return total
}

function wrapText(text: string, maxWidth: number, avgCharWidth: number): string[] {
  const charsPerLine = Math.max(1, Math.floor(maxWidth / avgCharWidth))
  const result: string[] = []
  const hardLines = text.split('\n')
  for (const line of hardLines) {
    if (line.length <= charsPerLine) {
      result.push(line)
    } else {
      for (let i = 0; i < line.length; i += charsPerLine) {
        result.push(line.slice(i, i + charsPerLine))
      }
    }
  }
  return result.length > 0 ? result : ['']
}

// ============================================================
// Layout Engine
// ============================================================

/**
 * High-performance text layout engine powered by @chenglou/pretext.
 *
 * Two-phase pipeline:
 *   1. prepare() — one-time text analysis (~1-5ms per paragraph, cached via LRU)
 *   2. layout()  — pure arithmetic (~0.0002ms, safe for animation frames)
 *
 * In environments without Canvas (Node.js), set a fallback backend
 * via the constructor or `setBackend()`.
 */
export class LayoutEngine {
  private config: LayoutConfig
  private backend: MeasurementBackend
  private preparedCache: LRUCache<PreparedText>
  private preparedSegCache: LRUCache<PreparedTextWithSegments>

  constructor(config: LayoutConfig, backend?: MeasurementBackend) {
    this.config = {
      viewportBuffer: 2,
      whiteSpace: 'normal',
      ...config,
    }
    this.backend = backend ?? pretextBackend
    this.preparedCache = new LRUCache(512)
    this.preparedSegCache = new LRUCache(256)
  }

  // --------------------------------------------------------
  // Configuration
  // --------------------------------------------------------

  /** Update layout configuration. Invalidates cache if font changes. */
  updateConfig(config: Partial<LayoutConfig>): void {
    const fontChanged = config.font && config.font !== this.config.font
    this.config = { ...this.config, ...config }
    if (fontChanged) {
      this.clearAllCaches()
    }
  }

  /** Get current configuration (readonly). */
  getConfig(): Readonly<LayoutConfig> {
    return this.config
  }

  /** Replace the measurement backend (e.g. for testing). */
  setBackend(backend: MeasurementBackend): void {
    this.backend = backend
    this.clearAllCaches()
  }

  /** Set locale for text segmentation. */
  setLocale(locale?: string): void {
    this.backend.setLocale(locale)
    this.clearAllCaches()
  }

  // --------------------------------------------------------
  // Core Layout API
  // --------------------------------------------------------

  /**
   * Compute height and line count for a text block.
   * Uses pretext prepare() + layout() pipeline.
   * The PreparedText is cached by (text, font) key.
   */
  computeLayout(text: string): LayoutResult {
    const prepared = this.getPrepared(text)
    const result = this.backend.layout(prepared, this.config.maxWidth, this.config.lineHeight)
    return {
      height: result.height,
      lineCount: result.lineCount,
    }
  }

  /**
   * Compute layout for code blocks using code font.
   * Falls back to main font if codeFont is not configured.
   */
  computeCodeLayout(text: string): LayoutResult {
    const font = this.config.codeFont ?? this.config.font
    const lineHeight = this.config.codeLineHeight ?? this.config.lineHeight
    const key = `${font}|pre-wrap|${text}`
    let prepared = this.preparedCache.get(key)
    if (!prepared) {
      prepared = this.backend.prepare(text, font, { whiteSpace: 'pre-wrap' })
      this.preparedCache.set(key, prepared)
    }
    const result = this.backend.layout(prepared, this.config.maxWidth, lineHeight)
    return {
      height: result.height,
      lineCount: result.lineCount,
    }
  }

  /**
   * Compute layout with individual line information.
   * Uses prepareWithSegments() + layoutWithLines().
   */
  computeLayoutWithLines(text: string): LayoutResult {
    const prepared = this.getPreparedWithSegments(text)
    const result = this.backend.layoutWithLines(
      prepared,
      this.config.maxWidth,
      this.config.lineHeight,
    )

    const lines: LayoutLine[] = result.lines.map((line, i) => ({
      text: line.text,
      width: line.width,
      y: i * this.config.lineHeight,
      sourceIndex: i,
    }))

    return {
      height: result.height,
      lineCount: result.lineCount,
      lines,
    }
  }

  /**
   * Compute layout for only the visible viewport.
   * Key performance optimization: only measure and position visible lines.
   * Includes configurable buffer (default 2x viewport) for smooth scrolling.
   */
  computeViewportLayout(
    text: string,
    scrollTop: number,
    viewportHeight: number,
  ): ViewportLayoutResult {
    const allLayout = this.computeLayoutWithLines(text)
    const allLines = allLayout.lines ?? []
    const { lineHeight } = this.config
    const buffer = (this.config.viewportBuffer ?? 2) * viewportHeight

    const bufferedTop = Math.max(0, scrollTop - buffer)
    const bufferedBottom = scrollTop + viewportHeight + buffer

    const startIndex = Math.max(0, Math.floor(bufferedTop / lineHeight))
    const endIndex = Math.min(allLines.length, Math.ceil(bufferedBottom / lineHeight))

    const visibleLines = allLines.slice(startIndex, endIndex)

    return {
      visibleLines,
      totalHeight: allLayout.height,
      startY: startIndex * lineHeight,
      startIndex,
      endIndex,
    }
  }

  // --------------------------------------------------------
  // Multi-paragraph Layout
  // --------------------------------------------------------

  /**
   * Compute layout for an array of text blocks (paragraphs).
   * Returns cumulative heights for virtual scrolling.
   */
  computeDocumentLayout(paragraphs: string[]): {
    totalHeight: number
    paragraphOffsets: number[]
    paragraphHeights: number[]
  } {
    const offsets: number[] = []
    const heights: number[] = []
    let cumHeight = 0

    for (const text of paragraphs) {
      offsets.push(cumHeight)
      const result = this.computeLayout(text)
      heights.push(result.height)
      cumHeight += result.height
    }

    return {
      totalHeight: cumHeight,
      paragraphOffsets: offsets,
      paragraphHeights: heights,
    }
  }

  /**
   * Find which paragraph and line is at a given scrollTop position.
   */
  hitTest(
    paragraphs: string[],
    scrollTop: number,
  ): { paragraphIndex: number; lineIndex: number } | null {
    let cumHeight = 0
    for (let i = 0; i < paragraphs.length; i++) {
      const result = this.computeLayout(paragraphs[i]!)
      if (cumHeight + result.height > scrollTop) {
        const localY = scrollTop - cumHeight
        const lineIndex = Math.floor(localY / this.config.lineHeight)
        return { paragraphIndex: i, lineIndex }
      }
      cumHeight += result.height
    }
    return null
  }

  // --------------------------------------------------------
  // Incremental Document Layout
  // --------------------------------------------------------

  private _lastParagraphs: string[] = []
  private _lastHeights: number[] = []
  private _lastTotalHeight = 0

  /**
   * Incremental document layout — reuses cached heights for unchanged paragraphs.
   * Only recomputes layout for paragraphs that changed since the last call.
   * Use this for real-time editing instead of computeDocumentLayout().
   *
   * Returns the same structure as computeDocumentLayout().
   */
  updateDocumentLayout(paragraphs: string[]): {
    totalHeight: number
    paragraphOffsets: number[]
    paragraphHeights: number[]
    changedIndices: number[]
  } {
    const prev = this._lastParagraphs
    const prevHeights = this._lastHeights
    const len = paragraphs.length
    const heights: number[] = new Array(len)
    const offsets: number[] = new Array(len)
    const changedIndices: number[] = []
    let cumHeight = 0

    for (let i = 0; i < len; i++) {
      const text = paragraphs[i]!
      // Reuse if same paragraph text
      if (i < prev.length && prev[i] === text) {
        heights[i] = prevHeights[i]!
      } else {
        heights[i] = this.computeLayout(text).height
        changedIndices.push(i)
      }
      offsets[i] = cumHeight
      cumHeight += heights[i]!
    }

    // Track for next call
    this._lastParagraphs = paragraphs
    this._lastHeights = heights
    this._lastTotalHeight = cumHeight

    return {
      totalHeight: cumHeight,
      paragraphOffsets: offsets,
      paragraphHeights: heights,
      changedIndices,
    }
  }

  /**
   * Get the cached total height from the last updateDocumentLayout() call.
   * O(1) — no recomputation.
   */
  getCachedTotalHeight(): number {
    return this._lastTotalHeight
  }

  // --------------------------------------------------------
  // Cache Management
  // --------------------------------------------------------

  /** Invalidate cache for a specific text block. */
  invalidateCache(text?: string): void {
    if (text) {
      const key = this.cacheKey(text)
      this.preparedCache.delete(key)
      this.preparedSegCache.delete(key)
    } else {
      this.clearAllCaches()
    }
  }

  /** Clear all caches including pretext internal cache. */
  clearAllCaches(): void {
    this.preparedCache.clear()
    this.preparedSegCache.clear()
    this.backend.clearCache()
  }

  /** Get current cache statistics. */
  getCacheStats(): { preparedSize: number; segmentSize: number } {
    return {
      preparedSize: this.preparedCache.size,
      segmentSize: this.preparedSegCache.size,
    }
  }

  // --------------------------------------------------------
  // Internal Helpers
  // --------------------------------------------------------

  private cacheKey(text: string): string {
    return `${this.config.font}|${this.config.whiteSpace ?? 'normal'}|${text}`
  }

  private getPrepared(text: string): PreparedText {
    const key = this.cacheKey(text)
    let prepared = this.preparedCache.get(key)
    if (!prepared) {
      const opts: PrepareOptions | undefined =
        this.config.whiteSpace === 'pre-wrap' ? { whiteSpace: 'pre-wrap' } : undefined
      prepared = this.backend.prepare(text, this.config.font, opts)
      this.preparedCache.set(key, prepared)
    }
    return prepared
  }

  private getPreparedWithSegments(text: string): PreparedTextWithSegments {
    const key = this.cacheKey(text)
    let prepared = this.preparedSegCache.get(key)
    if (!prepared) {
      const opts: PrepareOptions | undefined =
        this.config.whiteSpace === 'pre-wrap' ? { whiteSpace: 'pre-wrap' } : undefined
      prepared = this.backend.prepareWithSegments(text, this.config.font, opts)
      this.preparedSegCache.set(key, prepared)
    }
    return prepared
  }
}
