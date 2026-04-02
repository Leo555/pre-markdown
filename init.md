# 项目：基于 Pretext 的高性能 Markdown 编辑器

## 一、项目目标

基于 [Pretext](https://github.com/chenglou/pretext) 的零 DOM 重排文本测量与布局引擎，构建一款高性能 Markdown 编辑器。编辑器在功能完整性上对标 [Cherry Markdown](https://github.com/Tencent/cherry-markdown)，在性能上实现显著超越。

## 二、核心技术方案

### 2.1 底层引擎：Pretext

采用 Pretext 作为文本测量与布局的核心引擎，利用其关键能力：

- **零 DOM 重排测量**：通过 Canvas API `measureText` 进行文本测量，避免触发浏览器布局重排
- **两阶段处理模型**：
  - `prepare` 阶段：一次性完成文本规范化、分割、胶合规则应用、片段测量（500 段文本约 19ms）
  - `layout` 阶段：纯算术计算，极高频热路径（500 段文本约 0.09ms），窗口 resize 时仅需重跑此阶段
- **渲染目标无关**：支持 DOM / Canvas / SVG 多渲染目标
- **全语言支持**：包括 Emoji、RTL 双向文本、CJK 等

### 2.2 技术栈

- **语言**：TypeScript（严格模式）
- **构建工具**：Vite
- **测试框架**：Vitest（单测 + 基准测试）
- **包管理**：pnpm

## 三、功能需求（对标 Cherry Markdown）

### 3.1 Markdown 语法支持（完整实现）

#### 基础语法
- [ ] 标题（H1-H6）+ 自动 TOC 目录生成
- [ ] 粗体 / 斜体 / 删除线 / 下划线
- [ ] 有序列表 / 无序列表 / 任务列表（TODO）
- [ ] 超链接（行内 / 引用式）
- [ ] 图片（支持缩放、对齐、引用）
- [ ] 行内代码 / 代码块（支持语法高亮）
- [ ] 引用块（支持嵌套）
- [ ] 表格（支持对齐、合并）
- [ ] 水平分割线
- [ ] 脚注

#### 扩展语法
- [ ] 数学公式：行内公式（`$...$`）/ 块级公式（`$$...$$`），集成 KaTeX
- [ ] Mermaid 图表：流程图、时序图、甘特图等
- [ ] 字体样式：颜色、大小、背景色
- [ ] 上标 / 下标
- [ ] 音频 / 视频嵌入
- [ ] 信息面板（Info / Warning / Error / Success）
- [ ] 表格转图表

### 3.2 编辑器功能

- [ ] 实时预览（所见即所得 / 分栏预览 / 纯编辑 三种模式）
- [ ] 多光标编辑
- [ ] 富文本粘贴转 Markdown
- [ ] 快捷键系统（可自定义）
- [ ] 浮动工具栏（新行开头自动出现）
- [ ] 气泡菜单（选中文本时出现）
- [ ] 悬浮目录导航
- [ ] 输入建议 / 自动补全
- [ ] 主题切换（亮色 / 暗色）
- [ ] 导出为图片 / PDF
- [ ] 增量 / 流式渲染（适配 AI Chat 场景）

### 3.3 安全性

- [ ] 内置 XSS 防护：白名单过滤 + DOMPurify 扫描
- [ ] 自定义安全 Hook

## 四、性能目标（需超越 Cherry Markdown）

| 指标 | Cherry Markdown 参考值 | 本项目目标 |
|------|----------------------|-----------|
| 首次渲染（1000 行文档） | 需实测基线 | < 基线的 50% |
| 增量更新（单行编辑） | 局部渲染 | < 5ms（基于 Pretext layout 阶段） |
| 窗口 Resize 重排 | 全量重排 | < 1ms（纯算术，零 DOM 查询） |
| 大文档滚动（10000 行） | 需实测基线 | 60fps 无卡顿（虚拟化 + Pretext 高度预计算） |
| 内存占用（10000 行文档） | 需实测基线 | < 基线的 70% |
| 流式渲染（AI 逐 token 输出） | 支持 | < 2ms/token 渲染延迟 |

## 五、项目组织（Harness Engineering 模式）

### 5.1 Monorepo 结构

```
packages/
├── core/                  # 核心解析引擎
│   ├── src/
│   │   ├── parser/        # Markdown 语法解析器（AST 生成）
│   │   ├── renderer/      # AST → 目标格式渲染器
│   │   ├── layout/        # Pretext 布局集成层
│   │   └── types/         # 类型定义
│   └── __tests__/         # 核心单元测试
├── editor/                # 编辑器 UI 层
│   ├── src/
│   │   ├── components/    # UI 组件（工具栏、菜单、面板等）
│   │   ├── input/         # 输入处理（键盘、鼠标、粘贴等）
│   │   ├── selection/     # 选区管理
│   │   ├── themes/        # 主题系统
│   │   └── plugins/       # 插件系统
│   └── __tests__/
├── syntax/                # 语法扩展包（可独立发布）
│   ├── math/              # 数学公式
│   ├── mermaid/           # Mermaid 图表
│   ├── media/             # 音视频
│   └── table-chart/       # 表格转图表
├── harness/               # 测试 Harness
│   ├── benchmarks/        # 性能基准测试
│   │   ├── render.bench.ts
│   │   ├── parse.bench.ts
│   │   ├── layout.bench.ts
│   │   └── scroll.bench.ts
│   ├── fixtures/          # 测试夹具（各种 Markdown 文档样本）
│   │   ├── basic.md
│   │   ├── complex.md
│   │   ├── stress-10k.md
│   │   └── cherry-compat/ # Cherry Markdown 兼容性测试样本
│   ├── snapshots/         # 渲染快照
│   └── reports/           # 测试报告输出
└── docs/                  # 项目文档
    ├── architecture.md    # 架构设计文档
    ├── performance.md     # 性能测试报告
    ├── syntax-spec.md     # 语法规格文档（含测试矩阵）
    └── api.md             # API 文档
```

### 5.2 Harness 工程要求

#### 性能测试 Harness
- 使用 Vitest bench 进行基准测试
- 每项性能指标包含：**基线测量 → 优化实现 → 对比报告**
- CI 中集成性能回归检测：PR 合并前自动对比性能基线，劣化超过 10% 则阻断
- 生成标准化性能报告（包含 P50 / P95 / P99 延迟、内存峰值、帧率等）

#### 语法测试 Harness
- 为每种 Markdown 语法编写**正向 + 反向 + 边界用例**
- 使用快照测试（Snapshot Testing）验证渲染输出的正确性
- 构建**语法兼容性矩阵**：与 CommonMark Spec、GFM Spec、Cherry Markdown 进行对比
- 测试覆盖率目标：行覆盖率 > 90%，分支覆盖率 > 85%

#### 单元测试
- 核心解析器：每个语法节点类型至少 10 个测试用例
- 布局引擎集成层：测试 Pretext prepare/layout 的正确调用与缓存行为
- 编辑器交互：测试输入、选区、快捷键、粘贴等核心操作
- 插件系统：测试插件注册、生命周期、Hook 调用

### 5.3 开发阶段划分

| 阶段 | 里程碑 | 核心交付物 |
|------|--------|-----------|
| **Phase 0：基础设施** | 项目脚手架 + Harness 框架搭建 | Monorepo 结构、CI/CD 配置、测试 Harness 模板、性能基线采集 |
| **Phase 1：核心解析引擎** | 完整 Markdown AST 解析 | 语法解析器 + 语法测试 Harness（全量语法覆盖）|
| **Phase 2：Pretext 布局集成** | 零 DOM 重排的文本布局 | 布局引擎 + 虚拟化滚动 + 性能基准测试报告 |
| **Phase 3：编辑器 UI** | 可用的编辑器界面 | 三种编辑模式 + 工具栏 + 快捷键 + 主题 |
| **Phase 4：扩展语法** | 全量扩展语法支持 | Math / Mermaid / Media / Table-Chart 插件 |
| **Phase 5：高级功能** | 生产就绪 | 流式渲染 + 导出 + 安全性 + 完整文档 |
| **Phase 6：性能调优** | 性能目标达成 | 完整性能测试报告 + 与 Cherry Markdown 对比分析 |

## 六、交付要求

1. **代码**：完整可运行的编辑器项目，遵循 TypeScript 严格模式
2. **性能测试文档**：包含所有性能指标的测试结果、对比分析、优化策略说明
3. **语法测试文档**：包含语法兼容性矩阵、测试用例清单、覆盖率报告
4. **单元测试**：完整的单测套件，覆盖率满足目标要求
5. **架构文档**：阐述技术选型理由、模块划分、数据流、扩展机制

---

> **请先从 Phase 0 开始，搭建项目基础设施和 Harness 框架，然后按阶段推进。每个阶段完成后，运行对应的测试 Harness 验证交付质量，再进入下一阶段。**
