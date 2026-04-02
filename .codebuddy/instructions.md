# PreMarkdown 项目执行准则

> 本文件是 AI 的项目级指令，每次会话自动加载。所有代码变更必须遵守以下准则。

## 准则一：测试先行

- 每个 TASK 必须有对应单元测试（正常路径 + 边界 + 错误处理）
- 修改代码后必须运行 `pnpm test:run`，全部 pass 才算完成
- 测试不通过 → 修到通过，不得跳过/注释/删除测试
- 覆盖率目标：行/函数/语句 ≥ 90%，分支 ≥ 85%

## 准则二：性能回归检测

- 改动 `parser/` 或 `renderer/` 后必须运行 `pnpm bench`
- 基线：Parse 1K < 10ms, Parse 10K < 100ms, Render 1K < 5ms
- 劣化超过 20% → 必须定位并修复，不得提交
- 重大改动需在 `benchmark/` 7 引擎压测页面验证排名未下降

## 准则三：Harness 工程原则

- **Spec 驱动**：修改功能前先对照 `harness/specs/*.spec.md`
- **自验证闭环**：代码 → 测试 → 基准 → 验证
- **上下文隔离**：Parser/Layout/Renderer 三层解耦，改一层不破坏其他层
- **熵治理**：AST 变更必须同步 types.ts → builder.ts → visitor.ts → index.ts → parser → renderer → 所有相关测试
- **可拆卸性**：每个包可独立使用和测试

## 每个 TASK 执行流程（不得跳步）

1. 确认 TASK 目标和验收标准
2. 对照 `harness/specs/` 规格文档
3. 编写/修改代码
4. 编写/更新单元测试
5. `pnpm test:run` → 全部 pass ✓
6. `pnpm bench` → 无性能劣化 ✓（parser/renderer 变更时必做）
7. 更新 `TASKS.md` 标记完成
8. 同步更新 spec 文档（如需）

**任何步骤失败必须回退修复，不得跳步。**

## AST 变更同步清单

新增或修改 AST 节点类型时，以下文件必须全部同步更新：

```
packages/core/src/ast/types.ts       ← 类型定义 + 联合类型
packages/core/src/ast/builder.ts     ← 工厂函数
packages/core/src/ast/visitor.ts     ← inlineTypes / blockTypes 集合
packages/core/src/index.ts           ← 导出
packages/parser/src/block/parser.ts  ← 块级解析（如适用）
packages/parser/src/inline/parser.ts ← 内联解析（如适用）
packages/renderer/src/index.ts       ← HTML 渲染分支
packages/core/__tests__/             ← Builder / Visitor 测试
packages/parser/__tests__/           ← 解析测试
packages/renderer/__tests__/         ← 渲染测试
```

## 提交规范

格式：`type: description`，type = feat/fix/perf/refactor/test/docs/chore

提交前必须：`pnpm test:run` pass + `pnpm bench` 无劣化。
