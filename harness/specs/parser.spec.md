# Parser Spec — Block-Level Rules

## Overview
The block-level parser processes Markdown input line-by-line, identifying block structures and building the document AST tree.

## Parsing Algorithm

### Phase 1: Line Classification
Each line is classified as one of:
- **Blank line**: Only whitespace
- **ATX heading**: Starts with 1-6 `#` characters
- **Setext heading underline**: All `=` or `-`
- **Thematic break**: 3+ `*`, `-`, or `_` with optional spaces
- **Fenced code opening/closing**: 3+ backticks or tildes
- **Blockquote marker**: Starts with `>`
- **List item marker**: Starts with `- `, `* `, `+ `, or `1. `
- **Indented code**: 4+ leading spaces or tab
- **HTML block start**: Starts with `<tag>`
- **Table delimiter**: Contains `|` with `-` and optional `:`
- **Container opening/closing**: Starts with `:::`
- **Paragraph continuation**: Anything else

### Phase 2: Block Construction
Blocks are constructed following CommonMark's block continuation algorithm. Key rules:
1. Leaf blocks (paragraphs, headings, code, thematic breaks) cannot contain other blocks
2. Container blocks (blockquotes, lists) can contain other blocks
3. Lazy continuation: paragraph content can continue without a blockquote marker

### Incremental Update Protocol
When text changes:
1. Identify the changed line range
2. Re-parse only affected blocks
3. Merge results into existing AST
4. Emit change events

## Performance Constraints
- Full parse of 10K lines: < 50ms
- Incremental single-line change: < 1ms
- Memory per 10K lines: < 5MB AST nodes

## Verification
- CommonMark spec test suite: 652 cases
- GFM extensions test suite: ~200 cases
- Edge cases: deeply nested, malformed input, unicode
