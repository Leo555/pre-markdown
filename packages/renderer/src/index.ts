/**
 * @pre-markdown/renderer
 *
 * Renders AST to DOM (HTML string) or DOM nodes.
 */

import type {
  Document,
  BlockNode,
  InlineNode,
  ASTNode,
  Heading,
  Paragraph,
  Blockquote,
  List,
  ListItem,
  CodeBlock,
  ThematicBreak,
  HtmlBlock,
  Table,
  TableRow,
  TableCell,
  MathBlock,
  Container,
  Details,
  TOC,
  Text,
  Emphasis,
  Strong,
  Strikethrough,
  InlineCode,
  Link,
  Image,
  Break,
  SoftBreak,
  MathInline,
  Highlight,
  Superscript,
  Subscript,
  FontColor,
  FontSize,
  FontBgColor,
  HtmlInline,
  FootnoteReference,
  Autolink,
  Audio,
  Video,
  Ruby,
  Emoji,
} from '@pre-markdown/core'

/** Renderer options */
export interface RendererOptions {
  /** Sanitize HTML output (default: true) */
  sanitize?: boolean
  /** Enable syntax highlighting for code blocks */
  highlight?: (code: string, lang?: string) => string
  /** Custom heading ID generator (null = no id attribute, default: null) */
  headingId?: ((text: string, depth: number) => string) | null
  /** Base URL for relative links */
  baseUrl?: string
  /** Inline parser for lazy-parsed nodes (nodes with _raw) */
  inlineParser?: ((raw: string) => InlineNode[]) | null
}

// ============================================================
// Fast escapeHtml — single-pass scan, no intermediate strings
// ============================================================

const ESCAPE_HTML_RE = /[&<>"]/

function escapeHtml(str: string): string {
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

function escapeAttr(str: string): string {
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

// ============================================================
// Main renderer
// ============================================================

/**
 * Render a Document AST to an HTML string.
 */
export function renderToHtml(doc: Document, options?: RendererOptions): string {
  const opts: Required<RendererOptions> = {
    sanitize: true,
    highlight: escapeHtml,
    headingId: null,
    baseUrl: '',
    inlineParser: null,
    ...options,
  }

  return renderBlockNodes(doc.children, opts)
}

/**
 * Resolve lazy inline content: if a node has _raw and empty children,
 * parse the raw text and cache the result in children.
 */
function resolveInline(
  node: { children: InlineNode[]; _raw?: string },
  opts: Required<RendererOptions>,
): InlineNode[] {
  if (node._raw !== undefined && node.children.length === 0 && opts.inlineParser) {
    node.children = opts.inlineParser(node._raw)
    // Clear _raw after resolution to avoid double parsing
    node._raw = undefined
  }
  return node.children
}

function renderBlockNodes(nodes: BlockNode[], opts: Required<RendererOptions>): string {
  // Use array + join for many nodes (faster than += for > 3 elements)
  const len = nodes.length
  if (len === 0) return ''
  if (len === 1) return renderBlockNode(nodes[0]!, opts)
  const parts: string[] = new Array(len)
  for (let i = 0; i < len; i++) {
    parts[i] = renderBlockNode(nodes[i]!, opts)
  }
  return parts.join('')
}

function renderBlockNode(node: BlockNode, opts: Required<RendererOptions>): string {
  switch (node.type) {
    case 'heading':
      return renderHeading(node, opts)
    case 'paragraph':
      return renderParagraph(node, opts)
    case 'blockquote':
      return renderBlockquote(node, opts)
    case 'list':
      return renderList(node, opts)
    case 'listItem':
      return renderListItem(node, opts)
    case 'codeBlock':
      return renderCodeBlock(node, opts)
    case 'thematicBreak':
      return '<hr />\n'
    case 'htmlBlock':
      return (opts.sanitize ? escapeHtml(node.value) : node.value) + '\n'
    case 'table':
      return renderTable(node, opts)
    case 'tableRow':
      return ''
    case 'tableCell':
      return '<td>' + renderInlineNodes(resolveInline(node, opts), opts) + '</td>'
    case 'mathBlock':
      return '<div class="math-block">' + escapeHtml(node.value) + '</div>\n'
    case 'container':
      return renderContainer(node, opts)
    case 'details':
      return renderDetails(node, opts)
    case 'toc':
      return '<nav class="toc" data-toc></nav>\n'
    case 'footnoteDefinition':
      return '<div class="footnote" id="fn-' + escapeHtml(node.identifier) + '"><sup>' + escapeHtml(node.label) + '</sup>' + renderBlockNodes(node.children, opts) + '</div>\n'
    default:
      return ''
  }
}

function renderHeading(node: Heading, opts: Required<RendererOptions>): string {
  const children = resolveInline(node, opts)
  const inner = renderInlineNodes(children, opts)
  if (opts.headingId) {
    const text = getPlainText(children)
    const id = opts.headingId(text, node.depth)
    if (id) return '<h' + node.depth + ' id="' + escapeAttr(id) + '">' + inner + '</h' + node.depth + '>\n'
  }
  return '<h' + node.depth + '>' + inner + '</h' + node.depth + '>\n'
}

function renderParagraph(node: Paragraph, opts: Required<RendererOptions>): string {
  return '<p>' + renderInlineNodes(resolveInline(node, opts), opts) + '</p>\n'
}

function renderBlockquote(node: Blockquote, opts: Required<RendererOptions>): string {
  return '<blockquote>\n' + renderBlockNodes(node.children, opts) + '</blockquote>\n'
}

function renderList(node: List, opts: Required<RendererOptions>): string {
  const tag = node.ordered ? 'ol' : 'ul'
  const startAttr = node.ordered && node.start !== undefined && node.start !== 1
    ? ' start="' + node.start + '"'
    : ''
  const len = node.children.length
  const parts: string[] = new Array(len)
  const loose = node.spread
  for (let i = 0; i < len; i++) {
    parts[i] = renderListItem(node.children[i]!, opts, loose)
  }
  return '<' + tag + startAttr + '>\n' + parts.join('') + '</' + tag + '>\n'
}

function renderListItem(node: ListItem, opts: Required<RendererOptions>, loose = true): string {
  let content: string

  if (!loose && node.children.length === 1 && node.children[0]!.type === 'paragraph') {
    content = renderInlineNodes(resolveInline(node.children[0] as Paragraph, opts), opts)
  } else if (!loose && node.children.every(c => c.type === 'paragraph')) {
    content = node.children
      .map(c => renderInlineNodes(resolveInline(c as Paragraph, opts), opts))
      .join('\n')
  } else {
    content = renderBlockNodes(node.children, opts)
  }

  if (node.checked !== undefined) {
    const checked = node.checked ? ' checked disabled' : ' disabled'
    return '<li class="task-list-item"><input type="checkbox"' + checked + ' /> ' + content + '</li>\n'
  }

  return '<li>' + content + '</li>\n'
}

function renderCodeBlock(node: CodeBlock, opts: Required<RendererOptions>): string {
  let code = node.value
  if (code.length > 0 && code.charCodeAt(code.length - 1) !== 10) {
    code += '\n'
  }
  const highlighted = opts.highlight(code, node.lang)
  if (node.lang) {
    return '<pre><code class="language-' + escapeAttr(node.lang) + '">' + highlighted + '</code></pre>\n'
  }
  return '<pre><code>' + highlighted + '</code></pre>\n'
}

function renderTable(node: Table, opts: Required<RendererOptions>): string {
  const parts: string[] = ['<table>']
  let inHeader = true

  for (let i = 0; i < node.children.length; i++) {
    const row = node.children[i]!
    if (row.isHeader) {
      if (i === 0) parts.push('<thead>')
    } else if (inHeader) {
      parts.push('</thead><tbody>')
      inHeader = false
    }
    parts.push('<tr>')
    const cellTag = row.isHeader ? 'th' : 'td'
    for (let j = 0; j < row.children.length; j++) {
      const cell = row.children[j]!
      const align = node.align[j]
      const cellChildren = resolveInline(cell, opts)
      if (align) {
        parts.push('<' + cellTag + ' style="text-align:' + align + '">' + renderInlineNodes(cellChildren, opts) + '</' + cellTag + '>')
      } else {
        parts.push('<' + cellTag + '>' + renderInlineNodes(cellChildren, opts) + '</' + cellTag + '>')
      }
    }
    parts.push('</tr>')
  }

  if (inHeader && node.children.some(r => r.isHeader)) {
    parts.push('</thead>')
  } else if (!inHeader) {
    parts.push('</tbody>')
  }
  parts.push('</table>\n')
  return parts.join('')
}

function renderContainer(node: Container, opts: Required<RendererOptions>): string {
  const title = node.title ? '<p class="container-title">' + escapeHtml(node.title) + '</p>' : ''
  return '<div class="container container-' + escapeAttr(node.kind) + '">' + title + renderBlockNodes(node.children, opts) + '</div>\n'
}

function renderDetails(node: Details, opts: Required<RendererOptions>): string {
  return '<details><summary>' + escapeHtml(node.summary) + '</summary>' + renderBlockNodes(node.children, opts) + '</details>\n'
}

// ============================================================
// Inline Rendering — optimized with string concat (faster than template literals for hot path)
// ============================================================

function renderInlineNodes(nodes: InlineNode[], opts: Required<RendererOptions>): string {
  const len = nodes.length
  if (len === 0) return ''
  if (len === 1) return renderInlineNode(nodes[0]!, opts)
  let out = ''
  for (let i = 0; i < len; i++) {
    out += renderInlineNode(nodes[i]!, opts)
  }
  return out
}

function renderInlineNode(node: InlineNode, opts: Required<RendererOptions>): string {
  switch (node.type) {
    case 'text':
      return escapeHtml(node.value)
    case 'emphasis':
      return '<em>' + renderInlineNodes(node.children, opts) + '</em>'
    case 'strong':
      return '<strong>' + renderInlineNodes(node.children, opts) + '</strong>'
    case 'strikethrough':
      return '<del>' + renderInlineNodes(node.children, opts) + '</del>'
    case 'inlineCode':
      return '<code>' + escapeHtml(node.value) + '</code>'
    case 'link': {
      const safeUrl = opts.sanitize ? sanitizeUrl(node.url) : node.url
      let r = '<a href="' + escapeAttr(encodeUrl(safeUrl)) + '"'
      if (node.title) r += ' title="' + escapeAttr(node.title) + '"'
      return r + '>' + renderInlineNodes(node.children, opts) + '</a>'
    }
    case 'image': {
      const safeSrc = opts.sanitize ? sanitizeUrl(node.url) : node.url
      let r = '<img src="' + escapeAttr(encodeUrl(safeSrc)) + '" alt="' + escapeAttr(node.alt) + '"'
      if (node.title) r += ' title="' + escapeAttr(node.title) + '"'
      if (node.width) r += ' width="' + node.width + '"'
      if (node.height) r += ' height="' + node.height + '"'
      return r + ' />'
    }
    case 'htmlInline':
      return opts.sanitize ? escapeHtml(node.value) : node.value
    case 'break':
      return '<br />\n'
    case 'softBreak':
      return '\n'
    case 'footnoteReference':
      return '<sup class="footnote-ref"><a href="#fn-' + escapeAttr(node.identifier) + '">[' + escapeHtml(node.label) + ']</a></sup>'
    case 'mathInline':
      return '<span class="math-inline">' + escapeHtml(node.value) + '</span>'
    case 'highlight':
      return '<mark>' + renderInlineNodes(node.children, opts) + '</mark>'
    case 'superscript':
      return '<sup>' + renderInlineNodes(node.children, opts) + '</sup>'
    case 'subscript':
      return '<sub>' + renderInlineNodes(node.children, opts) + '</sub>'
    case 'fontColor': {
      const safeColor = opts.sanitize ? sanitizeCssValue(node.color) : node.color
      return '<span style="color:' + escapeAttr(safeColor) + '">' + renderInlineNodes(node.children, opts) + '</span>'
    }
    case 'fontSize': {
      const safeSize = opts.sanitize ? sanitizeCssValue(node.size) : node.size
      return '<span style="font-size:' + escapeAttr(safeSize) + '">' + renderInlineNodes(node.children, opts) + '</span>'
    }
    case 'fontBgColor': {
      const safeBgColor = opts.sanitize ? sanitizeCssValue(node.color) : node.color
      return '<span style="background-color:' + escapeAttr(safeBgColor) + '">' + renderInlineNodes(node.children, opts) + '</span>'
    }
    case 'ruby':
      return '<ruby>' + escapeHtml(node.base) + '<rp>(</rp><rt>' + escapeHtml(node.annotation) + '</rt><rp>)</rp></ruby>'
    case 'emoji':
      return node.value
    case 'audio': {
      const safeAudioUrl = opts.sanitize ? sanitizeUrl(node.url) : node.url
      let r = '<audio controls preload="metadata" src="' + escapeAttr(safeAudioUrl) + '"'
      if (node.title) r += ' title="' + escapeAttr(node.title) + '"'
      const audioAlt = node.title || 'Audio'
      return r + '>' + escapeHtml(audioAlt) + '</audio>'
    }
    case 'video': {
      const safeVideoUrl = opts.sanitize ? sanitizeUrl(node.url) : node.url
      let r = '<video controls preload="metadata" src="' + escapeAttr(safeVideoUrl) + '"'
      if (node.title) r += ' title="' + escapeAttr(node.title) + '"'
      const videoAlt = node.title || 'Video'
      return r + '>' + escapeHtml(videoAlt) + '</video>'
    }
    case 'autolink':
      return '<a href="' + escapeAttr(node.url) + '">' + escapeHtml(node.url.replace(/^mailto:/, '')) + '</a>'
    case 'underline':
      return '<span style="text-decoration:underline">' + renderInlineNodes(node.children, opts) + '</span>'
    default:
      return ''
  }
}

// ============================================================
// Utility Functions
// ============================================================

/** Sanitize a URL — block dangerous protocols */
function sanitizeUrl(url: string): string {
  const trimmed = url.trim().toLowerCase()
  if (
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('vbscript:') ||
    (trimmed.startsWith('data:') && !trimmed.startsWith('data:image/'))
  ) {
    return ''
  }
  return url
}

/** Percent-encode non-ASCII and special chars in URLs (CommonMark spec) */
function encodeUrl(url: string): string {
  // Encode chars that are not in the URL-safe set
  // But preserve already-encoded %XX sequences and common URL chars
  try {
    // encodeURI handles most cases but doesn't encode some chars CommonMark needs
    return url.replace(/[^\x21-\x7E]/g, (ch) => {
      try {
        return encodeURIComponent(ch)
      } catch {
        return ch
      }
    })
  } catch {
    return url
  }
}

/** Sanitize a CSS value — strip anything that looks like script injection */
function sanitizeCssValue(value: string): string {
  return value
    .replace(/expression\s*\(/gi, '')
    .replace(/url\s*\(/gi, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/;[^}]*$/g, '')
}

function getPlainText(nodes: InlineNode[]): string {
  let out = ''
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]!
    if (node.type === 'text') out += node.value
    else if (node.type === 'inlineCode') out += node.value
    else if ('children' in node) out += getPlainText(node.children)
  }
  return out
}

// ============================================================
// DOM Renderer — creates real DOM nodes, skips innerHTML parse
// ============================================================

/**
 * Render a Document AST directly to DOM nodes.
 * Faster than renderToHtml + innerHTML for incremental updates.
 */
export function renderToDOM(doc: Document, options?: RendererOptions): DocumentFragment {
  const opts: Required<RendererOptions> = {
    sanitize: true,
    highlight: escapeHtml,
    headingId: null,
    baseUrl: '',
    inlineParser: null,
    ...options,
  }
  const frag = document.createDocumentFragment()
  for (let i = 0; i < doc.children.length; i++) {
    const el = renderBlockToDOM(doc.children[i]!, opts)
    if (el) frag.appendChild(el)
  }
  return frag
}

function renderBlockToDOM(node: BlockNode, opts: Required<RendererOptions>): Node | null {
  switch (node.type) {
    case 'heading': {
      const el = document.createElement('h' + node.depth)
      const children = resolveInline(node, opts)
      appendInlineToDOM(el, children, opts)
      if (opts.headingId) {
        const text = getPlainText(children)
        const id = opts.headingId(text, node.depth)
        if (id) el.setAttribute('id', id)
      }
      return el
    }
    case 'paragraph': {
      const el = document.createElement('p')
      appendInlineToDOM(el, resolveInline(node, opts), opts)
      return el
    }
    case 'blockquote': {
      const el = document.createElement('blockquote')
      appendBlocksToDOM(el, node.children, opts)
      return el
    }
    case 'list': {
      const el = document.createElement(node.ordered ? 'ol' : 'ul')
      if (node.ordered && node.start !== undefined && node.start !== 1) {
        el.setAttribute('start', String(node.start))
      }
      for (let i = 0; i < node.children.length; i++) {
        const li = renderListItemToDOM(node.children[i]!, opts, node.spread)
        if (li) el.appendChild(li)
      }
      return el
    }
    case 'codeBlock': {
      const pre = document.createElement('pre')
      const code = document.createElement('code')
      if (node.lang) code.className = 'language-' + node.lang
      let content = node.value
      if (content.length > 0 && content.charCodeAt(content.length - 1) !== 10) {
        content += '\n'
      }
      code.innerHTML = opts.highlight(content, node.lang)
      pre.appendChild(code)
      return pre
    }
    case 'thematicBreak':
      return document.createElement('hr')
    case 'htmlBlock': {
      if (opts.sanitize) {
        const span = document.createElement('span')
        span.textContent = node.value
        return span
      }
      const tmpl = document.createElement('template')
      tmpl.innerHTML = node.value
      return tmpl.content
    }
    case 'table':
      return renderTableToDOM(node, opts)
    case 'mathBlock': {
      const div = document.createElement('div')
      div.className = 'math-block'
      div.textContent = node.value
      return div
    }
    case 'container': {
      const div = document.createElement('div')
      div.className = 'container container-' + node.kind
      if (node.title) {
        const p = document.createElement('p')
        p.className = 'container-title'
        p.textContent = node.title
        div.appendChild(p)
      }
      appendBlocksToDOM(div, node.children, opts)
      return div
    }
    case 'details': {
      const details = document.createElement('details')
      const summary = document.createElement('summary')
      summary.textContent = node.summary
      details.appendChild(summary)
      appendBlocksToDOM(details, node.children, opts)
      return details
    }
    case 'toc': {
      const nav = document.createElement('nav')
      nav.className = 'toc'
      nav.setAttribute('data-toc', '')
      return nav
    }
    case 'footnoteDefinition': {
      const div = document.createElement('div')
      div.className = 'footnote'
      div.id = 'fn-' + node.identifier
      const sup = document.createElement('sup')
      sup.textContent = node.label
      div.appendChild(sup)
      appendBlocksToDOM(div, node.children, opts)
      return div
    }
    default:
      return null
  }
}

function renderListItemToDOM(node: ListItem, opts: Required<RendererOptions>, loose: boolean): HTMLElement {
  const li = document.createElement('li')
  if (node.checked !== undefined) {
    li.className = 'task-list-item'
    const cb = document.createElement('input')
    cb.type = 'checkbox'
    cb.disabled = true
    if (node.checked) cb.checked = true
    li.appendChild(cb)
    li.appendChild(document.createTextNode(' '))
  }

  if (!loose && node.children.length === 1 && node.children[0]!.type === 'paragraph') {
    appendInlineToDOM(li, resolveInline(node.children[0] as Paragraph, opts), opts)
  } else if (!loose && node.children.every(c => c.type === 'paragraph')) {
    for (let i = 0; i < node.children.length; i++) {
      if (i > 0) li.appendChild(document.createTextNode('\n'))
      appendInlineToDOM(li, resolveInline(node.children[i] as Paragraph, opts), opts)
    }
  } else {
    appendBlocksToDOM(li, node.children, opts)
  }
  return li
}

function renderTableToDOM(node: Table, opts: Required<RendererOptions>): HTMLElement {
  const table = document.createElement('table')
  let thead: HTMLElement | null = null
  let tbody: HTMLElement | null = null

  for (let i = 0; i < node.children.length; i++) {
    const row = node.children[i]!
    const tr = document.createElement('tr')

    for (let j = 0; j < row.children.length; j++) {
      const cell = row.children[j]!
      const cellEl = document.createElement(row.isHeader ? 'th' : 'td')
      const align = node.align[j]
      if (align) cellEl.style.textAlign = align
      appendInlineToDOM(cellEl, resolveInline(cell, opts), opts)
      tr.appendChild(cellEl)
    }

    if (row.isHeader) {
      if (!thead) { thead = document.createElement('thead'); table.appendChild(thead) }
      thead.appendChild(tr)
    } else {
      if (!tbody) { tbody = document.createElement('tbody'); table.appendChild(tbody) }
      tbody.appendChild(tr)
    }
  }

  return table
}

function appendBlocksToDOM(parent: Node, blocks: BlockNode[], opts: Required<RendererOptions>): void {
  for (let i = 0; i < blocks.length; i++) {
    const el = renderBlockToDOM(blocks[i]!, opts)
    if (el) parent.appendChild(el)
  }
}

function appendInlineToDOM(parent: Node, nodes: InlineNode[], opts: Required<RendererOptions>): void {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]!
    const el = renderInlineToDOM(node, opts)
    if (el) parent.appendChild(el)
  }
}

function renderInlineToDOM(node: InlineNode, opts: Required<RendererOptions>): Node | null {
  switch (node.type) {
    case 'text':
      return document.createTextNode(node.value)
    case 'emphasis': {
      const em = document.createElement('em')
      appendInlineToDOM(em, node.children, opts)
      return em
    }
    case 'strong': {
      const strong = document.createElement('strong')
      appendInlineToDOM(strong, node.children, opts)
      return strong
    }
    case 'strikethrough': {
      const del = document.createElement('del')
      appendInlineToDOM(del, node.children, opts)
      return del
    }
    case 'inlineCode': {
      const code = document.createElement('code')
      code.textContent = node.value
      return code
    }
    case 'link': {
      const a = document.createElement('a')
      const safeUrl = opts.sanitize ? sanitizeUrl(node.url) : node.url
      a.href = encodeUrl(opts.baseUrl ? opts.baseUrl + safeUrl : safeUrl)
      if (node.title) a.title = node.title
      appendInlineToDOM(a, node.children, opts)
      return a
    }
    case 'image': {
      const img = document.createElement('img')
      const safeSrc = opts.sanitize ? sanitizeUrl(node.url) : node.url
      img.src = encodeUrl(opts.baseUrl ? opts.baseUrl + safeSrc : safeSrc)
      img.alt = node.alt
      if (node.title) img.title = node.title
      return img
    }
    case 'break':
      return document.createElement('br')
    case 'softBreak':
      return document.createTextNode('\n')
    case 'htmlInline': {
      if (opts.sanitize) return document.createTextNode(node.value)
      const span = document.createElement('span')
      span.innerHTML = node.value
      return span
    }
    case 'mathInline': {
      const span = document.createElement('span')
      span.className = 'math-inline'
      span.textContent = node.value
      return span
    }
    case 'highlight': {
      const mark = document.createElement('mark')
      appendInlineToDOM(mark, node.children, opts)
      return mark
    }
    case 'superscript': {
      const sup = document.createElement('sup')
      appendInlineToDOM(sup, node.children, opts)
      return sup
    }
    case 'subscript': {
      const sub = document.createElement('sub')
      appendInlineToDOM(sub, node.children, opts)
      return sub
    }
    case 'fontColor': {
      const span = document.createElement('span')
      span.style.color = opts.sanitize ? sanitizeCssValue(node.color) : node.color
      appendInlineToDOM(span, node.children, opts)
      return span
    }
    case 'fontSize': {
      const span = document.createElement('span')
      const size = /^\d+$/.test(node.size) ? node.size + 'px' : node.size
      span.style.fontSize = opts.sanitize ? sanitizeCssValue(size) : size
      appendInlineToDOM(span, node.children, opts)
      return span
    }
    case 'fontBgColor': {
      const span = document.createElement('span')
      span.style.backgroundColor = opts.sanitize ? sanitizeCssValue(node.color) : node.color
      appendInlineToDOM(span, node.children, opts)
      return span
    }
    case 'footnoteReference': {
      const sup = document.createElement('sup')
      const a = document.createElement('a')
      a.href = '#fn-' + node.identifier
      a.className = 'footnote-ref'
      a.textContent = node.label
      sup.appendChild(a)
      return sup
    }
    case 'autolink': {
      const a = document.createElement('a')
      a.href = node.isEmail ? 'mailto:' + node.url : node.url
      a.textContent = node.url
      return a
    }
    case 'emoji': {
      const span = document.createElement('span')
      span.className = 'emoji'
      span.textContent = node.value || ':' + node.shortcode + ':'
      return span
    }
    case 'ruby': {
      const ruby = document.createElement('ruby')
      ruby.appendChild(document.createTextNode(node.base))
      const rp1 = document.createElement('rp')
      rp1.textContent = '('
      ruby.appendChild(rp1)
      const rt = document.createElement('rt')
      rt.textContent = node.annotation
      ruby.appendChild(rt)
      const rp2 = document.createElement('rp')
      rp2.textContent = ')'
      ruby.appendChild(rp2)
      return ruby
    }
    case 'audio': {
      const audio = document.createElement('audio')
      audio.controls = true
      audio.preload = 'metadata'
      audio.src = node.url
      audio.textContent = node.title || 'Audio'
      return audio
    }
    case 'video': {
      const video = document.createElement('video')
      video.controls = true
      video.preload = 'metadata'
      video.src = node.url
      video.textContent = node.title || 'Video'
      return video
    }
    case 'underline': {
      const u = document.createElement('u')
      appendInlineToDOM(u, node.children, opts)
      return u
    }
    default:
      return null
  }
}
