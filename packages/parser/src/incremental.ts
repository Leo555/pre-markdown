/**
 * @pre-markdown/parser - Incremental Parser
 *
 * Implements incremental parsing protocol:
 * 1. Detect changed line ranges from edit operations
 * 2. Partially reparse only affected blocks
 * 3. Merge changed blocks into existing AST
 * 4. Emit change events via EventBus
 */

import type { Document, BlockNode } from '@pre-markdown/core'
import { createDocument, EventBus } from '@pre-markdown/core'
import type { EditorEvents } from '@pre-markdown/core'
import { parseBlocks, parseBlockLines } from './block/parser.js'
import type { BlockParserOptions } from './block/parser.js'

/** Describes an edit operation */
export interface EditOperation {
  /** Start line index (0-based, inclusive) */
  fromLine: number
  /** End line index (0-based, exclusive) — lines being replaced */
  toLine: number
  /** New text to insert (may contain newlines) */
  newText: string
}

/** Result of incremental parse */
export interface IncrementalParseResult {
  /** Updated document AST */
  document: Document
  /** Range of lines that were reparsed */
  affectedRange: { from: number; to: number }
  /** Number of new blocks generated */
  newBlockCount: number
  /** Number of old blocks replaced */
  oldBlockCount: number
  /** Parse duration in ms */
  duration: number
}

/**
 * Incremental parser that maintains state between edits.
 *
 * Instead of re-parsing the entire document on every keystroke,
 * it detects the affected block range and only reparses that portion,
 * then splices the new blocks into the existing AST.
 */
export class IncrementalParser {
  private lines: string[] = []
  private document: Document
  private options: Required<BlockParserOptions>
  private eventBus: EventBus<EditorEvents> | null = null

  constructor(
    initialText: string = '',
    options?: BlockParserOptions,
    eventBus?: EventBus<EditorEvents>,
  ) {
    this.options = {
      gfmTables: true,
      mathBlocks: true,
      containers: true,
      toc: true,
      footnotes: true,
      ...options,
    }
    this.eventBus = eventBus ?? null
    this.lines = initialText.split('\n')
    this.document = parseBlocks(initialText, this.options)
  }

  /** Get current document AST */
  getDocument(): Document {
    return this.document
  }

  /** Get current source text */
  getText(): string {
    return this.lines.join('\n')
  }

  /** Get current lines */
  getLines(): readonly string[] {
    return this.lines
  }

  /**
   * Apply an edit and incrementally reparse.
   */
  applyEdit(edit: EditOperation): IncrementalParseResult {
    const startTime = performance.now()

    // 1. Apply the text edit to lines array
    const newLines = edit.newText.split('\n')
    const oldLines = this.lines.slice(edit.fromLine, edit.toLine)
    this.lines.splice(edit.fromLine, edit.toLine - edit.fromLine, ...newLines)

    // 2. Determine the expanded reparse range
    // We need to reparse from the nearest block boundary before the edit
    // to the nearest block boundary after the edit
    const { blockStart, blockEnd } = this.findAffectedBlockRange(
      edit.fromLine,
      edit.fromLine + newLines.length,
    )

    // 3. Extract the lines to reparse
    const reparseFrom = this.lineIndexForBlock(blockStart)
    const reparseTo = this.lineIndexForBlockEnd(blockEnd)

    const linesToReparse = this.lines.slice(reparseFrom, reparseTo)

    // 4. Reparse only the affected range
    const newBlocks = parseBlockLines(linesToReparse, 0, linesToReparse.length, this.options)

    // 5. Splice new blocks into the existing AST
    const oldBlockCount = blockEnd - blockStart
    const oldChildren = this.document.children
    const updatedChildren = [
      ...oldChildren.slice(0, blockStart),
      ...newBlocks,
      ...oldChildren.slice(blockEnd),
    ]

    this.document = createDocument(updatedChildren)

    const duration = performance.now() - startTime

    // 6. Emit events
    if (this.eventBus) {
      this.eventBus.emit('content:change', {
        text: this.getText(),
        from: edit.fromLine,
        to: edit.toLine,
        inserted: edit.newText,
      })
      this.eventBus.emit('parse:done', {
        documentId: this.document.id ?? 0,
        duration,
      })
    }

    return {
      document: this.document,
      affectedRange: { from: reparseFrom, to: reparseTo },
      newBlockCount: newBlocks.length,
      oldBlockCount,
      duration,
    }
  }

  /**
   * Full reparse — used when edits are too complex for incremental update.
   */
  fullReparse(): Document {
    const startTime = performance.now()
    const text = this.lines.join('\n')
    this.document = parseBlocks(text, this.options)
    const duration = performance.now() - startTime

    if (this.eventBus) {
      this.eventBus.emit('parse:done', {
        documentId: this.document.id ?? 0,
        duration,
      })
    }

    return this.document
  }

  /**
   * Find the range of block indices affected by a line range edit.
   * Expands outward to include any blocks that might be affected.
   */
  private findAffectedBlockRange(
    editFromLine: number,
    editToLine: number,
  ): { blockStart: number; blockEnd: number } {
    const children = this.document.children
    if (children.length === 0) {
      return { blockStart: 0, blockEnd: 0 }
    }

    // Use a simple heuristic: map line numbers to block indices
    // by accumulating line counts per block
    let lineAcc = 0
    let blockStart = 0
    let blockEnd = children.length

    // Find blockStart: first block whose line range overlaps with editFromLine
    for (let i = 0; i < children.length; i++) {
      const blockLineCount = this.estimateBlockLineCount(children[i]!)
      if (lineAcc + blockLineCount > editFromLine) {
        blockStart = Math.max(0, i - 1) // include previous block for safety
        break
      }
      lineAcc += blockLineCount
      blockStart = i
    }

    // Find blockEnd: first block after edit range
    lineAcc = 0
    for (let i = 0; i < children.length; i++) {
      const blockLineCount = this.estimateBlockLineCount(children[i]!)
      lineAcc += blockLineCount
      if (lineAcc >= editToLine) {
        blockEnd = Math.min(children.length, i + 2) // include next block for safety
        break
      }
    }

    return { blockStart, blockEnd }
  }

  /**
   * Estimate line index where a block starts in the document.
   */
  private lineIndexForBlock(blockIndex: number): number {
    let lineAcc = 0
    const children = this.document.children
    for (let i = 0; i < blockIndex && i < children.length; i++) {
      lineAcc += this.estimateBlockLineCount(children[i]!)
    }
    // Clamp to valid range
    return Math.min(lineAcc, this.lines.length)
  }

  /**
   * Estimate line index where a block range ends.
   */
  private lineIndexForBlockEnd(blockEndIndex: number): number {
    let lineAcc = 0
    const children = this.document.children
    for (let i = 0; i < blockEndIndex && i < children.length; i++) {
      lineAcc += this.estimateBlockLineCount(children[i]!)
    }
    // Clamp to valid range
    return Math.min(lineAcc, this.lines.length)
  }

  /**
   * Estimate how many source lines a block node spans.
   * This is a heuristic — precise tracking would require SourceLocation data.
   */
  private estimateBlockLineCount(node: BlockNode): number {
    switch (node.type) {
      case 'heading':
        return 2 // heading + blank line
      case 'paragraph': {
        // Count newlines in children text
        let textLen = 0
        for (const child of node.children) {
          if (child.type === 'text') textLen += child.value.length
          if (child.type === 'softBreak') textLen += 1
        }
        return Math.max(2, Math.ceil(textLen / 80) + 1)
      }
      case 'codeBlock': {
        const lineCount = node.value.split('\n').length
        return lineCount + 3 // opening fence + content + closing fence + blank line
      }
      case 'blockquote': {
        let count = 0
        for (const child of node.children) {
          count += this.estimateBlockLineCount(child)
        }
        return Math.max(2, count + 1)
      }
      case 'list': {
        let count = 0
        for (const item of node.children) {
          count += this.estimateBlockLineCount(item)
        }
        return count + 1
      }
      case 'listItem': {
        let count = 1
        for (const child of node.children) {
          count += this.estimateBlockLineCount(child) - 1
        }
        return Math.max(1, count)
      }
      case 'table': {
        return node.children.length + 2 // header + delimiter + rows + blank
      }
      case 'thematicBreak':
        return 2
      case 'mathBlock': {
        const lines = node.value.split('\n').length
        return lines + 3
      }
      case 'container': {
        let count = 2 // open + close
        for (const child of node.children) {
          count += this.estimateBlockLineCount(child)
        }
        return count + 1
      }
      case 'footnoteDefinition': {
        let count = 1
        for (const child of node.children) {
          count += this.estimateBlockLineCount(child)
        }
        return count + 1
      }
      default:
        return 2
    }
  }
}
