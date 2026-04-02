# Layout Engine Spec

## Overview
The layout engine integrates `@chenglou/pretext` to provide high-performance text measurement and line breaking without DOM reflow.

## Architecture

### pretext Integration
```
Text Content → prepare(text, font, options?) → PreparedText (cached via LRU)
PreparedText → layout(prepared, maxWidth, lineHeight) → { height, lineCount }

Text Content → prepareWithSegments(text, font, options?) → PreparedTextWithSegments (cached)
PreparedTextWithSegments → layoutWithLines(prepared, maxWidth, lineHeight) → { height, lineCount, lines[] }
```

### Pluggable Backend
The LayoutEngine accepts a `MeasurementBackend` interface, allowing:
- **Real pretext** (default): Uses `@chenglou/pretext` with Canvas API (browser)
- **Fallback backend**: Character-count heuristic for Node.js testing
- **Custom backends**: Any implementation matching `MeasurementBackend`

### Cache Strategy
- **LRU Cache**: 512 entries for PreparedText, 256 for PreparedTextWithSegments
- **Key**: `(font, whiteSpace, text)` triple
- **Invalidation**:
  - Font change → clear all
  - Locale change → clear all
  - Specific text change → delete single entry
  - Backend swap → clear all

### Virtual Layout
- Only compute layout for visible viewport + configurable buffer
- Default buffer: 2x viewport height above and below
- `computeViewportLayout()` returns visible lines with Y positions
- `hitTest()` maps scrollTop → (paragraphIndex, lineIndex)

### Multi-paragraph Layout
- `computeDocumentLayout(paragraphs[])` → cumulative offsets + heights
- Enables efficient virtual scrolling over large documents
- Each paragraph prepared/cached independently

## Performance Targets
- `prepare()` 500 paragraphs: ~19ms (pretext specification)
- `layout()` 500 paragraphs: ~0.09ms (pure arithmetic)
- Viewport layout: < 1ms
- Window resize: < 5ms (only re-run layout(), not prepare())

## API Surface

### LayoutEngine Constructor
```typescript
new LayoutEngine(config: LayoutConfig, backend?: MeasurementBackend)
```

### Core Methods
- `computeLayout(text): LayoutResult` — height + lineCount
- `computeLayoutWithLines(text): LayoutResult` — + per-line info
- `computeViewportLayout(text, scrollTop, viewportHeight): ViewportLayoutResult`
- `computeDocumentLayout(paragraphs[]): { totalHeight, offsets[], heights[] }`
- `hitTest(paragraphs[], scrollTop): { paragraphIndex, lineIndex } | null`

### Configuration
- `updateConfig(partial): void` — update config, clears cache on font change
- `getConfig(): LayoutConfig`
- `setBackend(backend): void` — replace measurement backend
- `setLocale(locale?): void` — set text segmentation locale

### Cache Management
- `invalidateCache(text?): void` — invalidate specific or all
- `clearAllCaches(): void` — clear LRU + pretext internal
- `getCacheStats(): { preparedSize, segmentSize }`

## Types

```typescript
interface LayoutConfig {
  font: string           // CSS font (e.g., '16px Inter')
  lineHeight: number     // pixels
  maxWidth: number       // pixels
  whiteSpace?: 'normal' | 'pre-wrap'
  viewportBuffer?: number // multiplier (default 2)
}

interface LayoutResult {
  height: number
  lineCount: number
  lines?: LayoutLine[]
}

interface LayoutLine {
  text: string
  width: number
  y: number
  sourceIndex: number
}

interface ViewportLayoutResult {
  visibleLines: LayoutLine[]
  totalHeight: number
  startY: number
  startIndex: number
  endIndex: number
}
```
