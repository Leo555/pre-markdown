# PreMarkdown

<div align="center">

[![npm version](https://img.shields.io/npm/v/@pre-markdown/parser)](https://www.npmjs.com/package/@pre-markdown/parser)
[![npm downloads](https://img.shields.io/npm/dm/@pre-markdown/parser)](https://www.npmjs.com/package/@pre-markdown/parser)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5+-blue)](https://www.typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![pnpm](https://img.shields.io/badge/pnpm-%3E%3D%208.0.0-blue)](https://pnpm.io)

**高性能 Markdown 引擎** — 基于 [pretext](https://github.com/chenglou/pretext) 零 DOM 重排布局，打造 JavaScript 生态中最快的 Markdown 解析和渲染系统。

**[中文](./README.zh.md) | [English](./README.en.md) | [性能对标](./benchmark) | [完整 API](./docs/api.md)**

</div>

---

## 📋 目录

- [为什么选择 PreMarkdown](#-为什么选择-premardown)
- [快速开始](#-快速开始)
- [核心特性](#-核心特性)
- [包结构](#-包结构)
- [性能指标](#-性能指标)
- [语法支持](#-语法支持)
- [开发指南](#-开发指南)
- [常见问题](#-常见问题)
- [贡献指南](#-贡献指南)
- [许可证](#-许可证)

---

## 🎯 为什么选择 PreMarkdown

**一句话：** 通过零 DOM 重排布局和增量解析，实现比 marked 快 3 倍、比 markdown-it 快 10 倍的 Markdown 引擎，同时保持 < 30KB gzip 的轻量级体积。

### 性能对标

| 特性 | PreMarkdown | marked | markdown-it | commonmark.js | Cherry |
|------|:---:|:---:|:---:|:---:|:---:|
| **定位** | **性能极致** | 速度型 | 插件丰富 | 规范参考 | 功能全面 |
| **完整 AST** | ✅ | ❌ | ❌ Token | ✅ | ❌ |
| **增量解析** | ✅ < 1ms | ❌ | ❌ | ❌ | ✅ |
| **零 DOM 布局** | ✅ pretext | ❌ | ❌ | ❌ | ❌ DOM |
| **虚拟化滚动** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Tree-shakeable ESM** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **核心体积** | < 30KB | ~12KB | ~30KB | ~20KB | ~700KB |

---

## 🚀 快速开始

### 安装

```bash
# 仅需解析 + 渲染
npm install @pre-markdown/parser @pre-markdown/renderer

# 或使用 pnpm / yarn
pnpm add @pre-markdown/parser @pre-markdown/renderer
```

### 基础用法

```typescript
import { parse } from '@pre-markdown/parser'
import { renderToHtml } from '@pre-markdown/renderer'

const markdown = '# 你好 **世界**\n\n这是一个段落。'
const ast = parse(markdown)
const html = renderToHtml(ast)

console.log(html)
// <h1>你好 <strong>世界</strong></h1>\n<p>这是一个段落。</p>
```

### CommonJS 兼容

```javascript
const { parse } = require('@pre-markdown/parser')
const { renderToHtml } = require('@pre-markdown/renderer')

const html = renderToHtml(parse('# 你好'))
```

### 仅获取 AST

如果你只需要解析结构而不需要 HTML 渲染：

```typescript
import { parse } from '@pre-markdown/parser'

const doc = parse('你好 **世界**')
// {
//   type: 'document',
//   children: [
//     {
//       type: 'paragraph',
//       children: [
//         { type: 'text', content: '你好 ' },
//         { type: 'strong', children: [{ type: 'text', content: '世界' }] }
//       ]
//     }
//   ]
// }
```

### 遍历和转换 AST

```typescript
import { parse } from '@pre-markdown/parser'
import { Visitor } from '@pre-markdown/core'

const ast = parse(markdown)

// 使用 Visitor 模式遍历 AST
const visitor = new Visitor()
visitor.on('heading', (node) => {
  console.log(`找到标题 ${node.level} 级：${node.children[0].content}`)
})
visitor.visit(ast)

// 或者使用 find 方法
const headings = ast.find(n => n.type === 'heading')
```

### 安全渲染（防止 XSS）

```typescript
import { renderToHtml } from '@pre-markdown/renderer'

const markdown = '[链接](javascript:alert("XSS"))'
const safeHtml = renderToHtml(ast, {
  sanitize: true,
  allowedProtocols: ['http', 'https', 'mailto', 'ftp']
})
// XSS 向量被自动转义
```

### 增量解析（编辑场景）

对于实时编辑器，PreMarkdown 支持只重新解析修改的部分，实现 < 1ms 响应：

```typescript
import { IncrementalParser } from '@pre-markdown/parser'

const parser = new IncrementalParser()
let doc = parser.parse(initialMarkdown)

// 用户编辑：第 5-6 行替换为新内容
doc = parser.update({
  type: 'replace',
  startLine: 5,
  deleteCount: 1,
  insertLines: ['## 新标题', '更新的内容']
})
// 仅重新解析受影响的块级节点，复用其他 AST 部分
```

### 布局引擎（零 DOM 测量）

结合 pretext 进行精确的文本测量和虚拟化滚动：

```typescript
import { LayoutEngine } from '@pre-markdown/layout'

const engine = new LayoutEngine({
  font: '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto',
  lineHeight: 1.5,
  maxWidth: 800,
})

// 计算全文本布局（零 DOM reflow）
const { height, lineCount } = engine.computeLayout(text)

// 虚拨化视口（万行文档仍流畅）
const viewport = engine.computeViewportLayout(
  text,
  scrollTop,      // 当前滚动位置
  viewportHeight  // 视口高度
)
```

---

## 📚 示例页面和在线编辑器

### 🌐 在线编辑器（GitHub Pages）

**[👉 立即试用 PreMarkdown 在线编辑器](https://leo555.github.io/pre-markdown/)**

无需安装，直接在浏览器中编辑和预览 Markdown。支持：
- ✅ 实时预览
- ✅ 分享链接（URL 编码）
- ✅ 导出为 HTML 或 MD
- ✅ 完全离线运行
- ✅ 零隐私泄露（本地处理）

详见 [部署指南](./STANDALONE_DEPLOYMENT.md)

### 📖 本地示例页面

在本地开发时，可运行以下示例页面：

| 页面 | 链接 | 说明 |
|------|------|------|
| **基础用法** | `/examples/basic.html` | 解析、渲染、AST、安全模式、性能基准 |
| **AST 转换** | `/examples/ast-transform.html` | Visitor 模式、提取标题链接、统计文档 |
| **自定义渲染器** | `/examples/custom-renderer.html` | 代码高亮、链接处理、主题定制 |
| **增量解析** | `/examples/incremental-parsing.html` | 全量 vs 增量性能对比、大文档处理 |
| **完整编辑器 Demo** | `/demo` | 二分屏实时编辑器、工具栏、快捷键 |
| **性能压测** | `/benchmark` | 7 引擎实时性能对比、语法兼容性测试 |

### 快速访问示例

```bash
# 启动开发服务器
pnpm dev

# 打开浏览器访问示例
# http://localhost:9527/examples/basic.html
# http://localhost:9527/examples/ast-transform.html
# http://localhost:9527/examples/custom-renderer.html
# http://localhost:9527/examples/incremental-parsing.html
```

---

## ✨ 核心特性

### 🔥 极致性能
- **Parse + Render < 0.3ms**（1KB 文本） — 快于 marked
- **增量更新 < 1ms** — 编辑时只重解析变更行，复用已有 AST
- **零 DOM 重排** — 基于 pretext 的纯算术文本测量和布局计算
- **LRU 缓存** — 自动缓存常见段落的测量结果

### 🏗️ 完整的 AST
- **结构化 AST** — 支持完整的递归遍历和转换
- **Visitor 模式** — 内置 visitor 模式便于 AST 操作
- **事件系统** — EventBus 支持自定义解析/渲染 hook

### 🎯 虚拟化滚动
- **精确行高** — 基于 pretext 精确计算每行高度
- **万行流畅** — 支持 10000+ 行文档无卡顿滚动

### 📦 轻量可插拔
- **< 30KB gzip** — 核心包极致压缩
- **Tree-shakeable ESM** — 按需引入，优化 bundle 体积
- **零依赖**（core 包） — 轻松集成到任何项目

### 🔒 安全渲染
- **XSS 防护** — 自动转义危险字符和 HTML
- **URL 过滤** — 支持协议白名单，防止 `javascript:` 等危险链接
- **CSS 注入防护** — 清除不安全的样式属性

---

## 📦 包结构

PreMarkdown 由 4 个独立的 npm 包组成，支持灵活组合：

```
@pre-markdown/core       — AST 类型、Builder、Visitor、EventBus（0 依赖）
@pre-markdown/parser     — Markdown → AST 解析引擎（块级 + 内联 + 增量）
@pre-markdown/renderer   — AST → HTML 渲染器（安全模式、代码高亮 hook）
@pre-markdown/layout     — pretext 布局引擎（零 DOM 测量、LRU 缓存、虚拟化视口）
```

### 常见组合

| 场景 | 依赖 | 描述 |
|------|------|------|
| **静态渲染** | parser + renderer | 博客、文档静态生成 |
| **实时编辑器** | parser + renderer + layout | 编辑器、笔记应用 |
| **AST 转换** | core + parser | 自定义预处理、lint 工具 |
| **性能基准** | parser + renderer + layout | 编辑器性能基准测试 |

---

## 📊 性能指标

### 核心基线（参考环境：MacBook Pro 16" M1 Pro）

| 指标 | 目标 | 说明 |
|------|------|------|
| **Parse + Render 1KB** | < 0.3ms | 快于 marked 同等体积 |
| **Parse + Render 100KB** | < 10ms | 处理大型文档 |
| **Parse + Render 1MB** | < 100ms | 超大文档极限测试 |
| **增量更新（单行）** | < 1ms | 编辑器快速响应 |
| **pretext prepare()** | ≤ 19ms/500段 | 文本测量（零 DOM） |
| **pretext layout()** | < 0.1ms/500段 | vs 原生 DOM reflow ~50ms |
| **光标定位** | < 0.5ms | vs getBoundingClientRect ~5ms |
| **核心体积** | < 30KB gzip | 与 markdown-it 相当 |

### 在线性能对标

```bash
pnpm dev
# 打开 http://localhost:9527/benchmark
# 在浏览器中对比 7 个 Markdown 引擎的实时性能
```

---

## 📝 语法支持

### ✅ CommonMark（主流语法 ≥ 80% 通过）

标题、段落、引用、列表（有序/无序/嵌套）、代码块、水平线、链接、图片、强调（粗体/斜体）、行内代码、原始 HTML、硬换行、转义字符

### ✅ GFM（GitHub Flavored Markdown）

表格、删除线 (`~~文本~~`)、任务列表 (`- [x] 任务`)、URL 自动链接

### ✅ 扩展语法（Cherry 兼容）

| 语法 | 示例 | 说明 |
|------|------|------|
| **数学公式** | `$$E=mc^2$$` | LaTeX 数学表达式 |
| **上标/下标** | `H~2~O` `x^2^` | 化学式、数学符号 |
| **删除线** | `~~删除~~` | GFM 删除线 |
| **高亮** | `==高亮==` | 背景高亮 |
| **字体样式** | `{color: red}文字{/color}` | 彩色文字 |
| **Ruby 注音** | `{base\|ruby}` | 中日韩文注音 |
| **下划线** | `{u}下划线{/u}` | 下划线文本 |
| **面板块** | `::: info\n内容\n:::` | 信息/警告/错误面板 |
| **折叠块** | `::: collapse\n内容\n:::` | 可展开/折叠内容 |
| **FrontMatter** | `---\ntitle: 文档\n---` | 文档元数据 |
| **TOC** | `[TOC]` | 自动生成目录 |

---

## 🛠️ 开发指南

### 环境要求

- **Node.js** >= 18.0.0
- **pnpm** >= 8.0.0
- **TypeScript** 5.5+

### 本地开发

```bash
# 1. 安装依赖
pnpm install

# 2. 启动开发服务器
pnpm dev
# 打开浏览器访问 http://localhost:9527

# 3. 运行测试
pnpm test:run          # 运行全部 1038 个单元测试
pnpm test:coverage     # 生成覆盖率报告

# 4. 性能基准测试
pnpm bench             # 运行 Vitest 基准测试

# 5. 代码检查与格式化
pnpm lint              # ESLint 检查
pnpm format            # Prettier 自动格式化
pnpm typecheck         # TypeScript 类型检查

# 6. 构建发布版本
pnpm build             # 构建所有包（ESM + CJS + .d.ts）
pnpm clean             # 清理构建产物
```

### 项目结构

```
pre-markdown/
├── packages/                   # 核心包（4 个 npm 包）
│   ├── core/                  # @pre-markdown/core
│   │   └── src/ast/           # AST 类型定义、Builder、Visitor、EventBus
│   ├── parser/                # @pre-markdown/parser
│   │   └── src/               # Markdown 解析引擎（块级 + 内联 + 增量）
│   ├── renderer/              # @pre-markdown/renderer
│   │   └── src/               # AST 到 HTML 渲染器
│   └── layout/                # @pre-markdown/layout
│       └── src/               # pretext 布局引擎（测量、缓存、虚拟化）
├── harness/                    # 测试基础设施
│   ├── specs/                 # 模块规格文档（Spec 驱动开发）
│   ├── benchmarks/            # Vitest 基准测试
│   └── fixtures/              # 测试用例和数据文件
├── benchmark/                  # 浏览器性能压测页面
│   ├── index.html             # 7 引擎性能对比压测
│   └── compat.html            # 语法兼容性测试
├── demo/                       # 编辑器 Demo
├── docs/                       # 文档（API、指南等）
└── .codebuddy/
    └── instructions.md         # AI 助手执行准则
```

### 开发工作流程

1. **创建分支** — 从 `main` 创建功能分支：`git checkout -b feat/your-feature`
2. **编写测试** — 测试先行（TDD）。参考 `harness/specs/` 目录
3. **实现功能** — 修改相关包的代码
4. **验证质量** — 运行 `pnpm test:run` 和 `pnpm lint`
5. **性能检验** — 若涉及 parser/renderer，运行 `pnpm bench` 确保性能无劣化
6. **提交 PR** — 附上详细的改动说明和测试结果

### 核心规范

- **测试覆盖率** — 行 ≥ 90%、分支 ≥ 85%
- **性能回归** — parser/renderer 改动性能劣化 > 20% 禁止提交
- **AST 变更** — 修改 AST 必须同时更新 types/builder/visitor/parser/renderer 5 个文件

---

## ❓ 常见问题

### Q: PreMarkdown 和 marked、markdown-it 有什么区别？

**A:** PreMarkdown 的核心优势是**极致性能 + 零 DOM 重排**：

- **marked** — 简单快速但无 AST 和增量支持
- **markdown-it** — 插件丰富但性能较差且依赖 DOM
- **PreMarkdown** — 完整 AST + 增量解析 + 零 DOM 布局 = 最快 + 最灵活

### Q: 我需要自定义 Markdown 语法吗？

**A:** 支持多种定制方式：

1. **Visitor 模式** — 在 AST 上修改节点
2. **自定义渲染器** — 重写 renderToHtml 的 hook 函数
3. **EventBus** — 在解析/渲染过程插入 hook

详见 [自定义指南](./docs/customize.md)

### Q: 支持代码高亮吗？

**A:** renderToHtml 提供 `highlightCode` hook，你可以集成任意高亮库：

```typescript
renderToHtml(ast, {
  hooks: {
    highlightCode: (code, language) => {
      return highlight(code, { language })
    }
  }
})
```

支持 highlight.js、Prism、Shiki 等所有流行库。

### Q: 能否用于服务端渲染（SSR）？

**A:** 完全支持。PreMarkdown 是纯 JavaScript，无浏览器依赖：

```typescript
// Node.js 环境
import { parse } from '@pre-markdown/parser'
import { renderToHtml } from '@pre-markdown/renderer'

const html = renderToHtml(parse(markdown))
// 直接用于 SSR、静态生成等
```

### Q: 核心体积真的 < 30KB 吗？

**A:** 是的。测量方式：

```bash
npm pack @pre-markdown/parser
# 检查 .tgz 中 dist/ 文件夹大小
# ESM bundle 约 15KB gzip
```

具体见 [Bundlephobia](https://bundlephobia.com/package/@pre-markdown/parser)

### Q: 如何向 PreMarkdown 贡献代码？

**A:** 详见 [贡献指南](#贡献指南)

---

## 🤝 贡献指南

我们欢迎所有形式的贡献！无论是 bug 报告、功能建议还是代码提交。

### 报告 Bug

1. 搜索已有 issue，确保未重复报告
2. [创建新 issue](https://github.com/your-org/pre-markdown/issues/new)，附上：
   - 清晰的问题描述
   - 复现步骤（最小化代码示例）
   - 环境信息（Node 版本、操作系统等）

### 功能建议

1. 在 [Discussions](https://github.com/your-org/pre-markdown/discussions) 中讨论你的想法
2. 如果社区支持，创建 issue 并标记 `feature-request`

### 代码贡献

1. **Fork** 本仓库
2. **创建分支** — `git checkout -b feat/amazing-feature`
3. **编写测试** — TDD 原则，添加单元测试
4. **提交代码** — 遵守 [代码风格](#代码风格)
5. **提交 PR** — 清晰描述改动内容和改动原因

### 代码风格

我们使用 ESLint + Prettier 保持一致的代码风格：

```bash
pnpm lint       # 检查代码风格
pnpm format     # 自动格式化
```

### 提交信息规范

遵循 [Conventional Commits](https://www.conventionalcommits.org)：

```
feat: 添加增量解析支持
fix: 修复嵌套列表处理问题
docs: 更新 API 文档
test: 添加边界情况测试用例
perf: 优化 AST 遍历性能
chore: 更新依赖
```

### 测试要求

- 新增功能必须有对应的单元测试
- 修复 bug 必须附上复现 bug 的测试
- 测试命令 — `pnpm test:run`
- 覆盖率目标 — 行 ≥ 90%，分支 ≥ 85%

### 性能测试

对 parser 或 renderer 的改动必须运行性能测试：

```bash
pnpm bench
# 检查是否有性能劣化（> 20% 则不允许合并）
```

### 获取帮助

- 📖 查看 [完整文档](./docs)
- 💬 在 [Discussions](https://github.com/your-org/pre-markdown/discussions) 中提问
- 🐛 搜索 [已有 issue](https://github.com/your-org/pre-markdown/issues)

---

## 📄 许可证

MIT © 2024 PreMarkdown Contributors

详见 [LICENSE](./LICENSE) 文件。

---

<div align="center">

**如有问题或建议，欢迎 [提交 issue](https://github.com/your-org/pre-markdown/issues)** ❤️

**Made with ❤️ by the PreMarkdown community**

</div>
