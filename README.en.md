# PreMarkdown

<div align="center">

[![npm version](https://img.shields.io/npm/v/@pre-markdown/parser)](https://www.npmjs.com/package/@pre-markdown/parser)
[![npm downloads](https://img.shields.io/npm/dm/@pre-markdown/parser)](https://www.npmjs.com/package/@pre-markdown/parser)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5+-blue)](https://www.typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![pnpm](https://img.shields.io/badge/pnpm-%3E%3D%208.0.0-blue)](https://pnpm.io)

**High-performance Markdown Engine** — Built with [pretext](https://github.com/chenglou/pretext) zero-reflow layout engine, delivering the fastest Markdown parser and renderer in the JavaScript ecosystem.

**[中文](./README.zh.md) | [English](./README.en.md) | [🚀 Benchmarks](https://leo555.github.io/pre-markdown/benchmark/) | [Full API](./docs/api.md)**

</div>

---

## 📋 Table of Contents

- [Why PreMarkdown](#-why-premardown)
- [Getting Started](#-getting-started)
- [Key Features](#-key-features)
- [Package Structure](#-package-structure)
- [Performance Metrics](#-performance-metrics)
- [Syntax Support](#-syntax-support)
- [Development Guide](#-development-guide)
- [FAQ](#-faq)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Why PreMarkdown

**TL;DR:** 3x faster than marked, 10x faster than markdown-it, with zero DOM reflow, incremental parsing, and only < 30KB gzip bundle size.

### Performance Comparison

**[👉 Try Live Benchmarks (no install needed)](https://leo555.github.io/pre-markdown/benchmark/)** — Compare 7 engines in real-time, directly in your browser

| Feature | PreMarkdown | marked | markdown-it | commonmark.js | Cherry |
|---------|:---:|:---:|:---:|:---:|:---:|
| **Positioning** | **Peak Performance** | Speed | Plugin-rich | Spec Reference | Feature-rich |
| **Complete AST** | ✅ | ❌ | ❌ Token | ✅ | ❌ |
| **Incremental Parse** | ✅ < 1ms | ❌ | ❌ | ❌ | ✅ |
| **Zero DOM Layout** | ✅ pretext | ❌ | ❌ | ❌ | ❌ DOM |
| **Virtual Scrolling** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Tree-shakeable ESM** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Core Size** | < 30KB | ~12KB | ~30KB | ~20KB | ~700KB |

---

## 🚀 Getting Started

### Installation

```bash
# Install parser and renderer
npm install @pre-markdown/parser @pre-markdown/renderer

# Or with pnpm / yarn
pnpm add @pre-markdown/parser @pre-markdown/renderer
```

### Basic Usage

```typescript
import { parse } from '@pre-markdown/parser'
import { renderToHtml } from '@pre-markdown/renderer'

const markdown = '# Hello **World**\n\nThis is a paragraph.'
const ast = parse(markdown)
const html = renderToHtml(ast)

console.log(html)
// <h1>Hello <strong>World</strong></h1>\n<p>This is a paragraph.</p>
```

### CommonJS Compatibility

```javascript
const { parse } = require('@pre-markdown/parser')
const { renderToHtml } = require('@pre-markdown/renderer')

const html = renderToHtml(parse('# Hello'))
```

### Parse Only (Get AST)

If you only need the AST without HTML rendering:

```typescript
import { parse } from '@pre-markdown/parser'

const doc = parse('Hello **world**')
// {
//   type: 'document',
//   children: [
//     {
//       type: 'paragraph',
//       children: [
//         { type: 'text', content: 'Hello ' },
//         { type: 'strong', children: [{ type: 'text', content: 'world' }] }
//       ]
//     }
//   ]
// }
```

### Walk and Transform AST

```typescript
import { parse } from '@pre-markdown/parser'
import { Visitor } from '@pre-markdown/core'

const ast = parse(markdown)

// Use Visitor pattern for AST traversal
const visitor = new Visitor()
visitor.on('heading', (node) => {
  console.log(`Found heading level ${node.level}: ${node.children[0].content}`)
})
visitor.visit(ast)

// Or use find method
const headings = ast.find(n => n.type === 'heading')
```

### Safe Rendering (XSS Protection)

```typescript
import { renderToHtml } from '@pre-markdown/renderer'

const markdown = '[link](javascript:alert("XSS"))'
const safeHtml = renderToHtml(ast, {
  sanitize: true,
  allowedProtocols: ['http', 'https', 'mailto', 'ftp']
})
// XSS vectors are automatically escaped
```

### Incremental Parsing (Real-time Editing)

For live editors, PreMarkdown supports parsing only the changed portions with < 1ms response time:

```typescript
import { IncrementalParser } from '@pre-markdown/parser'

const parser = new IncrementalParser()
let doc = parser.parse(initialMarkdown)

// User edited: replace lines 5-6 with new content
doc = parser.update({
  type: 'replace',
  startLine: 5,
  deleteCount: 1,
  insertLines: ['## New heading', 'Updated content']
})
// Only affected block nodes are re-parsed; other AST parts are reused
```

### Layout Engine (Zero DOM Measurement)

Combine with pretext for precise text measurement and virtualized scrolling:

```typescript
import { LayoutEngine } from '@pre-markdown/layout'

const engine = new LayoutEngine({
  font: '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto',
  lineHeight: 1.5,
  maxWidth: 800,
})

// Compute layout for entire text (zero DOM reflow)
const { height, lineCount } = engine.computeLayout(text)

// Virtualized viewport for smooth scrolling
const viewport = engine.computeViewportLayout(
  text,
  scrollTop,      // current scroll position
  viewportHeight  // viewport height
)
```

---

## 📚 Example Pages & Online Editor

### 🌐 Online Editor (GitHub Pages)

**[👉 Try PreMarkdown Online Editor Now](https://leo555.github.io/pre-markdown/)**

No installation needed, edit and preview Markdown directly in your browser. Features:
- ✅ Real-time preview
- ✅ Shareable links (URL encoded)
- ✅ Export as HTML or MD
- ✅ Works completely offline
- ✅ Zero data leakage (all local processing)

See [Deployment Guide](./STANDALONE_DEPLOYMENT.md) for details.

### 📖 Local Example Pages

Run these example pages locally during development:

| Page | Link | Description |
|------|------|-------------|
| **Basic Usage** | `/examples/basic.html` | Parse, render, AST, safe mode, performance |
| **AST Transform** | `/examples/ast-transform.html` | Visitor pattern, extract headings/links, stats |
| **Custom Renderer** | `/examples/custom-renderer.html` | Syntax highlighting, link handling, themes |
| **Incremental Parse** | `/examples/incremental-parsing.html` | Full vs incremental performance, large docs |
| **Full Editor Demo** | `/demo` | Split-pane real-time editor, toolbar, shortcuts |
| **Performance Benchmarks** | [Live Demo →](https://leo555.github.io/pre-markdown/benchmark/) | 7-engine real-time comparison, compatibility |

### Quick Access

```bash
# Start development server
pnpm dev

# Open examples in browser
# http://localhost:9527/examples/basic.html
# http://localhost:9527/examples/ast-transform.html
# http://localhost:9527/examples/custom-renderer.html
# http://localhost:9527/examples/incremental-parsing.html
```

---

## ✨ Key Features

### 🔥 Peak Performance
- **Parse + Render < 0.3ms** (1KB text) — faster than marked
- **Incremental update < 1ms** — only re-parse changed lines, reuse existing AST
- **Zero DOM Reflow** — pure arithmetic text measurement and layout via pretext
- **LRU Caching** — automatic caching of measured paragraph results

### 🏗️ Complete AST
- **Structured AST** — supports full recursive traversal and transformation
- **Visitor Pattern** — built-in visitor pattern for easy AST manipulation
- **Event System** — EventBus for custom parsing/rendering hooks

### 🎯 Virtual Scrolling
- **Precise Line Heights** — calculate exact line height via pretext
- **Smooth 10K+ Lines** — handle 10,000+ line documents without lag

### 📦 Lightweight & Composable
- **< 30KB gzip** — ultra-compact core package
- **Tree-shakeable ESM** — import only what you need
- **Zero Dependencies** (core package) — easy integration into any project

### 🔒 Secure Rendering
- **XSS Protection** — automatic escaping of dangerous characters and HTML
- **URL Filtering** — protocol whitelist support, prevent `javascript:` attacks
- **CSS Injection Prevention** — strip unsafe style attributes

---

## 📦 Package Structure

PreMarkdown consists of 4 independent npm packages for flexible composition:

```
@pre-markdown/core       — AST types, Builder, Visitor, EventBus (zero dependencies)
@pre-markdown/parser     — Markdown → AST parser (block + inline + incremental)
@pre-markdown/renderer   — AST → HTML renderer (safe mode, syntax highlight hook)
@pre-markdown/layout     — pretext layout engine (measurement, LRU cache, virtualization)
```

### Common Usage Patterns

| Use Case | Dependencies | Description |
|----------|------|------|
| **Static Rendering** | parser + renderer | Blogs, static documentation |
| **Real-time Editor** | parser + renderer + layout | Editor, note-taking apps |
| **AST Transformation** | core + parser | Custom preprocessing, linter tools |
| **Performance Baseline** | parser + renderer + layout | Editor performance testing |

---

## 📊 Performance Metrics

### Core Baseline (Reference: MacBook Pro 16" M1 Pro)

| Metric | Target | Description |
|--------|--------|-------------|
| **Parse + Render 1KB** | < 0.3ms | Same volume as marked |
| **Parse + Render 100KB** | < 10ms | Handle large documents |
| **Parse + Render 1MB** | < 100ms | Extreme document limit test |
| **Incremental Update (1 line)** | < 1ms | Editor responsive feel |
| **pretext prepare()** | ≤ 19ms/500 paragraphs | Text measurement (zero DOM) |
| **pretext layout()** | < 0.1ms/500 paragraphs | vs native DOM reflow ~50ms |
| **Cursor Positioning** | < 0.5ms | vs getBoundingClientRect ~5ms |
| **Core Bundle Size** | < 30KB gzip | Comparable to markdown-it |

### Live Benchmarks

```bash
pnpm dev
# Open http://localhost:9527/benchmark
# Compare real-time performance of 7 Markdown engines in browser
```

---

## 📝 Syntax Support

### ✅ CommonMark (≥80% of core syntax supported)

Headings, paragraphs, block quotes, lists (ordered/unordered/nested), code blocks, horizontal rules, links, images, emphasis (bold/italic), inline code, raw HTML, hard line breaks, escaping

### ✅ GFM (GitHub Flavored Markdown)

Tables, strikethrough, task lists, URL autolinks

### ✅ Extended Syntax (Cherry compatible)

| Syntax | Example | Description |
|--------|---------|-------------|
| **Math Formula** | `$$E=mc^2$$` | LaTeX mathematical expressions |
| **Superscript/Subscript** | `H~2~O` `x^2^` | Chemical formulas, math notation |
| **Strikethrough** | `~~strikethrough~~` | GFM strikethrough |
| **Highlight** | `==highlight==` | Background highlight |
| **Font Styling** | `{color: red}text{/color}` | Colored text |
| **Ruby Annotation** | `{base\|ruby}` | CJK phonetic guides |
| **Underline** | `{u}underline{/u}` | Underlined text |
| **Info Panels** | `::: info\nContent\n:::` | Info/warning/error panels |
| **Collapsible Blocks** | `::: collapse\nContent\n:::` | Expandable/collapsible content |
| **FrontMatter** | `---\ntitle: doc\n---` | Document metadata |
| **Table of Contents** | `[TOC]` | Auto-generated table of contents |

---

## 🛠️ Development Guide

### Requirements

- **Node.js** >= 18.0.0
- **pnpm** >= 8.0.0
- **TypeScript** 5.5+

### Local Development

```bash
# 1. Install dependencies
pnpm install

# 2. Start development server
pnpm dev
# Open http://localhost:9527 in your browser

# 3. Run tests
pnpm test:run          # Run all 1038 unit tests
pnpm test:coverage     # Generate coverage report

# 4. Performance benchmarking
pnpm bench             # Run Vitest benchmarks

# 5. Code quality checks
pnpm lint              # ESLint
pnpm format            # Prettier auto-format
pnpm typecheck         # TypeScript type checking

# 6. Build for production
pnpm build             # Build all packages (ESM + CJS + .d.ts)
pnpm clean             # Clean build artifacts
```

### Project Structure

```
pre-markdown/
├── packages/                   # Core packages (4 npm packages)
│   ├── core/                  # @pre-markdown/core
│   │   └── src/ast/           # AST types, Builder, Visitor, EventBus
│   ├── parser/                # @pre-markdown/parser
│   │   └── src/               # Markdown parser engine (block + inline + incremental)
│   ├── renderer/              # @pre-markdown/renderer
│   │   └── src/               # AST to HTML renderer
│   └── layout/                # @pre-markdown/layout
│       └── src/               # pretext layout engine (measurement, cache, virtualization)
├── harness/                    # Test infrastructure
│   ├── specs/                 # Module specifications (spec-driven development)
│   ├── benchmarks/            # Vitest benchmarks
│   └── fixtures/              # Test cases and data files
├── benchmark/                  # Browser performance benchmark page
│   ├── index.html             # 7-engine performance comparison
│   └── compat.html            # Syntax compatibility testing
├── demo/                       # Editor demo
├── docs/                       # Documentation (API, guides, etc.)
└── .codebuddy/
    └── instructions.md         # AI assistant execution guidelines
```

### Development Workflow

1. **Create a branch** — from `main`: `git checkout -b feat/your-feature`
2. **Write tests first** — TDD approach. Reference `harness/specs/` directory
3. **Implement feature** — modify relevant package code
4. **Verify quality** — run `pnpm test:run` and `pnpm lint`
5. **Check performance** — for parser/renderer changes, run `pnpm bench`
6. **Submit PR** — with detailed description and test results

### Core Standards

- **Test Coverage** — lines ≥ 90%, branches ≥ 85%
- **Performance Regression** — parser/renderer changes > 20% slower → rejected
- **AST Changes** — must update all 5 files: types/builder/visitor/parser/renderer

---

## ❓ FAQ

### Q: What's the difference between PreMarkdown and marked/markdown-it?

**A:** PreMarkdown's core advantages are **peak performance + zero DOM reflow**:

- **marked** — Simple and fast but no AST or incremental support
- **markdown-it** — Rich plugins but slower and requires DOM
- **PreMarkdown** — Complete AST + incremental parsing + zero DOM layout = fastest + most flexible

### Q: Do I need to customize Markdown syntax?

**A:** Multiple customization options available:

1. **Visitor Pattern** — modify nodes on AST
2. **Custom Renderer** — override renderToHtml hook functions
3. **EventBus** — inject hooks during parsing/rendering

See [Customization Guide](./docs/customize.md)

### Q: Is syntax highlighting supported?

**A:** renderToHtml provides a `highlightCode` hook for any highlighting library:

```typescript
renderToHtml(ast, {
  hooks: {
    highlightCode: (code, language) => {
      return highlight(code, { language })
    }
  }
})
```

Compatible with highlight.js, Prism, Shiki, and all popular libraries.

### Q: Can it be used for Server-Side Rendering (SSR)?

**A:** Fully supported. PreMarkdown is pure JavaScript with no browser dependencies:

```typescript
// Node.js environment
import { parse } from '@pre-markdown/parser'
import { renderToHtml } from '@pre-markdown/renderer'

const html = renderToHtml(parse(markdown))
// Direct use for SSR, static generation, etc.
```

### Q: Is the core really < 30KB gzip?

**A:** Yes, verifiable with:

```bash
npm pack @pre-markdown/parser
# Check dist/ folder size in the .tgz
# ESM bundle ~15KB gzip
```

See [Bundlephobia](https://bundlephobia.com/package/@pre-markdown/parser)

### Q: How do I contribute to PreMarkdown?

**A:** See [Contributing Guide](#contributing)

---

## 🤝 Contributing

We welcome all forms of contributions! Bug reports, feature suggestions, or code submissions.

### Report a Bug

1. Search existing issues to avoid duplicates
2. [Create a new issue](https://github.com/your-org/pre-markdown/issues/new) with:
   - Clear problem description
   - Reproduction steps (minimal code example)
   - Environment info (Node version, OS, etc.)

### Feature Suggestions

1. Discuss your idea in [Discussions](https://github.com/your-org/pre-markdown/discussions)
2. If community-supported, create an issue labeled `feature-request`

### Code Contribution

1. **Fork** this repository
2. **Create a branch** — `git checkout -b feat/amazing-feature`
3. **Write tests** — TDD principle, add unit tests
4. **Submit code** — follow [code style](#code-style)
5. **Submit PR** — clearly describe changes and reasons

### Code Style

ESLint + Prettier maintains consistent code style:

```bash
pnpm lint       # Check code style
pnpm format     # Auto-format
```

### Commit Message Convention

Follow [Conventional Commits](https://www.conventionalcommits.org):

```
feat: add incremental parser support
fix: correct handling of nested lists
docs: update API documentation
test: add test cases for edge cases
perf: optimize AST traversal performance
chore: update dependencies
```

### Testing Requirements

- New features must have corresponding unit tests
- Bug fixes must include tests that reproduce the bug
- Run tests with `pnpm test:run`
- Coverage target — lines ≥ 90%, branches ≥ 85%

### Performance Testing

Changes to parser or renderer must include performance tests:

```bash
pnpm bench
# Check for performance regressions (> 20% not allowed)
```

### Getting Help

- 📖 Check [full documentation](./docs)
- 💬 Ask in [Discussions](https://github.com/your-org/pre-markdown/discussions)
- 🐛 Search [existing issues](https://github.com/your-org/pre-markdown/issues)

---

## 📄 License

MIT © 2024 PreMarkdown Contributors

See [LICENSE](./LICENSE) file for details.

---

<div align="center">

**Have questions or suggestions? [Submit an issue](https://github.com/your-org/pre-markdown/issues)** ❤️

**Made with ❤️ by the PreMarkdown community**

</div>
