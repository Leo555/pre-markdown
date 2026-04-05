/**
 * PreMarkdown Playground — Entry Point
 * Lightweight standalone playground with syntax highlighting, live preview,
 * URL sharing, and export capabilities.
 */
import { IncrementalParser } from '@pre-markdown/parser'
import type { EditOperation } from '@pre-markdown/parser'
import { renderToHtml } from '@pre-markdown/renderer'
import { walk } from '@pre-markdown/core'
import type { Document } from '@pre-markdown/core'

// ============================================================
// DOM Elements
// ============================================================

const editor = document.getElementById('editor') as HTMLTextAreaElement
const preview = document.getElementById('preview') as HTMLDivElement
const lineNumbers = document.getElementById('line-numbers') as HTMLDivElement
const highlightCode = document.getElementById('highlight-code') as HTMLElement
const highlightBackdrop = document.getElementById('highlight-backdrop') as HTMLPreElement
const statParse = document.getElementById('stat-parse')!
const statRender = document.getElementById('stat-render')!
const statLines = document.getElementById('stat-lines')!
const statChars = document.getElementById('stat-chars')!
const statTotal = document.getElementById('stat-total')!

// ============================================================
// Default Content
// ============================================================

const DEFAULT_CONTENT = `# 👋 欢迎使用 PreMarkdown Playground

> 高性能 Markdown 引擎，基于 **@chenglou/pretext** 零 DOM 重排布局

---

## ⚡ 核心特性

- **极致性能** — Parse + Render < 0.3ms（1KB 文本）
- **增量解析** — 编辑时响应 < 1ms
- **完整 AST** — 38+ 节点类型，支持 walk / find / transform
- **安全渲染** — 自动 XSS 防护
- **零 DOM 重排** — pretext 通过 Canvas API 测量文本

## 📝 语法演示

### 基础语法

这是一段普通文本，包含 **粗体**、*斜体*、~~删除线~~、\`行内代码\` 和 [链接](https://github.com)。

### 列表

- 无序列表项 1
- 无序列表项 2
  - 嵌套项 2.1
  - 嵌套项 2.2

1. 有序列表项
2. 第二项
3. 第三项

- [x] 已完成任务
- [ ] 未完成任务

### 引用

> 这是一段引用文字。
> 
> > 嵌套引用也支持。

### 代码块

\`\`\`typescript
import { parse } from '@pre-markdown/parser'
import { renderToHtml } from '@pre-markdown/renderer'

const ast = parse('# Hello **World**')
const html = renderToHtml(ast, { sanitize: true })
console.log(html)
\`\`\`

### 表格

| 功能 | 状态 | 性能 |
|------|:----:|-----:|
| Markdown 解析 | ✅ 完成 | < 5ms |
| HTML 渲染 | ✅ 完成 | < 2ms |
| 增量解析 | ✅ 完成 | < 1ms |
| Pretext 布局 | ✅ 集成 | < 0.1ms |

---

## 🔧 扩展语法

### 数学公式

行内公式：$E = mc^2$

### 高亮 & 删除线

==这是高亮文字== 和 ~~这是删除线~~

### Emoji

:rocket: :fire: :star: :heart: :tada:

---

## 💡 小提示

- 点击 **📤 分享** 生成可分享的链接
- 点击 **⬇ HTML / MD** 导出文件
- 所有处理完全在浏览器本地进行，零隐私泄露
- 支持 \`Ctrl+B\` 粗体、\`Ctrl+I\` 斜体等快捷键

---

*Made with :heart: by PreMarkdown*
`

// ============================================================
// highlight.js integration
// ============================================================

declare const hljs: {
  highlight: (code: string, options: { language: string }) => { value: string }
  getLanguage: (lang: string) => unknown
} | undefined

function highlightCodeBlock(code: string, lang?: string): string {
  if (typeof hljs !== 'undefined' && lang && hljs.getLanguage(lang)) {
    try { return hljs.highlight(code, { language: lang }).value } catch { /* fallback */ }
  }
  return code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ============================================================
// Markdown Syntax Highlighting (editor overlay)
// ============================================================

function escHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function highlightMarkdown(text: string): string {
  const lines = text.split('\n')
  const out: string[] = []
  let inCodeBlock = false
  let codeFenceChar = ''

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]!
    const line = escHtml(raw)

    // Fenced code blocks
    if (inCodeBlock) {
      const closeRe = codeFenceChar === '`' ? /^(\s*`{3,})\s*$/ : /^(\s*~{3,})\s*$/
      if (closeRe.test(raw)) { inCodeBlock = false; out.push(`<span class="hl-code-fence">${line}</span>`) }
      else { out.push(`<span class="hl-code">${line}</span>`) }
      continue
    }

    const fenceMatch = /^(\s*)((`{3,})(.*)|~{3,}(.*)?)$/.exec(raw)
    if (fenceMatch) {
      const bt = fenceMatch[3]
      if (bt) {
        codeFenceChar = '`'; inCodeBlock = true
        const lang = fenceMatch[4] || ''
        if (lang.trim()) { out.push(`<span class="hl-code-fence">${escHtml(fenceMatch[1]! + bt)}</span><span class="hl-code-lang">${escHtml(lang)}</span>`) }
        else { out.push(`<span class="hl-code-fence">${line}</span>`) }
        continue
      }
      const tildeM = raw.match(/^(\s*)(~{3,})(.*)$/)
      if (tildeM) {
        codeFenceChar = '~'; inCodeBlock = true
        const lang = tildeM[3] || ''
        if (lang.trim()) { out.push(`<span class="hl-code-fence">${escHtml(tildeM[1]! + tildeM[2]!)}</span><span class="hl-code-lang">${escHtml(lang)}</span>`) }
        else { out.push(`<span class="hl-code-fence">${line}</span>`) }
        continue
      }
    }

    // Headings
    const hm = /^(#{1,6})\s(.*)$/.exec(raw)
    if (hm) { out.push(`<span class="hl-heading-marker">${escHtml(hm[1]!)}</span> <span class="hl-heading">${highlightInline(hm[2]!)}</span>`); continue }

    // Thematic break
    if (/^\s{0,3}([-*_])\s*(\1\s*){2,}$/.test(raw)) { out.push(`<span class="hl-hr">${line}</span>`); continue }

    // Container
    if (/^\s*:{3,}/.test(raw)) { out.push(`<span class="hl-container">${line}</span>`); continue }

    // Blockquote
    const bq = /^(\s*>+\s?)(.*)$/.exec(raw)
    if (bq) { out.push(`<span class="hl-blockquote-marker">${escHtml(bq[1]!)}</span>${highlightInline(bq[2]!)}`); continue }

    // Unordered list
    const ul = /^(\s*)([-*+])\s(.*)$/.exec(raw)
    if (ul) {
      const rest = ul[3]!
      const task = /^\[([ xX])\]\s(.*)$/.exec(rest)
      if (task) { out.push(`${escHtml(ul[1]!)}<span class="hl-list-marker">${escHtml(ul[2]!)}</span> <span class="hl-task-check">${escHtml(`[${task[1]}]`)}</span> ${highlightInline(task[2]!)}`) }
      else { out.push(`${escHtml(ul[1]!)}<span class="hl-list-marker">${escHtml(ul[2]!)}</span> ${highlightInline(rest)}`) }
      continue
    }

    // Ordered list
    const ol = /^(\s*)(\d+[.)]\s)(.*)$/.exec(raw)
    if (ol) { out.push(`${escHtml(ol[1]!)}<span class="hl-list-marker">${escHtml(ol[2]!)}</span>${highlightInline(ol[3]!)}`); continue }

    // Table
    if (/^\|/.test(raw) || /\|$/.test(raw.trim())) { out.push(highlightTableRow(raw)); continue }

    // Footnote
    if (/^\[\^[^\]]+\]:/.test(raw)) { out.push(`<span class="hl-footnote">${line}</span>`); continue }

    // Details
    if (/^\+{3}/.test(raw)) { out.push(`<span class="hl-container">${line}</span>`); continue }

    out.push(highlightInline(raw))
  }
  return out.join('\n')
}

function highlightInline(raw: string): string {
  let result = ''
  let i = 0
  const len = raw.length

  while (i < len) {
    const ch = raw.charCodeAt(i)

    // Backslash escape
    if (ch === 0x5C && i + 1 < len) { result += `<span class="hl-escape">${escHtml(raw[i]! + raw[i + 1]!)}</span>`; i += 2; continue }

    // Inline code
    if (ch === 0x60) {
      let ticks = 1; while (i + ticks < len && raw.charCodeAt(i + ticks) === 0x60) ticks++
      const closeIdx = raw.indexOf('`'.repeat(ticks), i + ticks)
      if (closeIdx !== -1) { result += `<span class="hl-code">${escHtml(raw.slice(i, closeIdx + ticks))}</span>`; i = closeIdx + ticks; continue }
    }

    // Math $...$
    if (ch === 0x24 && i + 1 < len && raw.charCodeAt(i + 1) !== 0x24) {
      const ci = raw.indexOf('$', i + 1)
      if (ci > i + 1) { result += `<span class="hl-math">${escHtml(raw.slice(i, ci + 1))}</span>`; i = ci + 1; continue }
    }
    if (ch === 0x24 && i + 1 < len && raw.charCodeAt(i + 1) === 0x24) {
      const ci = raw.indexOf('$$', i + 2)
      if (ci !== -1) { result += `<span class="hl-math">${escHtml(raw.slice(i, ci + 2))}</span>`; i = ci + 2; continue }
    }

    // Highlight ==text==
    if (ch === 0x3D && i + 1 < len && raw.charCodeAt(i + 1) === 0x3D) {
      const ci = raw.indexOf('==', i + 2)
      if (ci !== -1) { result += `<span class="hl-highlight">${escHtml(raw.slice(i, ci + 2))}</span>`; i = ci + 2; continue }
    }

    // Strikethrough ~~text~~
    if (ch === 0x7E && i + 1 < len && raw.charCodeAt(i + 1) === 0x7E) {
      const ci = raw.indexOf('~~', i + 2)
      if (ci !== -1) { result += `<span class="hl-strike">${escHtml(raw.slice(i, ci + 2))}</span>`; i = ci + 2; continue }
    }

    // Image ![alt](url)
    if (ch === 0x21 && i + 1 < len && raw.charCodeAt(i + 1) === 0x5B) {
      const cb = raw.indexOf(']', i + 2)
      if (cb !== -1 && cb + 1 < len && raw.charCodeAt(cb + 1) === 0x28) {
        const cp = raw.indexOf(')', cb + 2)
        if (cp !== -1) {
          result += `<span class="hl-image-marker">!</span><span class="hl-link-bracket">[</span><span class="hl-link-text">${escHtml(raw.slice(i + 2, cb))}</span><span class="hl-link-bracket">](</span><span class="hl-link-url">${escHtml(raw.slice(cb + 2, cp))}</span><span class="hl-link-bracket">)</span>`
          i = cp + 1; continue
        }
      }
    }

    // Link [text](url)
    if (ch === 0x5B) {
      const cb = raw.indexOf(']', i + 1)
      if (cb !== -1 && cb + 1 < len && raw.charCodeAt(cb + 1) === 0x28) {
        const cp = raw.indexOf(')', cb + 2)
        if (cp !== -1) {
          result += `<span class="hl-link-bracket">[</span><span class="hl-link-text">${escHtml(raw.slice(i + 1, cb))}</span><span class="hl-link-bracket">](</span><span class="hl-link-url">${escHtml(raw.slice(cb + 2, cp))}</span><span class="hl-link-bracket">)</span>`
          i = cp + 1; continue
        }
      }
      // Footnote [^xxx]
      if (i + 1 < len && raw.charCodeAt(i + 1) === 0x5E) {
        const cb2 = raw.indexOf(']', i + 2)
        if (cb2 !== -1) { result += `<span class="hl-footnote">${escHtml(raw.slice(i, cb2 + 1))}</span>`; i = cb2 + 1; continue }
      }
    }

    // Bold/Italic
    if (ch === 0x2A || ch === 0x5F) {
      const m = raw[i]!
      let mc = 1; while (i + mc < len && raw[i + mc] === m) mc++
      if (mc >= 3) { const ci = raw.indexOf(m.repeat(3), i + 3); if (ci !== -1) { result += `<span class="hl-bold-italic">${escHtml(raw.slice(i, ci + 3))}</span>`; i = ci + 3; continue } }
      if (mc >= 2) { const ci = raw.indexOf(m.repeat(2), i + 2); if (ci !== -1) { result += `<span class="hl-bold">${escHtml(raw.slice(i, ci + 2))}</span>`; i = ci + 2; continue } }
      if (mc >= 1) { const ci = raw.indexOf(m, i + 1); if (ci > i + 1) { result += `<span class="hl-italic">${escHtml(raw.slice(i, ci + 1))}</span>`; i = ci + 1; continue } }
    }

    // HTML tags
    if (ch === 0x3C) {
      const ci = raw.indexOf('>', i + 1)
      if (ci !== -1) {
        const tag = raw.slice(i, ci + 1)
        if (/^<\/?[a-zA-Z][^>]*>$/.test(tag) || /^<!--/.test(tag)) { result += `<span class="hl-html">${escHtml(tag)}</span>`; i = ci + 1; continue }
      }
    }

    // Emoji :name:
    if (ch === 0x3A) {
      const ci = raw.indexOf(':', i + 1)
      if (ci !== -1 && ci - i < 30 && /^:[a-z0-9_+-]+:$/.test(raw.slice(i, ci + 1))) { result += `<span class="hl-math">${escHtml(raw.slice(i, ci + 1))}</span>`; i = ci + 1; continue }
    }

    result += escHtml(raw[i]!)
    i++
  }
  return result
}

function highlightTableRow(raw: string): string {
  const parts = raw.split('|')
  const highlighted = parts.map((part, idx) => {
    if (idx === 0 && part === '') return ''
    if (idx === parts.length - 1 && part.trim() === '') return ''
    if (/^\s*:?-+:?\s*$/.test(part)) return `<span class="hl-table-border">${escHtml(part)}</span>`
    return highlightInline(part)
  })
  return highlighted.join(`<span class="hl-table-border">|</span>`)
}

// ============================================================
// Core: Parse + Render + Update (IncrementalParser)
// ============================================================

let debounceTimer: ReturnType<typeof setTimeout> | null = null

let incrementalParser: IncrementalParser | null = null
let lastEditorValue = ''

/**
 * Compute an EditOperation from old → new text.
 * Finds the first and last differing lines for a minimal edit range.
 */
function computeEdit(oldText: string, newText: string): EditOperation {
  const oldLines = oldText.split('\n')
  const newLines = newText.split('\n')

  let fromLine = 0
  const minLen = Math.min(oldLines.length, newLines.length)
  while (fromLine < minLen && oldLines[fromLine] === newLines[fromLine]) {
    fromLine++
  }

  let oldEnd = oldLines.length
  let newEnd = newLines.length
  while (oldEnd > fromLine && newEnd > fromLine && oldLines[oldEnd - 1] === newLines[newEnd - 1]) {
    oldEnd--
    newEnd--
  }

  return {
    fromLine,
    toLine: oldEnd,
    newText: newLines.slice(fromLine, newEnd).join('\n'),
  }
}

function countNodes(doc: Document): number {
  let count = 0
  walk(doc, () => { count++ })
  return count
}

function update(value: string): void {
  const t0 = performance.now()

  let ast: Document

  if (!incrementalParser) {
    incrementalParser = new IncrementalParser(value, { lazyInline: false })
    ast = incrementalParser.getDocument()
  } else if (value !== lastEditorValue) {
    const edit = computeEdit(lastEditorValue, value)
    try {
      const result = incrementalParser.applyEdit(edit)
      ast = result.document
    } catch {
      incrementalParser = new IncrementalParser(value, { lazyInline: false })
      ast = incrementalParser.getDocument()
    }
  } else {
    ast = incrementalParser.getDocument()
  }

  lastEditorValue = value

  const t1 = performance.now()
  const html = renderToHtml(ast, { sanitize: true, highlight: highlightCodeBlock })
  const t2 = performance.now()

  // Update preview (incremental patch)
  patchPreview(preview, html)

  // Update syntax highlight
  highlightCode.innerHTML = highlightMarkdown(value)

  const parseMs = (t1 - t0).toFixed(2)
  const renderMs = (t2 - t1).toFixed(2)
  const totalMs = (t2 - t0).toFixed(2)
  const lines = value.split('\n').length

  statParse.textContent = `${parseMs}ms (incr)`
  statRender.textContent = `${renderMs}ms`
  statLines.textContent = `${lines}`
  statChars.textContent = `${value.length} 字符`
  statTotal.textContent = `Total: ${totalMs}ms`
}

// ============================================================
// Incremental DOM Patching
// ============================================================

function patchPreview(container: HTMLElement, html: string): void {
  if (container.children.length === 0) { container.innerHTML = html; return }
  const temp = document.createElement('div')
  temp.innerHTML = html
  const oldLen = container.children.length
  const newLen = temp.children.length
  const minLen = Math.min(oldLen, newLen)

  for (let i = 0; i < minLen; i++) {
    const oldC = container.children[i]!
    const newC = temp.children[i]!
    if (oldC.outerHTML !== newC.outerHTML) container.replaceChild(newC.cloneNode(true), oldC)
  }
  while (container.children.length > newLen) container.removeChild(container.lastElementChild!)
  for (let i = oldLen; i < newLen; i++) container.appendChild(temp.children[i]!.cloneNode(true))
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
      const isActive = i === currentLine
      nums.push(`<div${isActive ? ' class="active-line"' : ''} data-line="${i}">${i}</div>`)
    }
    lineNumbers.innerHTML = nums.join('')
    lastLineCount = lines
  } else {
    updateActiveLine()
  }
}

function updateActiveLine(): void {
  const pos = editor.selectionStart
  const line = editor.value.slice(0, pos).split('\n').length
  if (line !== currentLine) {
    const old = lineNumbers.querySelector(`[data-line="${currentLine}"]`)
    if (old) old.classList.remove('active-line')
    const cur = lineNumbers.querySelector(`[data-line="${line}"]`)
    if (cur) cur.classList.add('active-line')
    currentLine = line
  }
}

// ============================================================
// Editor Events
// ============================================================

// Input → debounced update
editor.addEventListener('input', () => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => { update(editor.value); updateLineNumbers(editor.value) }, 50)
})

// Cursor move
editor.addEventListener('click', updateActiveLine)
editor.addEventListener('keyup', updateActiveLine)

// Scroll sync
editor.addEventListener('scroll', () => {
  highlightBackdrop.scrollTop = editor.scrollTop
  highlightBackdrop.scrollLeft = editor.scrollLeft
  lineNumbers.scrollTop = editor.scrollTop
}, { passive: true })

// Tab support
editor.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') {
    e.preventDefault()
    const start = editor.selectionStart
    const end = editor.selectionEnd
    const value = editor.value
    if (start === end && !e.shiftKey) {
      editor.value = value.substring(0, start) + '  ' + value.substring(end)
      editor.selectionStart = editor.selectionEnd = start + 2
    } else {
      const lineStart = value.lastIndexOf('\n', start - 1) + 1
      const lineEnd = value.indexOf('\n', end) === -1 ? value.length : value.indexOf('\n', end)
      const selectedText = value.substring(lineStart, lineEnd)
      const lines = selectedText.split('\n')
      const modified = e.shiftKey
        ? lines.map(l => l.startsWith('  ') ? l.slice(2) : l.startsWith(' ') ? l.slice(1) : l)
        : lines.map(l => '  ' + l)
      editor.value = value.substring(0, lineStart) + modified.join('\n') + value.substring(lineEnd)
      editor.selectionStart = lineStart
      editor.selectionEnd = lineStart + modified.join('\n').length
    }
    update(editor.value); updateLineNumbers(editor.value)
    return
  }

  // Keyboard shortcuts
  const mod = e.metaKey || e.ctrlKey
  if (mod) {
    if (e.key === 'b') { e.preventDefault(); wrapSelection('**', '**') }
    else if (e.key === 'i') { e.preventDefault(); wrapSelection('*', '*') }
    else if (e.key === 'k') {
      e.preventDefault()
      const sel = editor.value.substring(editor.selectionStart, editor.selectionEnd)
      if (sel) wrapSelection('[', '](url)'); else insertAtCursor('[link text](url)')
    }
    else if (e.key === '`') { e.preventDefault(); wrapSelection('`', '`') }
    else if (e.key === 'd') { e.preventDefault(); wrapSelection('~~', '~~') }
    return
  }

  // Enter: auto-continue lists
  if (e.key === 'Enter') {
    const pos = editor.selectionStart
    const textBefore = editor.value.slice(0, pos)
    const currentLineText = textBefore.split('\n').pop() ?? ''

    const ulMatch = /^(\s*)([-*+])\s+(.*)$/.exec(currentLineText)
    if (ulMatch && ulMatch[3]!.length > 0) { e.preventDefault(); insertAtCursor('\n' + ulMatch[1] + ulMatch[2] + ' '); return }
    if (ulMatch && ulMatch[3]!.length === 0) {
      e.preventDefault()
      const lineStart = textBefore.lastIndexOf('\n') + 1
      editor.value = editor.value.substring(0, lineStart) + editor.value.substring(pos)
      editor.selectionStart = editor.selectionEnd = lineStart
      insertAtCursor('\n'); return
    }

    const olMatch = /^(\s*)(\d+)([.)]\s+)(.*)$/.exec(currentLineText)
    if (olMatch && olMatch[4]!.length > 0) { e.preventDefault(); insertAtCursor('\n' + olMatch[1] + (parseInt(olMatch[2]!, 10) + 1) + olMatch[3]); return }

    const bqMatch = /^(\s*>+\s?)(.*)$/.exec(currentLineText)
    if (bqMatch && bqMatch[2]!.length > 0) { e.preventDefault(); insertAtCursor('\n' + bqMatch[1]); return }
  }
})

function wrapSelection(prefix: string, suffix: string): void {
  const start = editor.selectionStart
  const end = editor.selectionEnd
  const selected = editor.value.substring(start, end)
  editor.value = editor.value.substring(0, start) + prefix + selected + suffix + editor.value.substring(end)
  editor.selectionStart = start + prefix.length
  editor.selectionEnd = end + prefix.length
  editor.focus()
  update(editor.value); updateLineNumbers(editor.value)
}

function insertAtCursor(text: string): void {
  const start = editor.selectionStart
  editor.value = editor.value.substring(0, start) + text + editor.value.substring(editor.selectionEnd)
  editor.selectionStart = editor.selectionEnd = start + text.length
  editor.focus()
  update(editor.value); updateLineNumbers(editor.value)
}

// ============================================================
// Draggable Divider
// ============================================================

const divider = document.getElementById('divider')!
const editorPane = document.getElementById('editor-pane')!
const previewPane = document.getElementById('preview-pane')!
const mainEl = document.querySelector('main')!
let isDragging = false

divider.addEventListener('mousedown', (e) => {
  isDragging = true; divider.classList.add('dragging')
  document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none'
  e.preventDefault()
})
document.addEventListener('mousemove', (e) => {
  if (!isDragging) return
  const rect = mainEl.getBoundingClientRect()
  const pct = Math.max(20, Math.min(80, ((e.clientX - rect.left) / rect.width) * 100))
  editorPane.style.flex = `0 0 ${pct}%`
  previewPane.style.flex = `0 0 ${100 - pct}%`
})
document.addEventListener('mouseup', () => {
  if (isDragging) {
    isDragging = false; divider.classList.remove('dragging')
    document.body.style.cursor = ''; document.body.style.userSelect = ''
  }
})

// ============================================================
// URL Sharing (Base64 UTF-8 safe)
// ============================================================

function encodeContent(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!)
  return btoa(binary)
}

function decodeContent(encoded: string): string {
  const binary = atob(encoded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

function loadFromUrl(): boolean {
  const hash = window.location.hash.slice(1)
  const params = new URLSearchParams(hash)
  const code = params.get('code')
  if (code) {
    try {
      editor.value = decodeContent(code)
      return true
    } catch { /* fallback */ }
  }
  return false
}

// ============================================================
// Toast
// ============================================================

function showToast(msg: string): void {
  const toast = document.getElementById('toast')!
  toast.textContent = msg
  toast.classList.add('show')
  setTimeout(() => toast.classList.remove('show'), 2000)
}

// ============================================================
// Header Actions
// ============================================================

// Share
document.getElementById('btn-share')!.addEventListener('click', () => {
  const encoded = encodeContent(editor.value)
  const url = `${window.location.origin}${window.location.pathname}#code=${encoded}`
  const shareUrl = document.getElementById('share-url') as HTMLTextAreaElement
  shareUrl.value = url
  document.getElementById('modal-share')!.classList.add('active')
})

document.getElementById('btn-copy-link')!.addEventListener('click', () => {
  const shareUrl = document.getElementById('share-url') as HTMLTextAreaElement
  navigator.clipboard.writeText(shareUrl.value).then(() => {
    showToast('✅ 链接已复制到剪贴板')
    document.getElementById('modal-share')!.classList.remove('active')
  }).catch(() => {
    shareUrl.select()
    document.execCommand('copy')
    showToast('✅ 链接已复制')
    document.getElementById('modal-share')!.classList.remove('active')
  })
})

// Export HTML
document.getElementById('btn-export-html')!.addEventListener('click', () => {
  const html = preview.innerHTML
  const doc = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Markdown Document</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 900px; margin: 0 auto; padding: 24px; line-height: 1.7; color: #333; }
    h1, h2, h3, h4, h5, h6 { margin-top: 24px; margin-bottom: 16px; font-weight: 600; }
    code { background: #f5f5f5; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 14px; }
    pre { background: #2d2d2d; color: #f8f8f2; padding: 16px 20px; border-radius: 8px; overflow-x: auto; margin: 12px 0; }
    pre code { background: none; padding: 0; color: inherit; }
    table { border-collapse: collapse; width: 100%; margin: 16px 0; }
    th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
    th { background: #f5f5f5; font-weight: 600; }
    blockquote { border-left: 4px solid #6c5ce7; padding: 10px 16px; margin: 12px 0; background: #f9f9f9; }
    hr { border: none; border-top: 2px solid #eee; margin: 20px 0; }
    img { max-width: 100%; }
    a { color: #6c5ce7; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
${html}
</body>
</html>`
  downloadFile(doc, 'document.html', 'text/html')
  showToast('✅ HTML 已导出')
})

// Export MD
document.getElementById('btn-export-md')!.addEventListener('click', () => {
  downloadFile(editor.value, 'document.md', 'text/markdown')
  showToast('✅ Markdown 已导出')
})

function downloadFile(content: string, filename: string, type: string): void {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Help
document.getElementById('btn-help')!.addEventListener('click', () => {
  document.getElementById('modal-help')!.classList.add('active')
})

// Close modals on overlay click
document.querySelectorAll('.modal-overlay').forEach(el => {
  el.addEventListener('click', (e) => {
    if (e.target === el) el.classList.remove('active')
  })
})

// Close modals on Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.active').forEach(el => el.classList.remove('active'))
  }
})

// ============================================================
// Initialize
// ============================================================

if (!loadFromUrl()) {
  editor.value = DEFAULT_CONTENT
}
update(editor.value)
updateLineNumbers(editor.value)
