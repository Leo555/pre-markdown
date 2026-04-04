# PreMarkdown

<div align="center">

<img src="./generated-images/logo-icon-only.png" alt="PreMarkdown Logo" width="160" />

**High-performance Markdown Engine** — Built with [pretext](https://github.com/chenglou/pretext) zero-reflow layout

[![CI](https://github.com/Leo555/pre-markdown/actions/workflows/ci.yml/badge.svg)](https://github.com/Leo555/pre-markdown/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@pre-markdown/parser)](https://www.npmjs.com/package/@pre-markdown/parser)
[![npm downloads](https://img.shields.io/npm/dm/@pre-markdown/parser)](https://www.npmjs.com/package/@pre-markdown/parser)
[![Bundle Size](https://img.shields.io/badge/gzip-18.5KB-brightgreen)](https://bundlephobia.com/package/@pre-markdown/parser)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5+-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[English](./README.md) · [简体中文](./README.zh.md) · [📖 Live Examples](https://leo555.github.io/pre-markdown/examples/basic.html) · [🚀 Benchmarks](https://leo555.github.io/pre-markdown/benchmark/) · [API Docs](./docs/api.md)

</div>

---

## Why PreMarkdown

> 3x faster than marked, 10x faster than markdown-it, with zero DOM reflow, incremental parsing, and only **< 30KB gzip** bundle size.

| Feature | PreMarkdown | marked | markdown-it | commonmark.js | Cherry |
|---------|:---:|:---:|:---:|:---:|:---:|
| **Focus** | **Peak Perf** | Speed | Plugin-rich | Spec Reference | Feature-rich |
| **Complete AST** | ✅ | ❌ | ❌ Token | ✅ | ❌ |
| **Incremental Parse** | ✅ < 1ms | ❌ | ❌ | ❌ | ✅ |
| **Zero DOM Layout** | ✅ pretext | ❌ | ❌ | ❌ | ❌ DOM |
| **Virtual Scrolling** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Tree-shakeable ESM** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Core Size** | **18.5KB** | ~12KB | ~30KB | ~20KB | ~700KB |

**[👉 Try Live Benchmarks (7 engines, no install)](https://leo555.github.io/pre-markdown/benchmark/)**

---

## Getting Started

### Installation

```bash
npm install @pre-markdown/parser @pre-markdown/renderer
```

### Basic Usage

```typescript
import { parse } from '@pre-markdown/parser'
import { renderToHtml } from '@pre-markdown/renderer'

const html = renderToHtml(parse('# Hello **World**'))
// → <h1>Hello <strong>World</strong></h1>
```

### Parse Only (Get AST)

```typescript
import { parse } from '@pre-markdown/parser'

const doc = parse('Hello **world**')
// { type: 'document', children: [{ type: 'paragraph', children: [...] }] }
```

### Walk & Query AST

```typescript
import { parse } from '@pre-markdown/parser'
import { walk, findAll, getTextContent } from '@pre-markdown/core'

const ast = parse(markdown)

walk(ast, (node) => {
  if (node.type === 'heading') {
    console.log(`H${node.depth}: ${getTextContent(node.children)}`)
  }
})

const links = findAll(ast, (n) => n.type === 'link')
```

### Safe Rendering (XSS Protection)

```typescript
const safeHtml = renderToHtml(ast, {
  sanitize: true  // enabled by default — filters javascript: and other dangerous protocols
})
```

### Incremental Parsing (Real-time Editing)

```typescript
import { IncrementalParser } from '@pre-markdown/parser'

const parser = new IncrementalParser()
let doc = parser.parse(initialMarkdown)

doc = parser.update({
  type: 'replace',
  startLine: 5,
  deleteCount: 1,
  insertLines: ['## New heading', 'Updated content']
})
// Only affected block nodes are re-parsed — < 1ms response
```

### Layout Engine (Zero DOM Measurement)

```typescript
import { LayoutEngine } from '@pre-markdown/layout'

const engine = new LayoutEngine({
  font: '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto',
  lineHeight: 1.5,
  maxWidth: 800,
})

const { height, lineCount } = engine.computeLayout(text)
const viewport = engine.computeViewportLayout(text, scrollTop, viewportHeight)
```

---

## Key Features

| Category | Features |
|----------|----------|
| 🔥 **Peak Performance** | Parse + Render < 0.3ms (1KB), incremental < 1ms, zero DOM reflow, LRU cache |
| 🏗️ **Complete AST** | Structured AST + Visitor pattern + EventBus hooks |
| 🎯 **Virtual Scrolling** | Precise line heights via pretext, smooth 10K+ line docs |
| 📦 **Lightweight** | < 30KB gzip, tree-shakeable ESM, zero deps (core) |
| 🔒 **Secure** | XSS protection + URL protocol whitelist + CSS injection prevention |

---

## Package Structure

```
@pre-markdown/core       — AST types, Builder, Visitor, EventBus (zero deps)
@pre-markdown/parser     — Markdown → AST parser (block + inline + incremental)
@pre-markdown/renderer   — AST → HTML renderer (safe mode, highlight hook)
@pre-markdown/layout     — pretext layout engine (measurement, LRU, virtualization)
```

| Use Case | Dependencies | Description |
|----------|------|-------------|
| Static Rendering | parser + renderer | Blogs, static docs |
| Real-time Editor | parser + renderer + layout | Editors, note-taking apps |
| AST Transformation | core + parser | Custom preprocessing, linters |

---

## Example Pages

### Live Demos (GitHub Pages)

| Page | Link | Description |
|------|------|-------------|
| ⚡ Quick Start | [Live Demo →](https://leo555.github.io/pre-markdown/examples/quick-start.html) | Simplest usage, AST, render options, XSS |
| 🚀 Basic Usage | [Live Demo →](https://leo555.github.io/pre-markdown/examples/basic.html) | Parse, render, AST, safe mode, perf |
| 🌲 AST Walker | [Live Demo →](https://leo555.github.io/pre-markdown/examples/ast-walker.html) | walk / findAll / findFirst / getTextContent |
| 🔧 AST Transform | [Live Demo →](https://leo555.github.io/pre-markdown/examples/ast-transform.html) | Visitor, extract headings/links, doc stats |
| 🎨 Custom Renderer | [Live Demo →](https://leo555.github.io/pre-markdown/examples/custom-renderer.html) | Syntax highlighting, link handling, themes |
| ⚡ Incremental Parse | [Live Demo →](https://leo555.github.io/pre-markdown/examples/incremental-parsing.html) | Full vs incremental, large docs |
| ✏️ Live Editor | [Live Demo →](https://leo555.github.io/pre-markdown/examples/live-editor.html) | Split-pane editor with stats |
| 📊 Benchmarks | [Live Demo →](https://leo555.github.io/pre-markdown/benchmark/) | 7-engine real-time comparison |
| 🌐 Online Editor | [Live Demo →](https://leo555.github.io/pre-markdown/) | Full editor demo |

### Run Locally

```bash
pnpm dev
# Open http://localhost:9527/examples/quick-start.html
```

---

## Performance

> Tested on MacBook Pro 16" M1 Pro · [Full performance report](./docs/performance.md)

| Metric | Target | Actual |
|--------|--------|--------|
| Parse + Render 1KB | < 0.3ms | **0.059ms** ✅ |
| Parse + Render 20KB | < 10ms | **0.618ms** ✅ |
| Parse + Render 210KB | < 100ms | **~5ms** ✅ |
| Incremental Update | < 1ms | **0.42ms** ✅ |
| Core Bundle (gzip) | < 30KB | **18.5KB** ✅ |

---

## Syntax Support

### ✅ CommonMark (≥ 80% passing)

Headings, paragraphs, block quotes, lists, code blocks, horizontal rules, links, images, emphasis, inline code, raw HTML, hard line breaks, escaping

### ✅ GFM

Tables, strikethrough (`~~text~~`), task lists (`- [x] task`), URL autolinks

### ✅ Extended Syntax

Math `$$E=mc^2$$`, superscript/subscript `H~2~O`, highlight `==text==`, info panels `:::info`, collapsible blocks, FrontMatter, TOC, Ruby annotations, font color/size

---

## Development

### Requirements

- **Node.js** >= 18 · **pnpm** >= 8 · **TypeScript** 5.5+

### Commands

```bash
pnpm install          # Install dependencies
pnpm dev              # Start dev server (http://localhost:9527)
pnpm test:run         # Run all tests
pnpm test:coverage    # Coverage report
pnpm bench            # Performance benchmarks
pnpm lint             # ESLint
pnpm format           # Prettier
pnpm typecheck        # TypeScript type checking
pnpm build            # Build all packages (ESM + CJS + .d.ts)
```

### Project Structure

```
pre-markdown/
├── packages/               # Core packages (4 npm packages)
│   ├── core/              # @pre-markdown/core — AST types, Builder, Visitor
│   ├── parser/            # @pre-markdown/parser — Markdown → AST
│   ├── renderer/          # @pre-markdown/renderer — AST → HTML
│   └── layout/            # @pre-markdown/layout — pretext layout engine
├── harness/                # Test infra (specs / benchmarks / fixtures)
├── benchmark/              # Browser 7-engine benchmark
├── examples/               # Interactive example pages (7)
├── docs/                   # Documentation (API / Architecture / Performance)
└── demo/                   # Editor demo
```

---

## FAQ

<details>
<summary><b>Q: How is PreMarkdown different from marked / markdown-it?</b></summary>

Core advantages: **peak performance + zero DOM reflow**. Try the [live benchmark](https://leo555.github.io/pre-markdown/benchmark/) to compare 7 engines.

- **marked** — Simple & fast, but no AST or incremental support
- **markdown-it** — Rich plugins, but slower and needs DOM
- **PreMarkdown** — Complete AST + incremental + zero DOM = fastest + most flexible

</details>

<details>
<summary><b>Q: Is syntax highlighting supported?</b></summary>

`renderToHtml` provides a `highlight` hook compatible with highlight.js, Prism, Shiki, etc.:

```typescript
renderToHtml(ast, {
  highlight: (code, lang) => hljs.highlight(code, { language: lang }).value
})
```

</details>

<details>
<summary><b>Q: Can it be used for SSR?</b></summary>

Fully supported. PreMarkdown is pure JavaScript with zero browser dependencies:

```typescript
import { parse } from '@pre-markdown/parser'
import { renderToHtml } from '@pre-markdown/renderer'
const html = renderToHtml(parse(markdown))
```

</details>

<details>
<summary><b>Q: Is the core really < 30KB gzip?</b></summary>

core + parser + renderer = **19.2KB** gzip (without layout). Full suite = **22.2KB** gzip. Verify on [Bundlephobia](https://bundlephobia.com/package/@pre-markdown/parser).

</details>

---

## Contributing

We welcome all contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full guide.

Quick steps:

1. Fork → branch `git checkout -b feat/your-feature`
2. Write tests (TDD) → implement feature
3. `pnpm test:run` + `pnpm lint` to verify
4. Submit PR with clear description

Commits follow [Conventional Commits](https://www.conventionalcommits.org): `feat:` / `fix:` / `perf:` / `docs:` / `test:` / `chore:`

---

## License

[MIT](./LICENSE) © 2024 PreMarkdown Contributors

---

<div align="center">

**Questions or suggestions? [Open an Issue](https://github.com/Leo555/pre-markdown/issues)** ❤️

**Made with ❤️ by the PreMarkdown community**

</div>
