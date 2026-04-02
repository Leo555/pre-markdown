# PreMarkdown

> 高性能 Markdown 编辑器，基于 [pretext](https://github.com/chenglou/pretext) 布局引擎

## 特性

- 🚀 **极致性能** — 基于 pretext 零回流文本测量，增量解析 + 虚拟化渲染
- 📝 **语法完备** — 覆盖 CommonMark + GFM + Cherry Markdown 全部语法
- 🧩 **可插拔** — 插件系统支持 KaTeX、Mermaid、ECharts 等扩展
- 🔬 **可验证** — 2000+ 测试用例，完整性能基准和合规测试
- 📦 **轻量级** — 核心包 < 50KB gzip

## 快速开始

```bash
pnpm install
pnpm dev
```

## 项目结构

```
packages/
  core/       — AST 类型、状态管理、事件系统
  parser/     — Markdown 增量解析引擎
  layout/     — pretext 布局引擎集成
  renderer/   — DOM/Canvas 渲染器
  editor/     — 编辑器 UI 层
  plugins/    — 可插拔扩展（KaTeX, Mermaid...）

harness/
  specs/      — 模块规格说明
  benchmarks/ — 性能基准测试
  fixtures/   — 测试固件
  reports/    — 测试报告
```

## 工程方法论

本项目采用 **Harness Engineering** 模式组织：

1. **上下文架构** — 分层 Spec 体系驱动开发
2. **架构约束** — TypeScript strict + 模块边界隔离
3. **自验证循环** — 每个模块自带 test harness
4. **上下文隔离** — Parser/Layout/Render 三层解耦
5. **熵治理** — 统一 AST + 性能基准回归
6. **可拆卸性** — pretext 可替换，Parser 可独立使用

## 许可证

MIT
