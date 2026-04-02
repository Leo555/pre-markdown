/**
 * @pre-markdown/layout
 *
 * Pretext-based text layout engine.
 * Handles text measurement, line breaking, and virtual viewport layout.
 */

export interface LayoutConfig {
  /** Default font string (CSS format, e.g., '16px Inter') */
  font: string
  /** Line height in pixels */
  lineHeight: number
  /** Maximum width for text wrapping */
  maxWidth: number
  /** Whether to preserve whitespace (pre-wrap mode) */
  preserveWhitespace?: boolean
}

export interface LayoutLine {
  /** Line text content */
  text: string
  /** Measured width in pixels */
  width: number
  /** Y position from top */
  y: number
  /** Source line index (in document lines) */
  sourceLineIndex: number
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
}

/**
 * Layout engine that wraps @chenglou/pretext for text measurement.
 *
 * This is the integration layer that bridges pretext's raw text
 * measurement capabilities with our document layout needs.
 *
 * Architecture:
 * 1. prepare() - one-time text analysis (cached)
 * 2. layout() - pure arithmetic line breaking (fast path)
 * 3. viewport layout - only compute visible lines
 */
export class LayoutEngine {
  private config: LayoutConfig
  private cache = new Map<string, unknown>() // PreparedText cache

  constructor(config: LayoutConfig) {
    this.config = config
  }

  /**
   * Update layout configuration.
   */
  updateConfig(config: Partial<LayoutConfig>): void {
    this.config = { ...this.config, ...config }
    // Invalidate cache if font changed
    if (config.font) {
      this.cache.clear()
    }
  }

  /**
   * Compute layout for a block of text.
   * Uses pretext's prepare() + layout() pipeline.
   */
  computeLayout(text: string): LayoutResult {
    // TODO: integrate with @chenglou/pretext
    // For now, provide a simple line-counting fallback
    const lines = text.split('\n')
    const lineCount = lines.length
    const height = lineCount * this.config.lineHeight

    return {
      height,
      lineCount,
    }
  }

  /**
   * Compute layout with individual line information.
   * Uses pretext's prepareWithSegments() + layoutWithLines().
   */
  computeLayoutWithLines(text: string): LayoutResult {
    // TODO: integrate with @chenglou/pretext layoutWithLines
    const textLines = text.split('\n')
    const lines: LayoutLine[] = textLines.map((line, i) => ({
      text: line,
      width: 0, // TODO: actual measurement
      y: i * this.config.lineHeight,
      sourceLineIndex: i,
    }))

    return {
      height: lines.length * this.config.lineHeight,
      lineCount: lines.length,
      lines,
    }
  }

  /**
   * Compute layout for only the visible viewport.
   * This is the key performance optimization: we only measure
   * and position lines that are actually visible.
   */
  computeViewportLayout(
    text: string,
    scrollTop: number,
    viewportHeight: number,
  ): ViewportLayoutResult {
    const allLayout = this.computeLayoutWithLines(text)
    const allLines = allLayout.lines ?? []

    const startIndex = Math.max(0, Math.floor(scrollTop / this.config.lineHeight))
    const endIndex = Math.min(
      allLines.length,
      Math.ceil((scrollTop + viewportHeight) / this.config.lineHeight),
    )

    const visibleLines = allLines.slice(startIndex, endIndex)

    return {
      visibleLines,
      totalHeight: allLayout.height,
      startY: startIndex * this.config.lineHeight,
    }
  }

  /**
   * Invalidate cache for a specific text block.
   */
  invalidateCache(key?: string): void {
    if (key) {
      this.cache.delete(key)
    } else {
      this.cache.clear()
    }
  }

  /**
   * Get current configuration.
   */
  getConfig(): Readonly<LayoutConfig> {
    return this.config
  }
}
