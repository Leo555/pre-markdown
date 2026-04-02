/**
 * @pre-markdown/core - AST Visitor
 *
 * Utilities for traversing and transforming AST trees.
 */

import type { ASTNode, Document, BlockNode, InlineNode } from './types.js'

/** Callback for visiting nodes */
export type VisitorCallback = (node: ASTNode, parent: ASTNode | null, index: number) => void | false

/** Walk the AST tree depth-first, calling the visitor for each node */
export function walk(root: Document, visitor: VisitorCallback): void {
  walkNode(root, null, 0, visitor)
}

/**
 * Internal walk function. Returns false if traversal should stop.
 */
function walkNode(
  node: ASTNode,
  parent: ASTNode | null,
  index: number,
  visitor: VisitorCallback,
): boolean {
  const result = visitor(node, parent, index)
  if (result === false) return false

  if ('children' in node && Array.isArray(node.children)) {
    const children = node.children as ASTNode[]
    for (let i = 0; i < children.length; i++) {
      const shouldContinue = walkNode(children[i]!, node, i, visitor)
      if (!shouldContinue) return false
    }
  }
  return true
}

/** Filter function to find all nodes of a specific type */
export function findAll<T extends ASTNode>(
  root: Document,
  predicate: (node: ASTNode) => node is T,
): T[] {
  const results: T[] = []
  walk(root, (node) => {
    if (predicate(node)) {
      results.push(node)
    }
  })
  return results
}

/** Find the first node matching a predicate */
export function findFirst<T extends ASTNode>(
  root: Document,
  predicate: (node: ASTNode) => node is T,
): T | undefined {
  let found: T | undefined
  walk(root, (node) => {
    if (predicate(node)) {
      found = node
      return false // stop walking
    }
  })
  return found
}

/** Type guard helpers */
export function isBlockNode(node: ASTNode): node is BlockNode {
  const blockTypes = new Set([
    'heading', 'paragraph', 'blockquote', 'list', 'listItem',
    'codeBlock', 'thematicBreak', 'htmlBlock', 'table', 'tableRow',
    'tableCell', 'footnoteDefinition', 'mathBlock', 'container',
    'details', 'toc',
  ])
  return blockTypes.has(node.type)
}

export function isInlineNode(node: ASTNode): node is InlineNode {
  const inlineTypes = new Set([
    'text', 'emphasis', 'strong', 'strikethrough', 'inlineCode',
    'link', 'image', 'htmlInline', 'break', 'softBreak',
    'footnoteReference', 'mathInline', 'highlight', 'superscript',
    'subscript', 'fontColor', 'fontSize', 'fontBgColor', 'ruby',
    'emoji', 'audio', 'video', 'autolink',
  ])
  return inlineTypes.has(node.type)
}

/** Get plain text content from an inline node tree */
export function getTextContent(nodes: InlineNode[]): string {
  let text = ''
  for (const node of nodes) {
    if (node.type === 'text') {
      text += node.value
    } else if (node.type === 'inlineCode') {
      text += node.value
    } else if (node.type === 'break' || node.type === 'softBreak') {
      text += '\n'
    } else if ('children' in node) {
      text += getTextContent(node.children)
    }
  }
  return text
}
