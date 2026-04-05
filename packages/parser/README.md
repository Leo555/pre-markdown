# @pre-markdown/parser

<div align="center">

**High-performance incremental Markdown parser** — Markdown → AST with block-level caching and sub-millisecond updates.

[![npm version](https://img.shields.io/npm/v/@pre-markdown/parser)](https://www.npmjs.com/package/@pre-markdown/parser)
[![npm downloads](https://img.shields.io/npm/dm/@pre-markdown/parser)](https://www.npmjs.com/package/@pre-markdown/parser)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5+-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

---

## Overview

`@pre-markdown/parser` is the parsing engine of [PreMarkdown](https://github.com/Leo555/pre-markdown). It converts Markdown text into a structured AST (Abstract Syntax Tree) and supports:

- **Full Markdown Parsing** — CommonMark compliant, with GFM and extended syntax support
- **Incremental Parsing** — Only reparse changed blocks on edits (< 1ms response time)
- **Block + Inline Architecture** — Two-pass pipeline: block structure → inline content
- **Lazy Inline Parsing** — Defer inline parsing to render time for faster initial parse
- **First-char Fast Path** — Skip impossible syntax rules based on the first character of each line

## Installation

```bash
npm install @pre-markdown/parser
```

```bash
pnpm add @pre-markdown/parser
```

> **Note**: `@pre-markdown/core` is a dependency and will be installed automatically.

## Quick Start

### Basic Parsing

```typescript
import { parse } from '@pre-markdown/parser'

const doc = parse('# Hello **World**\n\nA paragraph with `code`.')
console.log(doc)
// {
//   type: 'document',
//   children: [
//     { type: 'heading', depth: 1, children: [...] },
//     { type: 'paragraph', children: [...] }
//   ]
// }
```

### With Renderer

```typescript
import { parse } from '@pre-markdown/parser'
import { renderToHtml } from '@pre-markdown/renderer'

const html = renderToHtml(parse('# Hello **World**'))
// → <h1>Hello <strong>World</strong></h1>
```

### Incremental Parsing (Real-time Editing)

```typescript
import { IncrementalParser } from '@pre-markdown/parser'

const parser = new IncrementalParser('# Hello\n\nWorld')
let doc = parser.getDocument()

// Apply an edit (replace line 2)
const result = parser.applyEdit({
  fromLine: 2,
  toLine: 3,
  newText: 'Updated content',
})

console.log(result.duration)        // < 1ms
console.log(result.reusedBlockCount) // blocks not re-parsed
console.log(result.document)         // updated AST
```

## API Reference

### `parse(input, options?)`

Parse a complete Markdown document into an AST.

```typescript
function parse(input: string, options?: BlockParserOptions): Document
```

**Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `input` | `string` | Markdown source text |
| `options` | `BlockParserOptions` | Parser options (see below) |

**Returns:** `Document` AST node (from `@pre-markdown/core`)

### `BlockParserOptions`

```typescript
interface BlockParserOptions {
  gfmTables?: boolean    // GFM table parsing (default: true)
  mathBlocks?: boolean   // $$ math blocks (default: true)
  containers?: boolean   // ::: custom containers (default: true)
  toc?: boolean          // [toc] support (default: true)
  footnotes?: boolean    // Footnote definitions (default: true)
  lazyInline?: boolean   // Defer inline parsing to render time (default: false)
}
```

### `parseBlocks(input, options?)`

Lower-level: parse a full Markdown string into block nodes.

```typescript
function parseBlocks(input: string, options?: BlockParserOptions): Document
```

### `parseBlockLines(lines, start, end, options)`

Parse a specific range of lines into block-level nodes. Used internally by the incremental parser.

```typescript
function parseBlockLines(
  lines: string[],
  start: number,
  end: number,
  opts: Required<BlockParserOptions>
): BlockNode[]
```

### `parseInline(input)`

Parse inline Markdown content into inline AST nodes.

```typescript
function parseInline(input: string): InlineNode[]
```

**Example:**

```typescript
import { parseInline } from '@pre-markdown/parser'

const nodes = parseInline('Hello **world** and `code`')
// [
//   { type: 'text', value: 'Hello ' },
//   { type: 'strong', children: [{ type: 'text', value: 'world' }] },
//   { type: 'text', value: ' and ' },
//   { type: 'inlineCode', value: 'code' },
// ]
```

### `IncrementalParser`

Stateful parser that maintains the document between edits, enabling sub-millisecond incremental updates.

```typescript
class IncrementalParser {
  constructor(initialText?: string, options?: BlockParserOptions, eventBus?: EventBus)

  getDocument(): Document
  getText(): string
  getLines(): readonly string[]
  getLineHashes(): readonly number[]
  getBlockMetas(): readonly BlockMeta[]

  applyEdit(edit: EditOperation): IncrementalParseResult
  fullReparse(): Document
}
```

#### `EditOperation`

```typescript
interface EditOperation {
  fromLine: number   // Start line index (0-based, inclusive)
  toLine: number     // End line index (0-based, exclusive)
  newText: string    // Replacement text (may contain newlines)
}
```

#### `IncrementalParseResult`

```typescript
interface IncrementalParseResult {
  document: Document                        // Updated AST
  affectedRange: { from: number; to: number } // Lines that were reparsed
  newBlockCount: number                     // New blocks generated
  oldBlockCount: number                     // Old blocks replaced
  reusedBlockCount: number                  // Blocks reused from cache
  duration: number                          // Parse time in ms
}
```

#### How Incremental Parsing Works

1. **Edit Detection** — The edit range is mapped to affected block ranges using binary search on block metadata
2. **Partial Reparse** — Only the affected line range is reparsed into new block nodes
3. **Block Fingerprinting** — FNV-1a hash fingerprints identify unchanged blocks
4. **LRU Cache Reuse** — Previously parsed blocks matching the same fingerprint are reused (including resolved inline content)
5. **AST Splice** — New blocks are spliced into the existing AST, keeping unchanged blocks as-is

This achieves **< 1ms** update time even for 10,000+ line documents.

## Syntax Support

### CommonMark

| Syntax | Status |
|--------|--------|
| ATX Headings (`# H1` – `###### H6`) | ✅ |
| Setext Headings | ✅ |
| Paragraphs | ✅ |
| Block Quotes (`> text`) | ✅ |
| Ordered / Unordered Lists | ✅ |
| Fenced Code Blocks (`` ``` `` / `~~~`) | ✅ |
| Indented Code Blocks | ✅ |
| Thematic Breaks (`---` / `***` / `___`) | ✅ |
| Links `[text](url)` | ✅ |
| Images `![alt](url)` | ✅ |
| Emphasis `*em*` / `**strong**` | ✅ |
| Inline Code `` `code` `` | ✅ |
| Hard / Soft Line Breaks | ✅ |
| HTML Blocks (Type 1-7) | ✅ |
| Backslash Escapes | ✅ |
| HTML Entities | ✅ |

### GFM (GitHub Flavored Markdown)

| Syntax | Status |
|--------|--------|
| Tables | ✅ |
| Strikethrough `~~text~~` | ✅ |
| Task Lists `- [x] task` | ✅ |
| Autolinks `<url>` | ✅ |

### Extended Syntax

| Syntax | Status |
|--------|--------|
| Math Blocks `$$...$$` | ✅ |
| Math Inline `$...$` | ✅ |
| Highlight `==text==` | ✅ |
| Superscript `^text^` | ✅ |
| Subscript `~text~` | ✅ |
| Custom Containers `:::info` | ✅ |
| Collapsible `+++title` | ✅ |
| Footnotes `[^id]` | ✅ |
| TOC `[toc]` | ✅ |
| FrontMatter `---yaml---` | ✅ |
| Font Color `!!red text!!` | ✅ |
| Font Size `!12 text!` | ✅ |
| Background Color `!!!yellow text!!!` | ✅ |
| Ruby `{漢字\|かんじ}` | ✅ |
| Emoji `:smile:` | ✅ |
| Audio `!audio[title](url)` | ✅ |
| Video `!video[title](url)` | ✅ |
| Underline `/text/` | ✅ |

## Performance

| Benchmark | Result |
|-----------|--------|
| Parse 1KB Markdown | **< 0.1ms** |
| Parse 20KB Markdown | **< 1ms** |
| Parse 210KB Markdown | **~5ms** |
| Incremental Update | **< 1ms** |

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
| [@pre-markdown/renderer](https://www.npmjs.com/package/@pre-markdown/renderer) | AST → HTML renderer |
| [@pre-markdown/layout](https://www.npmjs.com/package/@pre-markdown/layout) | Pretext-based layout engine |

## License

[MIT](https://github.com/Leo555/pre-markdown/blob/master/LICENSE) © 2024-2026 PreMarkdown Contributors
