# PreMarkdown — Harness Engineering 任务拆解

> 本文档按 **Harness Engineering** 模式组织全部开发任务。  
> 每个任务完成后标记 `[x]`，进行中标记 `[-]`，未开始标记 `[ ]`。  
> 最后更新：2026-04-02

---

## 项目进度总览

| 阶段 | 状态 | 进度 |
|------|------|------|
| Phase 0：基础设施 | ✅ 已完成 | 100% |
| Phase 1：核心解析引擎 | ✅ 已完成 | 100% |
| Phase 2：Pretext 布局集成 | 🔨 进行中 | 70% |
| Phase 3：编辑器 UI | ⏳ 待开始 | 20% |
| Phase 4：扩展语法插件 | ⏳ 待开始 | 0% |
| Phase 5：高级功能 | ⏳ 待开始 | 0% |
| Phase 6：性能调优与文档 | ⏳ 待开始 | 0% |

---

## Phase 0：基础设施 ✅

> **里程碑**：项目脚手架 + Harness 框架搭建  
> **验证标准**：Monorepo 可构建、测试 Harness 可运行、Benchmark 模板可执行

### 0.1 Monorepo 搭建
- [x] 初始化 pnpm workspace（`pnpm-workspace.yaml`）
- [x] 创建根 `package.json`（含 build/dev/test/bench/lint 脚本）
- [x] 配置 TypeScript 严格模式（`tsconfig.json`，ES2022 目标，path alias）
- [x] 配置 Vitest（`vitest.config.ts`，覆盖率阈值 90/90/85/90）
- [x] 配置 ESLint + Prettier（`.eslintrc.json`，`.prettierrc`）
- [x] 配置 `.gitignore`

### 0.2 包结构初始化
- [x] `@pre-markdown/core` — 包骨架 + package.json + tsconfig.json
- [x] `@pre-markdown/parser` — 包骨架 + 依赖 core
- [x] `@pre-markdown/layout` — 包骨架 + 依赖 core + pretext
- [x] `@pre-markdown/renderer` — 包骨架 + 依赖 core
- [x] `@pre-markdown/editor` — 包骨架 + 依赖全部子包
- [x] `@pre-markdown/harness` — 测试 Harness 包

### 0.3 Harness 框架
- [x] 创建 `harness/benchmarks/parse.bench.ts` — 性能基准测试模板
- [x] 创建 `harness/specs/parser.spec.md` — 解析器规格说明
- [x] 创建 `harness/specs/layout.spec.md` — 布局引擎规格说明
- [x] 创建 `harness/fixtures/` — 测试夹具文件（basic.md / complex.md / stress-10k.md）
- [x] 创建 `harness/benchmarks/layout.bench.ts` — 布局性能基准模板
- [x] 创建 `harness/benchmarks/render.bench.ts` — 渲染性能基准模板
- [ ] 创建 Cherry Markdown 性能基线采集脚本

### 0.4 文档骨架
- [x] README.md — 项目说明
- [ ] `docs/architecture.md` — 架构设计文档
- [ ] `docs/api.md` — API 文档

---

## Phase 1：核心解析引擎 🔨

> **里程碑**：完整 Markdown AST 解析  
> **验证标准**：所有语法单测通过，语法兼容性矩阵覆盖 CommonMark + GFM + Cherry 扩展

### 1.1 AST 类型系统（@pre-markdown/core）
- [x] `Position` / `SourceLocation` / `BaseNode` 基础类型
- [x] 16 种块级节点类型定义（Document → TOC）
- [x] 22 种内联节点类型定义（Text → Autolink）
- [x] `BlockNode` / `InlineNode` / `ASTNode` / `NodeType` 联合类型
- [x] 38 个 AST Builder 工厂函数（自增 ID）
- [x] AST Visitor：`walk` / `findAll` / `findFirst` / `isBlockNode` / `isInlineNode` / `getTextContent`
- [x] EventBus 类型安全事件系统（8 种预定义事件）

### 1.2 AST 类型测试
- [x] AST Builder 测试（ast-builder.test.ts，245 行）
- [x] AST Visitor 测试（ast-visitor.test.ts，178 行）
- [x] EventBus 测试（event-bus.test.ts，98 行）

### 1.3 块级解析器（@pre-markdown/parser）
- [x] ATX 标题解析（H1-H6，含关闭 # 号）
- [x] Setext 标题解析（=== 和 --- 下划线）
- [x] 段落解析（空行分隔、连续行合并）
- [x] 围栏代码块（反引号/波浪线，带语言标识）
- [x] 缩进代码块（4 空格/Tab）
- [x] 引用块（嵌套支持、延迟续行）
- [x] 无序列表（- / * / +）
- [x] 有序列表（数字.）
- [x] 任务列表（`[x]` / `[ ]`）
- [x] 主题分隔线（--- / *** / ___）
- [x] GFM 表格（含对齐）
- [x] 数学块（$$...$$）
- [x] 自定义容器（::: type title）
- [x] TOC 占位符（[[toc]]）
- [x] HTML 块（Type 1 + Type 6）
- [x] 脚注定义解析（`[^id]: content`）
- [x] 增量解析协议（检测变更行范围、局部重解析、合并 AST、发射变更事件）

### 1.4 内联解析器（@pre-markdown/parser）
- [x] 纯文本
- [x] 强调 / 加粗（* / _ 单/双/三重）
- [x] 行内代码（反引号，含双反引号嵌套）
- [x] 链接（`[text](url "title")`）
- [x] 图片（`![alt](url "title")`）
- [x] 自动链接（`<url>` / `<email>`）
- [x] HTML 内联标签
- [x] 硬换行 / 软换行
- [x] 转义字符
- [x] 删除线（~~text~~）
- [x] 高亮（==text==）
- [x] 上标（^text^）
- [x] 下标（~text~）
- [x] 行内数学（$formula$）
- [x] 脚注引用（[^id]）
- [x] 字体颜色解析（`{color:red}text{/color}` + Cherry `!!red text!!`）
- [x] 字体大小解析（`{size:20px}text{/size}` + Cherry `!24 text!`）
- [x] 字体背景色解析（`{bgcolor:yellow}text{/bgcolor}` + Cherry `!!!yellow text!!!`）
- [x] Ruby 注音解析（`{漢字}(かんじ)` + Cherry `{漢字|かんじ}`）
- [x] Emoji 短码解析（`:smile:` → 😄）
- [x] 音频语法解析（`!audio[title](url)`）
- [x] 视频语法解析（`!video[title](url)`）
- [x] 下划线解析（Cherry `/text/`）
- [x] Cherry 下标兼容（`^^text^^`）
- [x] 面板类型缩写（p/i/w/d/s/l/c/r/j → primary/info/warning/...）
- [x] 折叠块 Detail（Cherry `+++title / +++`）
- [x] FrontMatter（`---yaml---`）
- [x] TOC 扩展格式（`[toc]` / `[[toc]]` / `【【toc】】`）

### 1.5 解析器测试
- [x] 块级解析器测试（block-parser.test.ts，280 行）
- [x] 内联解析器测试（inline-parser.test.ts，249 行）
- [x] 脚注定义解析测试（block-parser.test.ts，6 用例）
- [x] 扩展内联语法测试（inline-extended.test.ts，35 用例）
- [x] 边界用例测试（edge-cases.test.ts，53 用例：深层嵌套、畸形输入、Unicode）
- [ ] CommonMark 规格测试套件集成（652 cases）
- [ ] GFM 规格测试套件集成（~200 cases）

### 1.6 渲染器（@pre-markdown/renderer）
- [x] Document → HTML 字符串渲染
- [x] 全部 38 种节点类型 HTML 渲染
- [x] HTML 实体转义（escapeHtml / escapeAttr）
- [x] 标题锚点 ID 生成
- [x] 代码高亮 Hook
- [x] 安全模式（sanitize）
- [x] URL 安全过滤（sanitizeUrl — 阻止 javascript:/vbscript:/data: 协议）
- [x] CSS 值安全过滤（sanitizeCssValue — 防止样式注入）
- [ ] DOM 节点渲染（renderToDOM，非字符串）
- [ ] 增量渲染（Diff AST → 局部 DOM 更新）

### 1.7 渲染器测试
- [x] 基础渲染测试（renderer.test.ts，232 行）
- [x] 全量语法渲染快照测试（renderer-snapshot.test.ts，40 用例）
- [x] HTML 安全性测试（XSS 向量，17 用例）

---

## Phase 2：Pretext 布局集成 ⏳

> **里程碑**：零 DOM 重排的文本布局  
> **验证标准**：layout 基准测试通过性能目标，虚拟化滚动流畅

### 2.1 Pretext 集成（@pre-markdown/layout）
- [x] 安装并引入 `@chenglou/pretext`
- [x] 实现 `prepare()` 集成 — 文本规范化 + 片段测量（替换当前桩实现）
- [x] 实现 `layout()` 集成 — 纯算术行断开（替换当前简单行计数）
- [x] 实现 `layoutWithLines()` — 获取每行文本、宽度、光标位置
- [x] 实现 PreparedText 缓存（LRU 512 条，按 `(text, font, whiteSpace)` 键值缓存）
- [x] 实现缓存失效策略（文本变更、字体变更、locale 变更时失效）
- [x] 实现 `setLocale()` 处理区域设置
- [x] 支持多字体（CSS font 简写格式）
- [x] 可插拔 MeasurementBackend（浏览器用真正 pretext，Node.js 测试用 fallback）
- [x] 多段落文档布局（`computeDocumentLayout`）
- [x] 滚动位置命中测试（`hitTest`）

### 2.2 虚拟化滚动
- [x] 实现视口布局计算（`computeViewportLayout`，含可配置缓冲区，默认 2x）
- [x] 实现滚动位置映射（scrollTop ↔ 文档行号，via hitTest）
- [ ] 实现动态高度虚拟列表（基于 Pretext 精确高度）
- [ ] 实现滚动防抖与 requestAnimationFrame 调度

### 2.3 Layout 测试与基准
- [x] Layout 单元测试（layout-engine.test.ts，34 用例：配置/布局/视口/缓存/后端/边界）
- [x] `harness/benchmarks/layout.bench.ts` — 实际 Pretext 基准测试
  - [ ] `prepare()` 500 段文本 ≤ 19ms（需浏览器环境验证）
  - [ ] `layout()` 500 段文本 ≤ 0.09ms（需浏览器环境验证）
  - [ ] 视口布局 < 1ms
  - [ ] 窗口 Resize < 5ms

### 2.4 Layout Spec 验证
- [x] 更新 `harness/specs/layout.spec.md` 与实际实现对齐
- [ ] 生成 Layout 性能报告

---

## Phase 3：编辑器 UI ⏳

> **里程碑**：可用的编辑器界面  
> **验证标准**：三种编辑模式可切换，工具栏/快捷键/主题均可用

### 3.1 编辑器核心（@pre-markdown/editor）
- [ ] 重构 `PreMarkdownEditor` — 移除简单 textarea，实现 ContentEditable 或自定义输入层
- [ ] 实现输入监听（keydown / input / compositionstart/end）
- [ ] 实现光标管理（Selection API 集成）
- [ ] 实现多光标编辑
- [ ] 实现撤销/重做栈（Undo/Redo History）

### 3.2 编辑模式
- [ ] 分栏预览模式（Split）— 左编辑右预览，同步滚动
- [ ] 纯编辑模式（Edit）— 仅编辑区
- [ ] 纯预览模式（Preview）— 仅渲染区
- [ ] 模式切换 API 与 UI

### 3.3 工具栏与菜单
- [ ] 浮动工具栏（新行开头自动出现，含常用格式操作）
- [ ] 气泡菜单（选中文本时出现，含加粗/斜体/链接等）
- [ ] 固定工具栏组件（可选）
- [ ] 输入建议 / 自动补全（`/` 命令面板）

### 3.4 主题系统
- [ ] 亮色主题（Light）
- [ ] 暗色主题（Dark）
- [ ] CSS 变量化主题系统
- [ ] 主题切换 API

### 3.5 快捷键系统
- [ ] 默认快捷键映射（Ctrl+B 加粗、Ctrl+I 斜体 等）
- [ ] 可自定义快捷键 API
- [ ] 快捷键冲突检测

### 3.6 编辑器测试
- [ ] 输入处理单元测试
- [ ] 选区管理单元测试
- [ ] 快捷键系统单元测试
- [ ] 模式切换测试

---

## Phase 4：扩展语法插件 ⏳

> **里程碑**：全量扩展语法支持  
> **验证标准**：所有扩展插件测试通过，插件系统 Hook 链路完整

### 4.1 插件系统
- [ ] 定义插件接口（`PreMarkdownPlugin`）
- [ ] 实现插件注册机制（`editor.use(plugin)`）
- [ ] 实现插件生命周期（`install` / `activate` / `deactivate` / `destroy`）
- [ ] 实现语法扩展 Hook（解析阶段插入自定义规则）
- [ ] 实现渲染扩展 Hook（渲染阶段插入自定义渲染器）

### 4.2 数学公式插件（@pre-markdown/plugin-math）
- [ ] 集成 KaTeX 库
- [ ] 行内公式渲染（`$...$` → KaTeX HTML）
- [ ] 块级公式渲染（`$$...$$` → KaTeX HTML）
- [ ] 公式编辑交互（点击编辑、实时预览）
- [ ] 数学公式测试

### 4.3 Mermaid 图表插件（@pre-markdown/plugin-mermaid）
- [ ] 集成 Mermaid 库
- [ ] 流程图 / 时序图 / 甘特图渲染
- [ ] 图表尺寸编辑（拖拽调整大小）
- [ ] 图表对齐（居中/左/右/浮动）
- [ ] Mermaid 测试

### 4.4 媒体插件（@pre-markdown/plugin-media）
- [ ] 音频嵌入与播放器 UI
- [ ] 视频嵌入与播放器 UI
- [ ] 媒体尺寸控制
- [ ] 媒体测试

### 4.5 表格增强插件（@pre-markdown/plugin-table）
- [ ] 表格可视化编辑（增删行列、拖拽调整）
- [ ] 表格转图表（集成 ECharts 或类似库）
- [ ] 表格增强测试

### 4.6 插件系统测试
- [ ] 插件注册/注销测试
- [ ] 插件生命周期测试
- [ ] Hook 链路测试
- [ ] 插件冲突处理测试

---

## Phase 5：高级功能 ⏳

> **里程碑**：生产就绪  
> **验证标准**：流式渲染可用、导出功能正常、安全测试通过

### 5.1 增量/流式渲染
- [ ] 实现增量解析（文本变更 → 局部 AST 更新）
- [ ] 实现增量渲染（AST Diff → 局部 DOM 更新）
- [ ] 实现流式渲染（逐 token 输入 → 实时渲染，自动补全语法元素）
- [ ] 流式渲染性能测试（< 2ms/token）

### 5.2 富文本粘贴
- [ ] 实现 HTML → Markdown 转换器
- [ ] 支持从 Word / Google Docs / Notion 粘贴
- [ ] 保留表格、列表、格式等结构
- [ ] 粘贴转换测试

### 5.3 导出功能
- [ ] 导出为图片（HTML → Canvas → PNG/JPEG）
- [ ] 导出为 PDF（HTML → Print/PDF 库）
- [ ] 导出配置（分辨率、样式、页边距）

### 5.4 悬浮目录导航
- [ ] 从 AST 提取标题树（H1-H6 层级）
- [ ] 渲染悬浮 TOC 面板
- [ ] 点击跳转 + 滚动高亮当前节
- [ ] TOC 自动更新

### 5.5 安全性
- [ ] 集成 DOMPurify
- [ ] 实现白名单过滤机制
- [ ] 自定义安全 Hook API
- [ ] XSS 测试向量覆盖

### 5.6 高级功能测试
- [ ] 流式渲染测试
- [ ] 粘贴转换测试
- [ ] 导出功能测试
- [ ] 安全性测试

---

## Phase 6：性能调优与文档 ⏳

> **里程碑**：性能目标达成，文档完整  
> **验证标准**：所有性能指标达标，完整文档交付

### 6.1 Cherry Markdown 基线采集
- [ ] 部署 Cherry Markdown 测试环境
- [ ] 采集首次渲染基线（100/1K/10K 行）
- [ ] 采集增量更新基线
- [ ] 采集窗口 Resize 基线
- [ ] 采集大文档滚动基线（帧率）
- [ ] 采集内存占用基线

### 6.2 性能优化
- [ ] 解析器优化（热路径 profiling、正则预编译、对象池）
- [ ] 渲染器优化（DOM 复用、批量更新、虚拟 DOM Diff）
- [ ] 布局引擎优化（缓存命中率、预计算、Worker 线程）
- [ ] 内存优化（AST 节点池、WeakRef、按需加载）

### 6.3 性能验证（目标对比）

| 指标 | 目标 | 状态 |
|------|------|------|
| 首次渲染 1000 行 | < Cherry 基线 50% | [ ] |
| 增量更新（单行编辑） | < 5ms | [ ] |
| 窗口 Resize 重排 | < 1ms | [ ] |
| 大文档滚动 10000 行 | 60fps | [ ] |
| 内存占用 10000 行 | < Cherry 基线 70% | [ ] |
| 流式渲染 | < 2ms/token | [ ] |

### 6.4 文档编写
- [ ] `docs/architecture.md` — 架构设计文档（技术选型、模块划分、数据流、扩展机制）
- [ ] `docs/performance.md` — 性能测试报告（含 P50/P95/P99 延迟、内存峰值、帧率、对比分析）
- [ ] `docs/syntax-spec.md` — 语法规格文档（语法兼容性矩阵、测试用例清单、覆盖率）
- [ ] `docs/api.md` — API 文档（编辑器 API、插件 API、配置项）
- [ ] 更新 `README.md` — 安装指南、使用示例、开发指南

### 6.5 测试覆盖率达标
- [ ] 行覆盖率 > 90%
- [ ] 函数覆盖率 > 90%
- [ ] 分支覆盖率 > 85%
- [ ] 语句覆盖率 > 90%

---

## 任务统计

| 类别 | 总计 | 已完成 | 进行中 | 未开始 |
|------|------|--------|--------|--------|
| Phase 0 | 23 | 22 | 0 | 1 |
| Phase 1 | 51 | 49 | 0 | 2 |
| Phase 2 | 22 | 16 | 0 | 6 |
| Phase 3 | 22 | 0 | 0 | 22 |
| Phase 4 | 21 | 0 | 0 | 21 |
| Phase 5 | 19 | 0 | 0 | 19 |
| Phase 6 | 20 | 0 | 0 | 20 |
| **合计** | **178** | **87** | **0** | **91** |

> 当前总体完成度：**≈ 49%**

---

## 变更日志

| 日期 | 变更内容 |
|------|---------|
| 2026-04-02 | Phase 2 Pretext 集成：重写 LayoutEngine 真正调用 @chenglou/pretext API、LRU 缓存、可插拔 Backend、视口虚拟化、多段落布局、hitTest + 34 测试 + benchmark 更新 |
| 2026-04-02 | Cherry 语法兼容：!!color!! / !size! / !!!bg!!! / ^^sub^^ / {text\|ann} / /underline/ / +++ detail / --- frontmatter / [toc] 扩展 / 面板缩写 + 41 兼容测试 |
| 2026-04-02 | 增量解析协议 + 边界测试(53) + 渲染快照测试(40) + XSS安全测试(17) + URL/CSS安全过滤 + fixture文件 + benchmark模板 |
| 2026-04-02 | 实现脚注定义解析 + 7 种扩展内联语法（字体颜色/大小/背景色/Ruby/Emoji/音频/视频）+ 41 个新测试用例 |
| 2026-04-02 | 初始化任务拆解文档，评估现有代码进度 |
