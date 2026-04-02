/**
 * @pre-markdown/parser
 *
 * High-performance incremental Markdown parser.
 */

export { parseBlocks, parseBlockLines } from './block/parser.js'
export type { BlockParserOptions } from './block/parser.js'
export { parseInline } from './inline/index.js'
export { IncrementalParser } from './incremental.js'
export type { EditOperation, IncrementalParseResult } from './incremental.js'

import { parseBlocks } from './block/parser.js'
import type { BlockParserOptions } from './block/parser.js'
import type { Document } from '@pre-markdown/core'

/**
 * Parse a complete Markdown document.
 *
 * @param input - The Markdown source text
 * @param options - Parser options
 * @returns A Document AST node
 */
export function parse(input: string, options?: BlockParserOptions): Document {
  return parseBlocks(input, options)
}
