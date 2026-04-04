# Changesets

All notable changes to the PreMarkdown packages will be managed with [changesets](https://github.com/changesets/changesets).

## Workflow

1. **添加变更记录**：`pnpm changeset` — 选择包、版本类型、描述
2. **版本升级**：`pnpm changeset:version` — 自动更新 package.json 和 CHANGELOG
3. **发布到 npm**：`pnpm changeset:publish` — 构建并发布所有变更的包

## Packages

| Package | Description |
|---------|-------------|
| `@pre-markdown/core` | AST 类型、Builder、Visitor、EventBus |
| `@pre-markdown/parser` | 高性能增量 Markdown 解析器 |
| `@pre-markdown/renderer` | AST → HTML 渲染器 |
| `@pre-markdown/layout` | Pretext 零 DOM 重排文本布局引擎 |
