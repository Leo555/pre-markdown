# PreMarkdown

> 基于 [pretext](https://github.com/chenglou/pretext) 的全行业性能最佳 Markdown 引擎

## 为什么是 PreMarkdown？

| | PreMarkdown | marked | markdown-it | commonmark.js | Cherry |
|---|---|---|---|---|---|
| **架构** | AST 两阶段流水线 | 单遍正则 | 状态机 | 严格规范实现 | 正则一体化 |
| **AST** | ✅ 完整结构化 AST | ❌ 无 AST | ❌ Token 流 | ✅ AST | ❌ 无 AST |
| **增量解析** | ✅ 局部重解析 | ❌ 全量 | ❌ 全量 | ❌ 全量 | ✅ 局部渲染 |
| **布局引擎** | ✅ pretext 零回流 | ❌ 无 | ❌ 无 | ❌ 无 | ❌ DOM 依赖 |
| **CommonMark** | 🎯 目标 100% | ~95% | ~100% | 100% | ~80% |
| **GFM** | 🎯 目标 100% | ✅ 完整 | 需插件 | 需插件 | ✅ 完整 |
| **扩展语法** | ✅ Cherry 全兼容 | 需插件 | 需插件 | 需插件 | ✅ 原生 |
| **Tree-shakeable** | ✅ ESM | ✅ | ✅ | ❌ | ❌ |
| **核心体积** | < 30KB gzip | ~12KB | ~30KB | ~20KB | ~700KB |

## 核心优势

- 🚀 **性能** — Parse + Render 两阶段分离，纯算术热路径；基于 pretext 零 DOM 重排测量
- 🎯 **兼容** — 目标 CommonMark 652 + GFM 200 + Cherry 扩展全量通过
- 🌲 **AST** — 完整结构化抽象语法树，支持 walk/find/transform/serialize
- ⚡ **增量** — 编辑时只重解析变更行，复用已有 AST 节点
- 🔌 **可插拔** — 核心零依赖，KaTeX/Mermaid/ECharts 按需加载
- 📦 **轻量** — 核心引擎 < 30KB gzip，Tree-shakeable ESM

## 安装

```bash
npm install @pre-markdown/parser @pre-markdown/renderer
```

## 快速开始

```typescript
import { parse } from '@pre-markdown/parser'
import { renderToHtml } from '@pre-markdown/renderer'

const ast = parse('# Hello **World**')
const html = renderToHtml(ast)
// → <h1>Hello <strong>World</strong></h1>
```

### 仅解析（获取 AST）

```typescript
import { parse } from '@pre-markdown/parser'

const doc = parse('Hello **world**')
// doc.type === 'document'
// doc.children[0].type === 'paragraph'
// doc.children[0].children[1].type === 'strong'
```

### 安全模式

```typescript
import { renderToHtml } from '@pre-markdown/renderer'

const html = renderToHtml(ast, { sanitize: true })
// 自动转义 XSS 向量、过滤危险 URL 协议、清除 CSS 注入
```

### 增量解析

```typescript
import { IncrementalParser } from '@pre-markdown/parser'

const parser = new IncrementalParser()
const doc = parser.parse(initialMarkdown)

// 用户编辑后，只重解析变更部分
const updated = parser.update({
  type: 'replace',
  startLine: 5,
  deleteCount: 1,
  insertLines: ['new content here'],
})
```

### 布局引擎（基于 pretext）

```typescript
import { LayoutEngine, createFallbackBackend } from '@pre-markdown/layout'

const engine = new LayoutEngine({
  font: '16px Inter',
  lineHeight: 24,
  maxWidth: 800,
})

// 零 DOM 重排的文本测量
const { height, lineCount } = engine.computeLayout(text)

// 虚拟化视口布局
const viewport = engine.computeViewportLayout(text, scrollTop, viewportHeight)
```

## 包结构

```
@pre-markdown/core       — AST 类型、Builder、Visitor、EventBus
@pre-markdown/parser     — Markdown → AST 解析引擎（块级 + 内联 + 增量）
@pre-markdown/renderer   — AST → HTML 渲染器（安全模式、代码高亮 Hook）
@pre-markdown/layout     — pretext 布局引擎（零 DOM 测量、LRU 缓存、虚拟化视口）
```

## 语法支持

### CommonMark（目标: 652/652 通过）
标题、段落、引用、列表、代码块、水平线、链接、图片、强调、行内代码、HTML、硬换行、转义

### GFM（目标: 200/200 通过）
表格、删除线、任务列表、URL 自动链接

### 扩展语法（Cherry 兼容）
数学公式、高亮、上标、下标、脚注、字体颜色/大小/背景色、Ruby 注音、下划线、Emoji、面板、折叠块、FrontMatter、TOC、音频、视频

## 性能目标

| 指标 | 目标 | 对比基准 |
|------|------|---------|
| 解析 1000 行 | < 5ms | marked ~8ms |
| 解析 10000 行 | < 50ms | marked ~80ms |
| 渲染 1000 行 | < 3ms | - |
| 增量更新（单行编辑）| < 1ms | 全量重解析 |
| pretext layout() | < 0.1ms | DOM reflow ~50ms |
| 核心体积 | < 30KB gzip | marked 12KB, markdown-it 30KB |

## Benchmark

```bash
pnpm dev
# 打开 http://localhost:3000/benchmark/         — 7 引擎性能压测
# 打开 http://localhost:3000/benchmark/compat.html — 7 引擎语法兼容性测试
```

## 开发

```bash
pnpm install          # 安装依赖
pnpm dev              # 启动开发服务器 + Demo
pnpm test:run         # 运行测试（376 用例）
pnpm bench            # 运行 Vitest 基准测试
```

## 许可证

MIT
