/**
 * @pre-markdown/core - AST Type Definitions
 *
 * All Markdown AST node types following a unified schema.
 * Designed for incremental parsing and efficient diffing.
 */

// ============================================================
// Base Types
// ============================================================

/** Position in source text */
export interface Position {
  /** Line number (1-based) */
  readonly line: number
  /** Column number (1-based) */
  readonly column: number
  /** Absolute offset from start of text (0-based) */
  readonly offset: number
}

/** Source location span */
export interface SourceLocation {
  readonly start: Position
  readonly end: Position
}

/** Base interface for all AST nodes */
export interface BaseNode {
  /** Node type discriminator */
  readonly type: string
  /** Source location in the original text */
  loc?: SourceLocation
  /** Unique node ID for incremental updates */
  id?: number
}

// ============================================================
// Block-Level Nodes
// ============================================================

export interface Document extends BaseNode {
  readonly type: 'document'
  children: BlockNode[]
}

export interface Heading extends BaseNode {
  readonly type: 'heading'
  /** Heading level 1-6 */
  depth: 1 | 2 | 3 | 4 | 5 | 6
  children: InlineNode[]
}

export interface Paragraph extends BaseNode {
  readonly type: 'paragraph'
  children: InlineNode[]
}

export interface Blockquote extends BaseNode {
  readonly type: 'blockquote'
  children: BlockNode[]
}

export interface List extends BaseNode {
  readonly type: 'list'
  /** Ordered or unordered */
  ordered: boolean
  /** Starting number for ordered lists */
  start?: number
  /** Loose or tight list */
  spread: boolean
  children: ListItem[]
}

export interface ListItem extends BaseNode {
  readonly type: 'listItem'
  /** Task list checked state: true, false, or undefined (not a task) */
  checked?: boolean
  /** Loose or tight */
  spread: boolean
  children: BlockNode[]
}

export interface CodeBlock extends BaseNode {
  readonly type: 'codeBlock'
  /** Language identifier (from info string) */
  lang?: string
  /** Raw info string after the language */
  meta?: string
  /** Code content */
  value: string
}

export interface ThematicBreak extends BaseNode {
  readonly type: 'thematicBreak'
}

export interface HtmlBlock extends BaseNode {
  readonly type: 'htmlBlock'
  value: string
}

export interface Table extends BaseNode {
  readonly type: 'table'
  /** Column alignments */
  align: (TableAlign | null)[]
  children: TableRow[]
}

export type TableAlign = 'left' | 'center' | 'right'

export interface TableRow extends BaseNode {
  readonly type: 'tableRow'
  /** Whether this is the header row */
  isHeader: boolean
  children: TableCell[]
}

export interface TableCell extends BaseNode {
  readonly type: 'tableCell'
  children: InlineNode[]
}

export interface FootnoteDefinition extends BaseNode {
  readonly type: 'footnoteDefinition'
  identifier: string
  label: string
  children: BlockNode[]
}

export interface MathBlock extends BaseNode {
  readonly type: 'mathBlock'
  value: string
}

/** Custom container (e.g., ::: info) */
export interface Container extends BaseNode {
  readonly type: 'container'
  /** Container kind: info, warning, danger, etc. */
  kind: string
  /** Optional title */
  title?: string
  children: BlockNode[]
}

/** Details/summary collapsible */
export interface Details extends BaseNode {
  readonly type: 'details'
  summary: string
  children: BlockNode[]
}

/** Table of Contents placeholder */
export interface TOC extends BaseNode {
  readonly type: 'toc'
}

// ============================================================
// Inline-Level Nodes
// ============================================================

export interface Text extends BaseNode {
  readonly type: 'text'
  value: string
}

export interface Emphasis extends BaseNode {
  readonly type: 'emphasis'
  children: InlineNode[]
}

export interface Strong extends BaseNode {
  readonly type: 'strong'
  children: InlineNode[]
}

export interface Strikethrough extends BaseNode {
  readonly type: 'strikethrough'
  children: InlineNode[]
}

export interface InlineCode extends BaseNode {
  readonly type: 'inlineCode'
  value: string
}

export interface Link extends BaseNode {
  readonly type: 'link'
  url: string
  title?: string
  children: InlineNode[]
}

export interface Image extends BaseNode {
  readonly type: 'image'
  url: string
  title?: string
  alt: string
  /** Custom width */
  width?: number
  /** Custom height */
  height?: number
  /** Alignment */
  align?: 'left' | 'center' | 'right' | 'float-left' | 'float-right'
}

export interface HtmlInline extends BaseNode {
  readonly type: 'htmlInline'
  value: string
}

export interface Break extends BaseNode {
  readonly type: 'break'
}

export interface SoftBreak extends BaseNode {
  readonly type: 'softBreak'
}

export interface FootnoteReference extends BaseNode {
  readonly type: 'footnoteReference'
  identifier: string
  label: string
}

export interface MathInline extends BaseNode {
  readonly type: 'mathInline'
  value: string
}

export interface Highlight extends BaseNode {
  readonly type: 'highlight'
  children: InlineNode[]
}

export interface Superscript extends BaseNode {
  readonly type: 'superscript'
  children: InlineNode[]
}

export interface Subscript extends BaseNode {
  readonly type: 'subscript'
  children: InlineNode[]
}

export interface FontColor extends BaseNode {
  readonly type: 'fontColor'
  color: string
  children: InlineNode[]
}

export interface FontSize extends BaseNode {
  readonly type: 'fontSize'
  size: string
  children: InlineNode[]
}

export interface FontBgColor extends BaseNode {
  readonly type: 'fontBgColor'
  color: string
  children: InlineNode[]
}

export interface Ruby extends BaseNode {
  readonly type: 'ruby'
  /** Base text */
  base: string
  /** Annotation text (pinyin) */
  annotation: string
}

export interface Emoji extends BaseNode {
  readonly type: 'emoji'
  /** Emoji shortcode (e.g., 'smile') */
  shortcode: string
  /** Resolved unicode value */
  value: string
}

export interface Audio extends BaseNode {
  readonly type: 'audio'
  url: string
  title?: string
}

export interface Video extends BaseNode {
  readonly type: 'video'
  url: string
  title?: string
}

export interface Autolink extends BaseNode {
  readonly type: 'autolink'
  url: string
  /** Whether this is an email autolink */
  isEmail: boolean
}

export interface Underline extends BaseNode {
  readonly type: 'underline'
  children: InlineNode[]
}

// ============================================================
// Union Types
// ============================================================

/** All block-level node types */
export type BlockNode =
  | Heading
  | Paragraph
  | Blockquote
  | List
  | ListItem
  | CodeBlock
  | ThematicBreak
  | HtmlBlock
  | Table
  | TableRow
  | TableCell
  | FootnoteDefinition
  | MathBlock
  | Container
  | Details
  | TOC

/** All inline-level node types */
export type InlineNode =
  | Text
  | Emphasis
  | Strong
  | Strikethrough
  | InlineCode
  | Link
  | Image
  | HtmlInline
  | Break
  | SoftBreak
  | FootnoteReference
  | MathInline
  | Highlight
  | Superscript
  | Subscript
  | FontColor
  | FontSize
  | FontBgColor
  | Ruby
  | Emoji
  | Audio
  | Video
  | Autolink
  | Underline

/** Any AST node */
export type ASTNode = Document | BlockNode | InlineNode

/** Node type string literals */
export type NodeType = ASTNode['type']
