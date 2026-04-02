/**
 * @pre-markdown/core
 *
 * Core module exports: AST types, builders, visitors, and event system.
 */

// AST Types
export type {
  // Base
  Position,
  SourceLocation,
  BaseNode,
  // Block-level
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
  // Inline-level
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
  // Union types
  BlockNode,
  InlineNode,
  ASTNode,
  NodeType,
} from './ast/types.js'

// AST Builders
export {
  resetNodeIds,
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
  createEmphasis,
  createStrong,
  createStrikethrough,
  createInlineCode,
  createLink,
  createImage,
  createHtmlInline,
  createBreak,
  createSoftBreak,
  createFootnoteReference,
  createMathInline,
  createHighlight,
  createSuperscript,
  createSubscript,
  createFontColor,
  createFontSize,
  createFontBgColor,
  createRuby,
  createEmoji,
  createAudio,
  createVideo,
  createAutolink,
} from './ast/builder.js'

// AST Visitor
export {
  walk,
  findAll,
  findFirst,
  isBlockNode,
  isInlineNode,
  getTextContent,
} from './ast/visitor.js'
export type { VisitorCallback } from './ast/visitor.js'

// Event System
export { EventBus } from './events/event-bus.js'
export type { EditorEvents } from './events/event-bus.js'
