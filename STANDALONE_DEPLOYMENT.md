# PreMarkdown Playground — 部署指南

## 📖 概述

`standalone.html` 是 PreMarkdown 的**在线 Playground**，提供：

✅ 完整的 Markdown 实时编辑与预览  
✅ 语法高亮（编辑器 + 代码块 highlight.js）  
✅ 行号显示 + 当前行高亮  
✅ 快捷键支持（Ctrl+B/I/K/D 等）  
✅ 列表/引用自动续行、Tab 缩进  
✅ URL 分享（Base64 UTF-8 安全编码）  
✅ HTML / Markdown 文件导出  
✅ 可拖拽分隔栏调整编辑器/预览宽度  
✅ 增量 DOM 更新（只替换变化的节点）  
✅ 完全在浏览器本地运行，零隐私泄露  

---

## 🚀 快速使用

### 本地开发（推荐）

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 访问 Playground
open http://localhost:9527/standalone.html
```

### 构建部署

```bash
# 构建静态站点到 _site/
pnpm build:site

# Playground 产物路径
ls _site/standalone.html
```

构建后可部署到任意静态托管服务：GitHub Pages、Vercel、Netlify、Cloudflare Pages 等。

### GitHub Pages 部署

项目已配置 `vite.config.ts` 的 `base: '/pre-markdown/'`，构建产物直接适配 GitHub Pages：

```
https://your-org.github.io/pre-markdown/standalone.html
```

---

## 🎯 功能说明

| 功能 | 说明 |
|------|------|
| **实时预览** | 编辑器内容变化后 50ms 防抖更新预览 |
| **语法高亮** | 编辑器层面 25+ token 类型着色 |
| **代码块高亮** | 集成 highlight.js，支持 180+ 语言 |
| **行号** | 动态行号 + 当前行高亮 |
| **快捷键** | Ctrl+B（粗体）、Ctrl+I（斜体）、Ctrl+D（删除线）、Ctrl+K（链接）、Ctrl+`（代码） |
| **自动续行** | 列表 `- ` / `1. ` / `> ` 回车自动续行 |
| **Tab 缩进** | Tab 插入 2 空格 / Shift+Tab 反缩进 |
| **URL 分享** | Base64 编码内容到 URL hash，支持中文 |
| **文件导出** | 导出带样式 HTML 或 Markdown 原文 |
| **性能统计** | 实时显示解析耗时、渲染耗时、行数 |

---

## 🔗 URL 分享

### 格式

```
https://your-site.com/standalone.html#code=ENCODED_BASE64
```

### 特点

- 使用 `TextEncoder` / `TextDecoder` 进行 UTF-8 安全的 Base64 编码
- 支持中文、emoji 等多字节字符
- 内容完全在 URL 中，无需服务端存储
- 分享链接打开时自动加载编码内容

---

## ⚡ 性能

- 解析 + 渲染 1KB < 0.3ms
- 增量 DOM 更新：只替换变化的顶层节点
- 50ms 防抖避免频繁更新
- 编辑器 overlay 模式：透明 textarea + 高亮 pre 层

---

## 📦 技术架构

```
standalone.html
  └── demo/playground.ts (Vite 模块入口)
       ├── @pre-markdown/parser  (Markdown → AST)
       ├── @pre-markdown/renderer (AST → HTML)
       ├── @pre-markdown/core    (AST 类型 + walk)
       └── highlight.js (CDN)    (代码块语法高亮)
```

开发时通过 Vite alias 直接引用 `packages/*/src` 源码，无需预构建。  
生产构建时 Vite/Rollup 会将所有依赖打包为独立 JS chunk。

---

## 🛠️ 自定义

### 修改默认内容

编辑 `demo/playground.ts` 中的 `DEFAULT_CONTENT` 变量。

### 修改主题

编辑 `standalone.html` 中的 CSS 变量：

```css
:root {
  --bg: #0f1117;          /* 背景色 */
  --accent: #6c5ce7;      /* 主色调 */
  --green: #00cec9;       /* 强调色 */
  --text: #e4e5e9;        /* 文字色 */
}
```

---

## ⚙️ 浏览器兼容性

✅ Chrome 90+ · Firefox 88+ · Safari 15+ · Edge 90+
