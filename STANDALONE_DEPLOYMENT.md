# PreMarkdown 在线编辑器 - 部署指南

## 📖 概述

`standalone.html` 是一个**完全独立的静态 HTML 文件**，可以：

✅ 直接在 GitHub Pages 上运行（无需任何构建或后端）  
✅ 通过 CDN 加载 PreMarkdown 库，支持离线缓存  
✅ 实时编辑 Markdown，即时预览 HTML  
✅ 分享 Markdown 内容（通过 URL 编码）  
✅ 导出为 HTML 或 Markdown 文件  
✅ 完全在浏览器本地运行，零隐私泄露  

---

## 🚀 快速部署

### 方案 A：GitHub Pages 部署（推荐）

1. **复制文件到你的 GitHub Pages 仓库**
   ```bash
   cp standalone.html /path/to/your-github-pages-repo/premardown-editor.html
   ```

2. **提交并推送**
   ```bash
   cd /path/to/your-github-pages-repo
   git add premardown-editor.html
   git commit -m "Add PreMarkdown online editor"
   git push origin main
   ```

3. **访问你的编辑器**
   ```
   https://your-username.github.io/your-repo/premardown-editor.html
   ```

### 方案 B：在 PreMarkdown 主仓库中部署

如果你的 PreMarkdown 仓库启用了 GitHub Pages：

1. 将 `standalone.html` 放在项目根目录或 `docs/` 目录
2. 通过 https://your-org.github.io/pre-markdown/standalone.html 访问

### 方案 C：本地开发测试

```bash
# 方法 1：使用 Python 内置服务器
python -m http.server 8000

# 方法 2：使用 Node.js http-server
npx http-server

# 方法 3：使用 VS Code Live Server 扩展
# 在 VS Code 中右键 standalone.html → Open with Live Server
```

---

## 🎯 功能说明

### 核心功能

| 功能 | 说明 |
|------|------|
| **实时预览** | 在右侧实时预览 HTML 渲染结果 |
| **性能统计** | 显示解析耗时、行数、字符数、单词数 |
| **快捷键** | Ctrl+B（粗体）、Ctrl+I（斜体）、Ctrl+D（删除线）、Ctrl+K（链接） |
| **分享功能** | 生成编码 URL，可分享 Markdown 内容 |
| **导出** | 支持导出为 HTML 文件或 MD 文件 |
| **离线使用** | CDN 库支持浏览器缓存，无网络也可继续使用 |

### 工具栏按钮

- **📤 分享** - 生成可分享的 URL（包含 Markdown 内容）
- **⬇️ 导出 HTML** - 下载渲染后的 HTML 文件
- **⬇️ 导出 MD** - 下载原始 Markdown 文件
- **❓ 帮助** - 显示快速使用指南

---

## 🔗 URL 分享使用示例

### 生成分享链接

1. 在编辑器中输入 Markdown
2. 点击「📤 分享」按钮
3. 复制生成的 URL

### 分享链接格式

```
https://your-site.com/standalone.html#code=ENCODED_BASE64_MARKDOWN
```

例如：
```
https://your-site.com/standalone.html#code=IyBIZWxsbyBXb3JsZAoKVGhpcyBpcyBhIHRlc3Q=
```

访问这个链接时，编辑器会自动加载编码的 Markdown 内容。

---

## ⚡ 性能特点

- **解析耗时 < 0.3ms**（1KB 文本）
- **零 DOM 重排** - 仅更新改变的内容
- **防抖 100ms** - 编辑时流畅响应
- **完整 AST** - 支持所有 Markdown 特性
- **XSS 防护** - 自动清除危险内容

---

## 🔒 隐私和安全

✅ **完全本地运行** - 所有 Markdown 处理都在浏览器中进行  
✅ **无后端服务** - 不会发送任何数据到服务器  
✅ **XSS 防护** - 自动清除危险 HTML 和 JavaScript  
✅ **URL 编码** - 分享链接使用 Base64 编码，不涉及服务器存储  

---

## 🛠️ 自定义选项

### 修改默认 Markdown

编辑 `standalone.html` 中的 `DEFAULT_MARKDOWN` 变量：

```javascript
const DEFAULT_MARKDOWN = `# 你的默认标题

你的默认内容`
```

### 修改 CDN 源

如果 jsDelivr CDN 不可用，可以更换为其他 CDN（需要预先发布到 npm）：

```javascript
<script type="importmap">
{
  "imports": {
    "@pre-markdown/parser": "https://unpkg.com/@pre-markdown/parser@0.1.0/+esm",
    "@pre-markdown/renderer": "https://unpkg.com/@pre-markdown/renderer@0.1.0/+esm",
    "@pre-markdown/core": "https://unpkg.com/@pre-markdown/core@0.1.0/+esm"
  }
}
</script>
```

### 修改样式

编辑 CSS 变量：

```css
:root {
  --color-primary: #6c5ce7;        /* 主色调 */
  --color-primary-dark: #5a4fb5;   /* 深色主色 */
  --color-bg: #f5f5f5;              /* 背景色 */
  --color-text: #333;               /* 文字色 */
}
```

---

## 📦 CDN 库版本说明

当前使用的 CDN 版本：
- `@pre-markdown/parser@0.1.0` - jsDelivr
- `@pre-markdown/renderer@0.1.0` - jsDelivr
- `@pre-markdown/core@0.1.0` - jsDelivr

如果 npm 包有更新，修改版本号即可自动更新：

```javascript
"@pre-markdown/parser": "https://cdn.jsdelivr.net/npm/@pre-markdown/parser@0.2.0/+esm"
```

---

## ⚙️ 浏览器兼容性

✅ **Chrome** 90+  
✅ **Firefox** 88+  
✅ **Safari** 15+  
✅ **Edge** 90+  

（需要支持 ES Modules 和 ImportMap）

---

## 🐛 常见问题

### Q: 为什么打开后显示"加载中"？

**A:** CDN 可能需要时间加载 npm 包。

- 首次访问需要 2-3 秒加载库
- 后续访问会使用浏览器缓存，瞬间加载
- 检查浏览器开发工具 Console 是否有错误

### Q: 分享的链接很长怎么办？

**A:** 链接会很长是正常的（因为包含了完整的 Markdown 内容）。

- 可以使用短链接服务（如 bit.ly）压缩
- 或者改用后端服务存储 Markdown

### Q: 支持离线使用吗？

**A:** 支持，但前提是：

1. 首次访问需要网络加载 CDN 库
2. 加载后浏览器会缓存这些库
3. 之后即使无网络也可以继续编辑和预览

### Q: 能否运行在企业内网？

**A:** 可以，有两种方案：

1. **使用 npm + bundler** - 参考项目的开发指南
2. **自建 CDN** - 将 npm 包发布到私有 npm，修改 ImportMap 指向私有源

---

## 📚 相关资源

- [PreMarkdown GitHub 仓库](https://github.com/your-org/pre-markdown)
- [Markdown 完整文档](https://commonmark.org)
- [ES Modules ImportMap](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap)
- [jsDelivr CDN](https://www.jsdelivr.com)

---

## 💡 建议和改进

如有建议或发现问题，欢迎：

- [提交 Issue](https://github.com/your-org/pre-markdown/issues)
- [开启 Discussion](https://github.com/your-org/pre-markdown/discussions)
- 直接 PR 改进此文件

---

**享受 PreMarkdown 在线编辑器！** 🎉
