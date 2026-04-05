/**
 * @pre-markdown/editor
 *
 * High-performance Markdown editor powered by pretext.
 *
 * Architecture:
 *   IncrementalParser → AST → renderToDOM (DOM patch)
 *   LayoutEngine + CursorEngine → cursor, selection, line numbers
 *   VirtualList → large document virtual scrolling
 *   EventBus → typed inter-layer communication
 *
 * All text measurement is zero-DOM-reflow via @chenglou/pretext.
 */

import { IncrementalParser, parseInline } from '@pre-markdown/parser'
import { renderToDOM, renderToHtml } from '@pre-markdown/renderer'
import { EventBus, getTextContent } from '@pre-markdown/core'
import type {
  EditorEvents,
  Document,
  Heading,
} from '@pre-markdown/core'
import type { EditOperation } from '@pre-markdown/parser'
import type { RendererOptions } from '@pre-markdown/renderer'
import type { BlockParserOptions } from '@pre-markdown/parser'
import {
  LayoutEngine,
  CursorEngine,
  VirtualList,
  LineRenderer,
} from '@pre-markdown/layout'
import type {
  LayoutConfig,
  Rect,
  CursorPosition,
  LineNumberInfo,
} from '@pre-markdown/layout'

// ============================================================
// Options & Types
// ============================================================

export interface PreMarkdownOptions {
  /** Container element or CSS selector */
  container: HTMLElement | string
  /** Initial Markdown content */
  value?: string
  /** Parser options */
  parser?: BlockParserOptions
  /** Renderer options */
  renderer?: RendererOptions
  /** Layout configuration (font, lineHeight, maxWidth) */
  layout?: Partial<LayoutConfig>
  /** Editor mode */
  mode?: 'split' | 'edit' | 'preview'
  /** Theme */
  theme?: 'light' | 'dark'
  /** Callback when content changes */
  onChange?: (value: string) => void
  /** Callback when cursor moves */
  onCursorChange?: (position: CursorPosition) => void
  /** Callback when selection changes */
  onSelectionChange?: (start: number, end: number) => void
  /** Enable virtual scrolling for large documents (default: true) */
  virtualScroll?: boolean
  /** Debounce interval for re-render in ms (default: 16 — one frame) */
  renderDebounce?: number
}

/** Outline heading item for navigation */
export interface OutlineItem {
  /** Heading depth (1-6) */
  depth: number
  /** Plain text content */
  text: string
  /** AST node id */
  id: number
  /** Block index in document.children */
  blockIndex: number
}

// ============================================================
// Editor Class
// ============================================================

export class PreMarkdownEditor {
  // --- Configuration ---
  private container: HTMLElement
  private options: PreMarkdownOptions
  private rendererOptions: RendererOptions

  // --- Core pipeline ---
  private parser: IncrementalParser
  private events: EventBus<EditorEvents>
  private currentAST: Document

  // --- Pretext layout ---
  private layoutEngine: LayoutEngine
  private cursorEngine: CursorEngine
  private virtualList: VirtualList | null = null
  private lineRenderer: LineRenderer | null = null

  // --- DOM elements ---
  private editorEl: HTMLElement | null = null
  private textareaEl: HTMLTextAreaElement | null = null
  private previewEl: HTMLElement | null = null
  private lineGutterEl: HTMLElement | null = null

  // --- State ---
  private currentValue: string
  private selectionStart = 0
  private selectionEnd = 0
  private isComposing = false
  private renderRAF = 0
  private lastRenderTime = 0

  // --- Undo/Redo ---
  private undoStack: Array<{ value: string; selStart: number; selEnd: number }> = []
  private redoStack: Array<{ value: string; selStart: number; selEnd: number }> = []
  private undoTimer = 0
  private readonly maxUndoSteps = 200
  private readonly undoDebounce = 300

  // --- Bound handlers (for cleanup) ---
  private _onInput: (() => void) | null = null
  private _onScroll: (() => void) | null = null
  private _onKeydown: ((e: KeyboardEvent) => void) | null = null
  private _onSelect: (() => void) | null = null
  private _onCompositionStart: (() => void) | null = null
  private _onCompositionEnd: (() => void) | null = null
  private _onResize: (() => void) | null = null
  private resizeObserver: ResizeObserver | null = null

  constructor(options: PreMarkdownOptions) {
    this.options = options
    this.currentValue = options.value ?? ''
    this.events = new EventBus()

    // Resolve container
    if (typeof options.container === 'string') {
      const el = document.querySelector(options.container)
      if (!el) throw new Error(`Container not found: ${options.container}`)
      this.container = el as HTMLElement
    } else {
      this.container = options.container
    }

    // Renderer options with inline parser for lazy parsing
    this.rendererOptions = {
      sanitize: true,
      inlineParser: (raw: string) => parseInline(raw),
      ...options.renderer,
    }

    // Initialize incremental parser
    this.parser = new IncrementalParser(
      this.currentValue,
      { lazyInline: true, ...options.parser },
      this.events,
    )
    this.currentAST = this.parser.getDocument()

    // Initialize pretext layout engine
    const layoutConfig: LayoutConfig = {
      font: '16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      lineHeight: 24,
      maxWidth: 600,
      ...options.layout,
    }
    this.layoutEngine = new LayoutEngine(layoutConfig)
    this.cursorEngine = new CursorEngine(this.layoutEngine)

    // Build DOM and start
    this.init()
  }

  // ============================================================
  // Initialization
  // ============================================================

  private init(): void {
    const mode = this.options.mode ?? 'split'
    this.buildDOM(mode)
    this.renderPreview()
    this.bindEvents()
    this.setupLayout()

    // Push initial undo state
    this.pushUndo()
  }

  private buildDOM(mode: 'split' | 'edit' | 'preview'): void {
    this.container.innerHTML = ''
    this.container.classList.add('pre-markdown-container')

    if (mode === 'preview') {
      this.previewEl = document.createElement('div')
      this.previewEl.className = 'pre-markdown-preview'
      this.container.appendChild(this.previewEl)
      return
    }

    if (mode === 'edit' || mode === 'split') {
      this.editorEl = document.createElement('div')
      this.editorEl.className = 'pre-markdown-editor'

      // Line gutter
      this.lineGutterEl = document.createElement('div')
      this.lineGutterEl.className = 'pre-markdown-line-gutter'
      this.editorEl.appendChild(this.lineGutterEl)

      // Textarea
      this.textareaEl = document.createElement('textarea')
      this.textareaEl.className = 'pre-markdown-textarea'
      this.textareaEl.value = this.currentValue
      this.textareaEl.spellcheck = false
      this.textareaEl.setAttribute('autocomplete', 'off')
      this.textareaEl.setAttribute('autocorrect', 'off')
      this.textareaEl.setAttribute('autocapitalize', 'off')
      this.editorEl.appendChild(this.textareaEl)

      this.container.appendChild(this.editorEl)
    }

    if (mode === 'split') {
      this.previewEl = document.createElement('div')
      this.previewEl.className = 'pre-markdown-preview'
      this.container.appendChild(this.previewEl)
    }
  }

  private bindEvents(): void {
    if (!this.textareaEl) return

    // Input handling (incremental parse)
    this._onInput = () => this.handleInput()
    this.textareaEl.addEventListener('input', this._onInput)

    // Selection tracking
    this._onSelect = () => this.handleSelectionChange()
    this.textareaEl.addEventListener('select', this._onSelect)
    // Also track on mouseup/keyup for selection changes without 'select' event
    this.textareaEl.addEventListener('mouseup', this._onSelect)
    this.textareaEl.addEventListener('keyup', this._onSelect)

    // IME composition handling
    this._onCompositionStart = () => { this.isComposing = true }
    this._onCompositionEnd = () => {
      this.isComposing = false
      this.handleInput()
    }
    this.textareaEl.addEventListener('compositionstart', this._onCompositionStart)
    this.textareaEl.addEventListener('compositionend', this._onCompositionEnd)

    // Scroll sync
    this._onScroll = () => this.handleScroll()
    this.textareaEl.addEventListener('scroll', this._onScroll)

    // Keyboard shortcuts
    this._onKeydown = (e: KeyboardEvent) => this.handleKeydown(e)
    this.textareaEl.addEventListener('keydown', this._onKeydown)

    // Resize observer for layout recomputation
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.handleResize())
      this.resizeObserver.observe(this.container)
    }
  }

  private setupLayout(): void {
    // Initialize CursorEngine with current content
    this.cursorEngine.setText(this.currentValue)

    // Set up line renderer
    if (this.lineGutterEl) {
      this.lineRenderer = new LineRenderer({
        cursor: this.cursorEngine,
        container: this.lineGutterEl,
        lineHeight: this.layoutEngine.getConfig().lineHeight,
      })
      this.lineRenderer.render()
    }

    // Set up virtual list for preview if enabled
    if (this.options.virtualScroll !== false && this.previewEl) {
      this.virtualList = new VirtualList({
        engine: this.layoutEngine,
        viewportHeight: this.previewEl.clientHeight || 600,
        overscan: 5,
      })
    }
  }

  // ============================================================
  // Input Handling (Incremental Pipeline)
  // ============================================================

  private handleInput(): void {
    if (this.isComposing) return
    if (!this.textareaEl) return

    const newValue = this.textareaEl.value
    if (newValue === this.currentValue) return

    const oldValue = this.currentValue
    this.currentValue = newValue

    // Compute the edit operation (diff old vs new)
    const edit = this.computeEdit(oldValue, newValue)

    // Incremental parse
    try {
      const result = this.parser.applyEdit(edit)
      this.currentAST = result.document
    } catch {
      // Fallback to full reparse on error
      this.parser = new IncrementalParser(
        newValue,
        { lazyInline: true, ...this.options.parser },
        this.events,
      )
      this.currentAST = this.parser.getDocument()
    }

    // Schedule render (debounced to next frame)
    this.scheduleRender()

    // Update layout engine
    this.cursorEngine.setText(newValue)
    if (this.lineRenderer) {
      this.lineRenderer.render()
    }

    // Debounced undo push
    this.scheduleUndoPush()

    // Emit events
    this.events.emit('content:change', {
      text: newValue,
      from: edit.fromLine,
      to: edit.toLine,
      inserted: edit.newText,
    })

    this.options.onChange?.(newValue)
  }

  /**
   * Compute an EditOperation from old and new text.
   * Finds the first and last differing lines for minimal incremental reparse.
   */
  private computeEdit(oldText: string, newText: string): EditOperation {
    const oldLines = oldText.split('\n')
    const newLines = newText.split('\n')

    // Find first differing line
    let fromLine = 0
    const minLen = Math.min(oldLines.length, newLines.length)
    while (fromLine < minLen && oldLines[fromLine] === newLines[fromLine]) {
      fromLine++
    }

    // Find last differing line (from end)
    let oldEnd = oldLines.length
    let newEnd = newLines.length
    while (
      oldEnd > fromLine &&
      newEnd > fromLine &&
      oldLines[oldEnd - 1] === newLines[newEnd - 1]
    ) {
      oldEnd--
      newEnd--
    }

    return {
      fromLine,
      toLine: oldEnd,
      newText: newLines.slice(fromLine, newEnd).join('\n'),
    }
  }

  // ============================================================
  // Rendering (DOM Patch)
  // ============================================================

  private scheduleRender(): void {
    if (this.renderRAF) return
    this.renderRAF = requestAnimationFrame(() => {
      this.renderRAF = 0
      this.renderPreview()
    })
  }

  private renderPreview(): void {
    if (!this.previewEl) return
    if (!this.currentAST) return

    const startTime = performance.now()

    // Use renderToDOM for efficient DOM creation
    const fragment = renderToDOM(this.currentAST, this.rendererOptions)

    // DOM patch: compare and replace only changed nodes
    this.patchPreview(fragment)

    const duration = performance.now() - startTime
    this.lastRenderTime = duration

    this.events.emit('render:done', {
      nodeCount: this.currentAST.children.length,
      duration,
    })
  }

  /**
   * Efficient DOM patching: compare old and new block-level children,
   * only replace nodes that changed (based on node type + id).
   */
  private patchPreview(newFragment: DocumentFragment): void {
    if (!this.previewEl) return

    const oldChildren = Array.from(this.previewEl.children)
    const newChildren = Array.from(newFragment.children)

    // If the container is empty or structure changed significantly, replace all
    if (oldChildren.length === 0 || Math.abs(oldChildren.length - newChildren.length) > oldChildren.length * 0.5) {
      this.previewEl.innerHTML = ''
      this.previewEl.appendChild(newFragment)
      return
    }

    // Smart patch: compare by position and content
    const maxLen = Math.max(oldChildren.length, newChildren.length)
    for (let i = 0; i < maxLen; i++) {
      const oldChild = oldChildren[i]
      const newChild = newChildren[i]

      if (!oldChild && newChild) {
        // New node added
        this.previewEl.appendChild(newChild)
      } else if (oldChild && !newChild) {
        // Old node removed
        this.previewEl.removeChild(oldChild)
      } else if (oldChild && newChild) {
        // Compare and replace if different
        if (!oldChild.isEqualNode(newChild)) {
          this.previewEl.replaceChild(newChild, oldChild)
        }
      }
    }
  }

  // ============================================================
  // Selection & Cursor
  // ============================================================

  private handleSelectionChange(): void {
    if (!this.textareaEl) return

    const start = this.textareaEl.selectionStart
    const end = this.textareaEl.selectionEnd

    if (start === this.selectionStart && end === this.selectionEnd) return

    this.selectionStart = start
    this.selectionEnd = end

    // Update cursor position via CursorEngine
    const position = this.cursorEngine.offsetToPosition(start)

    // Update active line in line renderer
    const lineNum = this.cursorEngine.getLineNumberAtOffset(start)
    if (this.lineRenderer) {
      this.lineRenderer.setActiveLine(lineNum)
    }

    // Emit events
    this.events.emit('selection:change', { from: start, to: end })
    this.options.onCursorChange?.(position)
    this.options.onSelectionChange?.(start, end)
  }

  /**
   * Get selection rectangles for custom selection rendering.
   * Useful for overlaying selection highlights on a canvas.
   */
  getSelectionRects(): Rect[] {
    if (this.selectionStart === this.selectionEnd) return []
    return this.cursorEngine.getSelectionRects(this.selectionStart, this.selectionEnd)
  }

  // ============================================================
  // Scroll Handling
  // ============================================================

  private handleScroll(): void {
    if (!this.textareaEl) return

    const scrollTop = this.textareaEl.scrollTop
    const scrollLeft = this.textareaEl.scrollLeft

    // Update line renderer for virtual rendering
    if (this.lineRenderer && this.textareaEl) {
      this.lineRenderer.updateScroll(scrollTop, this.textareaEl.clientHeight)
    }

    // Update virtual list if active
    if (this.virtualList) {
      this.virtualList.setScrollTop(scrollTop)
    }

    // Sync preview scroll (AST-based paragraph mapping)
    if (this.previewEl && this.textareaEl) {
      this.syncPreviewScroll(scrollTop)
    }

    this.events.emit('scroll:change', { scrollTop, scrollLeft })
  }

  /**
   * AST-based sync scroll: map editor scroll to preview position
   * using paragraph offset mapping for precision.
   */
  private syncPreviewScroll(editorScrollTop: number): void {
    if (!this.previewEl || !this.textareaEl) return

    const editorHeight = this.textareaEl.scrollHeight - this.textareaEl.clientHeight
    if (editorHeight <= 0) return

    const ratio = editorScrollTop / editorHeight
    const previewHeight = this.previewEl.scrollHeight - this.previewEl.clientHeight
    this.previewEl.scrollTop = ratio * previewHeight
  }

  // ============================================================
  // Keyboard Shortcuts
  // ============================================================

  private handleKeydown(e: KeyboardEvent): void {
    const mod = e.metaKey || e.ctrlKey

    // Undo: Ctrl+Z
    if (mod && e.key === 'z' && !e.shiftKey) {
      e.preventDefault()
      this.undo()
      return
    }

    // Redo: Ctrl+Shift+Z or Ctrl+Y
    if (mod && (e.key === 'z' && e.shiftKey || e.key === 'y')) {
      e.preventDefault()
      this.redo()
      return
    }

    // Bold: Ctrl+B
    if (mod && e.key === 'b') {
      e.preventDefault()
      this.wrapSelection('**', '**')
      return
    }

    // Italic: Ctrl+I
    if (mod && e.key === 'i') {
      e.preventDefault()
      this.wrapSelection('*', '*')
      return
    }

    // Inline code: Ctrl+`
    if (mod && e.key === '`') {
      e.preventDefault()
      this.wrapSelection('`', '`')
      return
    }

    // Link: Ctrl+K
    if (mod && e.key === 'k') {
      e.preventDefault()
      this.wrapSelection('[', '](url)')
      return
    }

    // Strikethrough: Ctrl+D
    if (mod && e.key === 'd') {
      e.preventDefault()
      this.wrapSelection('~~', '~~')
      return
    }

    // Tab indent
    if (e.key === 'Tab' && !mod) {
      e.preventDefault()
      if (e.shiftKey) {
        this.dedent()
      } else {
        this.indent()
      }
      return
    }
  }

  // ============================================================
  // Text Manipulation
  // ============================================================

  /** Wrap current selection with prefix/suffix */
  wrapSelection(prefix: string, suffix: string): void {
    if (!this.textareaEl) return

    const start = this.textareaEl.selectionStart
    const end = this.textareaEl.selectionEnd
    const text = this.currentValue
    const selected = text.slice(start, end)

    const newText = text.slice(0, start) + prefix + selected + suffix + text.slice(end)
    this.textareaEl.value = newText
    this.textareaEl.selectionStart = start + prefix.length
    this.textareaEl.selectionEnd = end + prefix.length
    this.textareaEl.dispatchEvent(new Event('input'))
  }

  /** Insert text at cursor position */
  insertAtCursor(text: string): void {
    if (!this.textareaEl) return

    const start = this.textareaEl.selectionStart
    const end = this.textareaEl.selectionEnd
    const current = this.currentValue

    this.textareaEl.value = current.slice(0, start) + text + current.slice(end)
    this.textareaEl.selectionStart = start + text.length
    this.textareaEl.selectionEnd = start + text.length
    this.textareaEl.dispatchEvent(new Event('input'))
  }

  /** Indent selected lines */
  private indent(): void {
    if (!this.textareaEl) return
    const start = this.textareaEl.selectionStart
    const end = this.textareaEl.selectionEnd
    const text = this.currentValue

    const lineStart = text.lastIndexOf('\n', start - 1) + 1
    const lineEnd = text.indexOf('\n', end)
    const actualEnd = lineEnd === -1 ? text.length : lineEnd

    const lines = text.slice(lineStart, actualEnd).split('\n')
    const indented = lines.map(l => '  ' + l).join('\n')

    this.textareaEl.value = text.slice(0, lineStart) + indented + text.slice(actualEnd)
    this.textareaEl.selectionStart = start + 2
    this.textareaEl.selectionEnd = end + lines.length * 2
    this.textareaEl.dispatchEvent(new Event('input'))
  }

  /** Dedent selected lines */
  private dedent(): void {
    if (!this.textareaEl) return
    const start = this.textareaEl.selectionStart
    const end = this.textareaEl.selectionEnd
    const text = this.currentValue

    const lineStart = text.lastIndexOf('\n', start - 1) + 1
    const lineEnd = text.indexOf('\n', end)
    const actualEnd = lineEnd === -1 ? text.length : lineEnd

    const lines = text.slice(lineStart, actualEnd).split('\n')
    let removedBefore = 0
    let totalRemoved = 0
    const dedented = lines.map((l, i) => {
      if (l.startsWith('  ')) {
        if (i === 0) removedBefore = 2
        totalRemoved += 2
        return l.slice(2)
      }
      if (l.startsWith('\t')) {
        if (i === 0) removedBefore = 1
        totalRemoved += 1
        return l.slice(1)
      }
      return l
    }).join('\n')

    this.textareaEl.value = text.slice(0, lineStart) + dedented + text.slice(actualEnd)
    this.textareaEl.selectionStart = Math.max(lineStart, start - removedBefore)
    this.textareaEl.selectionEnd = Math.max(lineStart, end - totalRemoved)
    this.textareaEl.dispatchEvent(new Event('input'))
  }

  // ============================================================
  // Undo / Redo
  // ============================================================

  private scheduleUndoPush(): void {
    if (this.undoTimer) clearTimeout(this.undoTimer)
    this.undoTimer = window.setTimeout(() => this.pushUndo(), this.undoDebounce)
  }

  private pushUndo(): void {
    if (!this.textareaEl) return
    const snapshot = {
      value: this.currentValue,
      selStart: this.textareaEl.selectionStart,
      selEnd: this.textareaEl.selectionEnd,
    }

    // Don't push duplicate
    const last = this.undoStack[this.undoStack.length - 1]
    if (last && last.value === snapshot.value) return

    this.undoStack.push(snapshot)
    if (this.undoStack.length > this.maxUndoSteps) {
      this.undoStack.shift()
    }
    // Clear redo stack on new action
    this.redoStack = []
  }

  undo(): void {
    if (this.undoStack.length <= 1) return
    const current = this.undoStack.pop()!
    this.redoStack.push(current)
    const prev = this.undoStack[this.undoStack.length - 1]!
    this.applySnapshot(prev)
  }

  redo(): void {
    if (this.redoStack.length === 0) return
    const snapshot = this.redoStack.pop()!
    this.undoStack.push(snapshot)
    this.applySnapshot(snapshot)
  }

  private applySnapshot(snapshot: { value: string; selStart: number; selEnd: number }): void {
    if (!this.textareaEl) return
    this.textareaEl.value = snapshot.value
    this.textareaEl.selectionStart = snapshot.selStart
    this.textareaEl.selectionEnd = snapshot.selEnd
    // Trigger the pipeline manually (since programmatic value change doesn't fire 'input')
    this.currentValue = snapshot.value
    this.parser = new IncrementalParser(
      snapshot.value,
      { lazyInline: true, ...this.options.parser },
      this.events,
    )
    this.currentAST = this.parser.getDocument()
    this.cursorEngine.setText(snapshot.value)
    this.scheduleRender()
    if (this.lineRenderer) this.lineRenderer.render()
    this.options.onChange?.(snapshot.value)
  }

  // ============================================================
  // Resize Handling
  // ============================================================

  private handleResize(): void {
    if (!this.editorEl) return

    const width = this.editorEl.clientWidth
    if (width > 0) {
      // Update layout engine maxWidth
      this.layoutEngine.updateConfig({ maxWidth: width - 60 }) // 60px for gutter
      this.cursorEngine.recompute()
      if (this.lineRenderer) this.lineRenderer.render()
      if (this.virtualList && this.previewEl) {
        this.virtualList.setViewportHeight(this.previewEl.clientHeight)
        this.virtualList.relayout()
      }
    }
  }

  // ============================================================
  // Public API
  // ============================================================

  /** Get the current Markdown value */
  getValue(): string {
    return this.currentValue
  }

  /** Set a new Markdown value (full replace) */
  setValue(value: string): void {
    this.currentValue = value
    if (this.textareaEl) {
      this.textareaEl.value = value
    }

    // Full reparse
    this.parser = new IncrementalParser(
      value,
      { lazyInline: true, ...this.options.parser },
      this.events,
    )
    this.currentAST = this.parser.getDocument()
    this.cursorEngine.setText(value)

    this.scheduleRender()
    if (this.lineRenderer) this.lineRenderer.render()

    this.pushUndo()
    this.options.onChange?.(value)
  }

  /** Get the current AST */
  getAST(): Document {
    return this.currentAST
  }

  /** Get the rendered HTML string */
  getHtml(): string {
    return renderToHtml(this.currentAST, this.rendererOptions)
  }

  /** Get the incremental parser (for advanced usage) */
  getParser(): IncrementalParser {
    return this.parser
  }

  /** Get the layout engine */
  getLayoutEngine(): LayoutEngine {
    return this.layoutEngine
  }

  /** Get the cursor engine */
  getCursorEngine(): CursorEngine {
    return this.cursorEngine
  }

  /** Get the virtual list (may be null if disabled) */
  getVirtualList(): VirtualList | null {
    return this.virtualList
  }

  /** Get the event bus for subscribing to editor events */
  getEventBus(): EventBus<EditorEvents> {
    return this.events
  }

  /** Subscribe to editor events */
  on<K extends keyof EditorEvents>(event: K, handler: (data: EditorEvents[K]) => void): () => void {
    return this.events.on(event, handler)
  }

  /** Get line numbers info from CursorEngine */
  getLineNumbers(): readonly LineNumberInfo[] {
    return this.cursorEngine.getLineNumbers()
  }

  /** Get cursor position at an offset */
  getCursorPosition(offset?: number): CursorPosition {
    return this.cursorEngine.offsetToPosition(offset ?? this.selectionStart)
  }

  /** Get document outline (headings) from AST */
  getOutline(): OutlineItem[] {
    const items: OutlineItem[] = []
    const children = this.currentAST.children
    for (let i = 0; i < children.length; i++) {
      const node = children[i]!
      if (node.type === 'heading') {
        const heading = node as Heading
        items.push({
          depth: heading.depth,
          text: getTextContent(heading.children),
          id: heading.id ?? 0,
          blockIndex: i,
        })
      }
    }
    return items
  }

  /** Get last render duration in ms */
  getLastRenderTime(): number {
    return this.lastRenderTime
  }

  /** Focus the editor textarea */
  focus(): void {
    this.textareaEl?.focus()
  }

  /** Blur the editor textarea */
  blur(): void {
    this.textareaEl?.blur()
  }

  /** Set the editor mode */
  setMode(mode: 'split' | 'edit' | 'preview'): void {
    this.unbindEvents()
    this.buildDOM(mode)
    if (this.textareaEl) {
      this.textareaEl.value = this.currentValue
    }
    this.bindEvents()
    this.setupLayout()
    this.renderPreview()
  }

  /** Set the theme */
  setTheme(theme: 'light' | 'dark'): void {
    this.options.theme = theme
    this.container.setAttribute('data-theme', theme)
  }

  /** Destroy the editor and clean up all resources */
  destroy(): void {
    this.unbindEvents()
    if (this.renderRAF) cancelAnimationFrame(this.renderRAF)
    if (this.undoTimer) clearTimeout(this.undoTimer)
    if (this.lineRenderer) this.lineRenderer.dispose()
    this.events.off()
    this.container.innerHTML = ''
  }

  private unbindEvents(): void {
    if (this.textareaEl) {
      if (this._onInput) this.textareaEl.removeEventListener('input', this._onInput)
      if (this._onSelect) {
        this.textareaEl.removeEventListener('select', this._onSelect)
        this.textareaEl.removeEventListener('mouseup', this._onSelect)
        this.textareaEl.removeEventListener('keyup', this._onSelect)
      }
      if (this._onScroll) this.textareaEl.removeEventListener('scroll', this._onScroll)
      if (this._onKeydown) this.textareaEl.removeEventListener('keydown', this._onKeydown)
      if (this._onCompositionStart) this.textareaEl.removeEventListener('compositionstart', this._onCompositionStart)
      if (this._onCompositionEnd) this.textareaEl.removeEventListener('compositionend', this._onCompositionEnd)
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
      this.resizeObserver = null
    }
  }
}

export { PreMarkdownEditor as default }

// Re-export types for consumers
export type { CursorPosition, Rect, LineNumberInfo } from '@pre-markdown/layout'
export type { RendererOptions } from '@pre-markdown/renderer'
export type { BlockParserOptions, EditOperation, IncrementalParseResult } from '@pre-markdown/parser'
export type { EditorEvents, Document } from '@pre-markdown/core'
