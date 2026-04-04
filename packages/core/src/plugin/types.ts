/**
 * @pre-markdown/core - Plugin System Types
 *
 * Defines the plugin interface for extending PreMarkdown's parsing and rendering.
 *
 * Design principles:
 * - Plugins are pure configuration objects (no classes needed)
 * - Hooks are optional — a plugin can extend parsing, rendering, or both
 * - AST transform hooks run after parsing, before rendering
 * - Render hooks can override or extend HTML output for any node type
 */

import type { Document, BlockNode, InlineNode, ASTNode, NodeType } from '../ast/types.js'

// ============================================================
// Block Parse Hook
// ============================================================

/**
 * Context provided to block-level parse hooks.
 * The hook receives the current line and can decide whether to consume it.
 */
export interface BlockParseContext {
  /** Current line being parsed (untrimmed) */
  line: string
  /** Current line number (0-based) */
  lineIndex: number
  /** All remaining lines from current position */
  lines: string[]
  /** Add a block node to the document */
  addNode: (node: BlockNode) => void
}

/**
 * Block-level parse hook.
 * Return the number of lines consumed, or 0/undefined to skip.
 */
export type BlockParseHook = (ctx: BlockParseContext) => number | undefined

// ============================================================
// Inline Parse Hook
// ============================================================

/**
 * Context provided to inline-level parse hooks.
 */
export interface InlineParseContext {
  /** The full inline text being parsed */
  input: string
  /** Current position in the input */
  pos: number
  /** Character code at current position */
  charCode: number
}

/**
 * Inline parse result returned by a hook.
 */
export interface InlineParseResult {
  /** The parsed inline node */
  node: InlineNode
  /** New position after consuming the syntax */
  end: number
}

/**
 * Inline-level parse hook.
 * Return null to skip, or an InlineParseResult to consume.
 */
export type InlineParseHook = (ctx: InlineParseContext) => InlineParseResult | null

// ============================================================
// AST Transform Hook
// ============================================================

/**
 * AST transform hook — runs after parsing, before rendering.
 * Can modify the document AST in-place.
 */
export type ASTTransformHook = (doc: Document) => Document | void

// ============================================================
// Render Hook
// ============================================================

/**
 * Context for render hooks.
 */
export interface RenderContext {
  /** The node being rendered */
  node: ASTNode
  /** Default HTML for this node (from built-in renderer) */
  defaultHtml: string
  /** Render children to HTML (useful for custom wrappers) */
  renderChildren: (children: (BlockNode | InlineNode)[]) => string
}

/**
 * Render hook — called for specific node types.
 * Return a string to override the default HTML, or undefined to use default.
 */
export type RenderHook = (ctx: RenderContext) => string | undefined

// ============================================================
// Plugin Interface
// ============================================================

/**
 * A PreMarkdown plugin.
 *
 * Plugins can extend parsing, transform the AST, and customize rendering.
 * All hooks are optional — implement only what you need.
 *
 * @example
 * ```ts
 * const katexPlugin: Plugin = {
 *   name: 'katex',
 *   render: {
 *     mathBlock: ({ node }) => katex.renderToString(node.value, { displayMode: true }),
 *     mathInline: ({ node }) => katex.renderToString(node.value),
 *   },
 * }
 * ```
 *
 * @example
 * ```ts
 * const customBlockPlugin: Plugin = {
 *   name: 'custom-block',
 *   blockParse: (ctx) => {
 *     if (ctx.line.startsWith(':::chart')) {
 *       // consume lines until closing :::
 *       let end = 1
 *       while (end < ctx.lines.length && !ctx.lines[end].startsWith(':::')) end++
 *       ctx.addNode(createContainer('chart', []))
 *       return end + 1
 *     }
 *     return 0
 *   },
 * }
 * ```
 */
export interface Plugin {
  /** Unique plugin name */
  name: string

  /**
   * Block-level parse hook.
   * Called for each line that doesn't match built-in block syntax.
   * Return the number of lines consumed, or 0 to skip.
   */
  blockParse?: BlockParseHook

  /**
   * Inline parse hooks, keyed by trigger character code.
   * Each hook is called when the parser encounters the trigger character.
   *
   * @example
   * ```ts
   * inlineParse: {
   *   // Trigger on '@' character (charCode 64)
   *   64: (ctx) => {
   *     const match = ctx.input.slice(ctx.pos).match(/^@(\w+)/)
   *     if (!match) return null
   *     return { node: createLink('/' + match[1], [createText('@' + match[1])]), end: ctx.pos + match[0].length }
   *   }
   * }
   * ```
   */
  inlineParse?: Record<number, InlineParseHook>

  /**
   * AST transform hook — runs after parsing, before rendering.
   * Useful for post-processing (e.g., auto-linking, TOC generation).
   */
  transform?: ASTTransformHook

  /**
   * Render hooks, keyed by node type.
   * Called when rendering a node of the specified type.
   * Return a string to override, or undefined to use default rendering.
   */
  render?: Partial<Record<NodeType, RenderHook>>
}
