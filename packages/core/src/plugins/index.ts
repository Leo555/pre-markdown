/**
 * @pre-markdown/core — Built-in Plugins
 *
 * Re-exports all built-in plugins for convenient access.
 */

export { createKatexPlugin } from './katex.js'
export type { KatexRenderer, KatexPluginOptions } from './katex.js'

export { createMermaidPlugin } from './mermaid.js'
export type { MermaidRenderer, MermaidPluginOptions } from './mermaid.js'

export { createHighlightPlugin } from './highlight.js'
export type { HighlightFunction, HighlightPluginOptions } from './highlight.js'
