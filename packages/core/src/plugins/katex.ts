/**
 * @pre-markdown/core — Built-in KaTeX Plugin
 *
 * Renders mathBlock and mathInline nodes using KaTeX.
 * KaTeX must be provided by the consumer (peer dependency).
 *
 * @example
 * ```ts
 * import katex from 'katex'
 * import { PluginManager } from '@pre-markdown/core'
 * import { createKatexPlugin } from '@pre-markdown/core/plugins'
 *
 * const plugins = new PluginManager()
 * plugins.use(createKatexPlugin(katex))
 * ```
 */

import type { Plugin, RenderContext } from '../plugin/types.js'
import type { MathBlock, MathInline } from '../ast/types.js'

/**
 * KaTeX render function interface.
 * Compatible with `katex.renderToString()`.
 */
export interface KatexRenderer {
  renderToString(
    tex: string,
    options?: {
      displayMode?: boolean
      throwOnError?: boolean
      errorColor?: string
      macros?: Record<string, string>
      [key: string]: unknown
    },
  ): string
}

export interface KatexPluginOptions {
  /** Throw on KaTeX parse error (default: false — renders error message) */
  throwOnError?: boolean
  /** Error text color (default: '#cc0000') */
  errorColor?: string
  /** KaTeX macros */
  macros?: Record<string, string>
  /** Custom class for math block wrapper div */
  blockClass?: string
  /** Custom class for math inline wrapper span */
  inlineClass?: string
}

/**
 * Create a KaTeX plugin for math rendering.
 *
 * @param katex - The KaTeX module (import katex from 'katex')
 * @param options - Plugin options
 */
export function createKatexPlugin(
  katex: KatexRenderer,
  options: KatexPluginOptions = {},
): Plugin {
  const {
    throwOnError = false,
    errorColor = '#cc0000',
    macros,
    blockClass = 'math-block',
    inlineClass = 'math-inline',
  } = options

  const katexOptions = {
    throwOnError,
    errorColor,
    ...(macros ? { macros } : {}),
  }

  return {
    name: 'katex',
    render: {
      mathBlock: (ctx: RenderContext): string => {
        const node = ctx.node as MathBlock
        try {
          const html = katex.renderToString(node.value, {
            ...katexOptions,
            displayMode: true,
          })
          return `<div class="${blockClass}">${html}</div>\n`
        } catch (err) {
          if (throwOnError) throw err
          const msg = err instanceof Error ? err.message : String(err)
          return `<div class="${blockClass}" style="color:${errorColor}">${escapeHtml(msg)}</div>\n`
        }
      },
      mathInline: (ctx: RenderContext): string => {
        const node = ctx.node as MathInline
        try {
          const html = katex.renderToString(node.value, {
            ...katexOptions,
            displayMode: false,
          })
          return `<span class="${inlineClass}">${html}</span>`
        } catch (err) {
          if (throwOnError) throw err
          const msg = err instanceof Error ? err.message : String(err)
          return `<span class="${inlineClass}" style="color:${errorColor}">${escapeHtml(msg)}</span>`
        }
      },
    },
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
