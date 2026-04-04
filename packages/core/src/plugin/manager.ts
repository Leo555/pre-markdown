/**
 * @pre-markdown/core - Plugin Manager
 *
 * Manages plugin registration, ordering, and hook execution.
 * Provides a central registry that parser and renderer query for active hooks.
 */

import type {
  Plugin,
  BlockParseHook,
  InlineParseHook,
  ASTTransformHook,
  RenderHook,
  RenderContext,
  BlockParseContext,
  InlineParseContext,
  InlineParseResult,
} from './types.js'
import type { Document, NodeType } from '../ast/types.js'

export class PluginManager {
  private plugins: Plugin[] = []
  /** Cached inline hooks grouped by trigger char code */
  private inlineHookMap = new Map<number, InlineParseHook[]>()
  /** Cached render hooks grouped by node type */
  private renderHookMap = new Map<string, RenderHook[]>()
  /** Cached block parse hooks (ordered by plugin registration) */
  private blockHooks: BlockParseHook[] = []
  /** Cached transform hooks */
  private transformHooks: ASTTransformHook[] = []

  /**
   * Register one or more plugins.
   * Plugins are executed in registration order.
   */
  use(...plugins: Plugin[]): this {
    for (const plugin of plugins) {
      // Check for duplicate names
      if (this.plugins.some(p => p.name === plugin.name)) {
        console.warn(`[PreMarkdown] Plugin "${plugin.name}" is already registered, skipping.`)
        continue
      }
      this.plugins.push(plugin)
    }
    this.rebuildCaches()
    return this
  }

  /**
   * Remove a plugin by name.
   */
  remove(name: string): this {
    this.plugins = this.plugins.filter(p => p.name !== name)
    this.rebuildCaches()
    return this
  }

  /**
   * Get all registered plugin names.
   */
  getPluginNames(): string[] {
    return this.plugins.map(p => p.name)
  }

  /**
   * Check if a plugin is registered.
   */
  has(name: string): boolean {
    return this.plugins.some(p => p.name === name)
  }

  // ============================================================
  // Hook Execution
  // ============================================================

  /**
   * Try block parse hooks for the current line.
   * Returns the number of lines consumed, or 0 if no hook matched.
   */
  tryBlockParse(ctx: BlockParseContext): number {
    for (const hook of this.blockHooks) {
      const consumed = hook(ctx)
      if (consumed && consumed > 0) return consumed
    }
    return 0
  }

  /**
   * Try inline parse hooks for the given character code.
   * Returns the first successful result, or null.
   */
  tryInlineParse(ctx: InlineParseContext): InlineParseResult | null {
    const hooks = this.inlineHookMap.get(ctx.charCode)
    if (!hooks) return null
    for (const hook of hooks) {
      const result = hook(ctx)
      if (result) return result
    }
    return null
  }

  /**
   * Run all AST transform hooks in order.
   */
  applyTransforms(doc: Document): Document {
    let result = doc
    for (const hook of this.transformHooks) {
      const transformed = hook(result)
      if (transformed) result = transformed
    }
    return result
  }

  /**
   * Try render hooks for a given node type.
   * Returns the custom HTML or undefined if no hook matched.
   */
  tryRender(ctx: RenderContext): string | undefined {
    const nodeType = ctx.node.type as string
    const hooks = this.renderHookMap.get(nodeType)
    if (!hooks) return undefined
    for (const hook of hooks) {
      const result = hook(ctx)
      if (result !== undefined) return result
    }
    return undefined
  }

  /**
   * Check if there are any render hooks for a node type.
   */
  hasRenderHook(nodeType: NodeType): boolean {
    return (this.renderHookMap.get(nodeType)?.length ?? 0) > 0
  }

  /**
   * Check if there are any inline parse hooks for a character code.
   */
  hasInlineHook(charCode: number): boolean {
    return (this.inlineHookMap.get(charCode)?.length ?? 0) > 0
  }

  /**
   * Check if there are any block parse hooks.
   */
  hasBlockHooks(): boolean {
    return this.blockHooks.length > 0
  }

  /**
   * Check if there are any transform hooks.
   */
  hasTransformHooks(): boolean {
    return this.transformHooks.length > 0
  }

  // ============================================================
  // Internal: Cache Rebuilding
  // ============================================================

  private rebuildCaches(): void {
    this.inlineHookMap.clear()
    this.renderHookMap.clear()
    this.blockHooks = []
    this.transformHooks = []

    for (const plugin of this.plugins) {
      // Block parse hooks
      if (plugin.blockParse) {
        this.blockHooks.push(plugin.blockParse)
      }

      // Inline parse hooks
      if (plugin.inlineParse) {
        for (const [charCodeStr, hook] of Object.entries(plugin.inlineParse)) {
          const charCode = Number(charCodeStr)
          let hooks = this.inlineHookMap.get(charCode)
          if (!hooks) {
            hooks = []
            this.inlineHookMap.set(charCode, hooks)
          }
          hooks.push(hook)
        }
      }

      // Transform hooks
      if (plugin.transform) {
        this.transformHooks.push(plugin.transform)
      }

      // Render hooks
      if (plugin.render) {
        for (const [nodeType, hook] of Object.entries(plugin.render)) {
          if (!hook) continue
          let hooks = this.renderHookMap.get(nodeType)
          if (!hooks) {
            hooks = []
            this.renderHookMap.set(nodeType, hooks)
          }
          hooks.push(hook)
        }
      }
    }
  }
}
