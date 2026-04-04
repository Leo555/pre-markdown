# PreMarkdown 架构设计

> 📖 相关文档：[API 文档](./api.md) · [性能报告](./performance.md) · [插件指南](./plugins.md) · [贡献指南](../CONTRIBUTING.md) · [← 返回 README](../README.md)

---

## 总览

PreMarkdown 是基于 [pretext](https://github.com/chenglou/pretext) 的高性能 Markdown 引擎。核心设计理念：**性能第一，充分利用 pretext 零 DOM 重排布局能力**。

```
                    ┌──────────────────────────────────────┐
                    │           @pre-markdown/core          │
                    │  AST Types · Builders · Visitors · Bus │
                    └────────┬──────────┬──────────┬────────┘
                             │          │          │
                    ┌────────▼──┐  ┌────▼─────┐  ┌▼────────────┐
                    │  parser   │  │ renderer │  │   layout     │
                    │ MD → AST  │  │ AST → HTML│  │ pretext 布局 │
                    └────┬──────┘  └──────────┘  └─────────────┘
                         │
                    ┌────▼──────┐
                    │incremental│
                    │局部重解析  │
                    └───────────┘
```

## 两阶段流水线

### 1. Parse（Markdown → AST）

```
Input string
    ↓
┌─ Block Parser ─────────────────────────────┐
│ 1. input.split('\n') → lines               │
│ 2. 首字符快速路径（charCodeAt 分发）          │
│ 3. tryATXHeading / tryFencedCode / ...      │
│ 4. 每个 block 内调用 parseInline()          │
└─────────────────────────────────────────────┘
    ↓
┌─ Inline Parser ────────────────────────────┐
│ 1. 单遍扫描 charCodeAt 驱动                 │
│ 2. Sticky regex（y flag）避免 input.slice() │
│ 3. parseInlineFast 快速路径                 │
│ 4. HTML entity 解码                         │
└─────────────────────────────────────────────┘
    ↓
Document AST（结构化树）
```

### 2. Render（AST → HTML）

```
Document AST
    ↓
┌─ HTML Renderer ────────────────────────────┐
│ 1. switch(node.type) 递归遍历               │
│ 2. 单遍 escapeHtml（零拷贝快速路径）          │
│ 3. string concat（非 template literal）     │
│ 4. 安全模式：URL/CSS 过滤                   │
└─────────────────────────────────────────────┘
    ↓
HTML string
```

## AST 设计

### 节点层次

```
BaseNode { type, id?, loc? }
├── BlockNode (16 种)
│   ├── Document { children: BlockNode[] }
│   ├── Heading { depth: 1-6, children: InlineNode[] }
│   ├── Paragraph { children: InlineNode[] }
│   ├── CodeBlock { value, lang? }
│   ├── List { ordered, spread, children: ListItem[] }
│   ├── Blockquote { children: BlockNode[] }
│   ├── Table { align, children: TableRow[] }
│   └── ... (ThematicBreak, HtmlBlock, MathBlock, Container, Details, TOC, FootnoteDefinition)
│
└── InlineNode (22+ 种)
    ├── Text { value }
    ├── Emphasis { children: InlineNode[] }
    ├── Strong { children: InlineNode[] }
    ├── InlineCode { value }
    ├── Link { url, title?, children: InlineNode[] }
    ├── Image { url, alt, title? }
    └── ... (Break, SoftBreak, Strikethrough, Highlight, Math, FontColor, Ruby, Emoji, ...)
```

### Builder 工厂

每个节点类型有对应的 `createXxx()` 工厂函数：
- 自增 ID（`resetNodeIds()` 重置）
- 可选 SourceLocation
- 类型安全（TypeScript 严格模式）

### Visitor

- `walk(node, callback)` — 深度优先遍历
- `findAll(node, predicate)` — 查找所有匹配节点
- `findFirst(node, predicate)` — 查找第一个匹配
- `isBlockNode(node)` / `isInlineNode(node)` — 类型守卫

## 性能优化策略

| 优化 | 位置 | 效果 |
|------|------|------|
| 首字符 charCodeAt 分发 | Block Parser | 减少 80% 无效正则 |
| Sticky regex (y flag) | Inline Parser | 零 input.slice() |
| parseInlineFast | Inline Parser | 纯文本跳过递归 2.3x |
| 单遍 escapeHtml | Renderer | 零拷贝快速路径 2x |
| LRU O(1) evict | Layout | Map 迭代顺序 |
| 增量解析 | IncrementalParser | 单行编辑仅 7.8% 全量时间 |

## Pretext 集成

```
LayoutEngine
├── computeLayout(text)           → { height, lineCount }
├── computeLayoutWithLines(text)  → { lines[], height }
├── computeViewportLayout(...)    → 虚拟化视口
├── computeDocumentLayout(paras)  → 累积高度
├── updateDocumentLayout(paras)   → 增量布局
├── computeCodeLayout(text)       → 代码块专用字体
├── hitTest(paras, scrollTop)     → 段落/行号定位
└── LRU Cache (512 prepared + 256 segments)
```

## 包结构

| 包 | 大小 (gzip) | 依赖 |
|---|---|---|
| `@pre-markdown/core` | 2.0KB | 无 |
| `@pre-markdown/parser` | 10.8KB | core |
| `@pre-markdown/renderer` | 2.7KB | core |
| `@pre-markdown/layout` | 3.0KB | core + @chenglou/pretext |
| **合计** | **18.5KB** | |

## 构建

```bash
pnpm build    # tsup: ESM + CJS + .d.ts
pnpm test:run # vitest: 1038 测试
pnpm dev      # Vite dev server (port 9527)
```
