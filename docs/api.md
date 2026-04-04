# PreMarkdown API 文档

> 📖 相关文档：[架构设计](./architecture.md) · [性能报告](./performance.md) · [贡献指南](../CONTRIBUTING.md) · [← 返回 README](../README.md)

---

## @pre-markdown/parser

### `parse(input, options?): Document`

解析完整 Markdown 文档为 AST。

```typescript
import { parse } from '@pre-markdown/parser'

const doc = parse('# Hello **World**')
// doc.type === 'document'
// doc.children[0].type === 'heading'
```

**参数：**
- `input: string` — Markdown 源文本
- `options?: BlockParserOptions` — 可选配置

**BlockParserOptions：**
```typescript
{
  gfmTables?: boolean    // GFM 表格（默认 true）
  mathBlocks?: boolean   // 数学块 $$...$$（默认 true）
  containers?: boolean   // 自定义容器 :::（默认 true）
  toc?: boolean          // TOC 占位符（默认 true）
  footnotes?: boolean    // 脚注（默认 true）
}
```

### `parseInline(input): InlineNode[]`

解析行内 Markdown 内容。

```typescript
import { parseInline } from '@pre-markdown/parser'

const nodes = parseInline('**bold** and *italic*')
// [Strong, Text(' and '), Emphasis]
```

### `IncrementalParser`

增量解析器，编辑时只重解析变更行。

```typescript
import { IncrementalParser } from '@pre-markdown/parser'

const parser = new IncrementalParser(initialMarkdown)
const doc = parser.getDocument()

// 编辑第 5 行
const result = parser.applyEdit({
  fromLine: 5,
  toLine: 6,
  newText: 'new content here',
})
// result.document — 更新后的 AST
// result.duration — 解析耗时（通常 < 0.05ms）
```

---

## @pre-markdown/renderer

### `renderToHtml(doc, options?): string`

将 AST 渲染为 HTML 字符串。

```typescript
import { renderToHtml } from '@pre-markdown/renderer'

const html = renderToHtml(doc)
const safeHtml = renderToHtml(doc, { sanitize: true })
```

**RendererOptions：**
```typescript
{
  sanitize?: boolean     // 安全模式（默认 true）
  highlight?: (code: string, lang?: string) => string  // 代码高亮
  headingId?: ((text: string, depth: number) => string) | null  // 标题 ID
  baseUrl?: string       // 相对链接基础 URL
}
```

---

## @pre-markdown/core

### AST 类型

```typescript
import type { Document, Heading, Paragraph, ... } from '@pre-markdown/core'
```

完整类型列表见 [架构文档](./architecture.md#ast-设计)。

### Builder 工厂

```typescript
import { createHeading, createParagraph, createText, ... } from '@pre-markdown/core'

const heading = createHeading(1, [createText('Hello')])
```

### Visitor

```typescript
import { walk, findAll, findFirst, getTextContent } from '@pre-markdown/core'

// 遍历所有节点
walk(doc, (node) => { console.log(node.type) })

// 查找所有链接
const links = findAll(doc, (n) => n.type === 'link')

// 获取纯文本
const text = getTextContent(heading)
```

### EventBus

```typescript
import { EventBus } from '@pre-markdown/core'

const bus = new EventBus()
bus.on('astChanged', (data) => { /* ... */ })
bus.emit('astChanged', { document: doc })
```

---

## @pre-markdown/layout

### `LayoutEngine`

基于 pretext 的文本布局引擎。

```typescript
import { LayoutEngine, createFallbackBackend } from '@pre-markdown/layout'

// 浏览器环境（使用真正的 pretext）
const engine = new LayoutEngine({
  font: '16px Inter',
  lineHeight: 24,
  maxWidth: 800,
})

// Node.js 环境（使用 fallback）
const engine = new LayoutEngine(config, createFallbackBackend())
```

**LayoutConfig：**
```typescript
{
  font: string           // CSS 字体（必填）
  lineHeight: number     // 行高像素（必填）
  maxWidth: number       // 最大宽度像素（必填）
  whiteSpace?: string    // 'normal' | 'pre-wrap'
  viewportBuffer?: number // 视口缓冲倍数（默认 2）
  codeFont?: string      // 代码块字体
  codeLineHeight?: number // 代码块行高
}
```

**核心方法：**

```typescript
// 基本布局
const { height, lineCount } = engine.computeLayout(text)

// 带行信息
const { lines } = engine.computeLayoutWithLines(text)

// 代码块布局（使用 codeFont）
const codeLayout = engine.computeCodeLayout(codeText)

// 虚拟化视口
const viewport = engine.computeViewportLayout(text, scrollTop, viewportHeight)

// 多段落文档布局
const docLayout = engine.computeDocumentLayout(paragraphs)

// 增量文档布局（编辑时）
const { changedIndices } = engine.updateDocumentLayout(paragraphs)

// 滚动位置命中测试
const hit = engine.hitTest(paragraphs, scrollTop)
```
