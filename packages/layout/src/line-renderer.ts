/**
 * @pre-markdown/layout — Line Renderer
 *
 * Provides pretext-based line number rendering and soft-wrap computation.
 * Replaces naive "one div per line" approach with accurate visual line mapping
 * that correctly handles soft-wrapped (long) lines.
 *
 * Key features:
 *  - Accurate line number positioning that aligns with soft-wrapped text
 *  - Incremental updates: only recompute changed lines
 *  - Active line tracking (current cursor line highlight)
 *  - Virtual rendering for large documents (only render visible line numbers)
 *  - Pure pretext computation — zero DOM measurement needed
 */

import type { LayoutEngine } from './index.js'
import type { CursorEngine, LineNumberInfo } from './cursor.js'

// ============================================================
// Types
// ============================================================

/** Configuration for the line renderer */
export interface LineRendererConfig {
  /** The CursorEngine instance (provides visual line mapping) */
  cursor: CursorEngine
  /** Container element for line numbers */
  container: HTMLElement
  /** Line height in pixels (must match editor) */
  lineHeight: number
  /** Class name for active line highlight */
  activeClass?: string
  /** Whether to use virtual rendering (default: true for > 1000 lines) */
  virtual?: boolean
  /** Extra lines to render above/below viewport in virtual mode */
  overscan?: number
}

/** A rendered line number entry */
export interface RenderedLineNumber {
  /** Source line number (1-based) */
  lineNumber: number
  /** Y position in pixels */
  y: number
  /** Height spanning all visual lines of this source line */
  height: number
  /** Whether this is the active (cursor) line */
  isActive: boolean
}

// ============================================================
// LineRenderer
// ============================================================

/**
 * Renders line numbers with correct alignment for soft-wrapped text.
 * Uses pretext layout data from CursorEngine for pixel-perfect positioning.
 */
export class LineRenderer {
  private cursor: CursorEngine
  private container: HTMLElement
  private lineHeight: number
  private activeClass: string
  private virtual: boolean
  private overscan: number

  private activeLine = -1
  private lastScrollTop = 0
  private lastViewportHeight = 0
  private renderedRange: [number, number] = [0, 0]

  // DOM pool for virtual rendering
  private pool: HTMLDivElement[] = []

  constructor(config: LineRendererConfig) {
    this.cursor = config.cursor
    this.container = config.container
    this.lineHeight = config.lineHeight
    this.activeClass = config.activeClass ?? 'active-line'
    this.virtual = config.virtual ?? true
    this.overscan = config.overscan ?? 20
  }

  // --------------------------------------------------------
  // Active Line
  // --------------------------------------------------------

  /**
   * Set the active (cursor) line. Highlighted in the gutter.
   * @param lineNumber - 1-based source line number
   */
  setActiveLine(lineNumber: number): void {
    if (lineNumber === this.activeLine) return

    // Remove old highlight
    if (this.activeLine > 0) {
      const oldEl = this.container.querySelector(
        `[data-line="${this.activeLine}"]`
      )
      if (oldEl) oldEl.classList.remove(this.activeClass)
    }

    this.activeLine = lineNumber

    // Add new highlight
    const newEl = this.container.querySelector(
      `[data-line="${lineNumber}"]`
    )
    if (newEl) newEl.classList.add(this.activeClass)
  }

  /** Get the current active line number (1-based) */
  getActiveLine(): number {
    return this.activeLine
  }

  // --------------------------------------------------------
  // Rendering
  // --------------------------------------------------------

  /**
   * Full render: rebuild all line numbers.
   * Use for initial render or after text content changes.
   */
  render(): void {
    const lineNumbers = this.cursor.getLineNumbers()
    const totalLines = lineNumbers.length

    if (this.virtual && totalLines > 1000) {
      this.renderVirtual()
      return
    }

    // Non-virtual: render all line numbers
    this.renderAll(lineNumbers)
  }

  /**
   * Render all line numbers (non-virtual mode).
   * Uses absolutely-positioned divs for correct alignment with soft-wrapped text.
   */
  private renderAll(lineNumbers: readonly LineNumberInfo[]): void {
    const fragment = document.createDocumentFragment()

    for (const info of lineNumbers) {
      const div = document.createElement('div')
      div.textContent = String(info.lineNumber)
      div.setAttribute('data-line', String(info.lineNumber))
      div.style.height = info.height + 'px'
      div.style.lineHeight = info.height + 'px'

      if (info.lineNumber === this.activeLine) {
        div.classList.add(this.activeClass)
      }

      fragment.appendChild(div)
    }

    this.container.innerHTML = ''
    this.container.appendChild(fragment)
  }

  /**
   * Virtual rendering: only render line numbers visible in the viewport.
   * Uses absolute positioning with a spacer for correct scroll height.
   */
  renderVirtual(): void {
    const lineNumbers = this.cursor.getLineNumbers()
    const totalHeight = this.cursor.getTotalHeight()
    const scrollTop = this.lastScrollTop
    const viewportHeight = this.lastViewportHeight || 800

    // Find visible range
    const startY = Math.max(0, scrollTop - this.overscan * this.lineHeight)
    const endY = scrollTop + viewportHeight + this.overscan * this.lineHeight

    let startIdx = 0
    let endIdx = lineNumbers.length

    // Binary search for start
    {
      let lo = 0, hi = lineNumbers.length - 1
      while (lo < hi) {
        const mid = (lo + hi + 1) >>> 1
        if (lineNumbers[mid]!.y <= startY) lo = mid
        else hi = mid - 1
      }
      startIdx = lo
    }

    // Binary search for end
    {
      let lo = startIdx, hi = lineNumbers.length - 1
      while (lo < hi) {
        const mid = (lo + hi + 1) >>> 1
        if (lineNumbers[mid]!.y <= endY) lo = mid
        else hi = mid - 1
      }
      endIdx = lo + 1
    }

    // Only re-render if range changed
    if (this.renderedRange[0] === startIdx && this.renderedRange[1] === endIdx) {
      return
    }
    this.renderedRange = [startIdx, endIdx]

    // Build fragment
    this.container.innerHTML = ''

    // Spacer element for total height
    const spacer = document.createElement('div')
    spacer.style.height = totalHeight + 'px'
    spacer.style.position = 'relative'

    const fragment = document.createDocumentFragment()
    for (let i = startIdx; i < endIdx && i < lineNumbers.length; i++) {
      const info = lineNumbers[i]!
      const div = this.getPooledDiv()
      div.textContent = String(info.lineNumber)
      div.setAttribute('data-line', String(info.lineNumber))
      div.style.position = 'absolute'
      div.style.top = info.y + 'px'
      div.style.height = info.height + 'px'
      div.style.lineHeight = info.height + 'px'
      div.style.width = '100%'
      div.style.textAlign = 'right'

      if (info.lineNumber === this.activeLine) {
        div.classList.add(this.activeClass)
      } else {
        div.classList.remove(this.activeClass)
      }

      fragment.appendChild(div)
    }

    spacer.appendChild(fragment)
    this.container.appendChild(spacer)
  }

  /**
   * Update scroll position for virtual rendering.
   * Call from the editor's scroll event handler.
   */
  updateScroll(scrollTop: number, viewportHeight: number): void {
    this.lastScrollTop = scrollTop
    this.lastViewportHeight = viewportHeight

    if (this.virtual && this.cursor.getSourceLineCount() > 1000) {
      this.renderVirtual()
    }
  }

  /**
   * Update after text changes. Re-renders line numbers.
   */
  update(): void {
    this.render()
  }

  // --------------------------------------------------------
  // Auto-wrap information
  // --------------------------------------------------------

  /**
   * Get the number of visual lines for each source line.
   * Useful for understanding how text wraps without DOM measurement.
   *
   * @returns Array where index = source line (0-based), value = visual line count
   */
  getWrapInfo(): number[] {
    const lineNumbers = this.cursor.getLineNumbers()
    return lineNumbers.map(ln => ln.visualLineCount)
  }

  /**
   * Check if a source line is soft-wrapped (spans multiple visual lines).
   */
  isLineWrapped(sourceLine: number): boolean {
    const lineNumbers = this.cursor.getLineNumbers()
    const info = lineNumbers[sourceLine]
    return info ? info.visualLineCount > 1 : false
  }

  /**
   * Get total visual line count (including wrapped lines).
   */
  getTotalVisualLines(): number {
    return this.cursor.getVisualLineCount()
  }

  // --------------------------------------------------------
  // Cleanup
  // --------------------------------------------------------

  /**
   * Dispose resources.
   */
  dispose(): void {
    this.container.innerHTML = ''
    this.pool = []
  }

  // --------------------------------------------------------
  // Internal
  // --------------------------------------------------------

  private getPooledDiv(): HTMLDivElement {
    if (this.pool.length > 0) {
      return this.pool.pop()!
    }
    return document.createElement('div')
  }
}
