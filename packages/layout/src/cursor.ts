/**
 * @pre-markdown/layout — Cursor & Selection Engine
 *
 * Provides pixel-perfect cursor positioning and selection highlighting
 * powered by pretext's zero-DOM-reflow text measurement.
 *
 * Key capabilities:
 *  - offsetToXY: text offset → (x, y) pixel coordinates (via pretext layout)
 *  - xyToOffset: (x, y) click → text offset (reverse hit-test)
 *  - getSelectionRects: start/end offset → array of highlight rectangles
 *  - getLineInfo: get line boundaries, count, and visual line mapping
 *
 * All calculations are pure arithmetic after initial prepare() —
 * zero DOM reads, zero reflow.
 */

import type { LayoutEngine, LayoutLine } from './index.js'

// ============================================================
// Types
// ============================================================

/** A 2D point in pixel coordinates */
export interface Point {
  x: number
  y: number
}

/** A rectangle in pixel coordinates */
export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

/** Cursor position information */
export interface CursorPosition {
  /** Text offset in the source string */
  offset: number
  /** Visual line index (0-based, accounts for wrapping) */
  visualLine: number
  /** X coordinate in pixels from left edge */
  x: number
  /** Y coordinate in pixels from top */
  y: number
  /** Line height in pixels */
  lineHeight: number
}

/** Information about a visual line (may be a wrapped sub-line) */
export interface VisualLineInfo {
  /** Visual line index (0-based) */
  index: number
  /** Text content of this visual line */
  text: string
  /** Measured width in pixels */
  width: number
  /** Y offset from document top */
  y: number
  /** The source (hard) line index (0-based) */
  sourceLine: number
  /** Start offset in the original text */
  startOffset: number
  /** End offset in the original text (exclusive) */
  endOffset: number
}

/** Line number mapping for display */
export interface LineNumberInfo {
  /** Source line number (1-based, for display) */
  lineNumber: number
  /** Y position of this source line's first visual line */
  y: number
  /** Number of visual lines this source line spans */
  visualLineCount: number
  /** Height of all visual lines for this source line */
  height: number
}

// ============================================================
// CursorEngine
// ============================================================

/**
 * Cursor and selection engine powered by pretext.
 *
 * Usage:
 *   const cursor = new CursorEngine(layoutEngine)
 *   cursor.setText(editorContent)
 *
 *   // Click → offset
 *   const offset = cursor.xyToOffset(clickX, clickY)
 *
 *   // Offset → position
 *   const pos = cursor.offsetToPosition(offset)
 *
 *   // Selection rectangles
 *   const rects = cursor.getSelectionRects(selStart, selEnd)
 */
export class CursorEngine {
  private engine: LayoutEngine
  private text = ''
  private hardLines: string[] = ['']
  private visualLines: VisualLineInfo[] = []
  private lineNumbers: LineNumberInfo[] = []
  private totalHeight = 0

  constructor(engine: LayoutEngine) {
    this.engine = engine
  }

  // --------------------------------------------------------
  // Text Management
  // --------------------------------------------------------

  /**
   * Set the text content and compute all visual line info.
   * Call this when the editor content changes.
   */
  setText(text: string): void {
    this.text = text
    this.hardLines = text.split('\n')
    this.recompute()
  }

  /** Get current text */
  getText(): string {
    return this.text
  }

  /**
   * Force recomputation of layout (e.g., after width change).
   * Call after engine.updateConfig({ maxWidth: newWidth }).
   */
  recompute(): void {
    const { hardLines } = this
    const visualLines: VisualLineInfo[] = []
    const lineNumbers: LineNumberInfo[] = []
    const lineHeight = this.engine.getConfig().lineHeight

    let globalOffset = 0 // character offset in original text
    let y = 0

    for (let srcLine = 0; srcLine < hardLines.length; srcLine++) {
      const lineText = hardLines[srcLine]!
      const layout = this.engine.computeLayoutWithLines(lineText)
      const lines = layout.lines ?? []

      const lineNumInfo: LineNumberInfo = {
        lineNumber: srcLine + 1,
        y,
        visualLineCount: lines.length || 1,
        height: layout.height || lineHeight,
      }
      lineNumbers.push(lineNumInfo)

      if (lines.length === 0) {
        // Empty line
        visualLines.push({
          index: visualLines.length,
          text: '',
          width: 0,
          y,
          sourceLine: srcLine,
          startOffset: globalOffset,
          endOffset: globalOffset,
        })
        y += lineHeight
      } else {
        let lineStartOffset = globalOffset
        for (let vl = 0; vl < lines.length; vl++) {
          const line = lines[vl]!
          const endOffset = lineStartOffset + line.text.length
          visualLines.push({
            index: visualLines.length,
            text: line.text,
            width: line.width,
            y,
            sourceLine: srcLine,
            startOffset: lineStartOffset,
            endOffset,
          })
          lineStartOffset = endOffset
          y += lineHeight
        }
      }

      // +1 for the '\n' character (except last line)
      globalOffset += lineText.length
      if (srcLine < hardLines.length - 1) {
        globalOffset += 1 // '\n'
      }
    }

    this.visualLines = visualLines
    this.lineNumbers = lineNumbers
    this.totalHeight = y
  }

  // --------------------------------------------------------
  // Cursor Positioning
  // --------------------------------------------------------

  /**
   * Convert a text offset to pixel coordinates.
   * Returns the cursor position (x, y) for rendering a blinking cursor.
   */
  offsetToPosition(offset: number): CursorPosition {
    const clamped = Math.max(0, Math.min(offset, this.text.length))
    const lineHeight = this.engine.getConfig().lineHeight

    // Find which visual line contains this offset
    const vl = this.findVisualLineByOffset(clamped)

    if (!vl) {
      return { offset: clamped, visualLine: 0, x: 0, y: 0, lineHeight }
    }

    // Compute X by measuring the substring up to the offset
    const localOffset = clamped - vl.startOffset
    const prefix = vl.text.slice(0, localOffset)

    let x = 0
    if (prefix.length > 0) {
      const prefixLayout = this.engine.computeLayout(prefix)
      // For single-line prefix, width ≈ height / lineHeight * avgCharWidth
      // But more accurately, use computeLayoutWithLines
      const prefixLines = this.engine.computeLayoutWithLines(prefix)
      const lastLine = prefixLines.lines?.[prefixLines.lines.length - 1]
      x = lastLine?.width ?? 0
    }

    return {
      offset: clamped,
      visualLine: vl.index,
      x,
      y: vl.y,
      lineHeight,
    }
  }

  /**
   * Convert pixel coordinates (from a click event) to a text offset.
   * This is the reverse of offsetToPosition().
   */
  xyToOffset(x: number, y: number): number {
    const lineHeight = this.engine.getConfig().lineHeight

    // Find which visual line was clicked
    const visualLineIdx = Math.floor(y / lineHeight)
    const vl = this.visualLines[Math.max(0, Math.min(visualLineIdx, this.visualLines.length - 1))]

    if (!vl) return 0

    // Binary search for the character at x position
    const lineText = vl.text
    if (lineText.length === 0) return vl.startOffset

    // Binary search: find the offset where measured width crosses x
    let lo = 0
    let hi = lineText.length

    while (lo < hi) {
      const mid = (lo + hi) >>> 1
      const prefix = lineText.slice(0, mid + 1)
      const layout = this.engine.computeLayoutWithLines(prefix)
      const lastLine = layout.lines?.[layout.lines.length - 1]
      const w = lastLine?.width ?? 0

      if (w <= x) {
        lo = mid + 1
      } else {
        hi = mid
      }
    }

    // Fine-tune: check if click is closer to lo or lo-1
    if (lo > 0 && lo <= lineText.length) {
      const prefixPrev = lineText.slice(0, lo - 1)
      const prefixCurr = lineText.slice(0, lo)
      const layoutPrev = this.engine.computeLayoutWithLines(prefixPrev)
      const layoutCurr = this.engine.computeLayoutWithLines(prefixCurr)
      const wPrev = layoutPrev.lines?.[layoutPrev.lines.length - 1]?.width ?? 0
      const wCurr = layoutCurr.lines?.[layoutCurr.lines.length - 1]?.width ?? 0

      if (x - wPrev < wCurr - x) {
        lo = lo - 1
      }
    }

    return vl.startOffset + Math.min(lo, lineText.length)
  }

  // --------------------------------------------------------
  // Selection
  // --------------------------------------------------------

  /**
   * Compute selection highlight rectangles for a text range.
   * Returns one rect per visual line that intersects the selection.
   */
  getSelectionRects(start: number, end: number): Rect[] {
    if (start === end) return []
    const s = Math.min(start, end)
    const e = Math.max(start, end)
    const lineHeight = this.engine.getConfig().lineHeight
    const maxWidth = this.engine.getConfig().maxWidth
    const rects: Rect[] = []

    for (const vl of this.visualLines) {
      // Skip lines outside selection
      if (vl.endOffset <= s) continue
      if (vl.startOffset >= e) break

      // Compute the intersection
      const selStart = Math.max(s, vl.startOffset)
      const selEnd = Math.min(e, vl.endOffset)

      // Measure x coordinates
      const localStart = selStart - vl.startOffset
      const localEnd = selEnd - vl.startOffset

      let x1 = 0
      if (localStart > 0) {
        const prefix = vl.text.slice(0, localStart)
        const layout = this.engine.computeLayoutWithLines(prefix)
        x1 = layout.lines?.[layout.lines.length - 1]?.width ?? 0
      }

      let x2: number
      if (localEnd >= vl.text.length) {
        // Selection extends to end of line — extend to maxWidth for visual clarity
        x2 = vl.text.length > 0 ? vl.width : 0
        // If selection spans to next line, extend rect to fill the line
        if (selEnd > vl.endOffset || (selEnd === vl.endOffset && e > vl.endOffset)) {
          x2 = Math.max(x2, maxWidth)
        }
      } else {
        const prefix = vl.text.slice(0, localEnd)
        const layout = this.engine.computeLayoutWithLines(prefix)
        x2 = layout.lines?.[layout.lines.length - 1]?.width ?? 0
      }

      if (x2 > x1 || (x1 === 0 && x2 === 0 && selStart < selEnd)) {
        rects.push({
          x: x1,
          y: vl.y,
          width: Math.max(x2 - x1, 4), // min 4px for visibility on empty lines
          height: lineHeight,
        })
      }
    }

    return rects
  }

  // --------------------------------------------------------
  // Line Information
  // --------------------------------------------------------

  /** Get all visual lines */
  getVisualLines(): readonly VisualLineInfo[] {
    return this.visualLines
  }

  /** Get visual line count (total lines including wrapped) */
  getVisualLineCount(): number {
    return this.visualLines.length
  }

  /** Get source line count (hard lines from \n) */
  getSourceLineCount(): number {
    return this.hardLines.length
  }

  /**
   * Get line number info for rendering line numbers.
   * Each entry represents a source line with its Y position
   * and how many visual lines it spans (for proper alignment).
   */
  getLineNumbers(): readonly LineNumberInfo[] {
    return this.lineNumbers
  }

  /** Get total content height in pixels */
  getTotalHeight(): number {
    return this.totalHeight
  }

  /**
   * Get the source line number for a given text offset.
   * Returns 1-based line number.
   */
  getLineNumberAtOffset(offset: number): number {
    const vl = this.findVisualLineByOffset(offset)
    return vl ? vl.sourceLine + 1 : 1
  }

  /**
   * Get the visual line at a given Y coordinate.
   */
  getVisualLineAtY(y: number): VisualLineInfo | null {
    const lineHeight = this.engine.getConfig().lineHeight
    const idx = Math.floor(y / lineHeight)
    return this.visualLines[idx] ?? null
  }

  /**
   * Get all visual lines for a given source line.
   */
  getVisualLinesForSourceLine(sourceLine: number): VisualLineInfo[] {
    return this.visualLines.filter(vl => vl.sourceLine === sourceLine)
  }

  // --------------------------------------------------------
  // Word boundary utilities (for double-click word selection)
  // --------------------------------------------------------

  /**
   * Find word boundaries at a given offset.
   * Returns [start, end] offsets of the word.
   */
  getWordBoundary(offset: number): [number, number] {
    const text = this.text
    if (text.length === 0) return [0, 0]
    const clamped = Math.max(0, Math.min(offset, text.length - 1))

    // Check if at a word character
    const isWordChar = (ch: number) =>
      (ch >= 0x30 && ch <= 0x39) ||  // 0-9
      (ch >= 0x41 && ch <= 0x5A) ||  // A-Z
      (ch >= 0x61 && ch <= 0x7A) ||  // a-z
      ch === 0x5F ||                  // _
      ch > 0x7F                       // non-ASCII (CJK etc.)

    const ch = text.charCodeAt(clamped)
    if (!isWordChar(ch)) {
      // Not a word char — select just this character
      return [clamped, clamped + 1]
    }

    let start = clamped
    while (start > 0 && isWordChar(text.charCodeAt(start - 1))) start--

    let end = clamped
    while (end < text.length && isWordChar(text.charCodeAt(end))) end++

    return [start, end]
  }

  // --------------------------------------------------------
  // Internal helpers
  // --------------------------------------------------------

  /**
   * Find the visual line containing a given text offset.
   * Uses binary search for O(log n) performance.
   */
  private findVisualLineByOffset(offset: number): VisualLineInfo | null {
    const lines = this.visualLines
    if (lines.length === 0) return null

    let lo = 0
    let hi = lines.length - 1

    while (lo < hi) {
      const mid = (lo + hi + 1) >>> 1
      if (lines[mid]!.startOffset <= offset) {
        lo = mid
      } else {
        hi = mid - 1
      }
    }

    return lines[lo] ?? null
  }
}
