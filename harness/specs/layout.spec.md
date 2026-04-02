# Layout Engine Spec

## Overview
The layout engine integrates `@chenglou/pretext` to provide high-performance text measurement and line breaking without DOM reflow.

## Architecture

### pretext Integration
```
Text Content → prepare(text, font) → PreparedText (cached)
PreparedText → layout(prepared, maxWidth, lineHeight) → { height, lineCount }
PreparedText → layoutWithLines(prepared, maxWidth, lineHeight) → { lines[] }
```

### Cache Strategy
- **PreparedText Cache**: Keyed by `(text, font)` pair
- **Invalidation**: Only when source text or font changes
- **LRU eviction**: Configurable max cache size

### Virtual Layout
- Only compute layout for visible viewport + buffer
- Buffer: 2x viewport above and below for smooth scrolling
- Recalculate on scroll, resize, or content change

## Performance Targets
- `prepare()` 500 paragraphs: ~19ms
- `layout()` 500 paragraphs: ~0.09ms
- Viewport layout: < 1ms
- Window resize: < 5ms

## API Surface
- `computeLayout(text): LayoutResult`
- `computeLayoutWithLines(text): LayoutResult`
- `computeViewportLayout(text, scrollTop, viewportHeight): ViewportLayoutResult`
- `invalidateCache(key?): void`
- `updateConfig(config): void`
