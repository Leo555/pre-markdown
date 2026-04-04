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

## 图片

![Markdown Logo](https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Markdown-mark.svg/208px-Markdown-mark.svg.png "Markdown Logo")

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

!audio[示例音频](https://www.w3schools.com/html/horse.mp3)

!video[示例视频](https://www.w3schools.com/html/mov_bbb.mp4)

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

  // Incremental DOM update: only replace changed blocks
  patchPreview(preview, html)

  // Update sync scroll data
  updateSyncData(value, ast)

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
    const value = editor.value

    if (start === end && !e.shiftKey) {
      // Single cursor: insert 2 spaces
      editor.value = value.substring(0, start) + '  ' + value.substring(end)
      editor.selectionStart = editor.selectionEnd = start + 2
    } else {
      // Multi-line: indent/unindent selected lines
      const lineStart = value.lastIndexOf('\n', start - 1) + 1
      const lineEnd = value.indexOf('\n', end) === -1 ? value.length : value.indexOf('\n', end)
      const selectedText = value.substring(lineStart, lineEnd)
      const lines = selectedText.split('\n')

      let modified: string[]
      let delta = 0
      if (e.shiftKey) {
        // Unindent: remove up to 2 leading spaces
        modified = lines.map(l => {
          if (l.startsWith('  ')) { delta -= 2; return l.slice(2) }
          if (l.startsWith(' ')) { delta -= 1; return l.slice(1) }
          return l
        })
      } else {
        // Indent: add 2 spaces
        modified = lines.map(l => { delta += 2; return '  ' + l })
      }

      editor.value = value.substring(0, lineStart) + modified.join('\n') + value.substring(lineEnd)
      editor.selectionStart = lineStart
      editor.selectionEnd = lineStart + modified.join('\n').length
    }
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

// ============================================================
// AST-based Sync Scroll (paragraph mapping, not ratio)
// ============================================================

let lastAST: Document | null = null

// Scroll lock: tracks which pane initiated the scroll.
// While locked, the other pane's scroll handler is suppressed.
let scrollSource: 'editor' | 'preview' | null = null
let scrollLockTimer: ReturnType<typeof setTimeout> | null = null

function lockScroll(source: 'editor' | 'preview'): void {
  scrollSource = source
  if (scrollLockTimer) clearTimeout(scrollLockTimer)
  scrollLockTimer = setTimeout(() => {
    scrollSource = null
    scrollLockTimer = null
  }, 150)
}

/** Build line→block index map from source text */
function buildLineBlockMap(value: string): number[] {
  const lines = value.split('\n')
  const map: number[] = new Array(lines.length)
  let blockIdx = 0
  let inBlock = false

  for (let i = 0; i < lines.length; i++) {
    const blank = /^\s*$/.test(lines[i]!)
    if (blank && inBlock) {
      inBlock = false
      blockIdx++
    } else if (!blank) {
      inBlock = true
    }
    map[i] = blockIdx
  }
  return map
}

let lineBlockMap: number[] = []

function updateSyncData(value: string, ast: Document): void {
  lastAST = ast
  lineBlockMap = buildLineBlockMap(value)
}

/** Sync editor scroll → preview scroll using block mapping */
function syncEditorToPreview(): void {
  if (scrollSource === 'preview') return

  // Sync line numbers (always, no lock needed)
  lineNumbers.scrollTop = editor.scrollTop

  // Find which line is at the top of the editor viewport
  const lineHeight = parseFloat(getComputedStyle(editor).lineHeight) || 24
  const topLine = Math.floor(editor.scrollTop / lineHeight)
  const blockIndex = lineBlockMap[topLine] ?? 0

  // Find the corresponding DOM element in preview
  const previewChildren = preview.children
  if (blockIndex < previewChildren.length) {
    const targetEl = previewChildren[blockIndex] as HTMLElement
    lockScroll('editor')
    preview.scrollTop = targetEl.offsetTop - 20
  }
}

/** Sync preview scroll → editor scroll using block mapping */
function syncPreviewToEditor(): void {
  if (scrollSource === 'editor') return

  // Find which block is at the top of the preview viewport
  const previewChildren = preview.children
  let blockIndex = 0
  for (let i = 0; i < previewChildren.length; i++) {
    const el = previewChildren[i] as HTMLElement
    if (el.offsetTop + el.offsetHeight > preview.scrollTop) {
      blockIndex = i
      break
    }
  }

  // Find the first line of this block in the editor
  for (let i = 0; i < lineBlockMap.length; i++) {
    if (lineBlockMap[i] === blockIndex) {
      const lineHeight = parseFloat(getComputedStyle(editor).lineHeight) || 24
      lockScroll('preview')
      editor.scrollTop = i * lineHeight
      lineNumbers.scrollTop = editor.scrollTop
      break
    }
  }
}

// Debounced scroll handlers
let editorScrollRAF = 0
editor.addEventListener('scroll', () => {
  cancelAnimationFrame(editorScrollRAF)
  editorScrollRAF = requestAnimationFrame(syncEditorToPreview)
})

let previewScrollRAF = 0
preview.addEventListener('scroll', () => {
  cancelAnimationFrame(previewScrollRAF)
  previewScrollRAF = requestAnimationFrame(syncPreviewToEditor)
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

// ============================================================
// Toolbar Actions
// ============================================================

const toolbar = document.getElementById('toolbar')!

toolbar.addEventListener('click', (e) => {
  const btn = (e.target as HTMLElement).closest('button')
  if (!btn) return
  const action = btn.dataset.action
  if (!action) return

  editor.focus()

  switch (action) {
    case 'h1': insertLinePrefix('# '); break
    case 'h2': insertLinePrefix('## '); break
    case 'h3': insertLinePrefix('### '); break
    case 'bold': wrapSelection('**', '**'); break
    case 'italic': wrapSelection('*', '*'); break
    case 'strike': wrapSelection('~~', '~~'); break
    case 'code': wrapSelection('`', '`'); break
    case 'link': {
      const sel = editor.value.substring(editor.selectionStart, editor.selectionEnd)
      if (sel) wrapSelection('[', '](url)')
      else insertAtCursor('[link text](url)')
      break
    }
    case 'image': insertAtCursor('![alt text](url)'); break
    case 'ul': insertLinePrefix('- '); break
    case 'ol': insertLinePrefix('1. '); break
    case 'task': insertLinePrefix('- [ ] '); break
    case 'quote': insertLinePrefix('> '); break
    case 'codeblock': insertAtCursor('\n```\n\n```\n'); break
    case 'table': insertAtCursor('\n| Column A | Column B | Column C |\n|----------|----------|----------|\n| Cell 1   | Cell 2   | Cell 3   |\n'); break
    case 'hr': insertAtCursor('\n---\n'); break
  }
})

/** Insert prefix at the start of the current line */
function insertLinePrefix(prefix: string): void {
  const pos = editor.selectionStart
  const textBefore = editor.value.slice(0, pos)
  const lineStart = textBefore.lastIndexOf('\n') + 1
  editor.value = editor.value.substring(0, lineStart) + prefix + editor.value.substring(lineStart)
  editor.selectionStart = editor.selectionEnd = pos + prefix.length
  editor.focus()
  update(editor.value)
  updateLineNumbers(editor.value)
}

// ============================================================
// Incremental DOM Patching (minimal morphdom)
// ============================================================

/**
 * Patch the preview container with new HTML, only replacing changed blocks.
 * Compares top-level children and only replaces those that differ.
 * Falls back to full innerHTML for first render.
 */
function patchPreview(container: HTMLElement, html: string): void {
  // First render or empty: full replace
  if (container.children.length === 0) {
    container.innerHTML = html
    return
  }

  // Parse new HTML into a temporary container
  const temp = document.createElement('div')
  temp.innerHTML = html

  const oldLen = container.children.length
  const newLen = temp.children.length
  const minLen = Math.min(oldLen, newLen)

  // Compare and update existing children
  for (let i = 0; i < minLen; i++) {
    const oldChild = container.children[i]!
    const newChild = temp.children[i]!
    if (oldChild.outerHTML !== newChild.outerHTML) {
      container.replaceChild(newChild.cloneNode(true), oldChild)
    }
  }

  // Remove extra old children
  while (container.children.length > newLen) {
    container.removeChild(container.lastElementChild!)
  }

  // Append new children
  for (let i = oldLen; i < newLen; i++) {
    container.appendChild(temp.children[i]!.cloneNode(true))
  }
}

// ============================================================
// View Mode Toggle (split / edit-only / preview-only)
// ============================================================

const viewControls = document.getElementById('view-controls')!

viewControls.addEventListener('click', (e) => {
  const btn = (e.target as HTMLElement).closest('button')
  if (!btn) return
  const view = btn.dataset.view
  if (!view) return

  // Update button states
  viewControls.querySelectorAll('button').forEach(b => b.classList.remove('active'))
  btn.classList.add('active')

  // Update main layout
  mainEl.classList.remove('view-split', 'view-edit', 'view-preview')
  mainEl.classList.add('view-' + view)

  // Reset flex styles from draggable divider when switching modes
  if (view === 'split') {
    editorPane.style.flex = ''
    previewPane.style.flex = ''
  }
})

// ============================================================
// Initialize (after all event listeners are registered)
// ============================================================

try {
  editor.value = DEFAULT_CONTENT
  update(DEFAULT_CONTENT)
  updateLineNumbers(DEFAULT_CONTENT)
} catch (err) {
  console.error('[PreMarkdown] Initialization error:', err)
  // Even if parse/render fails, the editor and buttons still work
  editor.value = DEFAULT_CONTENT
  updateLineNumbers(DEFAULT_CONTENT)
}
