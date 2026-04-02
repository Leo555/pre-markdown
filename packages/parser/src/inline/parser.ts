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
  createFontColor,
  createFontSize,
  createFontBgColor,
  createRuby,
  createEmoji,
  createAudio,
  createVideo,
  createUnderline,
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
        // Soft break: strip trailing spaces from current text
        const trimmedPrev = prevText.replace(/ +$/, '')
        if (trimmedPrev) nodes.push(createText(trimmedPrev))
        else flushText()
        nodes.push(createSoftBreak())
      }
      pos++
      // Skip leading spaces on next line (CommonMark spec)
      while (pos < len && input[pos] === ' ') pos++
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

    // Cherry-style background color: !!!color text!!!
    if (ch === '!' && input[pos + 1] === '!' && input[pos + 2] === '!') {
      const result = tryCherryBgColor(input, pos)
      if (result) {
        flushText()
        nodes.push(result.node)
        pos = result.end
        textStart = pos
        continue
      }
    }

    // Cherry-style font color: !!color text!!
    if (ch === '!' && input[pos + 1] === '!' && input[pos + 2] !== '!') {
      const result = tryCherryFontColor(input, pos)
      if (result) {
        flushText()
        nodes.push(result.node)
        pos = result.end
        textStart = pos
        continue
      }
    }

    // Cherry-style font size: !size text!
    if (ch === '!' && input[pos + 1] !== '!' && input[pos + 1] !== '[' && input[pos + 1] !== 'a' && input[pos + 1] !== 'v') {
      const result = tryCherryFontSize(input, pos)
      if (result) {
        flushText()
        nodes.push(result.node)
        pos = result.end
        textStart = pos
        continue
      }
    }

    // Audio: !audio[title](url)
    if (ch === '!' && input.slice(pos, pos + 7) === '!audio[') {
      const result = tryAudio(input, pos)
      if (result) {
        flushText()
        nodes.push(result.node)
        pos = result.end
        textStart = pos
        continue
      }
    }

    // Video: !video[title](url)
    if (ch === '!' && input.slice(pos, pos + 7) === '!video[') {
      const result = tryVideo(input, pos)
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
    if (ch === '^' && input[pos + 1] !== '^') {
      const result = trySuperscript(input, pos)
      if (result) {
        flushText()
        nodes.push(result.node)
        pos = result.end
        textStart = pos
        continue
      }
    }

    // Cherry-style subscript: ^^text^^ (must check before single ^)
    if (ch === '^' && input[pos + 1] === '^') {
      const result = tryCherrySubscript(input, pos)
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

    // Font color/size/bgcolor: {color:red}text{/color} style
    if (ch === '{') {
      const result = tryFontColor(input, pos) || tryFontSize(input, pos) || tryFontBgColor(input, pos)
      if (result) {
        flushText()
        nodes.push(result.node)
        pos = result.end
        textStart = pos
        continue
      }
    }

    // Ruby: {text}(annotation) or Cherry-style {text|annotation}
    if (ch === '{') {
      const result = tryRuby(input, pos)
      if (result) {
        flushText()
        nodes.push(result.node)
        pos = result.end
        textStart = pos
        continue
      }
    }

    // Underline (Cherry-style): /text/ (requires space or line boundary)
    if (ch === '/') {
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
    if (ch === ':') {
      const result = tryEmoji(input, pos)
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

// ============================================================
// Extended Inline Parsers
// ============================================================

/** Emoji shortcode mapping (common subset) */
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

function tryFontColor(input: string, start: number): InlineResult | null {
  // {color:red}text{/color} or {color:#ff0000}text{/color}
  const match = /^\{color:([^}]+)\}/.exec(input.slice(start))
  if (!match) return null

  const color = match[1]!
  const afterOpen = start + match[0].length

  const closeTag = '{/color}'
  const closeIdx = input.indexOf(closeTag, afterOpen)
  if (closeIdx === -1) return null

  const content = input.slice(afterOpen, closeIdx)
  if (content.length === 0) return null

  return {
    node: createFontColor(color, parseInline(content)),
    end: closeIdx + closeTag.length,
  }
}

function tryFontSize(input: string, start: number): InlineResult | null {
  // {size:20px}text{/size} or {size:1.5em}text{/size}
  const match = /^\{size:([^}]+)\}/.exec(input.slice(start))
  if (!match) return null

  const size = match[1]!
  const afterOpen = start + match[0].length

  const closeTag = '{/size}'
  const closeIdx = input.indexOf(closeTag, afterOpen)
  if (closeIdx === -1) return null

  const content = input.slice(afterOpen, closeIdx)
  if (content.length === 0) return null

  return {
    node: createFontSize(size, parseInline(content)),
    end: closeIdx + closeTag.length,
  }
}

function tryFontBgColor(input: string, start: number): InlineResult | null {
  // {bgcolor:yellow}text{/bgcolor} or {bgcolor:#ffff00}text{/bgcolor}
  const match = /^\{bgcolor:([^}]+)\}/.exec(input.slice(start))
  if (!match) return null

  const color = match[1]!
  const afterOpen = start + match[0].length

  const closeTag = '{/bgcolor}'
  const closeIdx = input.indexOf(closeTag, afterOpen)
  if (closeIdx === -1) return null

  const content = input.slice(afterOpen, closeIdx)
  if (content.length === 0) return null

  return {
    node: createFontBgColor(color, parseInline(content)),
    end: closeIdx + closeTag.length,
  }
}

function tryRuby(input: string, start: number): InlineResult | null {
  // Format 1 (our style): {base text}(annotation)
  // Format 2 (Cherry style): {base text|annotation}
  if (input[start] !== '{') return null

  // Find closing brace
  const braceClose = input.indexOf('}', start + 1)
  if (braceClose === -1) return null

  const innerContent = input.slice(start + 1, braceClose)
  if (innerContent.length === 0) return null

  // Avoid matching font color/size/bgcolor patterns
  if (/^(?:color:|size:|bgcolor:)/.test(innerContent)) return null
  // Avoid matching {/color} etc close tags
  if (/^\//.test(innerContent)) return null

  // Cherry format: {text|annotation}
  if (innerContent.includes('|')) {
    const pipeIdx = innerContent.indexOf('|')
    const base = innerContent.slice(0, pipeIdx)
    const annotation = innerContent.slice(pipeIdx + 1)
    if (base.length > 0 && annotation.length > 0) {
      return {
        node: createRuby(base, annotation),
        end: braceClose + 1,
      }
    }
  }

  // Our format: {base text}(annotation)
  if (input[braceClose + 1] !== '(') return null

  const parenClose = input.indexOf(')', braceClose + 2)
  if (parenClose === -1) return null

  const annotation = input.slice(braceClose + 2, parenClose)
  if (annotation.length === 0) return null

  return {
    node: createRuby(innerContent, annotation),
    end: parenClose + 1,
  }
}

function tryEmoji(input: string, start: number): InlineResult | null {
  // :shortcode:
  const match = /^:([a-zA-Z0-9_+-]+):/.exec(input.slice(start))
  if (!match) return null

  const shortcode = match[1]!
  const value = EMOJI_MAP[shortcode]
  if (!value) return null

  return {
    node: createEmoji(shortcode, value),
    end: start + match[0].length,
  }
}

function tryAudio(input: string, start: number): InlineResult | null {
  // !audio[title](url)
  const match = /^!audio\[([^\]]*)\]\(([^)]+)\)/.exec(input.slice(start))
  if (!match) return null

  const title = match[1] || undefined
  const url = match[2]!

  return {
    node: createAudio(url, title),
    end: start + match[0].length,
  }
}

function tryVideo(input: string, start: number): InlineResult | null {
  // !video[title](url)
  const match = /^!video\[([^\]]*)\]\(([^)]+)\)/.exec(input.slice(start))
  if (!match) return null

  const title = match[1] || undefined
  const url = match[2]!

  return {
    node: createVideo(url, title),
    end: start + match[0].length,
  }
}

// ============================================================
// Cherry-Compatible Inline Parsers
// ============================================================

/** Cherry-style font color: !!color text!! (ref: Cherry Color.js) */
function tryCherryFontColor(input: string, start: number): InlineResult | null {
  // !!#hex text!! or !!colorname text!!
  const match = /^!!(#[0-9a-zA-Z]{3,6}|[a-z]{3,20})\s([\w\W]+?)!!/.exec(input.slice(start))
  if (!match) return null

  return {
    node: createFontColor(match[1]!, parseInline(match[2]!)),
    end: start + match[0].length,
  }
}

/** Cherry-style font size: !size text! (ref: Cherry Size.js) */
function tryCherryFontSize(input: string, start: number): InlineResult | null {
  // !24 text! — size is 1-2 digit number (px)
  const match = /^!([0-9]{1,2})\s([\w\W]*?)!/.exec(input.slice(start))
  if (!match) return null

  return {
    node: createFontSize(`${match[1]!}px`, parseInline(match[2]!)),
    end: start + match[0].length,
  }
}

/** Cherry-style background color: !!!color text!!! (ref: Cherry BackgroundColor.js) */
function tryCherryBgColor(input: string, start: number): InlineResult | null {
  // !!!#hex text!!! or !!!colorname text!!!
  const match = /^!!!(#[0-9a-zA-Z]{3,6}|[a-z]{3,10})\s([\w\W]+?)!!!/.exec(input.slice(start))
  if (!match) return null

  return {
    node: createFontBgColor(match[1]!, parseInline(match[2]!)),
    end: start + match[0].length,
  }
}

/** Cherry-style subscript: ^^text^^ (ref: Cherry Sub.js) */
function tryCherrySubscript(input: string, start: number): InlineResult | null {
  if (input[start] !== '^' || input[start + 1] !== '^') return null

  const closeIdx = input.indexOf('^^', start + 2)
  if (closeIdx === -1) return null

  const content = input.slice(start + 2, closeIdx)
  if (content.length === 0) return null

  return {
    node: createSubscript(parseInline(content)),
    end: closeIdx + 2,
  }
}

/** Cherry-style underline: /text/ (ref: Cherry Underline.js) — requires space/boundary */
function tryUnderline(input: string, start: number): InlineResult | null {
  if (input[start] !== '/') return null

  // Must be preceded by space or start of string
  if (start > 0 && input[start - 1] !== ' ' && input[start - 1] !== '\n') return null

  const closeIdx = input.indexOf('/', start + 1)
  if (closeIdx === -1 || closeIdx === start + 1) return null

  // Must not contain newlines
  const content = input.slice(start + 1, closeIdx)
  if (content.includes('\n')) return null

  // Must be followed by space or end of string
  if (closeIdx + 1 < input.length && input[closeIdx + 1] !== ' ' && input[closeIdx + 1] !== '\n') return null

  return {
    node: createUnderline(parseInline(content)),
    end: closeIdx + 1,
  }
}
