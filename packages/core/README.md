# @pre-markdown/core

<div align="center">

**Core foundation for the PreMarkdown engine** — AST types, builders, visitors, event system, and plugin architecture.

[![npm version](https://img.shields.io/npm/v/@pre-markdown/core)](https://www.npmjs.com/package/@pre-markdown/core)
[![npm downloads](https://img.shields.io/npm/dm/@pre-markdown/core)](https://www.npmjs.com/package/@pre-markdown/core)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5+-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

---

## Overview

`@pre-markdown/core` is the foundation package of the [PreMarkdown](https://github.com/Leo555/pre-markdown) engine. It provides:

- **AST Type System** — Complete TypeScript type definitions for all Markdown AST nodes (40+ node types)
- **AST Builders** — Factory functions for creating type-safe AST nodes
- **AST Visitors** — Utilities for traversing, querying, and transforming AST trees
- **Event System** — Type-safe event bus for inter-layer communication
- **Plugin System** — Extensible plugin architecture for custom parsing, rendering, and AST transforms
- **Built-in Plugins** — Ready-to-use plugins for KaTeX, Mermaid, and syntax highlighting

This package has **zero runtime dependencies** and serves as the shared foundation for `@pre-markdown/parser`, `@pre-markdown/renderer`, and `@pre-markdown/layout`.

## Installation

```bash
npm install @pre-markdown/core
```

```bash
pnpm add @pre-markdown/core
```

```bash
yarn add @pre-markdown/core
```

## Quick Start

```typescript
import {
  createDocument,
  createHeading,
  createParagraph,
  createText,
  createStrong,
  walk,
  findAll,
  getTextContent,
} from '@pre-markdown/core'
import type { Document, Heading, ASTNode } from '@pre-markdown/core'

// Build an AST programmatically
const doc: Document = createDocument([
  createHeading(1, [createText('Hello World')]),
  createParagraph([
    createText('This is '),
    createStrong([createText('bold')]),
    createText(' text.'),
  ]),
])

// Walk the AST
walk(doc, (node, parent, index) => {
  console.log(node.type)
})

// Find all headings
const headings = findAll(doc, (n): n is Heading => n.type === 'heading')
headings.forEach(h => {
  console.log(`H${h.depth}: ${getTextContent(h.children)}`)
})
```

## API Reference

### AST Types

The type system covers **16 block-level** and **24 inline-level** node types:

#### Block Nodes

| Type | Description | Key Fields |
|------|-------------|------------|
| `Document` | Root node | `children: BlockNode[]` |
| `Heading` | ATX / Setext heading | `depth: 1-6`, `children` |
| `Paragraph` | Paragraph | `children: InlineNode[]` |
| `Blockquote` | Block quote | `children: BlockNode[]` |
| `List` | Ordered / unordered list | `ordered`, `start`, `spread` |
| `ListItem` | List item | `checked?`, `spread`, `children` |
| `CodeBlock` | Fenced / indented code | `lang?`, `meta?`, `value` |
| `ThematicBreak` | Horizontal rule | — |
| `HtmlBlock` | Raw HTML block | `value` |
| `Table` | GFM table | `align[]`, `children: TableRow[]` |
| `TableRow` | Table row | `isHeader`, `children: TableCell[]` |
| `TableCell` | Table cell | `children: InlineNode[]` |
| `MathBlock` | `$$...$$` math block | `value` |
| `Container` | `:::info` custom block | `kind`, `title?`, `children` |
| `Details` | Collapsible block | `summary`, `children` |
| `TOC` | Table of contents placeholder | — |
| `FootnoteDefinition` | Footnote definition | `identifier`, `label`, `children` |

#### Inline Nodes

| Type | Description | Key Fields |
|------|-------------|------------|
| `Text` | Plain text | `value` |
| `Emphasis` | `*italic*` | `children` |
| `Strong` | `**bold**` | `children` |
| `Strikethrough` | `~~del~~` | `children` |
| `InlineCode` | `` `code` `` | `value` |
| `Link` | `[text](url)` | `url`, `title?`, `children` |
| `Image` | `![alt](url)` | `url`, `alt`, `title?`, `width?`, `height?` |
| `Break` | Hard line break | — |
| `SoftBreak` | Soft line break | — |
| `MathInline` | `$E=mc^2$` | `value` |
| `Highlight` | `==text==` | `children` |
| `Superscript` | `^text^` | `children` |
| `Subscript` | `~text~` | `children` |
| `FontColor` | `!!red text!!` | `color`, `children` |
| `FontSize` | `!12 text!` | `size`, `children` |
| `FontBgColor` | `!!!yellow text!!!` | `color`, `children` |
| `Ruby` | `{漢字\|かんじ}` | `base`, `annotation` |
| `Emoji` | `:smile:` | `shortcode`, `value` |
| `Audio` | `!audio[title](url)` | `url`, `title?` |
| `Video` | `!video[title](url)` | `url`, `title?` |
| `Autolink` | `<url>` | `url`, `isEmail` |
| `Underline` | `/text/` | `children` |
| `HtmlInline` | Inline HTML | `value` |
| `FootnoteReference` | `[^id]` | `identifier`, `label` |

### AST Builders

Every node type has a corresponding `create*` factory function:

```typescript
import {
  createDocument,
  createHeading,
  createParagraph,
  createText,
  createEmphasis,
  createStrong,
  createLink,
  createImage,
  createCodeBlock,
  createList,
  createListItem,
  createTable,
  createTableRow,
  createTableCell,
  // ... 30+ builders
} from '@pre-markdown/core'
```

### AST Visitors

```typescript
import { walk, findAll, findFirst, isBlockNode, isInlineNode, getTextContent } from '@pre-markdown/core'
```

#### `walk(root, visitor)`

Depth-first traversal of the AST. Return `false` from the visitor to stop traversal.

```typescript
walk(doc, (node, parent, index) => {
  if (node.type === 'link') {
    console.log('Found link:', node.url)
  }
})
```

#### `findAll(root, predicate)`

Find all nodes matching a type-guard predicate.

```typescript
import type { Link } from '@pre-markdown/core'

const links = findAll(doc, (n): n is Link => n.type === 'link')
```

#### `findFirst(root, predicate)`

Find the first node matching a predicate.

```typescript
const firstHeading = findFirst(doc, (n): n is Heading => n.type === 'heading')
```

#### `getTextContent(nodes)`

Extract plain text from an inline node tree.

```typescript
const heading = findFirst(doc, (n): n is Heading => n.type === 'heading')
if (heading) {
  const text = getTextContent(heading.children) // "Hello World"
}
```

#### `isBlockNode(node)` / `isInlineNode(node)`

Type guards for block-level and inline-level nodes.

### Event System

Type-safe event bus for communication between parsing, layout, and rendering layers.

```typescript
import { EventBus } from '@pre-markdown/core'
import type { EditorEvents } from '@pre-markdown/core'

const bus = new EventBus<EditorEvents>()

// Subscribe (returns unsubscribe function)
const unsubscribe = bus.on('parse:done', ({ documentId, duration }) => {
  console.log(`Parsed doc #${documentId} in ${duration}ms`)
})

// One-time listener
bus.once('content:change', (data) => {
  console.log('First change:', data)
})

// Emit
bus.emit('parse:done', { documentId: 1, duration: 0.5 })

// Unsubscribe
unsubscribe()

// Remove all handlers
bus.off()
```

#### Built-in Event Types

| Event | Payload | Description |
|-------|---------|-------------|
| `content:change` | `{ text, from, to, inserted }` | Content changed |
| `parse:done` | `{ documentId, duration }` | Parse completed |
| `layout:done` | `{ lineCount, duration }` | Layout computed |
| `render:done` | `{ nodeCount, duration }` | Render completed |
| `scroll:change` | `{ scrollTop, scrollLeft }` | Scroll position changed |
| `selection:change` | `{ from, to }` | Selection changed |
| `editor:focus` | `void` | Editor gained focus |
| `editor:blur` | `void` | Editor lost focus |

### Plugin System

Extend PreMarkdown with custom parsing, AST transforms, and rendering.

```typescript
import { PluginManager } from '@pre-markdown/core'
import type { Plugin } from '@pre-markdown/core'

// Define a plugin
const myPlugin: Plugin = {
  name: 'my-plugin',

  // Custom block parsing
  blockParse: (ctx) => {
    if (ctx.line.startsWith(':::chart')) {
      // consume lines...
      return linesConsumed
    }
    return 0
  },

  // Custom inline parsing (keyed by trigger char code)
  inlineParse: {
    64: (ctx) => { // '@' character
      const match = ctx.input.slice(ctx.pos).match(/^@(\w+)/)
      if (!match) return null
      return {
        node: createLink('/' + match[1], [createText('@' + match[1])]),
        end: ctx.pos + match[0].length,
      }
    },
  },

  // AST transform (runs after parsing, before rendering)
  transform: (doc) => {
    // Modify the AST...
    return doc
  },

  // Custom rendering (keyed by node type)
  render: {
    mathBlock: ({ node }) => `<div class="math">${katex.renderToString(node.value)}</div>`,
  },
}

// Register plugins
const manager = new PluginManager()
manager.use(myPlugin)
```

### Built-in Plugins

```typescript
import { createKatexPlugin, createMermaidPlugin, createHighlightPlugin } from '@pre-markdown/core'

// KaTeX math rendering
const katexPlugin = createKatexPlugin({
  renderer: (latex, displayMode) => katex.renderToString(latex, { displayMode }),
})

// Mermaid diagram rendering
const mermaidPlugin = createMermaidPlugin({
  renderer: (code, id) => `<div class="mermaid" id="${id}">${code}</div>`,
})

// Syntax highlighting
const highlightPlugin = createHighlightPlugin({
  highlight: (code, lang) => hljs.highlight(code, { language: lang }).value,
})
```

## Module Format

| Format | Entry |
|--------|-------|
| ESM | `dist/index.js` |
| CJS | `dist/index.cjs` |
| Types | `dist/index.d.ts` |

All exports are **tree-shakeable** — import only what you need.

## Related Packages

| Package | Description |
|---------|-------------|
| [@pre-markdown/parser](https://www.npmjs.com/package/@pre-markdown/parser) | Markdown → AST parser |
| [@pre-markdown/renderer](https://www.npmjs.com/package/@pre-markdown/renderer) | AST → HTML renderer |
| [@pre-markdown/layout](https://www.npmjs.com/package/@pre-markdown/layout) | Pretext-based layout engine |

## License

[MIT](https://github.com/Leo555/pre-markdown/blob/master/LICENSE) © 2024-2026 PreMarkdown Contributors
