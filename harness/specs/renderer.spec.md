# Renderer Spec

## Overview
The renderer transforms AST nodes into DOM elements (HTML strings or live DOM nodes).

## Rendering Pipeline
```
Document AST → Block Renderer → Inline Renderer → HTML String / DOM Nodes
```

## Supported Output Modes
1. **HTML String**: For server-side rendering and initial render
2. **DOM Nodes**: For client-side differential updates
3. **Canvas**: (Future) For high-performance rendering

## Differential Update
When the AST changes (incremental parse):
1. Diff old AST vs new AST (by node ID)
2. Generate minimal set of DOM operations
3. Apply patches to existing DOM
4. Preserve scroll position and selection

## HTML Sanitization
- Default: sanitize all HTML output
- Configurable whitelist for HTML pass-through
- XSS prevention via HTML entity encoding

## Performance Targets
- First render (1K lines): < 50ms
- Incremental update (single char): < 16ms (60fps)
- Scroll rendering: 60fps consistent
- Virtual scroll 100K lines: smooth
