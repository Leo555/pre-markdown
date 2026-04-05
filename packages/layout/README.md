# @pre-markdown/layout

Pretext-based zero-DOM-reflow text layout engine for the PreMarkdown ecosystem.

All text measurement and line-breaking calculations run through [@chenglou/pretext](https://github.com/chenglou/pretext) — **no DOM reads, no reflow, pure arithmetic**.

## Installation

```bash
npm install @pre-markdown/layout
```

> **Note**: `@chenglou/pretext` is a peer dependency and requires a Canvas-capable environment (browser or node-canvas). For Node.js testing, use `createFallbackBackend()`.

---

## Architecture

The layout engine uses a **two-phase pipeline**:

1. **`prepare()`** — One-time text analysis (~1–5ms per paragraph, cached via LRU)
2. **`layout()`** — Pure arithmetic line-breaking (~0.0002ms, safe to call every frame)

```
Text → prepare() → PreparedText [cached] → layout(maxWidth) → { height, lineCount, lines }
```

---

## Modules

| Module | Class/Function | Description |
|--------|---------------|-------------|
| **LayoutEngine** | `LayoutEngine` | Core text measurement & layout computation |
| **CursorEngine** | `CursorEngine` | Offset↔pixel cursor positioning, selection rectangles |
| **VirtualList** | `VirtualList` | Dynamic-height virtual scrolling with O(log n) lookup |
| **LineRenderer** | `LineRenderer` | Pretext-based line number rendering with soft-wrap alignment |
| **WorkerBackend** | `createWorkerBackend()` | Web Worker offloading for expensive `prepare()` calls |
| **FallbackBackend** | `createFallbackBackend()` | Character-width estimation backend for Node.js testing |

---

## LayoutEngine

Core layout engine. Wraps pretext's prepare/layout pipeline with LRU caching.

### Quick Start

```typescript
import { LayoutEngine } from '@pre-markdown/layout'

const engine = new LayoutEngine({
  font: '16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto',
  lineHeight: 24,
  maxWidth: 800,
})

// Basic layout
const { height, lineCount } = engine.computeLayout('Hello World')

// Layout with per-line detail
const result = engine.computeLayoutWithLines('A long paragraph...')
// result.lines → [{ text, width, y, sourceIndex }, ...]

// Viewport-only layout (for virtual scrolling)
const viewport = engine.computeViewportLayout(text, scrollTop, viewportHeight)

// Multi-paragraph document layout
const doc = engine.computeDocumentLayout(['Para 1', 'Para 2', 'Para 3'])
// doc.totalHeight, doc.paragraphOffsets, doc.paragraphHeights

// Incremental update (only recomputes changed paragraphs)
const updated = engine.updateDocumentLayout(paragraphs)
// updated.changedIndices → indices that were recomputed
```

### Configuration

```typescript
interface LayoutConfig {
  font: string          // CSS font string (e.g., '16px Inter')
  lineHeight: number    // Line height in pixels
  maxWidth: number      // Max width for text wrapping (px)
  whiteSpace?: 'normal' | 'pre-wrap'  // Default: 'normal'
  viewportBuffer?: number              // Viewport buffer multiplier (default: 2)
  codeFont?: string     // Font for code blocks (defaults to main font)
  codeLineHeight?: number // Line height for code blocks
}
```

### API

| Method | Description |
|--------|-------------|
| `computeLayout(text)` | Compute height and line count |
| `computeCodeLayout(text)` | Compute layout using code font |
| `computeLayoutWithLines(text)` | Compute layout with per-line detail |
| `computeViewportLayout(text, scrollTop, viewportHeight)` | Viewport-only visible lines |
| `computeDocumentLayout(paragraphs)` | Multi-paragraph layout with cumulative offsets |
| `hitTest(paragraphs, scrollTop)` | Find paragraph/line at scroll position |
| `updateDocumentLayout(paragraphs)` | Incremental document layout (reuses unchanged) |
| `getCachedTotalHeight()` | O(1) cached total height |
| `updateConfig(config)` | Update configuration (auto-clears cache on font change) |
| `setBackend(backend)` | Replace measurement backend |
| `invalidateCache(text?)` | Invalidate specific or all caches |
| `clearAllCaches()` | Clear all caches including pretext internal |
| `getCacheStats()` | Get `{ preparedSize, segmentSize }` |

---

## CursorEngine

Pixel-perfect cursor positioning and selection highlighting — all computed via pretext, zero DOM reflow.

### Quick Start

```typescript
import { LayoutEngine, CursorEngine } from '@pre-markdown/layout'

const engine = new LayoutEngine({ font: '16px Inter', lineHeight: 24, maxWidth: 800 })
const cursor = new CursorEngine(engine)

cursor.setText('Hello\nWorld with a very long line that wraps')

// Click → offset
const offset = cursor.xyToOffset(clickX, clickY)

// Offset → pixel position (for rendering blinking cursor)
const pos = cursor.offsetToPosition(offset)
// pos → { offset, visualLine, x, y, lineHeight }

// Selection rectangles (one per visual line)
const rects = cursor.getSelectionRects(selStart, selEnd)
// rects → [{ x, y, width, height }, ...]

// Line numbers (for gutter rendering)
const lineNums = cursor.getLineNumbers()
// lineNums → [{ lineNumber, y, visualLineCount, height }, ...]

// Word boundary (for double-click select)
const [start, end] = cursor.getWordBoundary(offset)
```

### API

| Method | Description |
|--------|-------------|
| `setText(text)` | Set text and compute all visual line info |
| `getText()` | Get current text |
| `recompute()` | Force recomputation (e.g., after width change) |
| `offsetToPosition(offset)` | Text offset → pixel `CursorPosition` |
| `xyToOffset(x, y)` | Pixel click → text offset (binary search) |
| `getSelectionRects(start, end)` | Compute selection highlight rectangles |
| `getVisualLines()` | Get all visual lines (including wrapped) |
| `getVisualLineCount()` | Total visual line count |
| `getSourceLineCount()` | Source (hard) line count |
| `getLineNumbers()` | Line number info for gutter rendering |
| `getTotalHeight()` | Total content height (px) |
| `getLineNumberAtOffset(offset)` | Get 1-based source line number |
| `getVisualLineAtY(y)` | Get visual line at Y coordinate |
| `getVisualLinesForSourceLine(n)` | Get all visual lines for source line |
| `getWordBoundary(offset)` | Get `[start, end]` word boundary |

### Types

```typescript
interface CursorPosition {
  offset: number       // Text offset
  visualLine: number   // Visual line index (0-based)
  x: number           // X pixel coordinate
  y: number           // Y pixel coordinate
  lineHeight: number  // Line height in px
}

interface VisualLineInfo {
  index: number        // Visual line index
  text: string         // Line text content
  width: number        // Measured width (px)
  y: number            // Y offset from top
  sourceLine: number   // Source (hard) line index
  startOffset: number  // Start offset in source text
  endOffset: number    // End offset (exclusive)
}

interface LineNumberInfo {
  lineNumber: number      // 1-based source line number
  y: number               // Y position of first visual line
  visualLineCount: number // Visual lines this source line spans
  height: number          // Total height of all visual lines
}
```

---

## VirtualList

Dynamic-height virtual scrolling powered by pretext precise measurement. Unlike typical virtual lists that estimate heights, every item is measured exactly.

### Quick Start

```typescript
import { LayoutEngine, VirtualList } from '@pre-markdown/layout'

const engine = new LayoutEngine({ font: '16px Inter', lineHeight: 24, maxWidth: 800 })
const list = new VirtualList({ engine, viewportHeight: 600, overscan: 5 })

// Set items (measures all heights via pretext)
list.setItems(['Paragraph 1...', 'Paragraph 2...', /* thousands more */])

// On scroll: compute visible range (O(log n) binary search)
const range = list.setScrollTop(scrollY)
// range → { startIndex, endIndex, items, totalHeight, offsetY }

// Incremental update (only remeasures changed items)
const changed = list.updateItems(updatedTexts)

// Scroll to item
list.scrollToItem(42, 'center')

// Hit test
const index = list.hitTest(clickY)

// Viewport change callback
list.onViewport((range) => renderVisibleItems(range.items))
```

### API

| Method | Description |
|--------|-------------|
| `setItems(texts)` | Set all items, measure all heights |
| `updateItems(texts)` | Incremental update, returns changed indices |
| `setScrollTop(y)` | Set scroll position, compute visible range |
| `getScrollTop()` | Get current scroll position |
| `setViewportHeight(h)` | Update viewport height |
| `scrollToItem(index, align?)` | Scroll to item (`'start'` / `'center'` / `'end'`) |
| `onViewport(callback)` | Register viewport change callback |
| `computeViewport()` | Compute current visible range |
| `hitTest(y)` | Y → item index (-1 if out of bounds) |
| `hitTestDetailed(y)` | Y → `{ index, localY }` |
| `relayout()` | Full remeasure (e.g., after maxWidth change) |
| `getTotalHeight()` | Total scroll height |
| `getItemCount()` | Number of items |
| `getItemHeight(i)` | Height of item at index |
| `getItemOffset(i)` | Y offset of item at index |

---

## LineRenderer

Renders line numbers with correct alignment for soft-wrapped text. Supports virtual rendering for large documents (>1000 lines).

### Quick Start

```typescript
import { LayoutEngine, CursorEngine, LineRenderer } from '@pre-markdown/layout'

const engine = new LayoutEngine({ font: '16px Inter', lineHeight: 24, maxWidth: 800 })
const cursor = new CursorEngine(engine)
cursor.setText(editorContent)

const lineRenderer = new LineRenderer({
  cursor,
  container: document.getElementById('line-numbers')!,
  lineHeight: 24,
  activeClass: 'active-line',
})

// Initial render
lineRenderer.render()

// Update active line on cursor move
lineRenderer.setActiveLine(currentLineNumber)

// Update on scroll (virtual rendering for >1000 lines)
lineRenderer.updateScroll(scrollTop, viewportHeight)

// Update after text changes
lineRenderer.update()

// Cleanup
lineRenderer.dispose()
```

### API

| Method | Description |
|--------|-------------|
| `render()` | Full render (auto-switches to virtual mode for >1000 lines) |
| `setActiveLine(n)` | Set active line (1-based), highlights in gutter |
| `getActiveLine()` | Get current active line number |
| `updateScroll(scrollTop, viewportHeight)` | Update scroll position for virtual rendering |
| `update()` | Re-render after text changes |
| `getWrapInfo()` | Array of visual line counts per source line |
| `isLineWrapped(sourceLine)` | Check if source line is soft-wrapped |
| `getTotalVisualLines()` | Total visual line count |
| `dispose()` | Clean up resources |

---

## WorkerBackend

Offloads expensive `prepare()` calls to a Web Worker, keeping the main thread free for rendering.

### Quick Start

```typescript
import { LayoutEngine, createWorkerBackend } from '@pre-markdown/layout'

const backend = createWorkerBackend()
const engine = new LayoutEngine(config, backend)

// Bulk prepare paragraphs in background (non-blocking)
await backend.prepareAsync(paragraphs, font)

// After prepareAsync, computeLayout() hits cache — synchronous & instant
const { height } = engine.computeLayout(text)

// Clean up when done
backend.terminate()
```

### API

| Method | Description |
|--------|-------------|
| `prepareAsync(texts, font, options?)` | Async bulk prepare via Worker (batch size: 50) |
| `prepareWithSegmentsAsync(texts, font, options?)` | Async bulk prepare with segments |
| `isAlive` | Whether the Worker is alive |
| `terminate()` | Terminate Worker, sync methods fall back to main thread |

> All synchronous `MeasurementBackend` methods (`prepare`, `layout`, etc.) are also available and use main-thread pretext with caching.

---

## MeasurementBackend Interface

Pluggable interface for swapping measurement implementations:

```typescript
interface MeasurementBackend {
  prepare(text: string, font: string, options?: PrepareOptions): PreparedText
  prepareWithSegments(text: string, font: string, options?: PrepareOptions): PreparedTextWithSegments
  layout(prepared: PreparedText, maxWidth: number, lineHeight: number): LayoutResult
  layoutWithLines(prepared: PreparedTextWithSegments, maxWidth: number, lineHeight: number): LayoutLinesResult
  clearCache(): void
  setLocale(locale?: string): void
}
```

### Built-in Backends

| Backend | Environment | Description |
|---------|-------------|-------------|
| Default (pretext) | Browser | Real `@chenglou/pretext` with Canvas measurement |
| `createFallbackBackend(avgCharWidth?)` | Node.js / Test | Character-count heuristic estimation |
| `createWorkerBackend(url?)` | Browser | Worker-offloaded prepare() + main-thread layout() |

---

## Performance

| Metric | Target | Description |
|--------|--------|-------------|
| `prepare()` 500 paragraphs | ≤ 19ms | One-time, cached via LRU (512 capacity) |
| `layout()` 500 paragraphs | ≤ 0.09ms | Pure arithmetic, no DOM |
| Viewport layout | < 1ms | Only visible lines computed |
| Window resize relayout | < 5ms | — |
| Cursor positioning | < 0.5ms | vs DOM `getBoundingClientRect` ~5ms |
| VirtualList 10K items | < 16ms/frame | Binary search O(log n) |

---

## License

[MIT](../../LICENSE)
