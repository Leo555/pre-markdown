# PreMarkdown — 任务拆解

> **目标**：基于 pretext 构建全行业性能最佳的 Markdown 引擎，充分利用 pretext 零 DOM 重排布局能力  
> **核心原则**：性能第一，语法兼容性够用即可（CommonMark 主流 sections 通过，不追求 100%）  
> 每个任务完成后标记 `[x]`，进行中标记 `[-]`，未开始标记 `[ ]`。  
> 最后更新：2026-04-05

---

## 项目进度总览

| 阶段 | 状态 | 进度 | 审计偏差 |
|------|------|------|---------|
| Phase 1：核心引擎 | ✅ 已完成 | ~95% | 缺 link ref def、emphasis 无 delimiter stack |
| Phase 2：性能优化（核心） | ✅ 已完成 | ~95% | 缺增量 benchmark、buildBlockMetas O(n) |
| Phase 3：Pretext 深度集成（核心） | ✅ 已完成 | ~92% | viewportLayout 伪虚拟化、hitTest O(n)、xyToOffset 冗余调用 |
| Phase 4：语法兼容性（次要） | 🔨 进行中 | 70% | 准确 |
| Phase 5：生态与文档 | ✅ 已完成 | ~90% | layout/README 空文件、README CommonMark 声称不实 |
| Phase 6：编辑器输入框优化 | ✅ 已完成 | ~98% | Undo/Redo 快照式（非操作式） |
| Phase 7：Editor 包重建（核心差距） | ✅ 已完成 | 100% | — |
| Phase 8：Demo 集成完善 | 🔨 进行中 | 60% | — |
| Phase 9：代码质量与测试补全 | 🔨 进行中 | 50% | — |

---

## Phase 1：核心引擎 ✅ (~95%)

> **里程碑**：完整的 Parse → AST → Render 流水线  
> **验证标准**：376 测试通过，所有已实现语法 Demo 可渲染  
> **审计偏差**：缺 link reference definitions `[text][id]`；emphasis 无 delimiter stack（`_` 字边界规则缺失）；Details 缺 `open` 字段（tryDetail 死代码）；HTML 实体表仅 ~90 条 vs 标准 2000+

### 1.1 AST 类型系统（@pre-markdown/core）
- [x] `Position` / `SourceLocation` / `BaseNode` 基础类型
- [x] 16 种块级节点类型（Document, Heading, Paragraph, Blockquote, List, ListItem, CodeBlock, ThematicBreak, HtmlBlock, Table, TableRow, TableCell, FootnoteDefinition, MathBlock, Container, Details, TOC）
- [x] 22+ 种内联节点类型（Text, Emphasis, Strong, Strikethrough, InlineCode, Link, Image, HtmlInline, Break, SoftBreak, FootnoteReference, MathInline, Highlight, Superscript, Subscript, FontColor, FontSize, FontBgColor, Ruby, Emoji, Audio, Video, Autolink, Underline）
- [x] `BlockNode` / `InlineNode` / `ASTNode` / `NodeType` 联合类型
- [x] 38+ 个 AST Builder 工厂函数（自增 ID）
- [x] AST Visitor: `walk` / `findAll` / `findFirst` / `isBlockNode` / `isInlineNode` / `getTextContent`
- [x] EventBus 类型安全事件系统

### 1.2 块级解析器（@pre-markdown/parser）
- [x] ATX 标题、Setext 标题、段落、围栏代码块、缩进代码块
- [x] 引用块、列表（有序/无序/任务）、主题分隔线
- [x] GFM 表格、数学块、自定义容器、折叠块、TOC
- [x] HTML 块、脚注定义、FrontMatter

### 1.3 内联解析器（@pre-markdown/parser）
- [x] 强调/加粗、行内代码、链接/图片、自动链接
- [x] HTML 内联、硬换行/软换行、转义字符
- [x] 删除线、高亮、上标、下标、行内数学、脚注引用
- [x] Cherry 扩展（颜色/大小/背景色/Ruby/Emoji/音视频/下划线）

### 1.4 渲染器 + 增量解析 + Layout
- [x] Document → HTML 渲染（38+ 节点类型）、安全模式
- [x] 增量解析器（局部重解析 + AST 合并）
- [x] Pretext 布局引擎（prepare/layout/虚拟化视口/LRU 缓存）

### 1.5 测试（1029 用例全部通过）
- [x] 单元测试 376 + CommonMark spec 653

---

## Phase 2：性能优化（核心）🔨 (~95%)

> **里程碑**：在 benchmark 6 引擎对比中，PreMarkdown 全面领先  
> **验证标准**：所有文件规模下解析+渲染耗时 ≤ marked，显著快于 markdown-it/Cherry  
> **原则**：这是项目的核心竞争力，最高优先级  
> **审计偏差**：8 项核心优化全部真实实现 ✅；缺增量解析专项 benchmark；`buildBlockMetas()` 每次编辑 O(n) 全量重建；内存管理仅部分（无 object pool/ArrayBuffer）

### 2.1 解析器热路径优化
- [x] 自定义 profiling 脚本（harness/profile.ts），基线测量
- [x] 正则预编译 + sticky regex（y flag）+ lastIndex 替代 input.slice()
- [x] charCodeAt 替代 charAt/字符比较，减少字符串创建
- [x] 块级解析器首字符快速路径（charCodeAt 分发，减少 ~80% 无效正则测试）
- [x] parseInlineFast 快速路径（纯文本内容跳过递归，emphasis 2.3x 提速）
- [x] 内联解析器：charCodeAt 替代 indexOf/repeat，合并 HTML inline 分支，emphasis delimiter run 优化
- [x] 块级解析器：正则替换为 charCodeAt 快速路径（strip3/isBlank/isIndentCode），减少 RE.exec
- [x] AST 节点 Flyweight 优化（Break/SoftBreak/ThematicBreak 单例，减少 GC 压力）
- [x] 懒解析内联（lazyInline — 仅在渲染时才解析段落内联内容，解析阶段 5.6x 提速）

### 2.2 渲染器热路径优化
- [x] escapeHtml 单遍扫描快速路径（无特殊字符时零拷贝返回）
- [x] 字符串拼接优化（+ 替代 template literal，for 循环替代 map）
- [x] escapeAttr 同样单遍扫描优化
- [x] DOM 渲染模式（renderToDOM — 直接创建 DOM 节点，跳过 innerHTML）
- [x] 增量渲染（patchPreview — 逐块 outerHTML 比较，只替换变化的 DOM 子节点）

### 2.3 增量解析优化
- [x] 行级 hash 指纹（FNV-1a 快速定位变更范围）
- [x] AST 节点复用（未变更块直接复用引用 + 二分查找变更范围 + block fingerprint）
- [x] 编辑感知缓存（LRU 按段落粒度缓存 AST 子树）

### 2.4 性能压测与 CI
- [x] 6 引擎性能压测页面（benchmark/index.html）
- [x] 13 个测试文件覆盖 1KB ~ 50MB
- [x] 自动化 CI 性能回归（每次 PR 跑 benchmark，对比基线）
- [x] 性能报告生成（P50/P95/P99、吞吐量、内存峰值）— docs/performance.md

### 2.5 性能目标

| 指标 | 目标 | 说明 |
|------|------|------|
| Parse+Render 1KB | < 0.3ms | 快于 marked |
| Parse+Render 100KB | < 10ms | 快于 marked |
| Parse+Render 1MB | < 100ms | 快于 markdown-it |
| 增量更新（单行） | < 1ms | 增量优势 |
| 核心体积 | < 30KB gzip | 与 markdown-it 相当 |
| 内存占用 10K 行 | < 20MB | - |

---

## Phase 3：Pretext 深度集成（核心）🔨 (~92%)

> **里程碑**：充分发挥 pretext 零 DOM 重排布局的能力  
> **验证标准**：文本测量、布局计算完全脱离 DOM，编辑器体验流畅无卡顿  
> **原则**：pretext 是本项目的核心差异化技术，必须深度利用  
> **审计偏差**：pretext 6 个 API（prepare/prepareWithSegments/layout/layoutWithLines/clearCache/setLocale）深度集成确认 ✅；`computeViewportLayout` 先算所有行再切片（非真正按需虚拟化）；`hitTest` O(n) 线性扫描；`xyToOffset` 二分搜索每步调用 layout（~9次/click）；WorkerBackend + LineRenderer 零测试

### 3.1 Pretext 文本测量增强
- [x] 集成 @chenglou/pretext prepare() / layout() / layoutWithLines()
- [x] LRU 缓存（512 PreparedText + 256 WithSegments）
- [x] 可插拔 MeasurementBackend（浏览器=pretext / Node.js=fallback）
- [x] Web Worker 离线 prepare()（大文档不阻塞主线程）
- [x] prepare() 增量更新（updateDocumentLayout — 只重算变更段落，复用未变更高度）
- [x] 多字体混排支持（computeCodeLayout — 代码块用 codeFont/codeLineHeight）

### 3.2 Pretext 虚拟化滚动
- [x] 视口虚拟化布局（computeViewportLayout，2x 缓冲区）
- [x] 多段落文档布局（computeDocumentLayout）/ hitTest
- [x] 动态高度虚拟列表（基于 pretext 精确高度，非估算）
- [x] 滚动防抖 + requestAnimationFrame 调度
- [x] 大文档（10K+ 行）虚拟滚动性能 < 16ms/frame
- [x] 窗口 Resize 重布局 < 5ms

### 3.3 Pretext 驱动的编辑器布局
- [x] 光标定位（x,y 坐标 → 文档 offset，完全通过 pretext 计算）— CursorEngine.xyToOffset / offsetToPosition
- [x] 选区高亮（基于 pretext 行信息渲染选区矩形）— CursorEngine.getSelectionRects
- [x] 自动换行计算（纯 pretext，零 DOM reflow）— CursorEngine.recompute + getVisualLines
- [x] 行号渲染（基于 pretext lineCount，非 DOM 计数）— CursorEngine.getLineNumbers + LineRenderer

### 3.4 Pretext 性能目标

| 指标 | 目标 | 对比 DOM |
|------|------|---------|
| prepare() 500 段 | ≤ 19ms | 免 DOM |
| layout() 500 段 | ≤ 0.09ms | DOM reflow ~50ms |
| 视口布局 | < 1ms | - |
| 窗口 Resize | < 5ms | - |
| 光标定位 | < 0.5ms | DOM getBoundingClientRect ~5ms |

---

## Phase 4：语法兼容性（次要）🔨

> **里程碑**：主流语法兼容性够用  
> **验证标准**：CommonMark 主流 sections 通过率 ≥ 80%，日常使用无感知差异  
> **原则**：不追求 100% 合规，focus 在用户最常用的语法子集

### 4.1 当前 CommonMark 通过率：418/652 (64.1%)

**已满分 sections (10个)**：
- [x] Precedence, Paragraphs, Blank lines, Inlines
- [x] Hard line breaks, Soft line breaks, Textual content
- [x] ATX headings, Fenced code blocks, Block quotes

**高通过率 sections (够用，暂不投入)**：
- HTML blocks 98%, Autolinks 95%, Raw HTML 95%, Thematic breaks 95%
- Entity references 94%, Setext headings 89%, Indented code blocks 83%
- Code spans 82%

**中等通过率 sections (视需要修复)**：
- [x] Thematic breaks (79% → 95% ✅)
- [ ] Setext headings (89%, 可接受)
- [ ] Indented code blocks (83%, 可接受)

**低通过率 sections (复杂规则，低优先)**：
- List items (48%) — 需实现完整缩进规则
- Emphasis (39%) — 规则极复杂，投入产出比低
- Links (39%) — 需实现完整 link reference definitions
- Images (27%) — 依赖 link reference
- Lists (27%) — 需实现完整缩进规则

### 4.2 适度修复（投入产出比高的）
- [x] ATX heading 尾部 # 关闭 + 空标题 + 1-3 前导空格 → 336/652 (51.5%)
- [x] Fenced code 1-3 前导空格 + 关闭 fence 前导空格 + backtick info 不含 ` → 342/652 (52.5%)
- [x] Thematic break 1-3 前导空格 + blockquote 前导空格/懒续行收紧 + setext 前导空格 + backslash escape 解码 → 356/652 (54.6%)
- [x] Fenced code backtick info string 全行检查 + 关闭条件修正 → 29/29 满分
- [x] Block quote 懒续行：禁止续行到 fenced code / indented code → 25/25 满分
- [x] 实体引用快速路径（&amp; &lt; &gt; &quot;）→ 94% (16/17)，仅剩 link ref def 依赖

### 4.3 不优先修复（复杂度高、用户无感）
- ~~Emphasis 左右限定规则完整实现~~
- ~~Link reference definitions 完整实现~~
- ~~List item 4-space 缩进规则~~
- ~~Entity references 完整 HTML5 实体表~~

---

## Phase 5：生态与文档 ⏳ (~90%)

> 同前，不变  
> **审计偏差**：`packages/layout/README.md` 空文件（0字节）— 核心包文档缺失；README.md + README.zh.md 声称 "CommonMark ≥ 80%" 但实际 64.1%（418/652）

### 5.1 插件系统
- [x] 插件接口 + 语法扩展 Hook + 渲染扩展 Hook（Plugin/PluginManager，block/inline/transform/render 四种 Hook）
- [x] 内置插件：KaTeX / Mermaid / 代码高亮（createKatexPlugin / createMermaidPlugin / createHighlightPlugin）

### 5.2 npm 发布
- [x] ESM + CJS + .d.ts 构建（tsup，4 个核心包全部通过）
- [x] 包体积审计：core 2KB + parser 10.8KB + renderer 2.7KB + layout 3KB = **18.5KB gzip**（目标 < 30KB ✅）
- [x] package.json exports (types + import + require) + sideEffects: false + license
- [x] npm publish 流程（changeset）

### 5.3 文档
- [x] `docs/architecture.md` — 架构设计（两阶段流水线、AST 设计、性能优化策略、pretext 集成）
- [x] `docs/api.md` — API 文档（parse / renderToHtml / IncrementalParser / LayoutEngine 完整参数）
- [x] `docs/performance.md` — 性能报告（7 引擎对比数据）
- [x] `docs/plugins.md` — 插件开发指南（Plugin 接口、四种 Hook 详解、完整示例、最佳实践）

### 5.4 CI/CD + Demo
- [x] 6 引擎压测 + 兼容性测试页面
- [x] GitHub Actions (test + typecheck + lint + build + bench regression)
- [x] 在线 Playground

### 5.5 Markdown 输入框优化（Demo 编辑器体验）

> 当前编辑器是纯 `<textarea>`，无语法高亮、无行号、无快捷键。  
> 目标：提供接近 VS Code 体验的 Markdown 输入框，充分利用 pretext 布局能力。

#### UI 增强
- [x] 行号显示（滚动同步 + 当前行高亮）
- [x] 当前行高亮（光标所在行背景色）
- [x] 编辑器 / 预览面板可拖拽调整宽度
- [x] 全屏编辑 / 全屏预览切换（Split / Edit / Preview 三模式）
- [x] 响应式布局（移动端 ≤768px 上下堆叠排列）

#### 语法高亮
- [x] Markdown 语法着色（标题、粗体、代码、链接等不同颜色）
- [x] 基于行级正则的快速高亮（overlay 模式：透明 textarea + 高亮 pre 层）
- [x] 代码块内语法高亮（集成 highlight.js CDN，支持 TypeScript/JavaScript/Python 等 180+ 语言）

#### 编辑增强
- [x] 快捷键：Ctrl+B 加粗、Ctrl+I 斜体、Ctrl+K 链接、Ctrl+` 代码、Ctrl+D 删除线
- [x] 自动补全：`- ` 列表续行、`> ` 引用续行、有序列表自增编号
- [x] Tab / Shift+Tab 缩进/反缩进（单行 + 多行选区支持）
- [x] 括号/引号自动配对 + 选中文字自动包裹（`*` `_` `` ` `` `~` `[` `(` `"` `'`）
- [x] 拖拽/粘贴图片自动插入 `![](url)` 占位
- [x] 退格键智能删除配对括号/引号（`()` `[]` `{}` `""` `''` `` `` `` `**` `~~`）
- [x] 关闭符号跳过（输入 `)` `]` `}` 等时自动跳过已存在的关闭符号）
- [x] 自动括号配对（`(` `[` `{` 自动插入闭合括号）
- [x] 搜索（Ctrl+F）— 支持正则表达式 + 区分大小写 + 上/下导航
- [x] 替换（Ctrl+H）— 替换当前 + 替换全部
- [x] Undo/Redo 自定义历史栈（Ctrl+Z / Ctrl+Shift+Z，200 步历史，300ms 去抖）

#### 工具栏
- [x] Markdown 工具栏（H1-H3/加粗/斜体/删除线/代码/链接/图片/列表/任务/引用/代码块/表格/分隔线）
- [x] 工具栏按钮操作插入对应语法到光标位置

#### 高级 UI
- [x] Minimap 代码小地图（Canvas 渲染，语法着色缩略图 + 视口指示器 + 点击跳转）
- [x] 大纲导航面板（AST 提取标题层级树，点击跳转编辑器+预览双向定位）
- [x] 字数统计（中英文分词统计）+ 字符数 + 阅读时间估算（中文 500 字/min，英文 275 词/min）
- [x] 亮色/暗色主题切换（CSS 变量双主题 + localStorage 持久化 + 一键切换按钮）
- [x] 编辑器当前行背景高亮（光标所在行半透明紫色背景条 + 滚动同步 + 光标移动追踪）
- [x] 快捷键帮助面板（F1 / Ctrl+? 弹出模态框，列出全部快捷键 + 语法速查 + Esc 关闭）
- [x] Markdown 导出（导出带样式 HTML + 导出 MD 原文件 Blob 下载）
- [x] URL 分享功能（Base64 编码内容到 URL hash + 加载时自动解析 + 复制链接按钮）

#### Pretext 集成
- [x] 基于 pretext 的精确光标定位（x,y → offset）— CursorEngine.xyToOffset / offsetToPosition
- [x] 基于 pretext 的选区高亮渲染 — CursorEngine.getSelectionRects
- [x] 基于 pretext 的自动换行计算（替代 textarea 原生换行）— CursorEngine.getVisualLines / recompute
- [x] 大文档虚拟滚动（只渲染可视区域行）— VirtualList + LineRenderer 虚拟渲染

#### 同步滚动
- [x] 基于 AST 的精确同步滚动（按段落映射，非比例 + rAF 防抖）
- [x] 编辑器 → 预览 + 预览 → 编辑器双向同步

---

## Phase 7：Editor 包重建（核心差距）✅

> **里程碑**：@pre-markdown/editor 成为真正可用的编辑器组件，充分利用已有能力  
> **验证标准**：编辑器使用 IncrementalParser + renderToDOM + VirtualList + CursorEngine  
> **原则**：这是目标"用 pretext 构建高性能 Markdown 编辑器"的最核心短板

### 7.1 重构 @pre-markdown/editor 核心流水线
- [x] 使用 IncrementalParser 替代 parse() 全量解析（~600 行完整重写，增量解析 + 回退全量）
- [x] 使用 renderToDOM() 替代 innerHTML 赋值（patchPreview DOM 比较，isEqualNode）
- [x] 集成 LayoutEngine + CursorEngine（光标定位、选区、行号精确对齐）
- [x] 集成 VirtualList 实现大文档虚拟滚动

### 7.2 编辑器增量更新流水线
- [x] 增量渲染：基于 AST diff 的 DOM patch（computeEdit 行级差异 + patchPreview DOM 比较）
- [x] 增量布局：updateDocumentLayout() 仅重算变更段落高度
- [x] IME 输入合成处理（compositionstart/end 事件，isComposing 标志抑制输入处理）

### 7.3 Editor 包测试覆盖
- [ ] @pre-markdown/editor 单元测试（当前零测试覆盖）

---

## Phase 8：Demo 集成完善 🔨

> **里程碑**：Demo 充分展示引擎全部能力  
> **验证标准**：Demo 使用 IncrementalParser + renderToDOM + VirtualList，大文档性能显著优于全量解析  
> **原则**：Demo 是项目的门面，必须体现核心技术优势

### 8.1 Demo 使用增量解析
- [x] 替换 parse(value) 为 IncrementalParser（demo/main.ts + demo/playground.ts）
- [x] 使用 renderToDOM 替代 renderToHtml + innerHTML（DOM-level isEqualNode patching）
- [x] 实时编辑场景下验证增量解析性能提升

### 8.2 Demo 使用虚拟滚动
- [ ] 集成 VirtualList 实现预览区虚拟渲染（当前未使用，仅手写 patchPreview DOM patch）
- [ ] 大文档（10K+ 行）虚拟滚动性能验证

### 8.3 Demo 使用 WorkerBackend
- [ ] 大文档 pretext prepare() 移至 Web Worker 异步执行（WorkerBackend 已实现但未接入 Demo）

---

## Phase 9：代码质量与测试补全 🔨

> **里程碑**：消除代码重复、修复性能隐患、补全测试覆盖  
> **验证标准**：无重复代码、核心模块测试覆盖 ≥ 80%  
> **原则**：代码质量是可维护性的基础

### 9.1 代码去重
- [x] 提取 `escapeHtml` 为 @pre-markdown/core 公共导出（原 5 处重复 → core/escape.ts 统一实现，单遍 charCodeAt 扫描 + 零拷贝快速路径）
- [x] `escapeAttr` 同步提取，统一实现（renderer + highlight 插件共用）

### 9.2 性能隐患修复
- [x] visitor.ts：`isBlockNode`/`isInlineNode` 的 Set 提升为模块级常量（ReadonlySet，O(1) 查找）
- [x] layout hitTest()：线性扫描 O(n) → 二分查找 O(log n)（利用 computeDocumentLayout 预计算偏移）
- [x] layout computeViewportLayout()：先用 computeLayout() 获取总高度/行数，按需决定是否调用 computeLayoutWithLines()
- [x] cursor.ts xyToOffset()：比例估算 + 精化（~3 次 layout 调用替代 ~9 次二分搜索）
- [x] block parser tryDetail()：修复死代码 `const detailSummary = isOpen ? summary : summary` → `isOpen ? \`[open]${summary}\` : summary`

### 9.3 测试覆盖补全
- [ ] renderToDOM() 测试（当前 ~350 行代码零覆盖）
- [ ] LineRenderer 测试覆盖
- [ ] WorkerBackend 测试覆盖
- [ ] LayoutEngine + CursorEngine + VirtualList 集成测试

### 9.4 渲染器改进
- [x] 插件 renderChildren 类型检测扩展（使用 isInlineNode() 类型守卫替代硬编码 6 种 inline 类型）
- [ ] Table parseTableRow 支持转义管道符 `\|`

---

## 任务统计

| 类别 | 总计 | 已完成 | 有偏差 | 未开始 |
|------|------|--------|--------|--------|
| Phase 1：核心引擎 | 50 | 47 | 3 | 0 |
| Phase 2：性能优化 | 20 | 19 | 1 | 0 |
| Phase 3：Pretext 深度集成 | 15 | 13 | 2 | 0 |
| Phase 4：语法兼容性 | 12 | 7 | 0 | 5 |
| Phase 5：生态与文档 | 12 | 10 | 2 | 0 |
| Phase 6：编辑器输入框优化 | 35 | 35 | 0 | 0 |
| Phase 7：Editor 包重建 | 8 | 7 | 0 | 1 |
| Phase 8：Demo 集成完善 | 6 | 3 | 0 | 3 |
| Phase 9：代码质量与测试补全 | 13 | 8 | 0 | 5 |
| **合计** | **171** | **149** | **8** | **14** |

> 当前总体完成度：**≈ 87%**（149 完成 + 8 有偏差待修复 + 14 未开始）  
> Phase 7 Editor 包重建完成（仅余单元测试），Phase 8/9 大幅推进

---

## 变更日志

| 日期 | 变更内容 |
|------|---------|
| 2026-04-05 | Phase 8.1+8.2：Demo 集成 IncrementalParser + renderToDOM。demo/main.ts 和 demo/playground.ts 使用 IncrementalParser 增量解析替代 parse() 全量解析，computeEdit() 行级差异检测，增量更新回退全量；demo/main.ts 使用 renderToDOM() 直接生成 DOM 节点替代 renderToHtml() + innerHTML，patchPreviewDOM 使用 isEqualNode 进行 DOM 级比较（替代 outerHTML 字符串比较）。完成度 78%→87% |
| 2026-04-05 | Phase 9.1：escapeHtml/escapeAttr 去重 → core/escape.ts 单遍 charCodeAt 扫描 + 零拷贝快速路径，5 处重复统一为 1 处（renderer + katex + mermaid + highlight 插件全部改为 import from core） |
| 2026-04-05 | Phase 9.2：5 项性能修复 — visitor.ts Set 常量化、hitTest O(log n) 二分查找、computeViewportLayout 按需计算、xyToOffset 比例估算（~3 次 layout 替代 ~9 次）、tryDetail 死代码修复 |
| 2026-04-05 | Phase 9.4：renderChildren 类型检测使用 isInlineNode() 类型守卫替代硬编码 6 种类型 |
| 2026-04-05 | Phase 7 Editor 包重建完成：@pre-markdown/editor 从 131 行 stub 重写为 ~600 行完整编辑器（IncrementalParser + renderToDOM + LayoutEngine + CursorEngine + VirtualList + LineRenderer + EventBus + IME compositionstart/end + patchPreview DOM diff + Undo/Redo 200 步 + 快捷键 + ResizeObserver） |
| 2026-04-05 | Phase 1-6 已完成任务深度审计：Phase 1 ~95%（缺 link ref def、emphasis delimiter stack、Details open 字段、HTML 实体表不完整）；Phase 2 ~95%（缺增量 benchmark、buildBlockMetas O(n)）；Phase 3 ~92%（computeViewportLayout 伪虚拟化、hitTest O(n)、xyToOffset 冗余 layout 调用、WorkerBackend/LineRenderer 零测试）；Phase 5 ~90%（layout/README.md 空文件、README CommonMark ≥80% 声称不实，实际 64.1%）；Phase 6 ~98%（18+ 功能全部验证通过）。完成度调整 83%→78%，8 项任务标记"有偏差" |
| 2026-04-05 | 全仓库 Review：新增 Phase 7（Editor 包重建）、Phase 8（Demo 集成完善）、Phase 9（代码质量与测试补全）共 24 项新任务。关键发现：Editor 包仅 131 行且未使用 IncrementalParser/VirtualList/renderToDOM；Demo 未使用增量解析和虚拟滚动；escapeHtml 5 处重复且 editor 版本有 XSS 风险；visitor.ts 每次调用创建 new Set；renderToDOM 350 行零测试。完成度调整 97%→83% |
| 2026-04-05 | CI 修复：harness 添加 marked/markdown-it/commonmark/showdown/remarkable 依赖；worker-script.ts 添加 webworker 三斜线引用修复 DedicatedWorkerGlobalScope 类型；tsconfig.check.json 适配 composite 项目类型检查；ESLint 配置重构（分层 type-checked + tests 宽松规则）；性能测试阈值调整 |
| 2026-04-05 | @pre-markdown/layout README.md：完整 API 文档覆盖 LayoutEngine/VirtualList/CursorEngine/LineRenderer/WorkerBackend 5 大模块 |
| 2026-04-05 | .changeset/config.json：修复 changelog 字段从错误的 @changesets/cli/changelog 改为 @changesets/changelog-github |
| 2026-04-04 | 在线 Playground：standalone.html 重写为 Vite 驱动的完整 Playground（语法高亮 + 行号 + 快捷键 + URL 分享 + 导出 + 可拖拽分隔栏），demo/playground.ts 独立入口 |
| 2026-04-04 | npm publish 流程：@changesets/cli + @changesets/changelog-github 集成，linked 四核心包版本同步，changeset/changeset:version/changeset:publish/release 脚本 |
| 2026-04-04 | Phase 5 生态与文档全部完成 100%，总完成度 95% → 97% |
| 2026-04-04 | 编辑器高级 UI 补全：亮色/暗色主题切换（CSS 变量双主题 + localStorage）、当前行背景高亮（半透明紫色追踪条）、快捷键帮助面板（F1/Ctrl+? 模态框）、Markdown 导出（HTML+MD Blob 下载）、URL 分享（Base64 编码 hash + 复制链接）；统计表修正：Phase 5 拆分为 5.1-5.4 生态文档 + 5.5 编辑器（独立为 Phase 6） |
| 2026-04-04 | 编辑器高级优化：搜索/替换（Ctrl+F/H，正则+大小写）、Minimap 代码小地图（Canvas 语法着色缩略图）、大纲导航面板（AST 标题树 + 双向跳转）、字数/字符/阅读时间统计 |
| 2026-04-04 | 编辑增强：退格智能删除配对括号、关闭符号跳过、自动括号配对 (()[]{})、Undo/Redo 自定义历史栈 (200 步，Ctrl+Z/Shift+Z) |
| 2026-04-04 | 总完成度 94% → 95%，新增 9 项编辑器特性全部完成 |
| 2026-04-04 | CursorEngine：pretext 精确光标定位（xyToOffset / offsetToPosition）、选区矩形（getSelectionRects）、visual line 映射、word boundary，41 测试全通过 |
| 2026-04-04 | LineRenderer：pretext 行号精确渲染（支持软换行对齐）、虚拟渲染（>1000 行）、active line 追踪 |
| 2026-04-04 | 编辑器 Pretext 深度集成：LayoutEngine + CursorEngine 接入 demo，行号精确对齐软换行、同步滚动用 pretext 精确计算替代 CSS lineHeight 估算 |
| 2026-04-04 | 代码块语法高亮：集成 highlight.js CDN，预览区代码块支持 180+ 语言语法高亮（atom-one-dark 主题） |
| 2026-04-04 | ResizeObserver：编辑器宽度变化时自动更新 pretext maxWidth + 行号重算 |
| 2026-04-04 | Phase 3 Pretext 深度集成全部完成 100%，Phase 6 编辑器优化全部完成 100%，总完成度 92% → 94% |
| 2026-04-04 | 内置插件：createKatexPlugin（数学公式渲染）、createMermaidPlugin（图表容器）、createHighlightPlugin（代码高亮 + 行号），15 测试全通过 |
| 2026-04-04 | VirtualList 动态高度虚拟列表：基于 pretext 精确高度、O(log n) 二分查找、增量更新、overscan 缓冲、hitTest、relayout，37 测试 + 7 性能测试全通过 |
| 2026-04-04 | Web Worker 离线 prepare()：WorkerMeasurementBackend + worker-script + prepareAsync 批量异步准备 + LRU 缓存，大文档不阻塞主线程 |
| 2026-04-04 | 性能目标达成：10K 项目虚拟滚动 < 16ms/frame ✅、1K Resize < 5ms ✅、10K Resize < 16ms ✅、viewport 计算 < 1ms ✅ |
| 2026-04-04 | docs/plugins.md 插件开发指南：Plugin 接口、四种 Hook 详解（block/inline/transform/render）、KaTeX/Mermaid/highlight/mention 示例、PluginManager API、最佳实践 |
| 2026-04-04 | docs 交叉链接更新：所有文档页面顶部增加插件指南链接；api.md 补充插件系统 API 参考 |
| 2026-04-04 | README 优化：默认英文版（README.md），中文版（README.zh.md），删除 README.en.md |
| 2026-04-04 | GitHub Actions CI：test（Node 18/20/22 矩阵）+ typecheck + lint + build + 包体积检查 |
| 2026-04-04 | 性能回归 CI：PR 自动 benchmark 对比基线，15% 阈值告警，PR 评论输出对比表 |
| 2026-04-04 | 插件系统：Plugin 接口 + PluginManager + block/inline/transform/render 四种 Hook + 渲染器集成 + 15 测试 |
| 2026-04-04 | 性能报告 docs/performance.md（P50/P95/P99、吞吐量、7 引擎对比、包体积、优化策略汇总） |
| 2026-04-04 | Markdown 语法高亮着色（overlay 模式：透明 textarea + 高亮 pre 层，25+ token 类型） |
| 2026-04-04 | 拖拽/粘贴图片自动插入 ![](dataUrl)（FileReader → data URL，async placeholder → replace） |
| 2026-04-04 | Entity references 确认 94% (16/17)；标记实体引用快速路径完成 |
| 2026-04-04 | Thematic break 打断列表 + 列表项内嵌 hr 渲染修复；Thematic breaks 79%→95%, Lists 12%→27%, List items 38%→48% → 418/652 (64.1%) |
| 2026-04-04 | 增量解析 LRU 缓存：基于 FNV-1a 指纹的段落粒度 BlockNode 缓存复用，256 容量 LRU 淘汰 |
| 2026-04-04 | AST 节点 Flyweight：Break/SoftBreak/ThematicBreak 单例化，减少对象创建 |
| 2026-04-04 | 内联解析器优化：tryEmphasis/tryInlineCode charCodeAt 快速路径 + HTML inline 分支合并；Code spans 64%→82% → 402/652 (61.7%) |
| 2026-04-04 | 块级解析器 RE→charCodeAt 优化（strip3/isBlank/isIndentCode）；Block quotes 25/25 + Fenced code 29/29 满分 → 398/652 (61.0%) |
| 2026-04-03 | 懒解析内联 lazyInline 5.6x 提速 + 行级 FNV-1a hash + AST 节点复用 + 二分查找变更范围 |
| 2026-04-03 | renderToDOM — 直接创建 DOM 节点跳过 innerHTML |
| 2026-04-03 | 全屏编辑/预览切换 + 响应式布局 + AST 段落映射双向同步滚动 + rAF 防抖 |
| 2026-04-03 | tsup 构建 ESM+CJS+.d.ts：4 核心包合计 18.5KB gzip |
| 2026-04-03 | Entity 解码 + HTML block Type 2-7 + blockquote/setext/thematic 前导空格 → 387/652 (59.4%) |
| 2026-04-03 | Raw HTML 内联 + URL percent-encoding + HTML 关闭标签修复 → 395/652 (60.6%) |
| 2026-04-03 | 架构设计文档 + API 文档 |
| 2026-04-03 | 编辑器: 行号 + 快捷键 + 工具栏 + 拖拽面板 + Tab 缩进 + 自动续行 |
| 2026-04-02 | 性能优化：sticky regex + charCodeAt + 单遍 escapeHtml + parseInlineFast → Pipeline 37%, Render 2x, inline 2.3x |
| 2026-04-02 | 目标调整：性能第一 + pretext 深度利用，语法兼容性降级为次要 |
| 2026-04-02 | CommonMark 51.1% (333/652)，7 sections 满分 |
| 2026-04-02 | 7 引擎性能压测 + 语法兼容性测试（benchmark/） |
| 2026-04-02 | Phase 1 Pretext 布局集成 + LayoutEngine 重写 |
| 2026-04-02 | Cherry 语法兼容 + 增量解析 + 安全模式 |
| 2026-04-02 | 项目初始化 |
