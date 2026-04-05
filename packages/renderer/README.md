# @pre-markdown/renderer

<div align="center">

**High-performance AST → HTML renderer** — Safe, extensible, with both string and DOM output modes.

[![npm version](https://img.shields.io/npm/v/@pre-markdown/renderer)](https://www.npmjs.com/package/@pre-markdown/renderer)
[![npm downloads](https://img.shields.io/npm/dm/@pre-markdown/renderer)](https://www.npmjs.com/package/@pre-markdown/renderer)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5+-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

---

## Overview

`@pre-markdown/renderer` converts [PreMarkdown](https://github.com/Leo555/pre-markdown) AST into HTML. It provides:

- **Two Render Modes** — `renderToHtml()` for HTML strings, `renderToDOM()` for direct DOM nodes
- **XSS Protection** — Enabled by default: sanitizes URLs, HTML, and CSS injection
- **Syntax Highlighting** — Bring-your-own highlighter (highlight.js, Prism, Shiki, etc.)
- **Plugin Hooks** — Override rendering for any node type via the plugin system
- **Lazy Inline Resolution** — Works with `@pre-markdown/parser`'s lazy inline parsing mode
- **Zero-copy Fast Path** — Optimized `escapeHtml` with single-pass scan

## Installation

```bash
npm install @pre-markdown/renderer
```

```bash
pnpm add @pre-markdown/renderer
```

> **Note**: `@pre-markdown/core` is a dependency and will be installed automatically.

## Quick Start

### Basic Rendering

```typescript
import { parse } from '@pre-markdown/parser'
import { renderToHtml } from '@pre-markdown/renderer'

const html = renderToHtml(parse('# Hello **World**'))
// → <h1>Hello <strong>World</strong></h1>
```

### Safe Rendering (XSS Protection)

XSS protection is **enabled by default**. It sanitizes:
- `javascript:`, `vbscript:`, unsafe `data:` URLs
- Raw HTML blocks and inline HTML
- CSS injection via `expression()`, `url()`, `javascript:` in style attributes

```typescript
const html = renderToHtml(ast, { sanitize: true }) // default
```

To allow raw HTML passthrough (trusted content only):

```typescript
const html = renderToHtml(ast, { sanitize: false })
```

### Syntax Highlighting

```typescript
import hljs from 'highlight.js'

const html = renderToHtml(ast, {
  highlight: (code, lang) => {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value
    }
    return hljs.highlightAuto(code).value
  },
})
```

### DOM Rendering (No innerHTML)

For incremental updates, render directly to DOM nodes — skips the HTML → DOM parse step:

```typescript
import { renderToDOM } from '@pre-markdown/renderer'

const fragment = renderToDOM(ast)
document.getElementById('output')!.appendChild(fragment)
```

### Custom Heading IDs

```typescript
const html = renderToHtml(ast, {
  headingId: (text, depth) => text.toLowerCase().replace(/\s+/g, '-'),
})
// → <h1 id="hello-world">Hello World</h1>
```

### With Plugins

```typescript
import { PluginManager, createKatexPlugin } from '@pre-markdown/core'

const plugins = new PluginManager()
plugins.use(createKatexPlugin({
  renderer: (latex, displayMode) => katex.renderToString(latex, { displayMode }),
}))

const html = renderToHtml(ast, { plugins })
```

### Lazy Inline Parsing

When the parser uses `lazyInline: true`, inline content is stored as raw text and parsed on-demand during rendering:

```typescript
import { parse } from '@pre-markdown/parser'
import { parseInline } from '@pre-markdown/parser'
import { renderToHtml } from '@pre-markdown/renderer'

const ast = parse(markdown, { lazyInline: true })
const html = renderToHtml(ast, { inlineParser: parseInline })
```

## API Reference

### `renderToHtml(doc, options?)`

Render a Document AST to an HTML string.

```typescript
function renderToHtml(doc: Document, options?: RendererOptions): string
```

### `renderToDOM(doc, options?)`

Render a Document AST directly to a DOM `DocumentFragment`. Faster than `renderToHtml` + `innerHTML` for incremental updates.

```typescript
function renderToDOM(doc: Document, options?: RendererOptions): DocumentFragment
```

### `RendererOptions`

```typescript
interface RendererOptions {
  /** Sanitize HTML output — XSS protection (default: true) */
  sanitize?: boolean

  /** Syntax highlighting for code blocks */
  highlight?: (code: string, lang?: string) => string

  /** Custom heading ID generator (null = no id attribute, default: null) */
  headingId?: ((text: string, depth: number) => string) | null

  /** Base URL for relative links */
  baseUrl?: string

  /** Inline parser for lazy-parsed nodes (nodes with _raw) */
  inlineParser?: ((raw: string) => InlineNode[]) | null

  /** Plugin manager for render hooks */
  plugins?: PluginManager | null
}
```

## HTML Output Examples

| Markdown | HTML |
|----------|------|
| `# Heading` | `<h1>Heading</h1>` |
| `**bold**` | `<strong>bold</strong>` |
| `*italic*` | `<em>italic</em>` |
| `` `code` `` | `<code>code</code>` |
| `~~del~~` | `<del>del</del>` |
| `==mark==` | `<mark>mark</mark>` |
| `[link](url)` | `<a href="url">link</a>` |
| `![alt](img.png)` | `<img src="img.png" alt="alt" />` |
| `- [x] task` | `<li class="task-list-item"><input type="checkbox" checked disabled /> task</li>` |
| `$E=mc^2$` | `<span class="math-inline">E=mc^2</span>` |
| `:::info` | `<div class="container container-info">...</div>` |
| `:smile:` | 😄 |

## Security

The renderer provides **defense-in-depth** XSS protection:

| Layer | Protection |
|-------|-----------|
| **URL Sanitization** | Blocks `javascript:`, `vbscript:`, unsafe `data:` protocols |
| **HTML Escaping** | All text content is escaped (`<`, `>`, `&`, `"`) |
| **CSS Sanitization** | Strips `expression()`, `url()`, `javascript:` from style values |
| **HTML Block Escaping** | Raw HTML blocks are escaped when `sanitize: true` |
| **Attribute Encoding** | URL percent-encoding for non-ASCII characters |

## Performance

The renderer is optimized for speed:

- **Single-pass `escapeHtml`** — Zero intermediate strings, fast-path for clean input
- **Array join for block nodes** — Faster than `+=` concatenation for many nodes
- **String concat for inline nodes** — Faster than array join for few nodes
- **Lazy inline resolution** — Parse inline content only when rendering

| Benchmark | Result |
|-----------|--------|
| Render 1KB AST | **< 0.05ms** |
| Render 20KB AST | **< 0.3ms** |

## Module Format

| Format | Entry |
|--------|-------|
| ESM | `dist/index.js` |
| CJS | `dist/index.cjs` |
| Types | `dist/index.d.ts` |

## Related Packages

| Package | Description |
|---------|-------------|
| [@pre-markdown/core](https://www.npmjs.com/package/@pre-markdown/core) | AST types, visitors, events, plugins |
| [@pre-markdown/parser](https://www.npmjs.com/package/@pre-markdown/parser) | Markdown → AST parser |
| [@pre-markdown/layout](https://www.npmjs.com/package/@pre-markdown/layout) | Pretext-based layout engine |

## License

[MIT](https://github.com/Leo555/pre-markdown/blob/master/LICENSE) © 2024-2026 PreMarkdown Contributors
