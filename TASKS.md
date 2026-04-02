# PreMarkdown — 任务拆解

> **目标**：基于 pretext 构建全行业性能最佳、语法兼容性最强的 Markdown 引擎  
> 每个任务完成后标记 `[x]`，进行中标记 `[-]`，未开始标记 `[ ]`。  
> 最后更新：2026-04-02

---

## 项目进度总览

| 阶段 | 状态 | 进度 |
|------|------|------|
| Phase 1：核心引擎 | ✅ 已完成 | 100% |
| Phase 2：语法兼容性 | 🔨 进行中 | 30% |
| Phase 3：性能优化 | 🔨 进行中 | 40% |
| Phase 4：规范合规 | ⏳ 待开始 | 0% |
| Phase 5：生态与文档 | ⏳ 待开始 | 0% |

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
- [x] ATX 标题（H1-H6，含关闭 # 号）
- [x] Setext 标题（=== / ---）
- [x] 段落（空行分隔、连续行合并）
- [x] 围栏代码块（反引号/波浪线，带语言标识）
- [x] 缩进代码块（4 空格/Tab）
- [x] 引用块（嵌套、延迟续行）
- [x] 无序列表（- / * / +）、有序列表（数字.）、任务列表（[x]/[ ]）
- [x] 主题分隔线（--- / *** / ___）
- [x] GFM 表格（含对齐）
- [x] 数学块（$$...$$）
- [x] 自定义容器（::: type title + Cherry 面板缩写）
- [x] 折叠块 Detail（+++ title / +++）
- [x] TOC 占位符（[toc] / [[toc]] / 【【toc】】）
- [x] HTML 块（Type 1 + Type 6）
- [x] 脚注定义（[^id]: content）
- [x] FrontMatter（---yaml---）

### 1.3 内联解析器（@pre-markdown/parser）
- [x] 强调/加粗（* / _ 单/双/三重）
- [x] 行内代码（反引号，含双反引号嵌套）
- [x] 链接 `[text](url "title")` + 图片 `![alt](url)`
- [x] 自动链接（`<url>` / `<email>`）
- [x] HTML 内联标签、硬换行/软换行、转义字符
- [x] 删除线 ~~text~~、高亮 ==text==、上标 ^text^、下标 ~text~ / ^^text^^
- [x] 行内数学 $formula$、脚注引用 [^id]
- [x] 字体颜色 `!!color text!!` + `{color:red}text{/color}`
- [x] 字体大小 `!size text!` + `{size:20px}text{/size}`
- [x] 背景色 `!!!color text!!!` + `{bgcolor:yellow}text{/bgcolor}`
- [x] Ruby 注音 `{text|ann}` + `{text}(ann)`
- [x] Emoji 短码 `:smile:` → 😄（60+ 常用 emoji）
- [x] 音频 `!audio[title](url)` / 视频 `!video[title](url)`
- [x] 下划线 `/text/`

### 1.4 渲染器（@pre-markdown/renderer）
- [x] Document → HTML 字符串渲染（全部 38+ 节点类型）
- [x] HTML 实体转义（escapeHtml / escapeAttr）
- [x] 标题锚点 ID 生成
- [x] 代码高亮 Hook
- [x] 安全模式（sanitize: URL 过滤 + CSS 值过滤 + 实体转义）

### 1.5 增量解析器
- [x] `IncrementalParser` — 检测变更行范围、局部重解析、合并 AST、发射 EventBus 事件

### 1.6 Pretext 布局引擎（@pre-markdown/layout）
- [x] 集成 @chenglou/pretext `prepare()` + `layout()` + `layoutWithLines()`
- [x] LRU 缓存（512 PreparedText + 256 WithSegments）
- [x] 可插拔 MeasurementBackend（浏览器=pretext / Node.js=fallback）
- [x] 视口虚拟化布局（computeViewportLayout，2x 缓冲区）
- [x] 多段落文档布局（computeDocumentLayout）/ hitTest

### 1.7 测试（376 用例全部通过）
- [x] AST Builder 测试（30）+ Visitor 测试（12）+ EventBus 测试（7）
- [x] 块级解析器测试（39）+ 内联解析器测试（28）+ 扩展内联测试（35）
- [x] 脚注测试（6）+ Cherry 兼容测试（41）+ 边界用例测试（53）
- [x] 增量解析器测试（17）
- [x] 渲染器测试（23）+ 渲染快照测试（57）+ XSS 安全测试（17）
- [x] Layout 引擎测试（34）

---

## Phase 2：语法兼容性 🔨

> **里程碑**：全行业最强语法兼容性  
> **验证标准**：CommonMark 652 cases 通过率 ≥ 98%，GFM 200 cases 通过率 ≥ 95%

### 2.1 CommonMark 规范合规（652 cases）
- [ ] 下载 CommonMark spec 0.31.2 测试数据集
- [ ] 搭建 spec 测试运行器（spec JSON → parse → renderToHtml → 比对 expected HTML）
- [ ] 首轮运行，统计基线通过率
- [ ] 修复 ATX 标题边界（尾部空格、空标题、标题中断）
- [ ] 修复段落续行规则（Lazy continuation）
- [ ] 修复列表松散/紧凑判定
- [ ] 修复列表项缩进规则（4 空格 vs marker+1）
- [ ] 修复链接引用定义 `[ref]: url "title"`
- [ ] 修复链接引用使用 `[text][ref]` / `[ref][]` / `[ref]`
- [ ] 修复嵌套强调/加粗的分隔符优先级（"左侧限定"/"右侧限定"规则）
- [ ] 修复块引用延迟续行（lazy continuation lines）
- [ ] 修复 HTML 块 Type 1-7 完整规则
- [ ] 修复缩进代码块与列表的交互
- [ ] 修复围栏代码块关闭条件
- [ ] 修复 Setext 标题与段落的优先级
- [ ] 修复实体引用 `&amp;` / `&#123;` / `&#x7B;`
- [ ] 二轮修复，目标 ≥ 98% 通过率
- [ ] 三轮修复，目标 100% 通过率

### 2.2 GFM 规范合规（~200 cases）
- [ ] 下载 GFM spec 0.29 测试数据集
- [ ] 首轮运行，统计基线通过率
- [ ] 修复表格解析边界（管道符转义、空单元格、表头对齐）
- [ ] 修复删除线边界（空格规则、嵌套）
- [ ] 修复任务列表格式
- [ ] 修复 URL 自动链接（裸 URL 识别、域名规则、路径截断）
- [ ] 修复 HTML 标签过滤（GFM 安全规则）
- [ ] 二轮修复，目标 ≥ 95% 通过率

### 2.3 扩展语法完善
- [ ] 图片扩展属性 `![alt #300px #center #shadow](url)`（Cherry 兼容）
- [ ] 链接引用定义 + 使用 `[text][ref]`（CommonMark 标准）
- [ ] 链接 target 属性 `[text](url){target=_blank}`（Cherry 兼容）
- [ ] 列表扩展：`a.` 希腊字母 / `I.` 罗马数字 / `一.` 中文数字（Cherry 兼容）
- [ ] 代码块缩写：` ```flow ` → mermaid / ` ```seq ` → sequenceDiagram（Cherry 兼容）
- [ ] 表格图表语法：表头 `:chartType:{options}` 触发图表（Cherry 兼容）
- [ ] Emoji 扩展：覆盖完整 GitHub Emoji 列表（1800+）
- [ ] FrontMatter 增强：解析为结构化 metadata 对象（非 HTML 注释）

### 2.4 语法兼容性测试
- [x] 7 引擎对比兼容性测试页面（benchmark/compat.html）
- [ ] CommonMark spec 自动化测试套件
- [ ] GFM spec 自动化测试套件
- [ ] Cherry 语法兼容矩阵（对照 cherry-markdown 源码逐项验证）
- [ ] 语法兼容性报告生成

---

## Phase 3：性能优化 🔨

> **里程碑**：全行业主流引擎中性能最佳  
> **验证标准**：在 benchmark 7 引擎对比中，PreMarkdown 在所有文件规模下排名前 2

### 3.1 解析器性能优化
- [ ] 热路径 Profiling（Chrome DevTools / Node --prof）
- [ ] 正则预编译 + 常量提取
- [ ] 减少字符串拷贝（slice 替代 substring，避免 concat）
- [ ] 内联解析器：减少 input.slice() 调用，改用索引偏移
- [ ] 块级解析器：减少 RE.exec 重复编译
- [ ] AST 节点对象池（复用节点减少 GC 压力）
- [ ] 懒解析内联（仅在渲染时才解析段落内联内容）

### 3.2 渲染器性能优化
- [ ] 字符串拼接优化（数组 push + join 替代 += ）
- [ ] 模板预编译（静态 HTML 片段缓存）
- [ ] escapeHtml 快速路径（无特殊字符时直接返回）
- [ ] DOM 渲染模式（renderToDOM — 直接创建 DOM 节点，跳过 innerHTML 解析）
- [ ] 增量渲染（Diff AST → 局部 DOM 更新）

### 3.3 增量解析优化
- [ ] 行级 hash 指纹（快速定位变更范围）
- [ ] AST 节点复用（未变更块直接复用引用）
- [ ] 编辑感知缓存（LRU 按段落粒度缓存 AST 子树）

### 3.4 Pretext 布局优化
- [ ] 动态高度虚拟列表（基于 Pretext 精确高度）
- [ ] 滚动防抖与 requestAnimationFrame 调度
- [ ] Web Worker 离线 prepare()（大文档 prepare 不阻塞主线程）
- [ ] prepare() 500 段文本 ≤ 19ms
- [ ] layout() 500 段文本 ≤ 0.09ms

### 3.5 性能压测
- [x] 7 引擎性能压测页面（benchmark/index.html）
- [x] 13 个测试文件覆盖 1KB ~ 50MB
- [ ] 自动化 CI 性能回归测试（每次 PR 跑 benchmark，对比基线）
- [ ] 性能报告生成（P50/P95/P99 延迟、吞吐量、内存峰值）

### 3.6 性能目标

| 指标 | 目标 | 对比 marked | 对比 markdown-it | 对比 Cherry |
|------|------|-----------|-----------------|------------|
| Parse+Render 1KB | < 0.5ms | ≤ 1x | ≤ 1x | < 0.5x |
| Parse+Render 100KB | < 15ms | ≤ 1.2x | ≤ 1x | < 0.3x |
| Parse+Render 1MB | < 150ms | ≤ 1.5x | ≤ 1.2x | < 0.2x |
| 增量更新（单行） | < 1ms | - | - | - |
| pretext layout() | < 0.1ms | - | - | - |
| 核心体积 | < 30KB gzip | ~2.5x marked | ~1x md-it | < 0.05x Cherry |
| 内存占用 10K 行 | < 20MB | - | - | < 0.7x Cherry |

---

## Phase 4：规范合规与安全 ⏳

> **里程碑**：生产级安全性与规范合规  
> **验证标准**：XSS 零漏洞，规范测试 100% 通过

### 4.1 安全性
- [x] HTML 实体转义（escapeHtml / escapeAttr）
- [x] URL 协议过滤（javascript: / vbscript: / data:text）
- [x] CSS 值过滤（expression() / url() 注入）
- [ ] 集成 DOMPurify（可选，作为额外安全层）
- [ ] 白名单 HTML 标签过滤（配置允许的标签和属性）
- [ ] 自定义安全 Hook API
- [ ] XSS 测试向量完整覆盖（OWASP XSS 清单）

### 4.2 规范测试自动化
- [ ] CommonMark spec runner（JSON 数据集 → 自动化 vitest）
- [ ] GFM spec runner
- [ ] 规范通过率 Badge 生成
- [ ] CI 集成（每次提交自动跑规范测试）

### 4.3 流式渲染（AI 场景）
- [ ] 流式解析（逐 token 输入 → 增量 AST 更新 → 实时渲染）
- [ ] 自动补全未闭合语法（代码块、表格、列表等）
- [ ] 流式渲染性能 < 2ms/token
- [ ] 流式渲染测试

---

## Phase 5：生态与文档 ⏳

> **里程碑**：npm 可发布，社区可贡献  
> **验证标准**：文档完整，npm 发布，benchmark 页面公开

### 5.1 插件系统
- [ ] 插件接口定义（`PreMarkdownPlugin`）
- [ ] 语法扩展 Hook（解析阶段插入自定义规则）
- [ ] 渲染扩展 Hook（自定义节点渲染器）
- [ ] 内置插件：KaTeX 数学公式
- [ ] 内置插件：Mermaid 图表
- [ ] 内置插件：代码高亮（Prism / Shiki）
- [ ] 插件系统测试

### 5.2 npm 发布
- [ ] 包构建配置（ESM + CJS + .d.ts）
- [ ] 包体积审计（< 30KB gzip 核心）
- [ ] package.json exports / main / types 配置
- [ ] npm publish 流程（changeset）
- [ ] 版本管理（semver）

### 5.3 文档
- [ ] `docs/architecture.md` — 架构设计（两阶段流水线、AST 设计、pretext 集成）
- [ ] `docs/syntax-spec.md` — 语法规格（兼容性矩阵、Cherry 扩展语法对照表）
- [ ] `docs/performance.md` — 性能报告（7 引擎对比数据、优化历程）
- [ ] `docs/api.md` — API 文档（parse / renderToHtml / IncrementalParser / LayoutEngine）
- [ ] `docs/plugins.md` — 插件开发指南
- [ ] README 完善（安装、使用、配置、示例）

### 5.4 CI/CD
- [ ] GitHub Actions: test + lint + typecheck
- [ ] GitHub Actions: benchmark 性能回归
- [ ] GitHub Actions: npm 自动发布
- [ ] 覆盖率报告上传（Codecov）
- [ ] 覆盖率目标：行 90% / 函数 90% / 分支 85%

### 5.5 Demo 与 Playground
- [x] 分栏编辑器 Demo（index.html + demo/main.ts）
- [x] 7 引擎性能压测（benchmark/index.html）
- [x] 7 引擎语法兼容性测试（benchmark/compat.html）
- [ ] 在线 Playground（GitHub Pages 部署）
- [ ] Benchmark 数据可视化（图表对比）

---

## 任务统计

| 类别 | 总计 | 已完成 | 未开始 |
|------|------|--------|--------|
| Phase 1：核心引擎 | 50 | 50 | 0 |
| Phase 2：语法兼容性 | 27 | 1 | 26 |
| Phase 3：性能优化 | 25 | 2 | 23 |
| Phase 4：规范与安全 | 12 | 3 | 9 |
| Phase 5：生态与文档 | 22 | 3 | 19 |
| **合计** | **136** | **59** | **77** |

> 当前总体完成度：**≈ 43%**

---

## 变更日志

| 日期 | 变更内容 |
|------|---------|
| 2026-04-02 | 项目目标调整：从 Markdown 编辑器转为全行业性能最佳 Markdown 引擎，重写 TASKS/README |
| 2026-04-02 | 7 引擎性能压测 + 语法兼容性测试（benchmark/ 独立模块） |
| 2026-04-02 | Phase 2 Pretext 集成：LayoutEngine 真正调用 pretext API + LRU 缓存 + 虚拟化 |
| 2026-04-02 | Cherry 语法兼容：!!color!! / !size! / !!!bg!!! / ^^sub^^ / {text\|ann} / /underline/ / +++ detail / --- frontmatter / [toc] 扩展 / 面板缩写 |
| 2026-04-02 | 增量解析 + 边界测试(53) + 渲染快照(40) + XSS安全(17) + URL/CSS过滤 |
| 2026-04-02 | 脚注解析 + 7 种扩展内联语法 + 41 测试 |
| 2026-04-02 | 项目初始化，任务拆解 |
