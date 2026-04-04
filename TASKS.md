# PreMarkdown — 任务拆解

> **目标**：基于 pretext 构建全行业性能最佳的 Markdown 引擎，充分利用 pretext 零 DOM 重排布局能力  
> **核心原则**：性能第一，语法兼容性够用即可（CommonMark 主流 sections 通过，不追求 100%）  
> 每个任务完成后标记 `[x]`，进行中标记 `[-]`，未开始标记 `[ ]`。  
> 最后更新：2026-04-04

---

## 项目进度总览

| 阶段 | 状态 | 进度 |
|------|------|------|
| Phase 1：核心引擎 | ✅ 已完成 | 100% |
| Phase 2：性能优化（核心） | ✅ 已完成 | 100% |
| Phase 3：Pretext 深度集成（核心） | 🔨 进行中 | 80% |
| Phase 4：语法兼容性（次要） | 🔨 进行中 | 70% |
| Phase 5：生态与文档 | 🔨 进行中 | 85% |
| Phase 6：编辑器输入框优化 | 🔨 进行中 | 80% |

---

## Phase 1：核心引擎 ✅

> **里程碑**：完整的 Parse → AST → Render 流水线  
> **验证标准**：376 测试通过，所有已实现语法 Demo 可渲染

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

## Phase 2：性能优化（核心）🔨

> **里程碑**：在 benchmark 6 引擎对比中，PreMarkdown 全面领先  
> **验证标准**：所有文件规模下解析+渲染耗时 ≤ marked，显著快于 markdown-it/Cherry  
> **原则**：这是项目的核心竞争力，最高优先级

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

## Phase 3：Pretext 深度集成（核心）🔨

> **里程碑**：充分发挥 pretext 零 DOM 重排布局的能力  
> **验证标准**：文本测量、布局计算完全脱离 DOM，编辑器体验流畅无卡顿  
> **原则**：pretext 是本项目的核心差异化技术，必须深度利用

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
- [ ] 光标定位（x,y 坐标 → 文档 offset，完全通过 pretext 计算）
- [ ] 选区高亮（基于 pretext 行信息渲染选区矩形）
- [ ] 自动换行计算（纯 pretext，零 DOM reflow）
- [ ] 行号渲染（基于 pretext lineCount，非 DOM 计数）

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

## Phase 5：生态与文档 ⏳

> 同前，不变

### 5.1 插件系统
- [x] 插件接口 + 语法扩展 Hook + 渲染扩展 Hook（Plugin/PluginManager，block/inline/transform/render 四种 Hook）
- [x] 内置插件：KaTeX / Mermaid / 代码高亮（createKatexPlugin / createMermaidPlugin / createHighlightPlugin）

### 5.2 npm 发布
- [x] ESM + CJS + .d.ts 构建（tsup，4 个核心包全部通过）
- [x] 包体积审计：core 2KB + parser 10.8KB + renderer 2.7KB + layout 3KB = **18.5KB gzip**（目标 < 30KB ✅）
- [x] package.json exports (types + import + require) + sideEffects: false + license
- [ ] npm publish 流程（changeset）

### 5.3 文档
- [x] `docs/architecture.md` — 架构设计（两阶段流水线、AST 设计、性能优化策略、pretext 集成）
- [x] `docs/api.md` — API 文档（parse / renderToHtml / IncrementalParser / LayoutEngine 完整参数）
- [x] `docs/performance.md` — 性能报告（7 引擎对比数据）
- [x] `docs/plugins.md` — 插件开发指南（Plugin 接口、四种 Hook 详解、完整示例、最佳实践）

### 5.4 CI/CD + Demo
- [x] 6 引擎压测 + 兼容性测试页面
- [x] GitHub Actions (test + typecheck + lint + build + bench regression)
- [ ] 在线 Playground

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
- [ ] 代码块内语法高亮（集成 Prism / Shiki）

#### 编辑增强
- [x] 快捷键：Ctrl+B 加粗、Ctrl+I 斜体、Ctrl+K 链接、Ctrl+` 代码、Ctrl+D 删除线
- [x] 自动补全：`- ` 列表续行、`> ` 引用续行、有序列表自增编号
- [x] Tab / Shift+Tab 缩进/反缩进（单行 + 多行选区支持）
- [x] 括号/引号自动配对 + 选中文字自动包裹（`*` `_` `` ` `` `~` `[` `(` `"` `'`）
- [x] 拖拽/粘贴图片自动插入 `![](url)` 占位

#### 工具栏
- [x] Markdown 工具栏（H1-H3/加粗/斜体/删除线/代码/链接/图片/列表/任务/引用/代码块/表格/分隔线）
- [x] 工具栏按钮操作插入对应语法到光标位置

#### Pretext 集成
- [ ] 基于 pretext 的精确光标定位（x,y → offset）
- [ ] 基于 pretext 的选区高亮渲染
- [ ] 基于 pretext 的自动换行计算（替代 textarea 原生换行）
- [ ] 大文档虚拟滚动（只渲染可视区域行）

#### 同步滚动
- [x] 基于 AST 的精确同步滚动（按段落映射，非比例 + rAF 防抖）
- [x] 编辑器 → 预览 + 预览 → 编辑器双向同步

---

## 任务统计

| 类别 | 总计 | 已完成 | 未开始 |
|------|------|--------|--------|
| Phase 1：核心引擎 | 50 | 50 | 0 |
| Phase 2：性能优化 | 20 | 20 | 0 |
| Phase 3：Pretext 深度集成 | 15 | 12 | 3 |
| Phase 4：语法兼容性 | 12 | 7 | 5 |
| Phase 5：生态与文档 | 10 | 9 | 1 |
| **合计** | **107** | **98** | **9** |

> 当前总体完成度：**≈ 92%**

---

## 变更日志

| 日期 | 变更内容 |
|------|---------|
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
