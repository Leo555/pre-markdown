/**
 * @pre-markdown/parser - Inline Parser
 *
 * Parses inline Markdown content into inline AST nodes.
 * Handles emphasis, links, images, code spans, and extensions.
 *
 * Performance: Uses sticky regex (y flag) + lastIndex to avoid input.slice() calls.
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
  createFontColor,
  createFontSize,
  createFontBgColor,
  createRuby,
  createEmoji,
  createAudio,
  createVideo,
  createUnderline,
} from '@pre-markdown/core'

// ============================================================
// Pre-compiled sticky regexes (avoid slice + re-creation)
// ============================================================

const RE_ESCAPE = /[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/
const RE_FOOTNOTE_REF = /\[\^([^\]]+)\]/y
const RE_AUTOLINK_URI = /<([a-zA-Z][a-zA-Z0-9+.\-]{1,31}:[^\s<>]*)>/y
const RE_AUTOLINK_EMAIL = /<([a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*)>/y
const RE_HTML_INLINE = /<\/?[a-zA-Z][a-zA-Z0-9-]*(?:\s+[a-zA-Z_:][a-zA-Z0-9_.:-]*(?:\s*=\s*(?:[^\s"'=<>`]+|'[^']*'|"[^"]*"))?)*\s*\/?>/y
const RE_CHERRY_COLOR = /!!(#[0-9a-zA-Z]{3,6}|[a-z]{3,20})\s([\w\W]+?)!!/y
const RE_CHERRY_SIZE = /!([0-9]{1,2})\s([\w\W]*?)!/y
const RE_CHERRY_BGCOLOR = /!!!(#[0-9a-zA-Z]{3,6}|[a-z]{3,10})\s([\w\W]+?)!!!/y
const RE_FONT_COLOR = /\{color:([^}]+)\}/y
const RE_FONT_SIZE = /\{size:([^}]+)\}/y
const RE_FONT_BGCOLOR = /\{bgcolor:([^}]+)\}/y
const RE_EMOJI = /:([a-zA-Z0-9_+-]+):/y
const RE_AUDIO = /!audio\[([^\]]*)\]\(([^)]+)\)/y
const RE_VIDEO = /!video\[([^\]]*)\]\(([^)]+)\)/y

/** Execute a sticky regex at a given position, returns match or null */
function execAt(re: RegExp, input: string, pos: number): RegExpExecArray | null {
  re.lastIndex = pos
  return re.exec(input)
}

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
    const ch = input.charCodeAt(pos)

    // Hard line break: two or more spaces before newline, or backslash before newline
    if (ch === 10) { // \n
      const prevText = input.slice(textStart, pos)
      if (prevText.endsWith('  ') || prevText.endsWith('\\')) {
        const trimmed = prevText.charCodeAt(prevText.length - 1) === 92 // backslash
          ? prevText.slice(0, -1)
          : prevText.replace(/ +$/, '')
        if (trimmed) nodes.push(createText(trimmed))
        nodes.push(createBreak())
      } else {
        // Soft break: strip trailing spaces from current text
        const trimmedPrev = prevText.replace(/ +$/, '')
        if (trimmedPrev) nodes.push(createText(trimmedPrev))
        else flushText()
        nodes.push(createSoftBreak())
      }
      pos++
      // Skip leading spaces on next line (CommonMark spec)
      while (pos < len && input.charCodeAt(pos) === 32) pos++
      textStart = pos
      continue
    }

    // Escape: backslash followed by punctuation
    if (ch === 92 && pos + 1 < len) { // backslash
      const next = input[pos + 1]!
      if (RE_ESCAPE.test(next)) {
        flushText()
        pos++
        textStart = pos
        pos++
        continue
      }
    }

    // Inline code: backtick
    if (ch === 96) { // `
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
    if (ch === 36 && input.charCodeAt(pos + 1) !== 36) { // $
      const result = tryMathInline(input, pos)
      if (result) {
        flushText()
        nodes.push(result.node)
        pos = result.end
        textStart = pos
        continue
      }
    }

    // Cherry-style background color: !!!color text!!!
    if (ch === 33 && input.charCodeAt(pos + 1) === 33 && input.charCodeAt(pos + 2) === 33) { // !!!
      const match = execAt(RE_CHERRY_BGCOLOR, input, pos)
      if (match) {
        flushText()
        nodes.push(createFontBgColor(match[1]!, parseInlineFast(match[2]!)))
        pos = pos + match[0].length
        textStart = pos
        continue
      }
    }

    // Cherry-style font color: !!color text!!
    if (ch === 33 && input.charCodeAt(pos + 1) === 33 && input.charCodeAt(pos + 2) !== 33) { // !!
      const match = execAt(RE_CHERRY_COLOR, input, pos)
      if (match) {
        flushText()
        nodes.push(createFontColor(match[1]!, parseInlineFast(match[2]!)))
        pos = pos + match[0].length
        textStart = pos
        continue
      }
    }

    // Cherry-style font size: !size text!
    if (ch === 33) { // !
      const next = input.charCodeAt(pos + 1)
      if (next !== 33 && next !== 91 && next !== 97 && next !== 118) { // not !, [, a, v
        const match = execAt(RE_CHERRY_SIZE, input, pos)
        if (match) {
          flushText()
          nodes.push(createFontSize(match[1]! + 'px', parseInlineFast(match[2]!)))
          pos = pos + match[0].length
          textStart = pos
          continue
        }
      }
    }

    // Audio: !audio[title](url)
    if (ch === 33 && input.charCodeAt(pos + 1) === 97) { // !a
      const match = execAt(RE_AUDIO, input, pos)
      if (match) {
        flushText()
        nodes.push(createAudio(match[2]!, match[1] || undefined))
        pos = pos + match[0].length
        textStart = pos
        continue
      }
    }

    // Video: !video[title](url)
    if (ch === 33 && input.charCodeAt(pos + 1) === 118) { // !v
      const match = execAt(RE_VIDEO, input, pos)
      if (match) {
        flushText()
        nodes.push(createVideo(match[2]!, match[1] || undefined))
        pos = pos + match[0].length
        textStart = pos
        continue
      }
    }

    // Image: ![alt](url)
    if (ch === 33 && input.charCodeAt(pos + 1) === 91) { // ![
      const result = tryImage(input, pos)
      if (result) {
        flushText()
        nodes.push(result.node)
        pos = result.end
        textStart = pos
        continue
      }
    }

    // Link: [text](url) or [^id]
    if (ch === 91) { // [
      if (input.charCodeAt(pos + 1) === 94) { // [^
        const match = execAt(RE_FOOTNOTE_REF, input, pos)
        if (match) {
          flushText()
          nodes.push(createFootnoteReference(match[1]!, match[1]!))
          pos = pos + match[0].length
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
    if (ch === 60) { // <
      const uriMatch = execAt(RE_AUTOLINK_URI, input, pos)
      if (uriMatch) {
        flushText()
        nodes.push(createAutolink(uriMatch[1]!, false))
        pos = pos + uriMatch[0].length
        textStart = pos
        continue
      }

      const emailMatch = execAt(RE_AUTOLINK_EMAIL, input, pos)
      if (emailMatch) {
        flushText()
        nodes.push(createAutolink('mailto:' + emailMatch[1]!, true))
        pos = pos + emailMatch[0].length
        textStart = pos
        continue
      }

      // HTML inline
      const htmlMatch = execAt(RE_HTML_INLINE, input, pos)
      if (htmlMatch) {
        flushText()
        nodes.push(createHtmlInline(htmlMatch[0]))
        pos = pos + htmlMatch[0].length
        textStart = pos
        continue
      }
    }

    // Emphasis/Strong: * or _
    if (ch === 42 || ch === 95) { // * or _
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
    if (ch === 126 && input.charCodeAt(pos + 1) === 126) { // ~~
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
    if (ch === 61 && input.charCodeAt(pos + 1) === 61) { // ==
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
    if (ch === 94 && input.charCodeAt(pos + 1) !== 94) { // ^
      const result = trySuperscript(input, pos)
      if (result) {
        flushText()
        nodes.push(result.node)
        pos = result.end
        textStart = pos
        continue
      }
    }

    // Cherry-style subscript: ^^text^^
    if (ch === 94 && input.charCodeAt(pos + 1) === 94) { // ^^
      const result = tryCherrySubscript(input, pos)
      if (result) {
        flushText()
        nodes.push(result.node)
        pos = result.end
        textStart = pos
        continue
      }
    }

    // Subscript: ~text~
    if (ch === 126 && input.charCodeAt(pos + 1) !== 126) { // ~
      const result = trySubscript(input, pos)
      if (result) {
        flushText()
        nodes.push(result.node)
        pos = result.end
        textStart = pos
        continue
      }
    }

    // Font color/size/bgcolor: {color:red}text{/color} or Ruby: {text|ann}
    if (ch === 123) { // {
      const colorMatch = execAt(RE_FONT_COLOR, input, pos)
      if (colorMatch) {
        const closeTag = '{/color}'
        const closeIdx = input.indexOf(closeTag, pos + colorMatch[0].length)
        if (closeIdx !== -1) {
          const content = input.slice(pos + colorMatch[0].length, closeIdx)
          if (content.length > 0) {
            flushText()
            nodes.push(createFontColor(colorMatch[1]!, parseInlineFast(content)))
            pos = closeIdx + closeTag.length
            textStart = pos
            continue
          }
        }
      }

      const sizeMatch = execAt(RE_FONT_SIZE, input, pos)
      if (sizeMatch) {
        const closeTag = '{/size}'
        const closeIdx = input.indexOf(closeTag, pos + sizeMatch[0].length)
        if (closeIdx !== -1) {
          const content = input.slice(pos + sizeMatch[0].length, closeIdx)
          if (content.length > 0) {
            flushText()
            nodes.push(createFontSize(sizeMatch[1]!, parseInlineFast(content)))
            pos = closeIdx + closeTag.length
            textStart = pos
            continue
          }
        }
      }

      const bgMatch = execAt(RE_FONT_BGCOLOR, input, pos)
      if (bgMatch) {
        const closeTag = '{/bgcolor}'
        const closeIdx = input.indexOf(closeTag, pos + bgMatch[0].length)
        if (closeIdx !== -1) {
          const content = input.slice(pos + bgMatch[0].length, closeIdx)
          if (content.length > 0) {
            flushText()
            nodes.push(createFontBgColor(bgMatch[1]!, parseInlineFast(content)))
            pos = closeIdx + closeTag.length
            textStart = pos
            continue
          }
        }
      }

      // Ruby: {text|annotation} or {text}(annotation)
      const result = tryRuby(input, pos)
      if (result) {
        flushText()
        nodes.push(result.node)
        pos = result.end
        textStart = pos
        continue
      }
    }

    // Underline (Cherry-style): /text/
    if (ch === 47) { // /
      const result = tryUnderline(input, pos)
      if (result) {
        flushText()
        nodes.push(result.node)
        pos = result.end
        textStart = pos
        continue
      }
    }

    // Emoji shortcode: :smile:
    if (ch === 58) { // :
      const match = execAt(RE_EMOJI, input, pos)
      if (match) {
        const value = EMOJI_MAP[match[1]!]
        if (value) {
          flushText()
          nodes.push(createEmoji(match[1]!, value))
          pos = pos + match[0].length
          textStart = pos
          continue
        }
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

// Special chars that trigger inline parsing — if content has none, just return [Text]
const INLINE_SPECIAL_CHARS = /[`*_~\[!<$\\={^:/{}\n]/

/** Fast path: if content has no special inline chars, return single Text node */
function parseInlineFast(content: string): InlineNode[] {
  if (!INLINE_SPECIAL_CHARS.test(content)) {
    return content.length > 0 ? [createText(content)] : []
  }
  return parseInline(content)
}

function tryInlineCode(input: string, start: number): InlineResult | null {
  let pos = start
  let ticks = 0
  while (pos < input.length && input.charCodeAt(pos) === 96) {
    ticks++
    pos++
  }

  // Find closing backticks
  const closePattern = '`'.repeat(ticks)
  let closePos = input.indexOf(closePattern, pos)
  while (closePos !== -1) {
    if (closePos + ticks >= input.length || input.charCodeAt(closePos + ticks) !== 96) {
      const content = input.slice(pos, closePos)
      const trimmed = content.replace(/\n/g, ' ')
      const normalized =
        trimmed.length > 0 && trimmed.trim().length > 0 && trimmed.charCodeAt(0) === 32 && trimmed.charCodeAt(trimmed.length - 1) === 32
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
  const pos = start + 1
  const closePos = input.indexOf('$', pos)
  if (closePos === -1 || closePos === pos) return null
  if (input.charCodeAt(pos) === 32 || input.charCodeAt(closePos - 1) === 32) return null

  return {
    node: createMathInline(input.slice(pos, closePos)),
    end: closePos + 1,
  }
}

function tryImage(input: string, start: number): InlineResult | null {
  const altClose = findClosingBracket(input, start + 1)
  if (altClose === -1 || input.charCodeAt(altClose + 1) !== 40) return null // (

  const alt = input.slice(start + 2, altClose)
  const urlResult = parseUrlAndTitle(input, altClose + 1)
  if (!urlResult) return null

  return {
    node: createImage(urlResult.url, alt, urlResult.title),
    end: urlResult.end,
  }
}

function tryLink(input: string, start: number): InlineResult | null {
  const textClose = findClosingBracket(input, start)
  if (textClose === -1 || input.charCodeAt(textClose + 1) !== 40) return null // (

  const text = input.slice(start + 1, textClose)
  const urlResult = parseUrlAndTitle(input, textClose + 1)
  if (!urlResult) return null

  return {
    node: createLink(urlResult.url, parseInlineFast(text), urlResult.title),
    end: urlResult.end,
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

  const closePattern = ch.repeat(count)
  let searchPos = pos
  while (searchPos < input.length) {
    const closeIdx = input.indexOf(closePattern, searchPos)
    if (closeIdx === -1) return null

    if (closeIdx + count < input.length && input[closeIdx + count] === ch) {
      searchPos = closeIdx + 1
      continue
    }

    const content = input.slice(pos, closeIdx)
    if (content.length === 0) return null

    const children = parseInlineFast(content)

    if (count === 1) {
      return { node: createEmphasis(children), end: closeIdx + count }
    } else if (count === 2) {
      return { node: createStrong(children), end: closeIdx + count }
    } else {
      return { node: createStrong([createEmphasis(children)]), end: closeIdx + count }
    }
  }

  return null
}

function tryStrikethrough(input: string, start: number): InlineResult | null {
  const closeIdx = input.indexOf('~~', start + 2)
  if (closeIdx === -1) return null
  const content = input.slice(start + 2, closeIdx)
  if (content.length === 0) return null
  return { node: createStrikethrough(parseInlineFast(content)), end: closeIdx + 2 }
}

function tryHighlight(input: string, start: number): InlineResult | null {
  const closeIdx = input.indexOf('==', start + 2)
  if (closeIdx === -1) return null
  const content = input.slice(start + 2, closeIdx)
  if (content.length === 0) return null
  return { node: createHighlight(parseInlineFast(content)), end: closeIdx + 2 }
}

function trySuperscript(input: string, start: number): InlineResult | null {
  const closeIdx = input.indexOf('^', start + 1)
  if (closeIdx === -1 || closeIdx === start + 1) return null
  const content = input.slice(start + 1, closeIdx)
  if (content.includes(' ')) return null
  return { node: createSuperscript(parseInlineFast(content)), end: closeIdx + 1 }
}

function trySubscript(input: string, start: number): InlineResult | null {
  if (input.charCodeAt(start + 1) === 126) return null // ~~
  const closeIdx = input.indexOf('~', start + 1)
  if (closeIdx === -1 || closeIdx === start + 1) return null
  const content = input.slice(start + 1, closeIdx)
  if (content.includes(' ')) return null
  return { node: createSubscript(parseInlineFast(content)), end: closeIdx + 1 }
}

function tryCherrySubscript(input: string, start: number): InlineResult | null {
  const closeIdx = input.indexOf('^^', start + 2)
  if (closeIdx === -1) return null
  const content = input.slice(start + 2, closeIdx)
  if (content.length === 0) return null
  return { node: createSubscript(parseInlineFast(content)), end: closeIdx + 2 }
}

// ============================================================
// Utility Functions
// ============================================================

function findClosingBracket(input: string, start: number): number {
  let depth = 0
  let pos = start
  while (pos < input.length) {
    const c = input.charCodeAt(pos)
    if (c === 91) depth++       // [
    else if (c === 93) {        // ]
      depth--
      if (depth === 0) return pos
    } else if (c === 92) {      // backslash
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
  if (input.charCodeAt(start) !== 40) return null // (

  let pos = start + 1
  // Skip whitespace
  while (pos < input.length && isWhitespace(input.charCodeAt(pos))) pos++

  // Parse URL
  let url = ''
  if (input.charCodeAt(pos) === 60) { // <
    const closeAngle = input.indexOf('>', pos + 1)
    if (closeAngle === -1) return null
    url = input.slice(pos + 1, closeAngle)
    pos = closeAngle + 1
  } else {
    let depth = 0
    const urlStart = pos
    while (pos < input.length) {
      const c = input.charCodeAt(pos)
      if (c === 40) depth++      // (
      else if (c === 41) {       // )
        if (depth === 0) break
        depth--
      } else if (isWhitespace(c)) break
      pos++
    }
    url = input.slice(urlStart, pos)
  }

  // Skip whitespace
  while (pos < input.length && isWhitespace(input.charCodeAt(pos))) pos++

  // Parse optional title
  let title: string | undefined
  const tc = input.charCodeAt(pos)
  if (tc === 34 || tc === 39 || tc === 40) { // " ' (
    const quote = tc === 40 ? 41 : tc // ) for (, same char otherwise
    const titleStart = pos + 1
    pos++
    while (pos < input.length && input.charCodeAt(pos) !== quote) {
      if (input.charCodeAt(pos) === 92) pos++ // backslash
      pos++
    }
    if (pos >= input.length) return null
    title = input.slice(titleStart, pos)
    pos++
  }

  // Skip whitespace and find closing paren
  while (pos < input.length && isWhitespace(input.charCodeAt(pos))) pos++
  if (pos >= input.length || input.charCodeAt(pos) !== 41) return null // )

  return { url, title, end: pos + 1 }
}

function isWhitespace(code: number): boolean {
  return code === 32 || code === 9 || code === 10 || code === 13
}

function tryRuby(input: string, start: number): InlineResult | null {
  const braceClose = input.indexOf('}', start + 1)
  if (braceClose === -1) return null

  const innerContent = input.slice(start + 1, braceClose)
  if (innerContent.length === 0) return null

  // Avoid matching font color/size/bgcolor patterns
  if (innerContent.charCodeAt(0) === 99 && innerContent.startsWith('color:')) return null   // color:
  if (innerContent.charCodeAt(0) === 115 && innerContent.startsWith('size:')) return null    // size:
  if (innerContent.charCodeAt(0) === 98 && innerContent.startsWith('bgcolor:')) return null  // bgcolor:
  if (innerContent.charCodeAt(0) === 47) return null // /

  // Cherry format: {text|annotation}
  const pipeIdx = innerContent.indexOf('|')
  if (pipeIdx !== -1) {
    const base = innerContent.slice(0, pipeIdx)
    const annotation = innerContent.slice(pipeIdx + 1)
    if (base.length > 0 && annotation.length > 0) {
      return { node: createRuby(base, annotation), end: braceClose + 1 }
    }
  }

  // Our format: {base text}(annotation)
  if (input.charCodeAt(braceClose + 1) !== 40) return null // (
  const parenClose = input.indexOf(')', braceClose + 2)
  if (parenClose === -1) return null

  const annotation = input.slice(braceClose + 2, parenClose)
  if (annotation.length === 0) return null

  return { node: createRuby(innerContent, annotation), end: parenClose + 1 }
}

function tryUnderline(input: string, start: number): InlineResult | null {
  // Must be preceded by space or start of string
  if (start > 0 && input.charCodeAt(start - 1) !== 32 && input.charCodeAt(start - 1) !== 10) return null

  const closeIdx = input.indexOf('/', start + 1)
  if (closeIdx === -1 || closeIdx === start + 1) return null

  const content = input.slice(start + 1, closeIdx)
  if (content.includes('\n')) return null

  // Must be followed by space or end of string
  if (closeIdx + 1 < input.length && input.charCodeAt(closeIdx + 1) !== 32 && input.charCodeAt(closeIdx + 1) !== 10) return null

  return { node: createUnderline(parseInlineFast(content)), end: closeIdx + 1 }
}

// ============================================================
// Emoji Map
// ============================================================

const EMOJI_MAP: Record<string, string> = {
  smile: '😄', laughing: '😆', blush: '😊', smiley: '😃', relaxed: '☺️',
  heart: '❤️', 'thumbsup': '👍', 'thumbsdown': '👎', ok_hand: '👌',
  wave: '👋', clap: '👏', raised_hands: '🙌', pray: '🙏',
  fire: '🔥', star: '⭐', sparkles: '✨', zap: '⚡',
  warning: '⚠️', x: '❌', white_check_mark: '✅', question: '❓',
  exclamation: '❗', bulb: '💡', memo: '📝', book: '📖',
  rocket: '🚀', tada: '🎉', eyes: '👀', thinking: '🤔',
  sob: '😭', joy: '😂', wink: '😉', grin: '😁',
  sweat_smile: '😅', sunglasses: '😎', heart_eyes: '😍',
  100: '💯', boom: '💥', muscle: '💪', point_up: '☝️',
  point_down: '👇', point_left: '👈', point_right: '👉',
  see_no_evil: '🙈', hear_no_evil: '🙉', speak_no_evil: '🙊',
  coffee: '☕', beer: '🍺', pizza: '🍕', hamburger: '🍔',
  dog: '🐶', cat: '🐱', bug: '🐛', penguin: '🐧',
  checkered_flag: '🏁', trophy: '🏆', gem: '💎', wrench: '🔧',
  hammer: '🔨', gear: '⚙️', link: '🔗', lock: '🔒',
  key: '🔑', bell: '🔔', calendar: '📅', clock: '🕐',
  earth_americas: '🌎', sunny: '☀️', cloud: '☁️', umbrella: '☂️',
  snowflake: '❄️', rainbow: '🌈', ocean: '🌊',
  '+1': '👍', '-1': '👎',
}
