/**
 * PreMarkdown Demo — Main Entry Point
 */
import { parse } from '@pre-markdown/parser'
import { renderToHtml } from '@pre-markdown/renderer'
import { walk } from '@pre-markdown/core'
import type { Document } from '@pre-markdown/core'

// Elements
const editor = document.getElementById('editor') as HTMLTextAreaElement
const preview = document.getElementById('preview') as HTMLDivElement
const lineNumbers = document.getElementById('line-numbers') as HTMLDivElement
const statParse = document.getElementById('stat-parse')!
const statRender = document.getElementById('stat-render')!
const statNodes = document.getElementById('stat-nodes')!
const statLines = document.getElementById('stat-lines')!
const statTotal = document.getElementById('stat-total')!

// Default content showcasing all supported syntax
const DEFAULT_CONTENT = `# PreMarkdown Demo

> 基于 **@chenglou/pretext** 零 DOM 重排布局引擎的高性能 Markdown 编辑器

---

## 基础语法

这是一段普通文本，包含 **粗体**、*斜体*、~~删除线~~、\`行内代码\` 和 [链接](https://github.com)。

### 列表

- 无序列表项 1
- 无序列表项 2
  - 嵌套项 2.1
  - 嵌套项 2.2
- 无序列表项 3

1. 有序列表项
2. 第二项
3. 第三项

- [x] 已完成任务
- [ ] 未完成任务
- [x] 另一个已完成任务

### 引用

> 这是一段引用文字。
> 
> > 嵌套引用也支持。

### 代码块

\`\`\`typescript
function fibonacci(n: number): number {
  if (n <= 1) return n
  return fibonacci(n - 1) + fibonacci(n - 2)
}

console.log(fibonacci(10)) // 55
\`\`\`

---

## 表格

| 功能 | 状态 | 性能 |
|------|:----:|-----:|
| Markdown 解析 | ✅ 完成 | < 5ms |
| HTML 渲染 | ✅ 完成 | < 2ms |
| Pretext 布局 | ✅ 集成 | < 0.1ms |
| 增量解析 | ✅ 完成 | < 1ms |

---

## 扩展语法

### 数学公式

行内公式：$E = mc^2$

块级公式：

$$
\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}
$$

### 高亮 & 上下标

==这是高亮文字== 和 H^2^O 以及 X~1~

### Cherry 兼容语法

!!red 红色文字!! 和 !20 大号文字! 和 !!!yellow 黄色背景!!!

^^下标文字^^ 和 /下划线文字/

{漢字|かんじ} — Ruby 注音

### Emoji

:rocket: :fire: :star: :heart: :tada: :100:

### 面板

::: info 信息提示
这是一个信息面板，用于展示重要信息。
:::

::: warning 警告
这是一个警告面板，注意安全！
:::

::: success 成功
操作已成功完成。
:::

### 折叠块

+++ 点击展开详情
这是折叠内容，默认收起。

可以包含 **任意 Markdown** 语法。
+++

### 脚注

这段文字有一个脚注引用[^1]。

[^1]: 这是脚注的内容。

### 音视频

!audio[示例音频](https://example.com/audio.mp3)

!video[示例视频](https://example.com/video.mp4)

---

## 性能特点

1. **零 DOM 重排** — pretext 通过 Canvas API 测量文本，完全避免触发浏览器布局
2. **两阶段流水线** — prepare() 一次性分析 + layout() 纯算术计算
3. **增量解析** — 只重新解析变更的行，复用已有 AST
4. **LRU 缓存** — PreparedText 按 (text, font) 缓存，避免重复测量
5. **虚拟化视口** — 只计算可见行的布局，大文档也流畅

\`\`\`
Parser → AST → Renderer → HTML
  ↑                         ↓
  └── Incremental Update ←──┘
\`\`\`

---

*Made with :heart: by PreMarkdown*
`

// State
let debounceTimer: ReturnType<typeof setTimeout> | null = null

function countNodes(doc: Document): number {
  let count = 0
  walk(doc, (_node) => { count++ })
  return count
}

function update(value: string): void {
  const t0 = performance.now()
  const ast = parse(value)
  const t1 = performance.now()
  const html = renderToHtml(ast, { sanitize: true })
  const t2 = performance.now()

  preview.innerHTML = html

  const parseMs = (t1 - t0).toFixed(2)
  const renderMs = (t2 - t1).toFixed(2)
  const totalMs = (t2 - t0).toFixed(2)
  const nodes = countNodes(ast)
  const lines = value.split('\n').length

  statParse.textContent = `${parseMs}ms`
  statRender.textContent = `${renderMs}ms`
  statNodes.textContent = String(nodes)
  statLines.textContent = String(lines)
  statTotal.textContent = `Total: ${totalMs}ms`
}

// ============================================================
// Line Numbers
// ============================================================

let lastLineCount = 0
let currentLine = 0

function updateLineNumbers(value: string): void {
  const lines = value.split('\n').length
  if (lines !== lastLineCount) {
    const nums: string[] = []
    for (let i = 1; i <= lines; i++) {
      nums.push(`<div${i === currentLine ? ' class="active-line"' : ''}>${i}</div>`)
    }
    lineNumbers.innerHTML = nums.join('')
    lastLineCount = lines
  } else {
    // Just update active line highlight
    updateActiveLine()
  }
}

function updateActiveLine(): void {
  const pos = editor.selectionStart
  const line = editor.value.slice(0, pos).split('\n').length
  if (line !== currentLine) {
    // Remove old highlight
    const old = lineNumbers.children[currentLine - 1]
    if (old) old.classList.remove('active-line')
    // Add new highlight
    const cur = lineNumbers.children[line - 1]
    if (cur) cur.classList.add('active-line')
    currentLine = line
  }
}

// Initialize
editor.value = DEFAULT_CONTENT
update(DEFAULT_CONTENT)
updateLineNumbers(DEFAULT_CONTENT)

// Live update with debounce
editor.addEventListener('input', () => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    update(editor.value)
    updateLineNumbers(editor.value)
  }, 50)
})

// Update active line on cursor move
editor.addEventListener('click', updateActiveLine)
editor.addEventListener('keyup', updateActiveLine)

// Tab key support in editor
editor.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') {
    e.preventDefault()
    const start = editor.selectionStart
    const end = editor.selectionEnd
    editor.value = editor.value.substring(0, start) + '  ' + editor.value.substring(end)
    editor.selectionStart = editor.selectionEnd = start + 2
    update(editor.value)
    updateLineNumbers(editor.value)
    return
  }

  // Auto-wrap selection with paired characters
  const hasSelection = editor.selectionStart !== editor.selectionEnd
  if (hasSelection) {
    const wrapPairs: Record<string, [string, string]> = {
      '*': ['*', '*'],
      '_': ['_', '_'],
      '`': ['`', '`'],
      '~': ['~', '~'],
      '[': ['[', ']'],
      '(': ['(', ')'],
      '"': ['"', '"'],
      "'": ["'", "'"],
    }
    const pair = wrapPairs[e.key]
    if (pair) {
      e.preventDefault()
      wrapSelection(pair[0], pair[1])
      return
    }
  }

  // Ctrl/Cmd shortcuts
  const mod = e.metaKey || e.ctrlKey
  if (mod) {
    if (e.key === 'b') {
      e.preventDefault()
      wrapSelection('**', '**')
    } else if (e.key === 'i') {
      e.preventDefault()
      wrapSelection('*', '*')
    } else if (e.key === 'k') {
      e.preventDefault()
      const sel = editor.value.substring(editor.selectionStart, editor.selectionEnd)
      if (sel) {
        wrapSelection('[', '](url)')
      } else {
        insertAtCursor('[link text](url)')
      }
    } else if (e.key === '`') {
      e.preventDefault()
      wrapSelection('`', '`')
    } else if (e.key === 'd') {
      e.preventDefault()
      wrapSelection('~~', '~~')
    }
    return
  }

  // Enter: auto-continue lists
  if (e.key === 'Enter') {
    const pos = editor.selectionStart
    const textBefore = editor.value.slice(0, pos)
    const currentLineText = textBefore.split('\n').pop() ?? ''

    // Auto-continue unordered list
    const ulMatch = /^(\s*)([-*+])\s+(.*)$/.exec(currentLineText)
    if (ulMatch && ulMatch[3]!.length > 0) {
      e.preventDefault()
      insertAtCursor('\n' + ulMatch[1] + ulMatch[2] + ' ')
      return
    }
    // Empty list item → end list
    if (ulMatch && ulMatch[3]!.length === 0) {
      e.preventDefault()
      // Remove the empty list marker
      const lineStart = textBefore.lastIndexOf('\n') + 1
      editor.value = editor.value.substring(0, lineStart) + editor.value.substring(pos)
      editor.selectionStart = editor.selectionEnd = lineStart
      insertAtCursor('\n')
      return
    }

    // Auto-continue ordered list
    const olMatch = /^(\s*)(\d+)([.)]\s+)(.*)$/.exec(currentLineText)
    if (olMatch && olMatch[4]!.length > 0) {
      e.preventDefault()
      const nextNum = parseInt(olMatch[2]!, 10) + 1
      insertAtCursor('\n' + olMatch[1] + nextNum + olMatch[3])
      return
    }

    // Auto-continue blockquote
    const bqMatch = /^(\s*>+\s?)(.*)$/.exec(currentLineText)
    if (bqMatch && bqMatch[2]!.length > 0) {
      e.preventDefault()
      insertAtCursor('\n' + bqMatch[1])
      return
    }
  }
})

/** Wrap current selection with prefix/suffix */
function wrapSelection(prefix: string, suffix: string): void {
  const start = editor.selectionStart
  const end = editor.selectionEnd
  const selected = editor.value.substring(start, end)
  const replacement = prefix + selected + suffix
  editor.value = editor.value.substring(0, start) + replacement + editor.value.substring(end)
  editor.selectionStart = start + prefix.length
  editor.selectionEnd = end + prefix.length
  editor.focus()
  update(editor.value)
  updateLineNumbers(editor.value)
}

/** Insert text at cursor position */
function insertAtCursor(text: string): void {
  const start = editor.selectionStart
  editor.value = editor.value.substring(0, start) + text + editor.value.substring(editor.selectionEnd)
  editor.selectionStart = editor.selectionEnd = start + text.length
  editor.focus()
  update(editor.value)
  updateLineNumbers(editor.value)
}

// Sync scroll (editor → preview + line numbers)
editor.addEventListener('scroll', () => {
  const ratio = editor.scrollTop / (editor.scrollHeight - editor.clientHeight || 1)
  preview.scrollTop = ratio * (preview.scrollHeight - preview.clientHeight)
  // Sync line numbers scroll with editor
  lineNumbers.scrollTop = editor.scrollTop
})

// ============================================================
// Draggable Divider (resize panes)
// ============================================================

const divider = document.getElementById('divider')!
const editorPane = document.getElementById('editor-pane')!
const previewPane = document.getElementById('preview-pane')!
const mainEl = document.querySelector('main')!

let isDragging = false

divider.addEventListener('mousedown', (e) => {
  isDragging = true
  divider.classList.add('dragging')
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
  e.preventDefault()
})

document.addEventListener('mousemove', (e) => {
  if (!isDragging) return
  const mainRect = mainEl.getBoundingClientRect()
  const pct = ((e.clientX - mainRect.left) / mainRect.width) * 100
  const clamped = Math.max(20, Math.min(80, pct))
  editorPane.style.flex = `0 0 ${clamped}%`
  previewPane.style.flex = `0 0 ${100 - clamped}%`
})

document.addEventListener('mouseup', () => {
  if (isDragging) {
    isDragging = false
    divider.classList.remove('dragging')
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }
})
