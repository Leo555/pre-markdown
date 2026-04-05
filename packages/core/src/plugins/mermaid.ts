/**
 * @pre-markdown/core — Built-in Mermaid Plugin
 *
 * Renders code blocks with language "mermaid" as Mermaid diagrams.
 * Mermaid must be provided by the consumer (peer dependency).
 *
 * @example
 * ```ts
 * import mermaid from 'mermaid'
 * import { PluginManager } from '@pre-markdown/core'
 * import { createMermaidPlugin } from '@pre-markdown/core/plugins'
 *
 * const plugins = new PluginManager()
 * plugins.use(createMermaidPlugin(mermaid))
 * ```
 */

import type { Plugin, RenderContext } from '../plugin/types.js'
import type { CodeBlock } from '../ast/types.js'
import { escapeHtml } from '../escape.js'

/**
 * Mermaid render interface.
 * Compatible with `mermaid.render()` (v10+).
 */
export interface MermaidRenderer {
  render(
    id: string,
    definition: string,
  ): Promise<{ svg: string }> | { svg: string }
}

export interface MermaidPluginOptions {
  /** CSS class for the mermaid container (default: 'mermaid') */
  containerClass?: string
  /** Prefix for generated SVG IDs (default: 'mermaid-') */
  idPrefix?: string
  /** Theme: 'default' | 'dark' | 'forest' | 'neutral' */
  theme?: string
}

let mermaidIdCounter = 0

/**
 * Create a Mermaid plugin for diagram rendering.
 *
 * Note: Since Mermaid's render() is async (v10+), this plugin
 * renders a placeholder that can be hydrated client-side.
 * For synchronous SSR, use mermaid.renderSync() if available.
 *
 * @param mermaid - The Mermaid module (import mermaid from 'mermaid')
 * @param options - Plugin options
 */
export function createMermaidPlugin(
  _mermaid?: MermaidRenderer | null,
  options: MermaidPluginOptions = {},
): Plugin {
  const {
    containerClass = 'mermaid',
    idPrefix = 'mermaid-',
  } = options

  return {
    name: 'mermaid',
    render: {
      codeBlock: (ctx: RenderContext): string | undefined => {
        const node = ctx.node as CodeBlock
        if (node.lang !== 'mermaid') return undefined // Fall through to default rendering

        const id = `${idPrefix}${++mermaidIdCounter}`
        // Render as a container with the mermaid definition as text content.
        // Client-side JS can hydrate this with mermaid.init() or mermaid.run().
        return `<div class="${containerClass}" id="${id}">${escapeHtml(node.value)}</div>\n`
      },
    },
  }
}
