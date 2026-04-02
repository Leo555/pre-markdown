/**
 * @pre-markdown/parser - Inline Parser
 *
 * Parses inline Markdown content into inline AST nodes.
 * Handles emphasis, links, images, code spans, and extensions.
 */

import type { InlineNode } from '@pre-markdown/core'

import {
  createText,
  createEmphasis,
  createStrong,
  createStrikethrough,
  createInlineCode,
  createLink,
  createImage,
  createHtmlInline,
  createBreak,
  createSoftBreak,
  createMathInline,
  createHighlight,
  createSuperscript,
  createSubscript,
  createAutolink,
  createFootnoteReference,
} from '@pre-markdown/core'

/**
 * Parse inline content from a string.
 */
export function parseInline(input: string): InlineNode[] {
  const nodes: InlineNode[] = []
  const len = input.length
  let pos = 0
  let textStart = 0

  function flushText(): void {
    if (pos > textStart) {
      nodes.push(createText(input.slice(textStart, pos)))
    }
  }

  while (pos < len) {
    const ch = input[pos]!

    // Hard line break: two or more spaces before newline, or backslash before newline
    if (ch === '\n') {
      const prevText = input.slice(textStart, pos)
      if (prevText.endsWith('  ') || prevText.endsWith('\\')) {
        const trimmed = prevText.endsWith('\\')
          ? prevText.slice(0, -1)
          : prevText.replace(/ +$/, '')
        if (trimmed) nodes.push(createText(trimmed))
        nodes.push(createBreak())
      } else {
        flushText()
        nodes.push(createSoftBreak())
      }
      pos++
      textStart = pos
      continue
    }

    // Escape: backslash followed by punctuation
    if (ch === '\\' && pos + 1 < len) {
      const next = input[pos + 1]!
      if (/[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/.test(next)) {
        flushText()
        pos++
        textStart = pos
        pos++
        continue
      }
    }

    // Inline code: backtick
    if (ch === '`') {
      const result = tryInlineCode(input, pos)
      if (result) {
        flushText()
        nodes.push(result.node)
        pos = result.end
        textStart = pos
        continue
      }
    }

    // Math inline: $...$
    if (ch === '$' && input[pos + 1] !== '$') {
      const result = tryMathInline(input, pos)
      if (result) {
        flushText()
        nodes.push(result.node)
        pos = result.end
        textStart = pos
        continue
      }
    }

    // Image: ![alt](url)
    if (ch === '!' && input[pos + 1] === '[') {
      const result = tryImage(input, pos)
      if (result) {
        flushText()
        nodes.push(result.node)
        pos = result.end
        textStart = pos
        continue
      }
    }

    // Link: [text](url)
    if (ch === '[') {
      // Check for footnote reference: [^id]
      if (input[pos + 1] === '^') {
        const result = tryFootnoteRef(input, pos)
        if (result) {
          flushText()
          nodes.push(result.node)
          pos = result.end
          textStart = pos
          continue
        }
      }

      const result = tryLink(input, pos)
      if (result) {
        flushText()
        nodes.push(result.node)
        pos = result.end
        textStart = pos
        continue
      }
    }

    // Autolink: <url> or <email>
    if (ch === '<') {
      const result = tryAutolink(input, pos)
      if (result) {
        flushText()
        nodes.push(result.node)
        pos = result.end
        textStart = pos
        continue
      }

      // HTML inline
      const htmlResult = tryHtmlInline(input, pos)
      if (htmlResult) {
        flushText()
        nodes.push(htmlResult.node)
        pos = htmlResult.end
        textStart = pos
        continue
      }
    }

    // Emphasis/Strong: * or _
    if (ch === '*' || ch === '_') {
      const result = tryEmphasis(input, pos)
      if (result) {
        flushText()
        nodes.push(result.node)
        pos = result.end
        textStart = pos
        continue
      }
    }

    // Strikethrough: ~~
    if (ch === '~' && input[pos + 1] === '~') {
      const result = tryStrikethrough(input, pos)
      if (result) {
        flushText()
        nodes.push(result.node)
        pos = result.end
        textStart = pos
        continue
      }
    }

    // Highlight: ==
    if (ch === '=' && input[pos + 1] === '=') {
      const result = tryHighlight(input, pos)
      if (result) {
        flushText()
        nodes.push(result.node)
        pos = result.end
        textStart = pos
        continue
      }
    }

    // Superscript: ^text^
    if (ch === '^') {
      const result = trySuperscript(input, pos)
      if (result) {
        flushText()
        nodes.push(result.node)
        pos = result.end
        textStart = pos
        continue
      }
    }

    // Subscript: ~text~  (single tilde, not double)
    if (ch === '~' && input[pos + 1] !== '~') {
      const result = trySubscript(input, pos)
      if (result) {
        flushText()
        nodes.push(result.node)
        pos = result.end
        textStart = pos
        continue
      }
    }

    pos++
  }

  // Flush remaining text
  if (textStart < len) {
    nodes.push(createText(input.slice(textStart)))
  }

  return nodes
}

// ============================================================
// Inline Parsers
// ============================================================

interface InlineResult {
  node: InlineNode
  end: number
}

function tryInlineCode(input: string, start: number): InlineResult | null {
  let pos = start
  let ticks = 0
  while (pos < input.length && input[pos] === '`') {
    ticks++
    pos++
  }

  // Find closing backticks
  const closePattern = '`'.repeat(ticks)
  let closePos = input.indexOf(closePattern, pos)
  while (closePos !== -1) {
    // Ensure exact match (not more backticks)
    if (closePos + ticks >= input.length || input[closePos + ticks] !== '`') {
      const content = input.slice(pos, closePos)
      // Collapse internal whitespace if not all spaces
      const trimmed = content.replace(/\n/g, ' ')
      const normalized =
        trimmed.length > 0 && trimmed.trim().length > 0 && trimmed.startsWith(' ') && trimmed.endsWith(' ')
          ? trimmed.slice(1, -1)
          : trimmed

      return {
        node: createInlineCode(normalized),
        end: closePos + ticks,
      }
    }
    closePos = input.indexOf(closePattern, closePos + 1)
  }

  return null
}

function tryMathInline(input: string, start: number): InlineResult | null {
  if (input[start] !== '$') return null
  const pos = start + 1

  // Find closing $
  const closePos = input.indexOf('$', pos)
  if (closePos === -1 || closePos === pos) return null

  // Must not have space right after opening or before closing
  if (input[pos] === ' ' || input[closePos - 1] === ' ') return null

  const value = input.slice(pos, closePos)
  return {
    node: createMathInline(value),
    end: closePos + 1,
  }
}

function tryImage(input: string, start: number): InlineResult | null {
  // ![alt](url "title")
  if (input[start] !== '!' || input[start + 1] !== '[') return null

  const altClose = findClosingBracket(input, start + 1)
  if (altClose === -1) return null
  if (input[altClose + 1] !== '(') return null

  const alt = input.slice(start + 2, altClose)
  const urlResult = parseUrlAndTitle(input, altClose + 1)
  if (!urlResult) return null

  return {
    node: createImage(urlResult.url, alt, urlResult.title),
    end: urlResult.end,
  }
}

function tryLink(input: string, start: number): InlineResult | null {
  // [text](url "title")
  if (input[start] !== '[') return null

  const textClose = findClosingBracket(input, start)
  if (textClose === -1) return null
  if (input[textClose + 1] !== '(') return null

  const text = input.slice(start + 1, textClose)
  const urlResult = parseUrlAndTitle(input, textClose + 1)
  if (!urlResult) return null

  const children = parseInline(text)

  return {
    node: createLink(urlResult.url, children, urlResult.title),
    end: urlResult.end,
  }
}

function tryFootnoteRef(input: string, start: number): InlineResult | null {
  // [^identifier]
  const match = /^\[\^([^\]]+)\]/.exec(input.slice(start))
  if (!match) return null

  const identifier = match[1]!
  return {
    node: createFootnoteReference(identifier, identifier),
    end: start + match[0].length,
  }
}

function tryAutolink(input: string, start: number): InlineResult | null {
  // <scheme:path> or <email@address>
  const match = /^<([a-zA-Z][a-zA-Z0-9+.\-]{1,31}:[^\s<>]*)>/.exec(input.slice(start))
  if (match) {
    return {
      node: createAutolink(match[1]!, false),
      end: start + match[0].length,
    }
  }

  const emailMatch = /^<([a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*)>/.exec(
    input.slice(start),
  )
  if (emailMatch) {
    return {
      node: createAutolink(`mailto:${emailMatch[1]!}`, true),
      end: start + emailMatch[0].length,
    }
  }

  return null
}

function tryHtmlInline(input: string, start: number): InlineResult | null {
  // Match HTML tags
  const match = /^<\/?[a-zA-Z][a-zA-Z0-9-]*(?:\s+[a-zA-Z_:][a-zA-Z0-9_.:-]*(?:\s*=\s*(?:[^\s"'=<>`]+|'[^']*'|"[^"]*"))?)*\s*\/?>/.exec(
    input.slice(start),
  )
  if (!match) return null

  return {
    node: createHtmlInline(match[0]),
    end: start + match[0].length,
  }
}

function tryEmphasis(input: string, start: number): InlineResult | null {
  const ch = input[start]!
  let count = 0
  let pos = start
  while (pos < input.length && input[pos] === ch) {
    count++
    pos++
  }

  if (count === 0 || count > 3) return null

  // Find matching closing delimiter
  const closePattern = ch.repeat(count)
  let searchPos = pos
  while (searchPos < input.length) {
    const closeIdx = input.indexOf(closePattern, searchPos)
    if (closeIdx === -1) return null

    // Verify it's a proper closing delimiter
    if (closeIdx + count < input.length && input[closeIdx + count] === ch) {
      searchPos = closeIdx + 1
      continue
    }

    const content = input.slice(pos, closeIdx)
    if (content.length === 0) return null

    const children = parseInline(content)

    if (count === 1) {
      return {
        node: createEmphasis(children),
        end: closeIdx + count,
      }
    } else if (count === 2) {
      return {
        node: createStrong(children),
        end: closeIdx + count,
      }
    } else {
      // ***bold italic***
      return {
        node: createStrong([createEmphasis(children)]),
        end: closeIdx + count,
      }
    }
  }

  return null
}

function tryStrikethrough(input: string, start: number): InlineResult | null {
  if (input[start] !== '~' || input[start + 1] !== '~') return null

  const closeIdx = input.indexOf('~~', start + 2)
  if (closeIdx === -1) return null

  const content = input.slice(start + 2, closeIdx)
  if (content.length === 0) return null

  return {
    node: createStrikethrough(parseInline(content)),
    end: closeIdx + 2,
  }
}

function tryHighlight(input: string, start: number): InlineResult | null {
  if (input[start] !== '=' || input[start + 1] !== '=') return null

  const closeIdx = input.indexOf('==', start + 2)
  if (closeIdx === -1) return null

  const content = input.slice(start + 2, closeIdx)
  if (content.length === 0) return null

  return {
    node: createHighlight(parseInline(content)),
    end: closeIdx + 2,
  }
}

function trySuperscript(input: string, start: number): InlineResult | null {
  if (input[start] !== '^') return null

  const closeIdx = input.indexOf('^', start + 1)
  if (closeIdx === -1 || closeIdx === start + 1) return null

  // Must not contain spaces
  const content = input.slice(start + 1, closeIdx)
  if (content.includes(' ')) return null

  return {
    node: createSuperscript(parseInline(content)),
    end: closeIdx + 1,
  }
}

function trySubscript(input: string, start: number): InlineResult | null {
  if (input[start] !== '~') return null
  if (input[start + 1] === '~') return null // Not strikethrough

  const closeIdx = input.indexOf('~', start + 1)
  if (closeIdx === -1 || closeIdx === start + 1) return null

  const content = input.slice(start + 1, closeIdx)
  if (content.includes(' ')) return null

  return {
    node: createSubscript(parseInline(content)),
    end: closeIdx + 1,
  }
}

// ============================================================
// Utility Functions
// ============================================================

function findClosingBracket(input: string, start: number): number {
  let depth = 0
  let pos = start
  while (pos < input.length) {
    if (input[pos] === '[') depth++
    else if (input[pos] === ']') {
      depth--
      if (depth === 0) return pos
    } else if (input[pos] === '\\') {
      pos++ // skip escaped character
    }
    pos++
  }
  return -1
}

function parseUrlAndTitle(
  input: string,
  start: number,
): { url: string; title?: string; end: number } | null {
  if (input[start] !== '(') return null

  let pos = start + 1
  // Skip whitespace
  while (pos < input.length && /\s/.test(input[pos]!)) pos++

  // Parse URL
  let url = ''
  if (input[pos] === '<') {
    // Angle-bracketed URL
    const closeAngle = input.indexOf('>', pos + 1)
    if (closeAngle === -1) return null
    url = input.slice(pos + 1, closeAngle)
    pos = closeAngle + 1
  } else {
    // Regular URL
    let depth = 0
    const urlStart = pos
    while (pos < input.length) {
      const ch = input[pos]!
      if (ch === '(') depth++
      else if (ch === ')') {
        if (depth === 0) break
        depth--
      } else if (/\s/.test(ch)) break
      pos++
    }
    url = input.slice(urlStart, pos)
  }

  // Skip whitespace
  while (pos < input.length && /\s/.test(input[pos]!)) pos++

  // Parse optional title
  let title: string | undefined
  if (pos < input.length && (input[pos] === '"' || input[pos] === "'" || input[pos] === '(')) {
    const quote = input[pos] === '(' ? ')' : input[pos]!
    const titleStart = pos + 1
    pos++
    while (pos < input.length && input[pos] !== quote) {
      if (input[pos] === '\\') pos++
      pos++
    }
    if (pos >= input.length) return null
    title = input.slice(titleStart, pos)
    pos++
  }

  // Skip whitespace and find closing paren
  while (pos < input.length && /\s/.test(input[pos]!)) pos++
  if (pos >= input.length || input[pos] !== ')') return null

  return { url, title, end: pos + 1 }
}
