/**
 * @pre-markdown/core — Built-in Highlight Plugin
 *
 * Provides code syntax highlighting via a pluggable highlight engine.
 * Compatible with highlight.js, Prism, Shiki, and any library that
 * takes (code, lang) → highlighted HTML.
 *
 * @example
 * ```ts
 * import hljs from 'highlight.js'
 * import { PluginManager } from '@pre-markdown/core'
 * import { createHighlightPlugin } from '@pre-markdown/core/plugins'
 *
 * const plugins = new PluginManager()
 * plugins.use(createHighlightPlugin((code, lang) => {
 *   if (lang && hljs.getLanguage(lang)) {
 *     return hljs.highlight(code, { language: lang }).value
 *   }
 *   return hljs.highlightAuto(code).value
 * }))
 * ```
 */

import type { Plugin, RenderContext } from '../plugin/types.js'
import type { CodeBlock } from '../ast/types.js'

/**
 * A function that highlights code and returns HTML.
 */
export type HighlightFunction = (code: string, lang?: string) => string

export interface HighlightPluginOptions {
  /** Languages to skip highlighting (code will be escaped) */
  skipLanguages?: string[]
  /** Add line numbers (default: false) */
  lineNumbers?: boolean
  /** Custom class prefix for the code block (default: 'language-') */
  classPrefix?: string
  /** Wrap highlighted code in a custom container */
  wrapperClass?: string
}

/**
 * Create a code highlight plugin.
 *
 * @param highlight - A function that takes (code, lang) and returns highlighted HTML
 * @param options - Plugin options
 */
export function createHighlightPlugin(
  highlight: HighlightFunction,
  options: HighlightPluginOptions = {},
): Plugin {
  const {
    skipLanguages = [],
    lineNumbers = false,
    classPrefix = 'language-',
    wrapperClass,
  } = options

  const skipSet = new Set(skipLanguages.map(l => l.toLowerCase()))

  return {
    name: 'highlight',
    render: {
      codeBlock: (ctx: RenderContext): string | undefined => {
        const node = ctx.node as CodeBlock
        const lang = node.lang?.toLowerCase()

        // Skip mermaid (handled by mermaid plugin) and user-specified languages
        if (lang === 'mermaid') return undefined
        if (lang && skipSet.has(lang)) return undefined

        let code = node.value
        if (code.length > 0 && code.charCodeAt(code.length - 1) !== 10) {
          code += '\n'
        }

        // Apply highlight function
        let highlighted: string
        try {
          highlighted = highlight(code, node.lang ?? undefined)
        } catch {
          highlighted = escapeHtml(code)
        }

        // Add line numbers if enabled
        if (lineNumbers) {
          highlighted = addLineNumbers(highlighted)
        }

        // Build HTML
        const langClass = node.lang ? ` class="${classPrefix}${escapeAttr(node.lang)}"` : ''
        const codeHtml = `<pre><code${langClass}>${highlighted}</code></pre>\n`

        if (wrapperClass) {
          return `<div class="${wrapperClass}">${codeHtml}</div>\n`
        }

        return codeHtml
      },
    },
  }
}

function addLineNumbers(html: string): string {
  // Split by newlines in the HTML, wrap each line with a span
  const lines = html.split('\n')
  // Remove trailing empty line from the split
  if (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop()
  }
  return lines
    .map((line, i) => `<span class="line-number" data-line="${i + 1}"></span>${line}`)
    .join('\n') + '\n'
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escapeAttr(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
