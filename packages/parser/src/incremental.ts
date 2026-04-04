/**
 * @pre-markdown/parser - Incremental Parser
 *
 * Implements incremental parsing protocol:
 * 1. Detect changed line ranges from edit operations
 * 2. Partially reparse only affected blocks
 * 3. Merge changed blocks into existing AST
 * 4. Emit change events via EventBus
 *
 * Optimizations:
 * - Line-level hash fingerprints for fast change detection
 * - AST node reuse for unchanged blocks
 * - Block fingerprint cache for structural matching
 */

import type { Document, BlockNode } from '@pre-markdown/core'
import { createDocument, EventBus } from '@pre-markdown/core'
import type { EditorEvents } from '@pre-markdown/core'
import { parseBlocks, parseBlockLines } from './block/parser.js'
import type { BlockParserOptions } from './block/parser.js'

/** Fast FNV-1a 32-bit hash for line fingerprinting */
function fnv1a(str: string): number {
  let hash = 0x811c9dc5 | 0
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i)
    hash = (hash * 0x01000193) | 0
  }
  return hash >>> 0
}

/** Combine multiple hashes into one (for block fingerprint from line hashes) */
function combineHashes(hashes: number[], from: number, to: number): number {
  let h = 0x811c9dc5 | 0
  for (let i = from; i < to; i++) {
    h ^= hashes[i]!
    h = (h * 0x01000193) | 0
  }
  return h >>> 0
}

/**
 * LRU cache mapping block fingerprints to previously parsed BlockNode subtrees.
 * When an edit only shifts blocks around without changing their content,
 * the fingerprint will match and we can reuse the old AST node (with already-
 * resolved inline content), avoiding a full reparse.
 *
 * Capacity is capped to prevent unbounded memory growth.
 */
class LRUBlockCache {
  private map = new Map<number, BlockNode>()
  private readonly capacity: number

  constructor(capacity: number = 256) {
    this.capacity = capacity
  }

  get(fingerprint: number): BlockNode | undefined {
    const node = this.map.get(fingerprint)
    if (node !== undefined) {
      // Move to end (most recently used) by re-inserting
      this.map.delete(fingerprint)
      this.map.set(fingerprint, node)
    }
    return node
  }

  set(fingerprint: number, node: BlockNode): void {
    // If already present, delete first to refresh insertion order
    if (this.map.has(fingerprint)) {
      this.map.delete(fingerprint)
    }
    this.map.set(fingerprint, node)
    // Evict oldest entries if over capacity
    if (this.map.size > this.capacity) {
      // Map iterator yields in insertion order — first key is the LRU entry
      const oldest = this.map.keys().next().value as number
      this.map.delete(oldest)
    }
  }

  /** Bulk-populate cache from an array of fingerprint→node pairs */
  populate(metas: BlockMeta[], nodes: BlockNode[]): void {
    for (let i = 0; i < metas.length; i++) {
      this.set(metas[i]!.fingerprint, nodes[i]!)
    }
  }

  clear(): void {
    this.map.clear()
  }

  get size(): number {
    return this.map.size
  }
}

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
  /** Number of blocks reused from old AST */
  reusedBlockCount: number
  /** Parse duration in ms */
  duration: number
}

/** Block metadata for incremental tracking */
interface BlockMeta {
  /** Start line index (0-based) in the source */
  startLine: number
  /** End line index (0-based, exclusive) */
  endLine: number
  /** Combined hash of source lines [startLine, endLine) */
  fingerprint: number
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
  private lineHashes: number[] = []
  private document: Document
  private options: Required<BlockParserOptions>
  private eventBus: EventBus<EditorEvents> | null = null
  /** Per-block metadata tracking source line ranges and fingerprints */
  private blockMetas: BlockMeta[] = []
  /** LRU cache: block fingerprint → previously parsed BlockNode subtree */
  private blockCache = new LRUBlockCache(256)

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
      lazyInline: false,
      ...options,
    }
    this.eventBus = eventBus ?? null
    this.lines = initialText.split('\n')
    this.lineHashes = this.lines.map(fnv1a)
    this.document = parseBlocks(initialText, this.options)
    this.buildBlockMetas()
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

  /** Get current line hashes (FNV-1a) */
  getLineHashes(): readonly number[] {
    return this.lineHashes
  }

  /** Get block metadata (for testing/debugging) */
  getBlockMetas(): readonly BlockMeta[] {
    return this.blockMetas
  }

  /**
   * Apply an edit and incrementally reparse.
   */
  applyEdit(edit: EditOperation): IncrementalParseResult {
    const startTime = performance.now()

    // 1. Apply the text edit to lines array and maintain hashes
    const newLines = edit.newText.split('\n')
    const newHashes = newLines.map(fnv1a)
    const deletedLineCount = edit.toLine - edit.fromLine
    const insertedLineCount = newLines.length
    const lineDelta = insertedLineCount - deletedLineCount

    this.lines.splice(edit.fromLine, deletedLineCount, ...newLines)
    this.lineHashes.splice(edit.fromLine, deletedLineCount, ...newHashes)

    // 2. Find affected block range using block metas
    const { blockStart, blockEnd } = this.findAffectedBlockRangeFromMetas(
      edit.fromLine,
      edit.toLine,
      lineDelta,
    )

    // 3. Extract the lines to reparse
    const reparseFrom = blockStart < this.blockMetas.length
      ? this.blockMetas[blockStart]!.startLine
      : this.lines.length
    // Adjust blockEnd metas for line delta
    let reparseTo: number
    if (blockEnd < this.blockMetas.length) {
      reparseTo = this.blockMetas[blockEnd]!.startLine + lineDelta
    } else {
      reparseTo = this.lines.length
    }
    // Clamp
    reparseTo = Math.min(reparseTo, this.lines.length)
    const reparseFromClamped = Math.max(0, Math.min(reparseFrom, this.lines.length))

    const linesToReparse = this.lines.slice(reparseFromClamped, reparseTo)

    // 4. Reparse only the affected range
    const newBlocks = linesToReparse.length > 0
      ? parseBlockLines(linesToReparse, 0, linesToReparse.length, this.options)
      : []

    // 5. Splice new blocks into the existing AST, reusing unchanged blocks
    //    For each newly parsed block, compute its fingerprint from the source lines.
    //    If the fingerprint matches a cached block, reuse the old AST node
    //    (which may already have resolved inline content from lazy parsing).
    const oldBlockCount = blockEnd - blockStart
    const oldChildren = this.document.children

    // Compute fingerprints for new blocks and attempt cache reuse
    let cacheHits = 0
    if (newBlocks.length > 0) {
      let newLineAcc = reparseFromClamped
      for (let bi = 0; bi < newBlocks.length; bi++) {
        const block = newBlocks[bi]!
        const blockLineCount = this.estimateBlockLineCount(block)
        const blockEndLine = Math.min(newLineAcc + blockLineCount, this.lines.length)
        const fp = combineHashes(this.lineHashes, newLineAcc, blockEndLine)
        // Try to reuse a cached block with the same fingerprint
        const cached = this.blockCache.get(fp)
        if (cached && cached.type === block.type) {
          newBlocks[bi] = cached
          cacheHits++
        }
        newLineAcc = blockEndLine
      }
    }

    // Blocks before the edit range are reused as-is (same object references)
    const beforeBlocks = oldChildren.slice(0, blockStart)
    // Blocks after the edit range are reused as-is
    const afterBlocks = oldChildren.slice(blockEnd)

    const updatedChildren = [
      ...beforeBlocks,
      ...newBlocks,
      ...afterBlocks,
    ]

    const reusedBlockCount = beforeBlocks.length + afterBlocks.length + cacheHits

    this.document = createDocument(updatedChildren)

    // 6. Rebuild block metas
    this.buildBlockMetas()

    const duration = performance.now() - startTime

    // 7. Emit events
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
      affectedRange: { from: reparseFromClamped, to: reparseTo },
      newBlockCount: newBlocks.length,
      oldBlockCount,
      reusedBlockCount,
      duration,
    }
  }

  /**
   * Full reparse — used when edits are too complex for incremental update.
   */
  fullReparse(): Document {
    const startTime = performance.now()
    const text = this.lines.join('\n')
    this.lineHashes = this.lines.map(fnv1a)
    this.document = parseBlocks(text, this.options)
    this.buildBlockMetas()
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
   * Build block metadata array from current document + lines.
   * Assigns each block its source line range and fingerprint.
   */
  private buildBlockMetas(): void {
    const children = this.document.children
    const metas: BlockMeta[] = new Array(children.length)
    let lineAcc = 0

    for (let i = 0; i < children.length; i++) {
      const lc = this.estimateBlockLineCount(children[i]!)
      const startLine = lineAcc
      const endLine = Math.min(lineAcc + lc, this.lines.length)
      const fingerprint = combineHashes(this.lineHashes, startLine, endLine)
      metas[i] = { startLine, endLine, fingerprint }
      // Populate LRU cache: fingerprint → block node
      this.blockCache.set(fingerprint, children[i]!)
      lineAcc = endLine
    }

    this.blockMetas = metas
  }

  /**
   * Find affected block range using block metas for precise mapping.
   * Returns [blockStart, blockEnd) — the half-open range of blocks to replace.
   */
  private findAffectedBlockRangeFromMetas(
    editFromLine: number,
    editToLine: number,
    _lineDelta: number,
  ): { blockStart: number; blockEnd: number } {
    const metas = this.blockMetas
    if (metas.length === 0) {
      return { blockStart: 0, blockEnd: 0 }
    }

    // Binary search for blockStart: first block whose endLine > editFromLine
    let blockStart = 0
    {
      let lo = 0, hi = metas.length - 1
      while (lo <= hi) {
        const mid = (lo + hi) >>> 1
        if (metas[mid]!.endLine <= editFromLine) {
          lo = mid + 1
        } else {
          blockStart = mid
          hi = mid - 1
        }
      }
    }
    // Safety: include one block before for boundary effects
    blockStart = Math.max(0, blockStart - 1)

    // Binary search for blockEnd: first block whose startLine >= editToLine
    let blockEnd = metas.length
    {
      let lo = blockStart, hi = metas.length - 1
      while (lo <= hi) {
        const mid = (lo + hi) >>> 1
        if (metas[mid]!.startLine < editToLine) {
          lo = mid + 1
        } else {
          blockEnd = mid
          hi = mid - 1
        }
      }
    }
    // Safety: include one block after for boundary effects
    blockEnd = Math.min(metas.length, blockEnd + 1)

    return { blockStart, blockEnd }
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
        // If lazy inline, use _raw for estimation
        if (node._raw) {
          const nlCount = node._raw.split('\n').length
          return nlCount + 1
        }
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
      case 'details': {
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
