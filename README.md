# PreMarkdown

> 基于 [pretext](https://github.com/chenglou/pretext) 的全行业性能最佳 Markdown 引擎

## 为什么是 PreMarkdown？

**性能第一** — 充分利用 pretext 零 DOM 重排布局，打造 JS 生态中最快的 Markdown 引擎。

| | PreMarkdown | marked | markdown-it | commonmark.js | Cherry |
|---|---|---|---|---|---|
| **定位** | **性能极致** | 速度型 | 插件丰富 | 规范参考 | 功能全面 |
| **架构** | AST 两阶段流水线 | 单遍正则 | 状态机 | 严格规范 | 正则一体化 |
| **AST** | ✅ 完整结构化 | ❌ 无 | ❌ Token 流 | ✅ | ❌ 无 |
| **增量解析** | ✅ 局部重解析 | ❌ 全量 | ❌ 全量 | ❌ 全量 | ✅ 局部 |
| **布局引擎** | ✅ **pretext 零回流** | ❌ 无 | ❌ 无 | ❌ 无 | ❌ DOM |
| **零 DOM 测量** | ✅ pretext | ❌ | ❌ | ❌ | ❌ |
| **虚拟化滚动** | ✅ pretext 精确高度 | ❌ | ❌ | ❌ | ❌ |
| **Tree-shakeable** | ✅ ESM | ✅ | ✅ | ❌ | ❌ |
| **核心体积** | < 30KB gzip | ~12KB | ~30KB | ~20KB | ~700KB |

## 核心优势

- **pretext 驱动** — 文本测量、行断开、光标定位全部通过 pretext 纯算术计算，零 DOM reflow
- **极致性能** — Parse + Render 热路径优化，目标击败 marked/markdown-it
- **增量更新** — 编辑时只重解析变更行，复用已有 AST 节点，< 1ms 响应
- **虚拟化滚动** — 基于 pretext 精确行高，万行文档流畅滚动
- **结构化 AST** — 完整 AST，支持 walk/find/transform
- **轻量可插拔** — 核心 < 30KB gzip，Tree-shakeable ESM

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

### CommonMark（主流语法 ≥ 80% 通过）
标题、段落、引用、列表、代码块、水平线、链接、图片、强调、行内代码、HTML、硬换行、转义

### GFM
表格、删除线、任务列表、URL 自动链接

### 扩展语法（Cherry 兼容）
数学公式、高亮、上标、下标、脚注、字体颜色/大小/背景色、Ruby 注音、下划线、Emoji、面板、折叠块、FrontMatter、TOC、音频、视频

## 性能目标（核心指标）

| 指标 | 目标 | 说明 |
|------|------|------|
| Parse+Render 1KB | < 0.3ms | 快于 marked |
| Parse+Render 100KB | < 10ms | 快于 marked |
| Parse+Render 1MB | < 100ms | 快于 markdown-it |
| 增量更新（单行） | < 1ms | 增量优势 |
| pretext prepare() | ≤ 19ms/500段 | 零 DOM 测量 |
| pretext layout() | < 0.1ms/500段 | DOM reflow ~50ms |
| 光标定位 | < 0.5ms | getBoundingClientRect ~5ms |
| 核心体积 | < 30KB gzip | 与 markdown-it 相当 |

## Benchmark

```bash
pnpm dev
# 打开 http://localhost:9527/benchmark/         — 7 引擎性能压测
# 打开 http://localhost:9527/benchmark/compat.html — 7 引擎语法兼容性测试
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
