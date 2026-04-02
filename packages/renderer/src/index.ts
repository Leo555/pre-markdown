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
  /** Custom heading ID generator */
  headingId?: (text: string, depth: number) => string
  /** Base URL for relative links */
  baseUrl?: string
}

/**
 * Render a Document AST to an HTML string.
 */
export function renderToHtml(doc: Document, options?: RendererOptions): string {
  const opts: Required<RendererOptions> = {
    sanitize: true,
    highlight: (code: string) => escapeHtml(code),
    headingId: (text: string) => text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, ''),
    baseUrl: '',
    ...options,
  }

  return renderBlockNodes(doc.children, opts)
}

function renderBlockNodes(nodes: BlockNode[], opts: Required<RendererOptions>): string {
  return nodes.map((node) => renderBlockNode(node, opts)).join('\n')
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
      return '<hr />'
    case 'htmlBlock':
      return opts.sanitize ? escapeHtml(node.value) : node.value
    case 'table':
      return renderTable(node, opts)
    case 'tableRow':
      return renderTableRow(node, opts)
    case 'tableCell':
      return `<td>${renderInlineNodes(node.children, opts)}</td>`
    case 'mathBlock':
      return `<div class="math-block">${escapeHtml(node.value)}</div>`
    case 'container':
      return renderContainer(node, opts)
    case 'details':
      return renderDetails(node, opts)
    case 'toc':
      return '<nav class="toc" data-toc></nav>'
    case 'footnoteDefinition':
      return `<div class="footnote" id="fn-${escapeHtml(node.identifier)}"><sup>${escapeHtml(node.label)}</sup>${renderBlockNodes(node.children, opts)}</div>`
    default:
      return ''
  }
}

function renderHeading(node: Heading, opts: Required<RendererOptions>): string {
  const text = getPlainText(node.children)
  const id = opts.headingId(text, node.depth)
  return `<h${node.depth} id="${escapeAttr(id)}">${renderInlineNodes(node.children, opts)}</h${node.depth}>`
}

function renderParagraph(node: Paragraph, opts: Required<RendererOptions>): string {
  return `<p>${renderInlineNodes(node.children, opts)}</p>`
}

function renderBlockquote(node: Blockquote, opts: Required<RendererOptions>): string {
  return `<blockquote>\n${renderBlockNodes(node.children, opts)}\n</blockquote>`
}

function renderList(node: List, opts: Required<RendererOptions>): string {
  const tag = node.ordered ? 'ol' : 'ul'
  const startAttr = node.ordered && node.start !== undefined && node.start !== 1
    ? ` start="${node.start}"`
    : ''
  const items = node.children.map((item) => renderListItem(item, opts)).join('\n')
  return `<${tag}${startAttr}>\n${items}\n</${tag}>`
}

function renderListItem(node: ListItem, opts: Required<RendererOptions>): string {
  let content = renderBlockNodes(node.children, opts)

  if (node.checked !== undefined) {
    const checked = node.checked ? ' checked disabled' : ' disabled'
    content = `<input type="checkbox"${checked} /> ${content}`
    return `<li class="task-list-item">${content}</li>`
  }

  return `<li>${content}</li>`
}

function renderCodeBlock(node: CodeBlock, opts: Required<RendererOptions>): string {
  const highlighted = opts.highlight(node.value, node.lang)
  const langClass = node.lang ? ` class="language-${escapeAttr(node.lang)}"` : ''
  return `<pre><code${langClass}>${highlighted}</code></pre>`
}

function renderTable(node: Table, opts: Required<RendererOptions>): string {
  const rows = node.children.map((row, _i) => {
    const cellTag = row.isHeader ? 'th' : 'td'
    const cells = row.children
      .map((cell, j) => {
        const align = node.align[j]
        const alignAttr = align ? ` style="text-align:${align}"` : ''
        return `<${cellTag}${alignAttr}>${renderInlineNodes(cell.children, opts)}</${cellTag}>`
      })
      .join('')
    return `<tr>${cells}</tr>`
  })

  const headerRows = rows.filter((_, i) => node.children[i]?.isHeader)
  const bodyRows = rows.filter((_, i) => !node.children[i]?.isHeader)

  let html = '<table>'
  if (headerRows.length > 0) {
    html += `<thead>${headerRows.join('')}</thead>`
  }
  if (bodyRows.length > 0) {
    html += `<tbody>${bodyRows.join('')}</tbody>`
  }
  html += '</table>'
  return html
}

function renderTableRow(_node: TableRow, _opts: Required<RendererOptions>): string {
  // Handled in renderTable for proper thead/tbody grouping
  return ''
}

function renderContainer(node: Container, opts: Required<RendererOptions>): string {
  const title = node.title ? `<p class="container-title">${escapeHtml(node.title)}</p>` : ''
  return `<div class="container container-${escapeAttr(node.kind)}">${title}${renderBlockNodes(node.children, opts)}</div>`
}

function renderDetails(node: Details, opts: Required<RendererOptions>): string {
  return `<details><summary>${escapeHtml(node.summary)}</summary>${renderBlockNodes(node.children, opts)}</details>`
}

// ============================================================
// Inline Rendering
// ============================================================

function renderInlineNodes(nodes: InlineNode[], opts: Required<RendererOptions>): string {
  return nodes.map((node) => renderInlineNode(node, opts)).join('')
}

function renderInlineNode(node: InlineNode, opts: Required<RendererOptions>): string {
  switch (node.type) {
    case 'text':
      return escapeHtml(node.value)
    case 'emphasis':
      return `<em>${renderInlineNodes(node.children, opts)}</em>`
    case 'strong':
      return `<strong>${renderInlineNodes(node.children, opts)}</strong>`
    case 'strikethrough':
      return `<del>${renderInlineNodes(node.children, opts)}</del>`
    case 'inlineCode':
      return `<code>${escapeHtml(node.value)}</code>`
    case 'link':
      return `<a href="${escapeAttr(node.url)}"${node.title ? ` title="${escapeAttr(node.title)}"` : ''}>${renderInlineNodes(node.children, opts)}</a>`
    case 'image':
      return `<img src="${escapeAttr(node.url)}" alt="${escapeAttr(node.alt)}"${node.title ? ` title="${escapeAttr(node.title)}"` : ''}${node.width ? ` width="${node.width}"` : ''}${node.height ? ` height="${node.height}"` : ''} />`
    case 'htmlInline':
      return opts.sanitize ? escapeHtml(node.value) : node.value
    case 'break':
      return '<br />\n'
    case 'softBreak':
      return '\n'
    case 'footnoteReference':
      return `<sup class="footnote-ref"><a href="#fn-${escapeAttr(node.identifier)}">[${escapeHtml(node.label)}]</a></sup>`
    case 'mathInline':
      return `<span class="math-inline">${escapeHtml(node.value)}</span>`
    case 'highlight':
      return `<mark>${renderInlineNodes(node.children, opts)}</mark>`
    case 'superscript':
      return `<sup>${renderInlineNodes(node.children, opts)}</sup>`
    case 'subscript':
      return `<sub>${renderInlineNodes(node.children, opts)}</sub>`
    case 'fontColor':
      return `<span style="color:${escapeAttr(node.color)}">${renderInlineNodes(node.children, opts)}</span>`
    case 'fontSize':
      return `<span style="font-size:${escapeAttr(node.size)}">${renderInlineNodes(node.children, opts)}</span>`
    case 'fontBgColor':
      return `<span style="background-color:${escapeAttr(node.color)}">${renderInlineNodes(node.children, opts)}</span>`
    case 'ruby':
      return `<ruby>${escapeHtml(node.base)}<rp>(</rp><rt>${escapeHtml(node.annotation)}</rt><rp>)</rp></ruby>`
    case 'emoji':
      return node.value
    case 'audio':
      return `<audio controls src="${escapeAttr(node.url)}"${node.title ? ` title="${escapeAttr(node.title)}"` : ''}></audio>`
    case 'video':
      return `<video controls src="${escapeAttr(node.url)}"${node.title ? ` title="${escapeAttr(node.title)}"` : ''}></video>`
    case 'autolink':
      return `<a href="${escapeAttr(node.url)}">${escapeHtml(node.url.replace(/^mailto:/, ''))}</a>`
    default:
      return ''
  }
}

// ============================================================
// Utility Functions
// ============================================================

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escapeAttr(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function getPlainText(nodes: InlineNode[]): string {
  return nodes
    .map((node) => {
      if (node.type === 'text') return node.value
      if (node.type === 'inlineCode') return node.value
      if ('children' in node) return getPlainText(node.children)
      return ''
    })
    .join('')
}
