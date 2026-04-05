/**
 * @pre-markdown/core — HTML Escaping Utilities
 *
 * Shared high-performance escapeHtml / escapeAttr functions.
 * Single-pass scan with charCodeAt — no intermediate strings, zero-copy fast path.
 *
 * Used by: renderer, built-in plugins (katex, mermaid, highlight).
 */

const ESCAPE_HTML_RE = /[&<>"]/

/**
 * Escape HTML special characters in a string.
 * Single-pass scan — O(n) with zero-copy fast path when no special chars.
 */
export function escapeHtml(str: string): string {
  // Fast path: no special chars → return original (zero-copy)
  if (!ESCAPE_HTML_RE.test(str)) return str

  let out = ''
  let last = 0
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i)
    let esc: string | undefined
    if (ch === 38) esc = '&amp;'       // &
    else if (ch === 60) esc = '&lt;'   // <
    else if (ch === 62) esc = '&gt;'   // >
    else if (ch === 34) esc = '&quot;' // "
    if (esc !== undefined) {
      if (last < i) out += str.slice(last, i)
      out += esc
      last = i + 1
    }
  }
  if (last === 0) return str
  if (last < str.length) out += str.slice(last)
  return out
}

/**
 * Escape HTML attribute value special characters.
 * Single-pass scan — also escapes single quotes for attribute safety.
 */
export function escapeAttr(str: string): string {
  if (!ESCAPE_HTML_RE.test(str) && !str.includes("'")) return str

  let out = ''
  let last = 0
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i)
    let esc: string | undefined
    if (ch === 38) esc = '&amp;'
    else if (ch === 34) esc = '&quot;'
    else if (ch === 39) esc = '&#39;'
    else if (ch === 60) esc = '&lt;'
    else if (ch === 62) esc = '&gt;'
    if (esc !== undefined) {
      if (last < i) out += str.slice(last, i)
      out += esc
      last = i + 1
    }
  }
  if (last === 0) return str
  if (last < str.length) out += str.slice(last)
  return out
}
