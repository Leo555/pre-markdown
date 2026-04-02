/**
 * @pre-markdown/editor
 *
 * Main editor module that orchestrates parser, layout, and renderer.
 * This is the public API consumers will interact with.
 */

import { parse } from '@pre-markdown/parser'
import { renderToHtml } from '@pre-markdown/renderer'
import { EventBus } from '@pre-markdown/core'
import type { EditorEvents, Document } from '@pre-markdown/core'
import type { RendererOptions } from '@pre-markdown/renderer'
import type { BlockParserOptions } from '@pre-markdown/parser'

export interface PreMarkdownOptions {
  /** Container element or selector */
  container: HTMLElement | string
  /** Initial Markdown content */
  value?: string
  /** Parser options */
  parser?: BlockParserOptions
  /** Renderer options */
  renderer?: RendererOptions
  /** Editor mode */
  mode?: 'split' | 'edit' | 'preview'
  /** Theme */
  theme?: 'light' | 'dark'
  /** Callback when content changes */
  onChange?: (value: string) => void
}

export class PreMarkdownEditor {
  private container: HTMLElement
  private options: PreMarkdownOptions
  private events: EventBus<EditorEvents>
  private currentValue: string
  private currentAST: Document | null = null

  constructor(options: PreMarkdownOptions) {
    this.options = options
    this.events = new EventBus()
    this.currentValue = options.value ?? ''

    // Resolve container
    if (typeof options.container === 'string') {
      const el = document.querySelector(options.container)
      if (!el) throw new Error(`Container not found: ${options.container}`)
      this.container = el as HTMLElement
    } else {
      this.container = options.container
    }

    this.init()
  }

  private init(): void {
    // Parse initial content
    this.currentAST = parse(this.currentValue, this.options.parser)

    // Render
    this.render()
  }

  private render(): void {
    if (!this.currentAST) return

    const html = renderToHtml(this.currentAST, this.options.renderer)

    const mode = this.options.mode ?? 'split'

    if (mode === 'preview') {
      this.container.innerHTML = `<div class="pre-markdown-preview">${html}</div>`
    } else if (mode === 'edit') {
      this.container.innerHTML = `<div class="pre-markdown-editor"><textarea class="pre-markdown-textarea">${escapeHtml(this.currentValue)}</textarea></div>`
    } else {
      this.container.innerHTML = `
        <div class="pre-markdown-split">
          <div class="pre-markdown-editor">
            <textarea class="pre-markdown-textarea">${escapeHtml(this.currentValue)}</textarea>
          </div>
          <div class="pre-markdown-preview">${html}</div>
        </div>
      `
    }
  }

  /** Get the current Markdown value */
  getValue(): string {
    return this.currentValue
  }

  /** Set a new Markdown value */
  setValue(value: string): void {
    this.currentValue = value
    this.currentAST = parse(value, this.options.parser)
    this.render()
    this.options.onChange?.(value)
  }

  /** Get the current AST */
  getAST(): Document | null {
    return this.currentAST
  }

  /** Get the rendered HTML */
  getHtml(): string {
    if (!this.currentAST) return ''
    return renderToHtml(this.currentAST, this.options.renderer)
  }

  /** Subscribe to editor events */
  on<K extends keyof EditorEvents>(event: K, handler: (data: EditorEvents[K]) => void): () => void {
    return this.events.on(event, handler)
  }

  /** Destroy the editor */
  destroy(): void {
    this.events.off()
    this.container.innerHTML = ''
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export { PreMarkdownEditor as default }
