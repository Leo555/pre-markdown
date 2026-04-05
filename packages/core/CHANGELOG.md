# @pre-markdown/core

## 0.2.1

### Patch Changes

- Add detailed README documentation for all packages

## 0.2.0

### Minor Changes

- 8807ee4: Initial release of PreMarkdown — high-performance Markdown engine powered by @chenglou/pretext zero-DOM-reflow layout.

  ### @pre-markdown/core
  - AST type system with 38+ node types (16 block + 22+ inline)
  - AST builders, visitors (walk/findAll/findFirst), type guards
  - EventBus type-safe event system

  ### @pre-markdown/parser
  - High-performance Markdown parser (Parse 1KB < 0.3ms)
  - Incremental parsing with FNV-1a fingerprinting and LRU cache
  - CommonMark 64.1% compatibility (418/652)
  - GFM extensions: tables, strikethrough, task lists, footnotes
  - Cherry-compatible syntax: color, size, ruby, emoji, audio/video

  ### @pre-markdown/renderer
  - AST → HTML renderer with XSS sanitization
  - Plugin-compatible highlight callback for code blocks
  - Single-pass escapeHtml/escapeAttr for maximum performance

  ### @pre-markdown/layout
  - Pretext-based zero-DOM-reflow text layout engine
  - CursorEngine: xy→offset, offset→position, selection rects
  - LayoutEngine: prepare/layout/viewport virtualization
  - LRU cache (512 PreparedText + 256 WithSegments)
  - Web Worker offline prepare() for non-blocking large documents
  - VirtualList: dynamic-height virtual scrolling with O(log n) hit test
