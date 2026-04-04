/**
 * @pre-markdown/parser - Block-Level Parser
 *
 * Parses Markdown text into block-level AST nodes.
 * Implements CommonMark block structure algorithm with extensions.
 */

import type {
  Document,
  BlockNode,
  InlineNode,
  Heading,
  Paragraph,
  CodeBlock,
  Blockquote,
  List,
  ListItem,
  ThematicBreak,
  HtmlBlock,
  Table,
  TableAlign,
  TableRow,
  TableCell,
  FootnoteDefinition,
  MathBlock,
  Container,
  Details,
  TOC,
} from '@pre-markdown/core'

import {
  createDocument,
  createHeading,
  createParagraph,
  createBlockquote,
  createList,
  createListItem,
  createCodeBlock,
  createThematicBreak,
  createHtmlBlock,
  createTable,
  createTableRow,
  createTableCell,
  createFootnoteDefinition,
  createMathBlock,
  createContainer,
  createDetails,
  createTOC,
  createText,
} from '@pre-markdown/core'

import { parseInline } from '../inline/index.js'

/** Parser options */
export interface BlockParserOptions {
  /** Enable GFM table parsing */
  gfmTables?: boolean
  /** Enable math block parsing */
  mathBlocks?: boolean
  /** Enable custom container parsing */
  containers?: boolean
  /** Enable TOC parsing */
  toc?: boolean
  /** Enable footnote definition parsing */
  footnotes?: boolean
  /** Lazy inline parsing: store raw text, defer parseInline to render time */
  lazyInline?: boolean
}

const DEFAULT_OPTIONS: Required<BlockParserOptions> = {
  gfmTables: true,
  mathBlocks: true,
  containers: true,
  toc: true,
  footnotes: true,
  lazyInline: false,
}

/** ATX heading pattern: 1-6 # followed by space or end of line */
const RE_ATX_HEADING = /^(#{1,6})(?:\s|$)/
/** Setext heading underline */
const RE_SETEXT_H1 = /^ {0,3}={1,}[ \t]*$/
const RE_SETEXT_H2 = /^ {0,3}-{1,}[ \t]*$/
/** Thematic break */
const RE_THEMATIC_BREAK = /^(?:\*[ \t]*){3,}$|^(?:-[ \t]*){3,}$|^(?:_[ \t]*){3,}$/
/** Unordered list marker */
const RE_UL_MARKER = /^([*+-])(\s+|$)/
/** Ordered list marker */
const RE_OL_MARKER = /^(\d{1,9})([.)])(\s+|$)/
/** Blockquote marker */
const RE_BLOCKQUOTE = /^>[ \t]?/
/** Fenced code block opening */
const RE_FENCE_OPEN = /^(`{3,}|~{3,})(?:\s*(\S+)?.*)?$/
/** Fenced code block closing */
const RE_FENCE_CLOSE_BACKTICK = /^`{3,}\s*$/
const RE_FENCE_CLOSE_TILDE = /^~{3,}\s*$/
/** Math block opening/closing */
const RE_MATH_OPEN = /^\${2}\s*$/
const RE_MATH_CLOSE = /^\${2}\s*$/
/** Container opening */
const RE_CONTAINER_OPEN = /^:::[ \t]*(\w+)(?:[ \t]+(.*))?$/
const RE_CONTAINER_CLOSE = /^:::[ \t]*$/
/** TOC — supports [toc], [[toc]], 【【toc】】 (Cherry-compatible) */
const RE_TOC = /^(?:\[toc\]|\[\[toc\]\]|【【toc】】)$/i
/** GFM table delimiter row */
const RE_TABLE_DELIM = /^\|?(?:\s*:?-+:?\s*\|)+\s*:?-+:?\s*\|?\s*$/
/** HTML block start patterns */
const RE_HTML_BLOCK_1 = /^<(?:script|pre|style|textarea)(?:\s|>|$)/i
const RE_HTML_BLOCK_2 = /^<!--/  // HTML comment
const RE_HTML_BLOCK_3 = /^<\?/   // Processing instruction
const RE_HTML_BLOCK_4 = /^<![A-Z]/  // Declaration
const RE_HTML_BLOCK_5 = /^<!\[CDATA\[/  // CDATA
const RE_HTML_BLOCK_6 = /^<\/?(?:address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h1|h2|h3|h4|h5|h6|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul)(?:\s|\/?>|$)/i
/** HTML block Type 7: open tag with attributes OR close tag (no attributes), on a line by itself */
const RE_HTML_BLOCK_7_OPEN = /^<[a-zA-Z][a-zA-Z0-9-]*(?:\s+[a-zA-Z_:][a-zA-Z0-9_.:-]*(?:\s*=\s*(?:[^\s"'=<>`]+|'[^']*'|"[^"]*"))?)*\s*\/?>[ \t]*$/
const RE_HTML_BLOCK_7_CLOSE = /^<\/[a-zA-Z][a-zA-Z0-9-]*\s*>[ \t]*$/
/** Indented code block (4+ spaces) */
const RE_INDENT_CODE = /^(?: {4}|\t)/
/** Blank line */
const RE_BLANK = /^[ \t]*$/
/** Task list item */
const RE_TASK = /^\[([ xX])\]\s+/
/** Footnote definition */
const RE_FOOTNOTE_DEF = /^\[\^([^\]]+)\]:\s+(.*)/
/** Detail/collapsible block opening: +++ or +++- */
const RE_DETAIL_OPEN = /^\+\+\+([-]?)\s+(.+)$/
const RE_DETAIL_CLOSE = /^\+\+\+\s*$/
/** FrontMatter opening: --- at start of document */
const RE_FRONTMATTER_OPEN = /^-{3,}\s*$/

/**
 * Fast indented code check. Line starts with 4+ spaces or a tab.
 */
function isIndentCode(s: string): boolean {
  const c = s.charCodeAt(0)
  if (c === 9) return true  // tab
  return c === 32 && s.charCodeAt(1) === 32 && s.charCodeAt(2) === 32 && s.charCodeAt(3) === 32
}

/**
 * Fast blank line check. Replaces `RE_BLANK.test(line)` — avoids regex overhead.
 */
function isBlank(s: string): boolean {
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i)
    if (c !== 32 && c !== 9) return false  // not space or tab
  }
  return true
}

/**
 * Strip up to 3 leading spaces from a line.
 * Replaces the frequently used `line.replace(/^ {0,3}/, '')` with a fast charCodeAt-based version.
 */
function strip3(s: string): string {
  const c0 = s.charCodeAt(0)
  if (c0 !== 32) return s
  const c1 = s.charCodeAt(1)
  if (c1 !== 32) return s.slice(1)
  const c2 = s.charCodeAt(2)
  if (c2 !== 32) return s.slice(2)
  return s.slice(3)
}

/**
 * Parse a Markdown string into a Document AST.
 */
export function parseBlocks(input: string, options?: BlockParserOptions): Document {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const lines = input.split('\n')
  const children = parseBlockLines(lines, 0, lines.length, opts)
  return createDocument(children)
}

/**
 * Parse a range of lines into block-level nodes.
 */
function parseBlockLines(
  lines: string[],
  start: number,
  end: number,
  opts: Required<BlockParserOptions>,
): BlockNode[] {
  const blocks: BlockNode[] = []
  let i = start

  while (i < end) {
    const line = lines[i]!

    // Skip blank lines
    if (isBlank(line)) {
      i++
      continue
    }

    let result: ParseResult | null

    // Fast path: use first non-space character to skip impossible rules
    const firstChar = line.charCodeAt(0)
    // Find first non-space index (replaces line.search(/\S/))
    let trimStart = -1
    for (let k = 0; k < line.length; k++) {
      const c = line.charCodeAt(k)
      if (c !== 32 && c !== 9) { trimStart = k; break }
    }
    const fc = trimStart >= 0 ? line.charCodeAt(trimStart) : firstChar

    // 0. FrontMatter (only at start of document, first non-blank line)
    if (blocks.length === 0 && i === start && fc === 45) { // -
      result = tryFrontMatter(lines, i, end)
      if (result) {
        blocks.push(result.node)
        i = result.nextLine
        continue
      }
    }

    // 1. ATX Heading — starts with # (or 1-3 spaces then #)
    if (fc === 35 || (firstChar === 32 && trimStart <= 3 && trimStart >= 0 && line.charCodeAt(trimStart) === 35)) { // #
      result = tryATXHeading(lines, i, opts)
      if (result) {
        blocks.push(result.node)
        i = result.nextLine
        continue
      }
    }

    // 2. Thematic break — starts with *, -, _ (or 1-3 spaces then these)
    if (fc === 42 || fc === 45 || fc === 95) { // * - _
      result = tryThematicBreak(lines, i)
      if (result) {
        blocks.push(result.node)
        i = result.nextLine
        continue
      }
    }

    // 3. Fenced code block — starts with ` or ~ (or 1-3 spaces then ` or ~)
    if (fc === 96 || fc === 126) { // ` ~
      result = tryFencedCode(lines, i, end)
      if (result) {
        blocks.push(result.node)
        i = result.nextLine
        continue
      }
    }

    // 4. Math block — starts with $
    if (opts.mathBlocks && fc === 36) { // $
      result = tryMathBlock(lines, i, end)
      if (result) {
        blocks.push(result.node)
        i = result.nextLine
        continue
      }
    }

    // 5. TOC — starts with [ or 【
    if (opts.toc && (fc === 91 || fc === 12304)) { // [ 【
      result = tryTOC(lines, i)
      if (result) {
        blocks.push(result.node)
        i = result.nextLine
        continue
      }
    }

    // 5.5. Footnote definition — starts with [
    if (opts.footnotes && fc === 91) { // [
      result = tryFootnoteDefinition(lines, i, end, opts)
      if (result) {
        blocks.push(result.node)
        i = result.nextLine
        continue
      }
    }

    // 6. Custom container — starts with :
    if (opts.containers && fc === 58) { // :
      result = tryContainer(lines, i, end, opts)
      if (result) {
        blocks.push(result.node)
        i = result.nextLine
        continue
      }
    }

    // 6.5 Detail/collapsible block — starts with +
    if (fc === 43) { // +
      result = tryDetail(lines, i, end, opts)
      if (result) {
        blocks.push(result.node)
        i = result.nextLine
        continue
      }
    }

    // 7. Blockquote — starts with >
    if (fc === 62) { // >
      result = tryBlockquote(lines, i, end, opts)
      if (result) {
        blocks.push(result.node)
        i = result.nextLine
        continue
      }
    }

    // 8. List — starts with -, *, +, or digit
    if (fc === 45 || fc === 42 || fc === 43 || (fc >= 48 && fc <= 57)) { // - * + 0-9
      result = tryList(lines, i, end, opts)
      if (result) {
        blocks.push(result.node)
        i = result.nextLine
        continue
      }
    }

    // 9. HTML block — starts with <
    if (fc === 60) { // <
      result = tryHtmlBlock(lines, i, end)
      if (result) {
        blocks.push(result.node)
        i = result.nextLine
        continue
      }
    }

    // 10. GFM Table — line contains |
    if (opts.gfmTables && line.includes('|')) {
      result = tryTable(lines, i, end, opts)
      if (result) {
        blocks.push(result.node)
        i = result.nextLine
        continue
      }
    }

    // 11. Indented code block — starts with 4+ spaces or tab
    if (firstChar === 32 || firstChar === 9) { // space or tab
      result = tryIndentedCode(lines, i, end)
      if (result) {
        blocks.push(result.node)
        i = result.nextLine
        continue
      }
    }

    // 12. Default: paragraph (with setext heading detection)
    result = tryParagraphOrSetext(lines, i, end, opts)
    if (result) {
      blocks.push(result.node)
      i = result.nextLine
      continue
    }

    // Shouldn't reach here, but advance to prevent infinite loop
    i++
  }

  return blocks
}

interface ParseResult {
  node: BlockNode
  nextLine: number
}

// ============================================================
// Block Parsers
// ============================================================

/** Helper: parse inline immediately or store raw text for lazy parsing */
function inlineOrLazy(content: string, opts: Required<BlockParserOptions>): InlineNode[] {
  if (opts.lazyInline) return []
  return parseInline(content)
}

function tryATXHeading(
  lines: string[],
  i: number,
  _opts: Required<BlockParserOptions>,
): ParseResult | null {
  let line = lines[i]!
  // Strip up to 3 leading spaces (CommonMark spec)
  const stripped = strip3(line)
  const match = RE_ATX_HEADING.exec(stripped)
  if (!match) return null

  const depth = match[1]!.length as 1 | 2 | 3 | 4 | 5 | 6
  // Get content after opening # + space
  let content = stripped.slice(match[0].length)
  // Remove optional closing #s: trailing space + one or more # + optional space
  content = content.replace(/\s+#+\s*$/, '')
  // If content is only # characters, it's a closing sequence → empty heading
  if (/^#+\s*$/.test(content)) content = ''
  content = content.trim()
  const children = content ? inlineOrLazy(content, _opts) : []
  const node = createHeading(depth, children)
  if (_opts.lazyInline && content) node._raw = content

  return {
    node,
    nextLine: i + 1,
  }
}

function tryThematicBreak(lines: string[], i: number): ParseResult | null {
  const line = lines[i]!
  // Strip up to 3 leading spaces (CommonMark spec)
  const stripped = strip3(line)
  if (!RE_THEMATIC_BREAK.test(stripped)) return null

  return {
    node: createThematicBreak(),
    nextLine: i + 1,
  }
}

function tryFencedCode(lines: string[], i: number, end: number): ParseResult | null {
  const line = lines[i]!
  // Count up to 3 leading spaces
  let indent = 0
  while (indent < 3 && indent < line.length && line.charCodeAt(indent) === 32) indent++
  const stripped = line.slice(indent)
  const openMatch = RE_FENCE_OPEN.exec(stripped)
  if (!openMatch) return null

  const fence = openMatch[1]!
  const rawLang = openMatch[2] ?? undefined
  const isBacktick = fence[0] === '`'
  const fenceLen = fence.length

  // Backtick fences: the entire info string (everything after the opening fence) must not contain backticks (CommonMark spec)
  if (isBacktick) {
    const afterFence = stripped.slice(fenceLen)
    if (afterFence.includes('`')) return null
  }

  // Decode backslash escapes and HTML entities in info string
  const lang = rawLang ? decodeInfoString(rawLang) : undefined

  const contentLines: string[] = []
  let j = i + 1
  while (j < end) {
    const current = lines[j]!
    // Strip up to 3 leading spaces for close fence detection
    const closeStripped = strip3(current)
    // Check for closing fence (must be at least as long as opening, only fence chars + optional spaces)
    if (isBacktick && /^`{3,}\s*$/.test(closeStripped) && closeStripped.trim().length >= fenceLen) {
      j++
      break
    }
    if (!isBacktick && /^~{3,}\s*$/.test(closeStripped) && closeStripped.trim().length >= fenceLen) {
      j++
      break
    }
    // Strip indent from content lines (up to the fence indent)
    if (indent > 0 && current.length > 0) {
      let strip = 0
      for (let k = 0; k < indent && k < current.length && current[k] === ' '; k++) strip++
      contentLines.push(current.slice(strip))
    } else {
      contentLines.push(current)
    }
    j++
  }

  return {
    node: createCodeBlock(contentLines.join('\n'), lang),
    nextLine: j,
  }
}

function tryMathBlock(lines: string[], i: number, end: number): ParseResult | null {
  const line = lines[i]!
  if (!RE_MATH_OPEN.test(line)) return null

  const contentLines: string[] = []
  let j = i + 1
  while (j < end) {
    if (RE_MATH_CLOSE.test(lines[j]!)) {
      j++
      break
    }
    contentLines.push(lines[j]!)
    j++
  }

  return {
    node: createMathBlock(contentLines.join('\n')),
    nextLine: j,
  }
}

function tryTOC(lines: string[], i: number): ParseResult | null {
  const line = lines[i]!.trim()
  if (!RE_TOC.test(line)) return null

  return {
    node: createTOC(),
    nextLine: i + 1,
  }
}

/** Expand Cherry-style panel type shorthands (ref: Cherry Panel.js) */
function expandContainerKind(raw: string): string {
  switch (raw.toLowerCase()) {
    case 'p': return 'primary'
    case 'i': return 'info'
    case 'w': return 'warning'
    case 'd': return 'danger'
    case 's': return 'success'
    case 'l': return 'left'
    case 'c': return 'center'
    case 'r': return 'right'
    case 'j': return 'justify'
    case 'tip': return 'info'
    default: return raw
  }
}

function tryContainer(
  lines: string[],
  i: number,
  end: number,
  opts: Required<BlockParserOptions>,
): ParseResult | null {
  const line = lines[i]!
  const openMatch = RE_CONTAINER_OPEN.exec(line)
  if (!openMatch) return null

  const rawKind = openMatch[1]!
  const title = openMatch[2] ?? undefined

  // Cherry-compatible panel type shorthand (ref: Cherry Panel.js)
  const kind = expandContainerKind(rawKind)

  const contentLines: string[] = []
  let j = i + 1
  while (j < end) {
    if (RE_CONTAINER_CLOSE.test(lines[j]!)) {
      j++
      break
    }
    contentLines.push(lines[j]!)
    j++
  }

  // Recursively parse container content
  const children = parseBlockLines(contentLines, 0, contentLines.length, opts)

  return {
    node: createContainer(kind, children, title),
    nextLine: j,
  }
}

function tryBlockquote(
  lines: string[],
  i: number,
  end: number,
  opts: Required<BlockParserOptions>,
): ParseResult | null {
  const line = lines[i]!
  // Strip up to 3 leading spaces
  const stripped = strip3(line)
  if (!RE_BLOCKQUOTE.test(stripped)) return null

  // Gather all consecutive blockquote lines
  const contentLines: string[] = []
  let j = i
  while (j < end) {
    const current = lines[j]!
    const curStripped = strip3(current)
    if (RE_BLOCKQUOTE.test(curStripped)) {
      contentLines.push(curStripped.replace(RE_BLOCKQUOTE, ''))
      j++
    } else if (
      !isBlank(current) &&
      contentLines.length > 0 &&
      // Don't lazily continue after a blank content line (empty > line)
      contentLines[contentLines.length - 1]!.trim().length > 0 &&
      // Don't lazily continue if the line starts a new block element
      // (reuse curStripped instead of re-computing strip3)
      !RE_ATX_HEADING.test(curStripped) &&
      !RE_THEMATIC_BREAK.test(curStripped) &&
      !RE_FENCE_OPEN.test(curStripped) &&
      !RE_UL_MARKER.test(curStripped) &&
      !RE_OL_MARKER.test(curStripped) &&
      !RE_HTML_BLOCK_1.test(current) &&
      !RE_HTML_BLOCK_6.test(current) &&
      // Only lazily continue paragraphs, not code blocks or other blocks
      // Check that last content line is not inside an open fenced code block
      !isInsideOpenFencedCode(contentLines) &&
      // Don't lazily continue if blockquote content ends with indented code
      // (i.e., last non-blank content line is indented code)
      !lastContentIsIndentedCode(contentLines)
    ) {
      // Lazy continuation
      contentLines.push(current)
      j++
    } else {
      break
    }
  }

  const children = parseBlockLines(contentLines, 0, contentLines.length, opts)

  return {
    node: createBlockquote(children),
    nextLine: j,
  }
}

/** Check if the accumulated content lines end inside an open (unclosed) fenced code block */
function isInsideOpenFencedCode(contentLines: string[]): boolean {
  let insideFence = false
  let fenceChar = ''
  let fenceLen = 0
  for (const line of contentLines) {
    const stripped = strip3(line)
    if (!insideFence) {
      const openMatch = RE_FENCE_OPEN.exec(stripped)
      if (openMatch) {
        insideFence = true
        fenceChar = openMatch[1]![0]!
        fenceLen = openMatch[1]!.length
      }
    } else {
      // Check for close
      const closeStripped = stripped
      if (fenceChar === '`' && /^`{3,}\s*$/.test(closeStripped) && closeStripped.trim().length >= fenceLen) {
        insideFence = false
      } else if (fenceChar === '~' && /^~{3,}\s*$/.test(closeStripped) && closeStripped.trim().length >= fenceLen) {
        insideFence = false
      }
    }
  }
  return insideFence
}

/**
 * Check if the last block-level element in the blockquote content lines
 * would be an indented code block (4+ spaces).
 * If so, lazy continuation should be rejected.
 *
 * We walk backwards from the end of contentLines to find the last
 * non-blank line(s). If those lines all have 4+ space indent (indented code),
 * return true.
 */
function lastContentIsIndentedCode(contentLines: string[]): boolean {
  // Walk backwards to find last non-blank line
  let idx = contentLines.length - 1
  while (idx >= 0 && isBlank(contentLines[idx]!)) {
    idx--
  }
  if (idx < 0) return false

  // Check if the last non-blank line is indented code (4+ spaces or tab)
  const lastLine = contentLines[idx]!
  return isIndentCode(lastLine)
}

function tryList(
  lines: string[],
  i: number,
  end: number,
  opts: Required<BlockParserOptions>,
): ParseResult | null {
  const line = lines[i]!
  const ulMatch = RE_UL_MARKER.exec(line)
  const olMatch = RE_OL_MARKER.exec(line)

  if (!ulMatch && !olMatch) return null

  const ordered = !!olMatch
  const startNum = olMatch ? parseInt(olMatch[1]!, 10) : undefined

  const items: ListItem[] = []
  let j = i
  let spread = false

  while (j < end) {
    const currentLine = lines[j]!
    const currentUl = RE_UL_MARKER.exec(currentLine)
    const currentOl = RE_OL_MARKER.exec(currentLine)

    // Must match the same list type
    const isListItem = ordered ? !!currentOl : !!currentUl

    if (!isListItem && j > i) {
      // Check if it's continuation content (indented) or blank line within list
      if (isBlank(currentLine)) {
        // Check if next non-blank line is a list item
        let k = j + 1
        while (k < end && isBlank(lines[k]!)) k++
        if (k < end) {
          const nextUl = RE_UL_MARKER.exec(lines[k]!)
          const nextOl = RE_OL_MARKER.exec(lines[k]!)
          if (ordered ? !!nextOl : !!nextUl) {
            spread = true
            j++
            continue
          }
        }
        break
      }
      // Check for indented continuation
      if (/^(?: {2,}|\t)/.test(currentLine)) {
        j++
        continue
      }
      break
    }

    if (!isListItem) break

    // Parse list item content
    const marker = ordered ? currentOl! : currentUl!
    const markerWidth = marker[0]!.length
    let content = currentLine.slice(markerWidth)

    // Check for task list
    let checked: boolean | undefined
    const taskMatch = RE_TASK.exec(content)
    if (taskMatch) {
      checked = taskMatch[1] !== ' '
      content = content.slice(taskMatch[0].length)
    }

    // Gather item content lines
    const itemLines: string[] = [content]
    j++
    while (j < end) {
      const itemLine = lines[j]!
      if (isBlank(itemLine)) {
        // Check if next line continues this item
        if (j + 1 < end && /^(?: {2,}|\t)/.test(lines[j + 1]!)) {
          itemLines.push('')
          j++
          continue
        }
        break
      }
      // Check for new list item
      if ((ordered ? RE_OL_MARKER : RE_UL_MARKER).test(itemLine)) break
      // Check for indented continuation
      if (/^(?: {2,}|\t)/.test(itemLine)) {
        itemLines.push(itemLine.replace(/^(?: {2,}|\t)/, ''))
        j++
        continue
      }
      // Lazy continuation
      itemLines.push(itemLine)
      j++
    }

    const children = parseBlockLines(itemLines, 0, itemLines.length, opts)
    items.push(createListItem(children, false, checked))
  }

  if (items.length === 0) return null

  return {
    node: createList(ordered, spread, items, startNum),
    nextLine: j,
  }
}

function tryHtmlBlock(lines: string[], i: number, end: number): ParseResult | null {
  const line = lines[i]!
  // Strip up to 3 leading spaces for matching
  const stripped = strip3(line)

  // Type 1: <script>, <pre>, <style>, <textarea> — ends at closing tag
  if (RE_HTML_BLOCK_1.test(stripped)) {
    const htmlLines: string[] = []
    let j = i
    while (j < end) {
      htmlLines.push(lines[j]!)
      if (/<\/(?:script|pre|style|textarea)>/i.test(lines[j]!)) {
        j++
        break
      }
      j++
    }
    return {
      node: createHtmlBlock(htmlLines.join('\n')),
      nextLine: j,
    }
  }

  // Type 2: <!-- HTML comment --> — ends at -->
  if (RE_HTML_BLOCK_2.test(stripped)) {
    const htmlLines: string[] = []
    let j = i
    while (j < end) {
      htmlLines.push(lines[j]!)
      if (lines[j]!.includes('-->')) {
        j++
        break
      }
      j++
    }
    return {
      node: createHtmlBlock(htmlLines.join('\n')),
      nextLine: j,
    }
  }

  // Type 3: <? processing instruction ?> — ends at ?>
  if (RE_HTML_BLOCK_3.test(stripped)) {
    const htmlLines: string[] = []
    let j = i
    while (j < end) {
      htmlLines.push(lines[j]!)
      if (lines[j]!.includes('?>')) { j++; break }
      j++
    }
    return { node: createHtmlBlock(htmlLines.join('\n')), nextLine: j }
  }

  // Type 4: <!DECLARATION> — ends at >
  if (RE_HTML_BLOCK_4.test(stripped)) {
    const htmlLines: string[] = []
    let j = i
    while (j < end) {
      htmlLines.push(lines[j]!)
      if (lines[j]!.includes('>')) { j++; break }
      j++
    }
    return { node: createHtmlBlock(htmlLines.join('\n')), nextLine: j }
  }

  // Type 5: <![CDATA[ — ends at ]]>
  if (RE_HTML_BLOCK_5.test(stripped)) {
    const htmlLines: string[] = []
    let j = i
    while (j < end) {
      htmlLines.push(lines[j]!)
      if (lines[j]!.includes(']]>')) { j++; break }
      j++
    }
    return { node: createHtmlBlock(htmlLines.join('\n')), nextLine: j }
  }

  // Type 6: block-level HTML elements — ends at blank line
  if (RE_HTML_BLOCK_6.test(stripped)) {
    const htmlLines: string[] = []
    let j = i
    while (j < end) {
      if (j > i && isBlank(lines[j]!)) break
      htmlLines.push(lines[j]!)
      j++
    }
    return {
      node: createHtmlBlock(htmlLines.join('\n')),
      nextLine: j,
    }
  }

  // Type 7: any open/close tag on a line by itself — ends at blank line
  if (RE_HTML_BLOCK_7_OPEN.test(stripped) || RE_HTML_BLOCK_7_CLOSE.test(stripped)) {
    const htmlLines: string[] = []
    let j = i
    while (j < end) {
      if (j > i && isBlank(lines[j]!)) break
      htmlLines.push(lines[j]!)
      j++
    }
    return {
      node: createHtmlBlock(htmlLines.join('\n')),
      nextLine: j,
    }
  }

  return null
}

function tryTable(
  lines: string[],
  i: number,
  end: number,
  _opts: Required<BlockParserOptions>,
): ParseResult | null {
  // Need at least 2 lines (header + delimiter)
  if (i + 1 >= end) return null

  const headerLine = lines[i]!
  const delimLine = lines[i + 1]!

  // Must have delimiter row
  if (!RE_TABLE_DELIM.test(delimLine)) return null
  // Header must contain pipe
  if (!headerLine.includes('|')) return null

  // Parse column alignments from delimiter row
  const align = parseTableAlign(delimLine)

  // Parse header
  const headerCells = parseTableRow(headerLine)
  const headerRow = createTableRow(
    true,
    headerCells.map((cellText) => {
      const cell = createTableCell(inlineOrLazy(cellText, _opts))
      if (_opts.lazyInline && cellText) cell._raw = cellText
      return cell
    }),
  )

  const rows: TableRow[] = [headerRow]

  // Parse body rows
  let j = i + 2
  while (j < end) {
    const rowLine = lines[j]!
    if (isBlank(rowLine)) break
    if (!rowLine.includes('|')) break

    const cells = parseTableRow(rowLine)
    rows.push(
      createTableRow(
        false,
        cells.map((cellText) => {
          const cell = createTableCell(inlineOrLazy(cellText, _opts))
          if (_opts.lazyInline && cellText) cell._raw = cellText
          return cell
        }),
      ),
    )
    j++
  }

  return {
    node: createTable(align, rows),
    nextLine: j,
  }
}

function parseTableAlign(delim: string): (TableAlign | null)[] {
  return delim
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((cell) => {
      const trimmed = cell.trim()
      const left = trimmed.startsWith(':')
      const right = trimmed.endsWith(':')
      if (left && right) return 'center'
      if (right) return 'right'
      if (left) return 'left'
      return null
    })
}

function parseTableRow(line: string): string[] {
  // Remove leading/trailing pipes
  let trimmed = line.trim()
  if (trimmed.startsWith('|')) trimmed = trimmed.slice(1)
  if (trimmed.endsWith('|')) trimmed = trimmed.slice(0, -1)

  return trimmed.split('|').map((cell) => cell.trim())
}

function tryIndentedCode(lines: string[], i: number, end: number): ParseResult | null {
  const line = lines[i]!
  if (!isIndentCode(line)) return null

  const codeLines: string[] = []
  let j = i
  while (j < end) {
    const current = lines[j]!
    if (isIndentCode(current)) {
      codeLines.push(current.replace(/^(?: {4}|\t)/, ''))
      j++
    } else if (isBlank(current)) {
      // Blank lines within indented code
      codeLines.push('')
      j++
    } else {
      break
    }
  }

  // Remove trailing blank lines
  while (codeLines.length > 0 && codeLines[codeLines.length - 1] === '') {
    codeLines.pop()
  }

  if (codeLines.length === 0) return null

  return {
    node: createCodeBlock(codeLines.join('\n')),
    nextLine: j,
  }
}

function tryParagraphOrSetext(
  lines: string[],
  i: number,
  end: number,
  _opts: Required<BlockParserOptions>,
): ParseResult | null {
  const paragraphLines: string[] = []
  let j = i

  while (j < end) {
    const current = lines[j]!

    if (isBlank(current)) break

    // Check for setext heading underline
    if (paragraphLines.length > 0) {
      if (RE_SETEXT_H1.test(current)) {
        const content = paragraphLines.join('\n').trim()
        const node = createHeading(1, inlineOrLazy(content, _opts))
        if (_opts.lazyInline && content) node._raw = content
        return {
          node,
          nextLine: j + 1,
        }
      }
      if (RE_SETEXT_H2.test(current)) {
        const content = paragraphLines.join('\n').trim()
        const node = createHeading(2, inlineOrLazy(content, _opts))
        if (_opts.lazyInline && content) node._raw = content
        return {
          node,
          nextLine: j + 1,
        }
      }
    }

    // Check for interrupt patterns (block elements that interrupt a paragraph)
    if (paragraphLines.length > 0) {
      // Strip up to 3 spaces for interrupt check
      const currentStripped = strip3(current)
      if (
        RE_ATX_HEADING.test(currentStripped) ||
        RE_THEMATIC_BREAK.test(currentStripped) ||
        RE_FENCE_OPEN.test(currentStripped) ||
        RE_BLOCKQUOTE.test(currentStripped) ||
        RE_HTML_BLOCK_1.test(currentStripped) ||
        RE_HTML_BLOCK_2.test(currentStripped) ||
        RE_HTML_BLOCK_3.test(currentStripped) ||
        RE_HTML_BLOCK_4.test(currentStripped) ||
        RE_HTML_BLOCK_5.test(currentStripped) ||
        RE_HTML_BLOCK_6.test(currentStripped)
      ) {
        break
      }
    }

    paragraphLines.push(current.replace(/^ {1,3}(?! )/, ''))
    j++
  }

  if (paragraphLines.length === 0) return null

  const content = paragraphLines.join('\n').trim()
  const node = createParagraph(inlineOrLazy(content, _opts))
  if (_opts.lazyInline && content) node._raw = content
  return {
    node,
    nextLine: j,
  }
}

/** Parse FrontMatter --- yaml --- (ref: Cherry FrontMatter.js) */
function tryFrontMatter(lines: string[], i: number, end: number): ParseResult | null {
  const line = lines[i]!
  if (!RE_FRONTMATTER_OPEN.test(line)) return null

  const contentLines: string[] = []
  let j = i + 1
  let foundClose = false
  while (j < end) {
    if (RE_FRONTMATTER_OPEN.test(lines[j]!)) {
      foundClose = true
      j++
      break
    }
    contentLines.push(lines[j]!)
    j++
  }

  // Must have closing --- and at least one non-blank content line
  if (!foundClose) return null
  const hasContent = contentLines.some((l) => l.trim().length > 0)
  if (!hasContent) return null
  // Content must look like YAML/JSON (contain : or { or [) — avoid matching thematic break sequences
  const looksLikeYaml = contentLines.some((l) => /[:{\[]/.test(l))
  if (!looksLikeYaml) return null

  const content = contentLines.join('\n')
  return {
    node: createHtmlBlock(`<!-- frontmatter\n${content}\n-->`),
    nextLine: j,
  }
}

/** Parse Detail/collapsible: +++title / +++ (ref: Cherry Detail.js) */
function tryDetail(
  lines: string[],
  i: number,
  end: number,
  opts: Required<BlockParserOptions>,
): ParseResult | null {
  const line = lines[i]!
  const openMatch = RE_DETAIL_OPEN.exec(line)
  if (!openMatch) return null

  const isOpen = openMatch[1] === '-'
  const summary = openMatch[2]!.trim()

  const contentLines: string[] = []
  let j = i + 1
  while (j < end) {
    if (RE_DETAIL_CLOSE.test(lines[j]!)) {
      j++
      break
    }
    contentLines.push(lines[j]!)
    j++
  }

  const children = parseBlockLines(contentLines, 0, contentLines.length, opts)

  // Use Details node — summary field stores the title
  // isOpen is encoded by prefixing summary with a marker
  const detailSummary = isOpen ? summary : summary

  return {
    node: createDetails(detailSummary, children),
    nextLine: j,
  }
}

function tryFootnoteDefinition(
  lines: string[],
  i: number,
  end: number,
  opts: Required<BlockParserOptions>,
): ParseResult | null {
  const line = lines[i]!
  const match = RE_FOOTNOTE_DEF.exec(line)
  if (!match) return null

  const identifier = match[1]!
  const firstLineContent = match[2]!

  // Gather continuation lines (indented by at least 2 spaces or tab)
  const contentLines: string[] = [firstLineContent]
  let j = i + 1
  while (j < end) {
    const current = lines[j]!
    if (isBlank(current)) {
      // Check if next line continues the footnote (indented)
      if (j + 1 < end && /^(?: {2,}|\t)/.test(lines[j + 1]!)) {
        contentLines.push('')
        j++
        continue
      }
      break
    }
    if (/^(?: {2,}|\t)/.test(current)) {
      contentLines.push(current.replace(/^(?: {2,}|\t)/, ''))
      j++
      continue
    }
    break
  }

  const children = parseBlockLines(contentLines, 0, contentLines.length, opts)

  return {
    node: createFootnoteDefinition(identifier, identifier, children),
    nextLine: j,
  }
}

export { parseBlockLines }

/** Decode backslash escapes and common HTML entities in code block info string */
function decodeInfoString(str: string): string {
  let result = str.replace(/\\([!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~])/g, '$1')
  if (result.includes('&')) {
    result = result.replace(/&(?:#x([0-9a-fA-F]{1,6})|#([0-9]{1,7})|([a-zA-Z][a-zA-Z0-9]{1,31}));/g, (match, hex, dec, name) => {
      if (hex) return String.fromCodePoint(parseInt(hex, 16) || 0xFFFD)
      if (dec) return String.fromCodePoint(parseInt(dec, 10) || 0xFFFD)
      const entities: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', ouml: '\u00F6', uuml: '\u00FC', auml: '\u00E4' }
      return entities[name] ?? match
    })
  }
  return result
}
