/**
 * @pre-markdown/core - AST Builder
 *
 * Factory functions for creating AST nodes with auto-incrementing IDs.
 */

import type {
  Document,
  Heading,
  Paragraph,
  Blockquote,
  List,
  ListItem,
  CodeBlock,
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
  Text,
  Emphasis,
  Strong,
  Strikethrough,
  InlineCode,
  Link,
  Image,
  HtmlInline,
  Break,
  SoftBreak,
  FootnoteReference,
  MathInline,
  Highlight,
  Superscript,
  Subscript,
  FontColor,
  FontSize,
  FontBgColor,
  Ruby,
  Emoji,
  Audio,
  Video,
  Autolink,
  Underline,
  BlockNode,
  InlineNode,
  SourceLocation,
} from './types.js'

let _nextId = 1

/** Reset the ID counter (useful for testing) */
export function resetNodeIds(): void {
  _nextId = 1
}

/** Get next unique node ID */
function nextId(): number {
  return _nextId++
}

// ============================================================
// Node Pool: Flyweight pattern for frequently created leaf nodes
// Reuse Break and SoftBreak singletons (they have no varying state).
// For Text/InlineCode nodes, use monomorphic object shapes for V8 optimization.
// ============================================================

/** Shared Break instance (no unique state) */
const BREAK_SINGLETON: Break = Object.freeze({ type: 'break', id: 0 }) as Break

/** Shared SoftBreak instance (no unique state) */
const SOFT_BREAK_SINGLETON: SoftBreak = Object.freeze({ type: 'softBreak', id: 0 }) as SoftBreak

/** Shared ThematicBreak instance (no unique state) */
const THEMATIC_BREAK_SINGLETON: ThematicBreak = Object.freeze({ type: 'thematicBreak', id: 0 }) as ThematicBreak

// ============================================================
// Block-Level Builders
// ============================================================

export function createDocument(children: BlockNode[] = [], loc?: SourceLocation): Document {
  return { type: 'document', children, loc, id: nextId() }
}

export function createHeading(
  depth: 1 | 2 | 3 | 4 | 5 | 6,
  children: InlineNode[] = [],
  loc?: SourceLocation,
): Heading {
  return { type: 'heading', depth, children, loc, id: nextId() }
}

export function createParagraph(children: InlineNode[] = [], loc?: SourceLocation): Paragraph {
  return { type: 'paragraph', children, loc, id: nextId() }
}

export function createBlockquote(children: BlockNode[] = [], loc?: SourceLocation): Blockquote {
  return { type: 'blockquote', children, loc, id: nextId() }
}

export function createList(
  ordered: boolean,
  spread: boolean,
  children: ListItem[] = [],
  start?: number,
  loc?: SourceLocation,
): List {
  return { type: 'list', ordered, spread, children, start, loc, id: nextId() }
}

export function createListItem(
  children: BlockNode[] = [],
  spread = false,
  checked?: boolean,
  loc?: SourceLocation,
): ListItem {
  return { type: 'listItem', spread, checked, children, loc, id: nextId() }
}

export function createCodeBlock(
  value: string,
  lang?: string,
  meta?: string,
  loc?: SourceLocation,
): CodeBlock {
  return { type: 'codeBlock', value, lang, meta, loc, id: nextId() }
}

export function createThematicBreak(loc?: SourceLocation): ThematicBreak {
  if (!loc) return THEMATIC_BREAK_SINGLETON
  return { type: 'thematicBreak', loc, id: nextId() }
}

export function createHtmlBlock(value: string, loc?: SourceLocation): HtmlBlock {
  return { type: 'htmlBlock', value, loc, id: nextId() }
}

export function createTable(
  align: (TableAlign | null)[],
  children: TableRow[] = [],
  loc?: SourceLocation,
): Table {
  return { type: 'table', align, children, loc, id: nextId() }
}

export function createTableRow(
  isHeader: boolean,
  children: TableCell[] = [],
  loc?: SourceLocation,
): TableRow {
  return { type: 'tableRow', isHeader, children, loc, id: nextId() }
}

export function createTableCell(children: InlineNode[] = [], loc?: SourceLocation): TableCell {
  return { type: 'tableCell', children, loc, id: nextId() }
}

export function createFootnoteDefinition(
  identifier: string,
  label: string,
  children: BlockNode[] = [],
  loc?: SourceLocation,
): FootnoteDefinition {
  return { type: 'footnoteDefinition', identifier, label, children, loc, id: nextId() }
}

export function createMathBlock(value: string, loc?: SourceLocation): MathBlock {
  return { type: 'mathBlock', value, loc, id: nextId() }
}

export function createContainer(
  kind: string,
  children: BlockNode[] = [],
  title?: string,
  loc?: SourceLocation,
): Container {
  return { type: 'container', kind, title, children, loc, id: nextId() }
}

export function createDetails(
  summary: string,
  children: BlockNode[] = [],
  loc?: SourceLocation,
): Details {
  return { type: 'details', summary, children, loc, id: nextId() }
}

export function createTOC(loc?: SourceLocation): TOC {
  return { type: 'toc', loc, id: nextId() }
}

// ============================================================
// Inline-Level Builders
// ============================================================

export function createText(value: string, loc?: SourceLocation): Text {
  return { type: 'text', value, loc, id: nextId() }
}

export function createEmphasis(children: InlineNode[] = [], loc?: SourceLocation): Emphasis {
  return { type: 'emphasis', children, loc, id: nextId() }
}

export function createStrong(children: InlineNode[] = [], loc?: SourceLocation): Strong {
  return { type: 'strong', children, loc, id: nextId() }
}

export function createStrikethrough(
  children: InlineNode[] = [],
  loc?: SourceLocation,
): Strikethrough {
  return { type: 'strikethrough', children, loc, id: nextId() }
}

export function createInlineCode(value: string, loc?: SourceLocation): InlineCode {
  return { type: 'inlineCode', value, loc, id: nextId() }
}

export function createLink(
  url: string,
  children: InlineNode[] = [],
  title?: string,
  loc?: SourceLocation,
): Link {
  return { type: 'link', url, title, children, loc, id: nextId() }
}

export function createImage(
  url: string,
  alt: string,
  title?: string,
  loc?: SourceLocation,
): Image {
  return { type: 'image', url, alt, title, loc, id: nextId() }
}

export function createHtmlInline(value: string, loc?: SourceLocation): HtmlInline {
  return { type: 'htmlInline', value, loc, id: nextId() }
}

export function createBreak(loc?: SourceLocation): Break {
  if (!loc) return BREAK_SINGLETON
  return { type: 'break', loc, id: nextId() }
}

export function createSoftBreak(loc?: SourceLocation): SoftBreak {
  if (!loc) return SOFT_BREAK_SINGLETON
  return { type: 'softBreak', loc, id: nextId() }
}

export function createFootnoteReference(
  identifier: string,
  label: string,
  loc?: SourceLocation,
): FootnoteReference {
  return { type: 'footnoteReference', identifier, label, loc, id: nextId() }
}

export function createMathInline(value: string, loc?: SourceLocation): MathInline {
  return { type: 'mathInline', value, loc, id: nextId() }
}

export function createHighlight(children: InlineNode[] = [], loc?: SourceLocation): Highlight {
  return { type: 'highlight', children, loc, id: nextId() }
}

export function createSuperscript(children: InlineNode[] = [], loc?: SourceLocation): Superscript {
  return { type: 'superscript', children, loc, id: nextId() }
}

export function createSubscript(children: InlineNode[] = [], loc?: SourceLocation): Subscript {
  return { type: 'subscript', children, loc, id: nextId() }
}

export function createFontColor(
  color: string,
  children: InlineNode[] = [],
  loc?: SourceLocation,
): FontColor {
  return { type: 'fontColor', color, children, loc, id: nextId() }
}

export function createFontSize(
  size: string,
  children: InlineNode[] = [],
  loc?: SourceLocation,
): FontSize {
  return { type: 'fontSize', size, children, loc, id: nextId() }
}

export function createFontBgColor(
  color: string,
  children: InlineNode[] = [],
  loc?: SourceLocation,
): FontBgColor {
  return { type: 'fontBgColor', color, children, loc, id: nextId() }
}

export function createRuby(base: string, annotation: string, loc?: SourceLocation): Ruby {
  return { type: 'ruby', base, annotation, loc, id: nextId() }
}

export function createEmoji(shortcode: string, value: string, loc?: SourceLocation): Emoji {
  return { type: 'emoji', shortcode, value, loc, id: nextId() }
}

export function createAudio(url: string, title?: string, loc?: SourceLocation): Audio {
  return { type: 'audio', url, title, loc, id: nextId() }
}

export function createVideo(url: string, title?: string, loc?: SourceLocation): Video {
  return { type: 'video', url, title, loc, id: nextId() }
}

export function createAutolink(
  url: string,
  isEmail: boolean,
  loc?: SourceLocation,
): Autolink {
  return { type: 'autolink', url, isEmail, loc, id: nextId() }
}

export function createUnderline(children: InlineNode[] = [], loc?: SourceLocation): Underline {
  return { type: 'underline', children, loc, id: nextId() }
}
