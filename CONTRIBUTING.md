# PreMarkdown 贡献指南 & 开发准则

> 📖 相关文档：[API 文档](./docs/api.md) · [架构设计](./docs/architecture.md) · [性能报告](./docs/performance.md) · [插件指南](./docs/plugins.md) · [← 返回 README](./README.md)

感谢你对 PreMarkdown 的关注！本文档定义了项目的开发流程、质量标准和工程规范。所有代码变更（无论人工还是 AI）都必须遵守这些准则。

我们致力于提供一个友好、包容的贡献环境。请在参与时保持尊重和建设性。

---

## 一、核心原则

### 1. 测试先行，验证通过才算完成

- 每个功能/修复必须有对应的单元测试
- 测试必须覆盖：**正常路径 + 边界情况 + 错误处理**
- 修改代码后必须运行 `pnpm test:run`，**全部 pass 才算完成**
- 测试不通过 → 必须修复到通过，**不得跳过、注释或删除测试**
- 覆盖率目标：

| 指标 | 阈值 |
|------|------|
| 行覆盖率 | ≥ 90% |
| 函数覆盖率 | ≥ 90% |
| 分支覆盖率 | ≥ 85% |
| 语句覆盖率 | ≥ 90% |

### 2. 性能回归检测

- 每次修改 `parser/` 或 `renderer/` 后，必须运行 `pnpm bench` 检查性能
- 关键性能基线：

| 指标 | 基线 |
|------|------|
| Parse 1K lines | < 10ms |
| Parse 10K lines | < 100ms |
| Render 1K lines | < 5ms |
| Full pipeline 1K lines | < 15ms |

- **劣化超过 20% → 必须定位原因并修复后再提交**
- 重大改动需在 `benchmark/` 7 引擎压测页面中验证排名未下降

### 3. Harness 工程原则

| 原则 | 说明 |
|------|------|
| **Spec 驱动** | 每个模块对应 `harness/specs/*.spec.md`，修改功能前先对照 Spec |
| **自验证闭环** | 代码 → 测试 → 基准 → 验证，形成闭环 |
| **上下文隔离** | Parser / Layout / Renderer 三层解耦，改一层不得破坏其他层的测试 |
| **熵治理** | AST 类型是层间契约，任何 AST 变更必须同步更新 builder → visitor → renderer → 测试 |
| **可拆卸性** | 每个包可独立 `npm install` 使用，测试可独立运行 |

---

## 二、每个 TASK 的执行流程

```
1. 确认目标 ─── 明确 TASK 描述和验收标准
       │
2. 对照 Spec ── 检查 harness/specs/ 中的规格约束
       │
3. 编写代码 ─── 实现功能或修复
       │
4. 编写测试 ─── 新增/更新单元测试（正常+边界+错误）
       │
5. 验证测试 ─── pnpm test:run → 全部 pass ✓
       │
6. 验证性能 ─── pnpm bench → 无劣化 ✓
       │
7. 更新文档 ─── TASKS.md 标记完成 + 更新 Spec（如需）
       │
8. 完成 ✓
```

**任何步骤失败，必须回退修复后重新走流程。不得跳步。**

---

## 三、AST 变更同步清单

当新增或修改 AST 节点类型时，以下文件必须同步更新：

```
packages/core/src/ast/types.ts      ← 类型定义 + 联合类型
packages/core/src/ast/builder.ts    ← 工厂函数
packages/core/src/ast/visitor.ts    ← inlineTypes / blockTypes 集合
packages/core/src/index.ts          ← 导出
packages/parser/src/block/parser.ts ← 块级解析（如适用）
packages/parser/src/inline/parser.ts← 内联解析（如适用）
packages/renderer/src/index.ts      ← HTML 渲染分支
packages/core/__tests__/            ← Builder / Visitor 测试
packages/parser/__tests__/          ← 解析测试
packages/renderer/__tests__/        ← 渲染测试
```

遗漏任何一项都会导致运行时错误或渲染空白。

---

## 四、目录结构约定

```
packages/
  core/       ← AST 类型、Builder、Visitor、EventBus（零依赖）
  parser/     ← Markdown → AST（仅依赖 core）
  renderer/   ← AST → HTML（仅依赖 core）
  layout/     ← pretext 布局引擎（依赖 core + @chenglou/pretext）
  editor/     ← 编辑器 UI（依赖全部，非核心）

harness/
  specs/      ← 模块规格文档（Spec 驱动开发的依据）
  benchmarks/ ← Vitest 基准测试（pnpm bench）
  fixtures/   ← 测试夹具文件

benchmark/    ← 浏览器端 7 引擎对比压测（独立 node_modules）
  fixtures/   ← 1KB~50MB 测试文件
  index.html  ← 性能压测
  compat.html ← 语法兼容性测试

demo/         ← 编辑器 Demo（非核心）
```

---

## 五、常用命令

```bash
pnpm test:run          # 运行全部测试（必须全部 pass）
pnpm test:coverage     # 运行测试 + 覆盖率报告
pnpm bench             # 运行 Vitest 基准测试
pnpm dev               # 启动 Vite Dev Server（Demo + Benchmark）
pnpm typecheck         # TypeScript 类型检查
pnpm lint              # ESLint 检查
```

---

## 六、提交规范

```
feat: 新功能
fix: 修复
perf: 性能优化
refactor: 重构（不改变外部行为）
test: 测试
docs: 文档
chore: 工程配置
```

每次提交前确保：
1. `pnpm test:run` → 全部 pass
2. `pnpm bench` → 无性能劣化（parser/renderer 变更时）
3. TASKS.md 已更新（如完成了 TASK）

---

## 七、如何贡献

我们欢迎所有形式的贡献！无论是 bug 报告、功能建议还是代码提交。

### 报告 Bug

1. 搜索已有 issue，确保未重复报告
2. [创建新 issue](https://github.com/Leo555/pre-markdown/issues/new)，附上：
   - 清晰的问题描述
   - 复现步骤（最小化代码示例）
   - 环境信息（Node 版本、操作系统等）

### 功能建议

1. 在 [Discussions](https://github.com/Leo555/pre-markdown/discussions) 中讨论你的想法
2. 如果社区支持，创建 issue 并标记 `feature-request`

### 代码贡献

1. **Fork** 本仓库
2. **创建分支** — `git checkout -b feat/amazing-feature`
3. **编写测试** — TDD 原则，添加单元测试
4. **提交代码** — 遵守代码风格（ESLint + Prettier）
5. **提交 PR** — 清晰描述改动内容和改动原因

### 代码风格

我们使用 ESLint + Prettier 保持一致的代码风格：

```bash
pnpm lint       # 检查代码风格
pnpm format     # 自动格式化
```

### 获取帮助

- 查看 [完整文档](./docs)
- 在 [Discussions](https://github.com/Leo555/pre-markdown/discussions) 中提问
- 搜索 [已有 issue](https://github.com/Leo555/pre-markdown/issues)
