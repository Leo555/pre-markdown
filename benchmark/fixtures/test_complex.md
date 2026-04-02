# Markdown 文件预览功能 - 技术设计文档

> **版本**: v2.0
> **作者**: QQ 文件团队
> **更新日期**: 2026-03-24
> **状态**: 开发中

---

## 1. 背景与目标

### 1.1 背景

QQ 文件浏览器需要支持 **Markdown (.md)** 文件的预览功能。当前支持的文件类型包括：

- 图片格式：`jpg`、`png`、`gif`、`webp`
- 文档格式：`doc`、`docx`、`pdf`、`txt`
- 视频格式：`mp4`、`avi`、`mkv`
- ~~HTML 格式~~（已废弃）

### 1.2 目标

1. 支持标准 Markdown 语法解析和渲染
2. 支持代码块语法高亮
3. 大文件（>100MB）场景下的性能优化
4. 与现有文件浏览器框架无缝集成

---

## 2. 技术方案

### 2.1 架构设计

```
┌─────────────────────────────────────────┐
│           FileBrowserActivity           │
├─────────────────────────────────────────┤
│  MarkdownFilePresenterV2 (Presenter)    │
│  ├── 文件读取（子线程）                   │
│  ├── RichParser 解析                     │
│  └── RichRender 渲染                     │
├─────────────────────────────────────────┤
│  MarkdownFileBrowserViewV2 (View)       │
│  ├── ScrollView                         │
│  └── ConstraintLayout (渲染容器)         │
└─────────────────────────────────────────┘
```

### 2.2 关键类说明

| 类名 | 职责 | 所在模块 |
|------|------|---------|
| `MarkdownFilePresenterV2` | Markdown 文件预览控制逻辑 | qqfile-filebrowser-impl |
| `MarkdownFileBrowserViewV2` | Markdown 渲染视图 | qqfile-filebrowser-impl |
| `RichParser` | Markdown 内容解析器 | rich_kit |
| `RichRender` | 解析结果渲染器 | rich_kit |
| `MarkdownFileFactory` | 自定义组件工厂 | qqfile-filebrowser-impl |

---

## 3. 详细实现

### 3.1 文件读取

```java
private String readFileContent(String filePath) {
    StringBuilder sb = new StringBuilder();
    try (InputStreamReader reader = new InputStreamReader(
            new FileInputStream(filePath), StandardCharsets.UTF_8)) {
        char[] buffer = new char[4096];
        int len;
        while ((len = reader.read(buffer)) != -1) {
            sb.append(buffer, 0, len);
        }
    } catch (IOException e) {
        QLog.e(TAG, "readFileContent failed", e);
        return null;
    }
    return sb.toString();
}
```

### 3.2 渲染参数

| 参数 | 值 | 说明 |
|------|-----|------|
| 内边距 | 16dp | 左右内边距 |
| 文字大小 | 16sp | 正文字体大小 |
| 行间距 | 3dp (add) | 额外行间距 |
| 行间距倍数 | 1.0 | 行间距乘数 |
| 换行策略 | BREAK_STRATEGY_SIMPLE | 简单换行 |

---

## 4. 性能考量

### 4.1 文件大小限制

当前设置的最大支持文件大小为 **100MB**，具体性能表现如下：

| 文件大小 | 读取耗时 | 解析耗时 | 渲染耗时 | 总耗时 | 内存峰值 |
|---------|---------|---------|---------|--------|---------|
| 1KB | <10ms | <10ms | <50ms | <70ms | ~2MB |
| 100KB | ~20ms | ~50ms | ~200ms | ~270ms | ~10MB |
| 1MB | ~100ms | ~500ms | ~1s | ~1.6s | ~50MB |
| 10MB | ~500ms | ~3s | ~5s | ~8.5s | ~200MB |

> ⚠️ **注意**: 以上数据为预估值，实际表现取决于文件内容复杂度和设备性能。

### 4.2 优化措施

1. **异步处理**: 文件读取和解析在子线程执行，不阻塞 UI
2. **内存释放**: 解析完成后立即释放原始字符串引用
3. **错误兜底**: 解析/渲染失败时回退到"用其他应用打开"

### 4.3 后续优化方向

- [ ] 分片解析：将大文件拆分为多个片段逐步解析
- [ ] 懒加载渲染：只渲染可视区域内的内容
- [ ] 缓存机制：缓存已解析的结果，避免重复解析
- [x] 子线程处理：文件读取+解析移至子线程

---

## 5. 兼容性

### 5.1 支持的 Markdown 语法

| 语法 | 支持状态 | 备注 |
|------|---------|------|
| 标题 (h1-h6) | ✅ | |
| **加粗** | ✅ | |
| *斜体* | ✅ | |
| ~~删除线~~ | ✅ | |
| `行内代码` | ✅ | |
| 代码块 | ✅ | 支持语法高亮 |
| 引用 | ✅ | 支持嵌套 |
| 有序/无序列表 | ✅ | 支持嵌套 |
| 任务列表 | ✅ | |
| 表格 | ✅ | 支持对齐 |
| 链接 | ✅ | |
| 图片 | ⚠️ | 仅显示占位 |
| 数学公式 | ❌ | 暂不支持 |
| HTML 标签 | ⚠️ | 部分支持 |

### 5.2 已知问题

1. 图片资源：网络图片暂不支持加载，仅显示 alt 文本
2. 超长表格：列数过多时可能超出屏幕，暂无横向滚动
3. 数学公式：LaTeX 语法暂不支持

---

## 6. 测试用例

### 6.1 功能测试

```
TC-001: 打开小型 Markdown 文件（<10KB）
  前置条件: 文件已下载到本地
  操作步骤: 在文件列表中点击 .md 文件
  期望结果: 正确渲染 Markdown 内容

TC-002: 打开大型 Markdown 文件（>1MB）
  前置条件: 文件已下载到本地
  操作步骤: 在文件列表中点击 .md 文件
  期望结果: 正确渲染，无 ANR，加载时间可接受

TC-003: 打开超大 Markdown 文件（>100MB）
  前置条件: 文件已下载到本地
  操作步骤: 在文件列表中点击 .md 文件
  期望结果: 显示"用其他应用打开"兜底页
```

### 6.2 异常测试

| 场景 | 期望行为 |
|------|---------|
| 文件编码非 UTF-8 | 尽力解码，乱码时降级显示 |
| 文件被其他应用锁定 | 显示兜底页 |
| 解析过程中退出页面 | 正常退出，无内存泄漏 |
| 文件内容包含恶意 HTML | 安全过滤，不执行脚本 |

---

## 附录

### A. 参考资料

- [CommonMark 规范](https://spec.commonmark.org/)
- [GitHub Flavored Markdown](https://github.github.com/gfm/)

### B. 变更历史

| 版本 | 日期 | 变更内容 | 作者 |
|------|------|---------|------|
| v1.0 | 2026-03-01 | 初始版本，纯文本渲染 | 张三 |
| v1.1 | 2026-03-10 | 接入 RichParser 解析 | 张三 |
| v2.0 | 2026-03-24 | 异步处理、性能优化 | 张三 |

---

*本文档由 QQ 文件团队维护*
