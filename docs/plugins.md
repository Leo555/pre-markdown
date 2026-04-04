# PreMarkdown 插件开发指南

> 📖 相关文档：[API 文档](./api.md) · [架构设计](./architecture.md) · [性能报告](./performance.md) · [贡献指南](../CONTRIBUTING.md) · [← 返回 README](../README.md)

---

## 概述

PreMarkdown 提供了灵活的插件系统，允许通过 **四种 Hook** 扩展解析和渲染行为：

| Hook 类型 | 作用阶段 | 用途 |
|-----------|----------|------|
| `blockParse` | 解析阶段 | 添加自定义块级语法 |
| `inlineParse` | 解析阶段 | 添加自定义行内语法 |
| `transform` | 解析后、渲染前 | AST 转换和后处理 |
| `render` | 渲染阶段 | 自定义 HTML 输出 |

所有 Hook 都是**可选的** — 一个插件只需要实现需要的 Hook 即可。

```
Markdown → [blockParse] → [inlineParse] → AST → [transform] → [render] → HTML
```

---

## 快速开始

### 安装

```bash
npm install @pre-markdown/parser @pre-markdown/renderer @pre-markdown/core
```

### 基本用法

```typescript
import { parse } from '@pre-markdown/parser'
import { renderToHtml } from '@pre-markdown/renderer'
import { PluginManager } from '@pre-markdown/core'
import type { Plugin } from '@pre-markdown/core'

// 1. 定义插件
const myPlugin: Plugin = {
  name: 'my-plugin',
  render: {
    codeBlock: ({ node, defaultHtml }) => {
      const cb = node as any
      if (cb.lang === 'mermaid') {
        return `<div class="mermaid">${cb.value}</div>`
      }
      return undefined // 返回 undefined 使用默认渲染
    },
  },
}

// 2. 注册插件
const plugins = new PluginManager()
plugins.use(myPlugin)

// 3. 使用
const doc = parse(markdown)
const html = renderToHtml(doc, { plugins })
```

---

## Plugin 接口

```typescript
interface Plugin {
  /** 唯一名称（用于去重和移除） */
  name: string

  /** 块级解析钩子 */
  blockParse?: BlockParseHook

  /** 行内解析钩子（按触发字符码注册） */
  inlineParse?: Record<number, InlineParseHook>

  /** AST 转换钩子（解析后、渲染前） */
  transform?: ASTTransformHook

  /** 渲染钩子（按节点类型注册） */
  render?: Partial<Record<NodeType, RenderHook>>
}
```

---

## Hook 详解

### 1. Render Hook（渲染钩子）

最常用的 Hook 类型，用于自定义特定节点类型的 HTML 输出。

**签名：**

```typescript
type RenderHook = (ctx: RenderContext) => string | undefined

interface RenderContext {
  node: ASTNode           // 当前节点
  defaultHtml: string     // 默认 HTML 输出
  renderChildren: (children: (BlockNode | InlineNode)[]) => string  // 渲染子节点
}
```

**规则：**
- 返回 `string` → 覆盖默认输出
- 返回 `undefined` → 回退到下一个插件或默认渲染

**示例：KaTeX 数学公式渲染**

```typescript
import katex from 'katex'

const katexPlugin: Plugin = {
  name: 'katex',
  render: {
    mathBlock: ({ node }) => {
      const math = node as any
      return `<div class="math-display">${katex.renderToString(math.value, { displayMode: true })}</div>\n`
    },
    mathInline: ({ node }) => {
      const math = node as any
      return katex.renderToString(math.value)
    },
  },
}
```

**示例：自定义代码高亮**

```typescript
import hljs from 'highlight.js'

const highlightPlugin: Plugin = {
  name: 'highlight',
  render: {
    codeBlock: ({ node }) => {
      const cb = node as any
      const code = cb.value.endsWith('\n') ? cb.value : cb.value + '\n'
      const highlighted = cb.lang
        ? hljs.highlight(code, { language: cb.lang, ignoreIllegals: true }).value
        : hljs.highlightAuto(code).value
      const langClass = cb.lang ? ` class="language-${cb.lang}"` : ''
      return `<pre><code${langClass}>${highlighted}</code></pre>\n`
    },
  },
}
```

**示例：自定义链接（新窗口打开外部链接）**

```typescript
const externalLinkPlugin: Plugin = {
  name: 'external-links',
  render: {
    link: ({ node, renderChildren }) => {
      const link = node as any
      const children = renderChildren(link.children)
      if (link.url.startsWith('http://') || link.url.startsWith('https://')) {
        return `<a href="${link.url}" target="_blank" rel="noopener noreferrer">${children}</a>`
      }
      return undefined // 内部链接使用默认渲染
    },
  },
}
```

### 2. Block Parse Hook（块级解析钩子）

添加自定义块级语法。每一行未匹配内置语法时，会依次调用注册的 blockParse 钩子。

**签名：**

```typescript
type BlockParseHook = (ctx: BlockParseContext) => number | undefined

interface BlockParseContext {
  line: string                     // 当前行（原始文本）
  lineIndex: number                // 当前行号（0-based）
  lines: string[]                  // 当前位置起的所有行
  addNode: (node: BlockNode) => void  // 添加 AST 节点
}
```

**规则：**
- 返回 `> 0` 的数字 → 消耗的行数
- 返回 `0` 或 `undefined` → 不处理，交给下一个钩子

**示例：自定义 Chart 块语法**

```typescript
import { createContainer } from '@pre-markdown/core'

const chartPlugin: Plugin = {
  name: 'chart',
  blockParse: (ctx) => {
    if (!ctx.line.startsWith(':::chart')) return 0

    // 找到关闭标记
    let end = 1
    while (end < ctx.lines.length && !ctx.lines[end]!.startsWith(':::')) {
      end++
    }

    // 收集内容
    const content = ctx.lines.slice(1, end).join('\n')
    ctx.addNode(createContainer('chart', [], content))

    return end + 1 // 消耗的行数（含开闭标记）
  },
  render: {
    container: ({ node }) => {
      const c = node as any
      if (c.kind === 'chart') {
        return `<div class="chart" data-config='${c.title || ''}'></div>\n`
      }
      return undefined
    },
  },
}
```

### 3. Inline Parse Hook（行内解析钩子）

添加自定义行内语法。按**触发字符码（charCode）**注册，当解析器遇到对应字符时触发。

**签名：**

```typescript
type InlineParseHook = (ctx: InlineParseContext) => InlineParseResult | null

interface InlineParseContext {
  input: string     // 完整输入文本
  pos: number       // 当前位置
  charCode: number  // 当前字符码
}

interface InlineParseResult {
  node: InlineNode  // 解析出的节点
  end: number       // 消耗结束位置
}
```

**规则：**
- 返回 `InlineParseResult` → 消耗语法并插入节点
- 返回 `null` → 不处理

**示例：@mention 语法**

```typescript
import { createLink, createText } from '@pre-markdown/core'

const mentionPlugin: Plugin = {
  name: 'mention',
  inlineParse: {
    // 64 = '@' 的 charCode
    64: (ctx) => {
      const rest = ctx.input.slice(ctx.pos)
      const match = rest.match(/^@([a-zA-Z]\w{0,38})/)
      if (!match) return null

      const username = match[1]!
      return {
        node: createLink(
          `https://github.com/${username}`,
          [createText(`@${username}`)],
          undefined // title
        ),
        end: ctx.pos + match[0].length,
      }
    },
  },
}
```

**示例：#tag 标签语法**

```typescript
const tagPlugin: Plugin = {
  name: 'hashtag',
  inlineParse: {
    // 35 = '#' 的 charCode
    35: (ctx) => {
      // 避免与标题冲突：只在行内位置触发
      if (ctx.pos === 0) return null

      const rest = ctx.input.slice(ctx.pos)
      const match = rest.match(/^#([a-zA-Z]\w{0,29})(?=\s|$|[^\w])/)
      if (!match) return null

      return {
        node: createLink(`/tags/${match[1]}`, [createText(`#${match[1]}`)]),
        end: ctx.pos + match[0].length,
      }
    },
  },
}
```

### 4. Transform Hook（AST 转换钩子）

在解析完成后、渲染之前对 AST 进行转换。适合全局性的后处理。

**签名：**

```typescript
type ASTTransformHook = (doc: Document) => Document | void
```

**规则：**
- 返回新 `Document` → 替换原 AST
- 返回 `void` → 原地修改（无需返回值）
- 多个 transform 按注册顺序链式执行

**示例：自动为标题生成 ID**

```typescript
import { walk, getTextContent } from '@pre-markdown/core'

const headingIdPlugin: Plugin = {
  name: 'heading-ids',
  transform: (doc) => {
    const slugCount = new Map<string, number>()

    walk(doc, (node) => {
      if (node.type === 'heading') {
        const text = getTextContent(node.children)
        let slug = text
          .toLowerCase()
          .replace(/[^\w\u4e00-\u9fff]+/g, '-')
          .replace(/^-|-$/g, '')

        // 处理重复
        const count = slugCount.get(slug) || 0
        slugCount.set(slug, count + 1)
        if (count > 0) slug += '-' + count

        ;(node as any).data = { id: slug }
      }
    })
  },
}
```

**示例：提取文档统计信息**

```typescript
import { walk, getTextContent } from '@pre-markdown/core'

const statsPlugin: Plugin = {
  name: 'doc-stats',
  transform: (doc) => {
    let wordCount = 0
    let headingCount = 0
    let linkCount = 0
    let imageCount = 0

    walk(doc, (node) => {
      switch (node.type) {
        case 'text':
          wordCount += node.value.split(/\s+/).filter(Boolean).length
          break
        case 'heading':
          headingCount++
          break
        case 'link':
          linkCount++
          break
        case 'image':
          imageCount++
          break
      }
    })

    ;(doc as any).meta = { wordCount, headingCount, linkCount, imageCount }
  },
}
```

---

## PluginManager API

```typescript
import { PluginManager } from '@pre-markdown/core'

const pm = new PluginManager()

// 注册
pm.use(plugin1, plugin2, plugin3)  // 批量注册，支持链式调用
pm.use(plugin4)

// 查询
pm.has('katex')              // → boolean
pm.getPluginNames()          // → ['plugin1', 'plugin2', ...]
pm.hasRenderHook('codeBlock') // → boolean
pm.hasInlineHook(64)          // → boolean (charCode for '@')
pm.hasBlockHooks()            // → boolean
pm.hasTransformHooks()        // → boolean

// 移除
pm.remove('plugin1')

// 手动执行（通常由解析器/渲染器自动调用）
pm.tryBlockParse(ctx)      // → number (consumed lines)
pm.tryInlineParse(ctx)     // → InlineParseResult | null
pm.applyTransforms(doc)    // → Document
pm.tryRender(ctx)          // → string | undefined
```

**特性：**
- **去重**：同名插件不会重复注册
- **缓存**：每次注册/移除后自动重建内部 Hook 缓存
- **顺序**：Hook 按插件注册顺序执行

---

## 完整示例：Mermaid 图表插件

```typescript
import type { Plugin } from '@pre-markdown/core'

/**
 * Mermaid 图表插件
 *
 * 将 ```mermaid 代码块渲染为交互式图表。
 * 需要在页面中加载 mermaid.js。
 */
const mermaidPlugin: Plugin = {
  name: 'mermaid',
  render: {
    codeBlock: ({ node }) => {
      const cb = node as any
      if (cb.lang !== 'mermaid') return undefined

      // 生成唯一 ID
      const id = 'mermaid-' + (cb.id || Math.random().toString(36).slice(2, 8))
      return `<div class="mermaid" id="${id}">${cb.value}</div>\n`
    },
  },
}

// 使用
const plugins = new PluginManager()
plugins.use(mermaidPlugin)

const html = renderToHtml(parse(markdown), { plugins })

// 渲染后初始化 mermaid
// mermaid.init(undefined, '.mermaid')
```

---

## 最佳实践

### 1. 命名规范

使用 `kebab-case` 命名，带有明确的功能前缀：

```typescript
// ✅ Good
{ name: 'katex-math' }
{ name: 'syntax-highlight' }
{ name: 'auto-toc' }

// ❌ Bad
{ name: 'myPlugin' }
{ name: 'plugin1' }
```

### 2. 优先使用 render Hook

大多数场景只需要 render Hook。**尽量避免修改解析逻辑**，除非真的需要新语法：

```typescript
// ✅ 优先：render hook 自定义输出
const plugin: Plugin = {
  name: 'highlight-code',
  render: {
    codeBlock: ({ node }) => { /* ... */ },
  },
}

// ⚠️ 谨慎：block/inline parse hook（可能影响性能）
const plugin: Plugin = {
  name: 'custom-syntax',
  blockParse: (ctx) => { /* ... */ },
}
```

### 3. 返回 undefined 回退默认

在 render Hook 中，对于不需要处理的情况，**一定返回 `undefined`** 而不是 `defaultHtml`：

```typescript
// ✅ 正确：只处理特定条件，其余回退
render: {
  codeBlock: ({ node }) => {
    if ((node as any).lang === 'mermaid') {
      return '<div class="mermaid">...</div>'
    }
    return undefined // ← 让下一个插件或默认渲染处理
  },
}

// ❌ 错误：所有情况都返回 string，阻断其他插件
render: {
  codeBlock: ({ node, defaultHtml }) => {
    if ((node as any).lang === 'mermaid') {
      return '<div class="mermaid">...</div>'
    }
    return defaultHtml // ← 阻断了后续插件的机会
  },
}
```

### 4. 性能注意事项

- **Inline parse hook** 会在每个字符上检查，尽量减少 hook 数量
- **Block parse hook** 的正则应简洁，首先检查行首字符
- **Transform hook** 避免深层遍历，使用 `findAll` 而非手动递归
- **Render hook** 是最轻量的，优先使用

### 5. TypeScript 类型安全

Hook 中的 `node` 参数是联合类型，需要类型断言：

```typescript
render: {
  codeBlock: ({ node }) => {
    // node 是 ASTNode 联合类型，需要断言
    const cb = node as CodeBlock
    return `<pre class="custom"><code>${cb.value}</code></pre>`
  },
}
```

---

## AST 节点类型参考

> 完整类型定义见 [API 文档](./api.md) 和 [架构文档](./architecture.md#ast-设计)。

### 常用块级节点

| 类型 | 关键属性 |
|------|----------|
| `heading` | `depth: 1-6`, `children: InlineNode[]` |
| `paragraph` | `children: InlineNode[]` |
| `codeBlock` | `value: string`, `lang?: string` |
| `blockquote` | `children: BlockNode[]` |
| `list` | `ordered: boolean`, `children: ListItem[]` |
| `table` | `align: TableAlign[]`, `children: TableRow[]` |
| `mathBlock` | `value: string` |
| `container` | `kind: string`, `title?: string`, `children: BlockNode[]` |

### 常用行内节点

| 类型 | 关键属性 |
|------|----------|
| `text` | `value: string` |
| `emphasis` | `children: InlineNode[]` |
| `strong` | `children: InlineNode[]` |
| `link` | `url: string`, `title?: string`, `children: InlineNode[]` |
| `image` | `url: string`, `alt: string` |
| `inlineCode` | `value: string` |
| `mathInline` | `value: string` |
