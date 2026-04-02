# Complex Markdown Test Document

## Extended Syntax

### Strikethrough
~~This text is deleted.~~

### Highlight
==This text is highlighted.==

### Superscript and Subscript
H~2~O is water. E = mc^2^ is famous.

### Math

Inline math: $E = mc^2$

Block math:

$$
\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
$$

### Footnotes

This has a footnote[^1] and another[^note].

[^1]: First footnote content.

[^note]: A longer footnote with more detail.

### Custom Containers

::: info Information
This is an informational panel.
:::

::: warning Caution
Be careful with this operation.
:::

::: danger Critical Error
Something went very wrong!
:::

### Table of Contents

[[toc]]

### Font Styling

{color:red}Red colored text{/color}

{size:24px}Large text{/size}

{bgcolor:#ffff00}Yellow background text{/bgcolor}

### Ruby Annotation

{漢字}(かんじ) means "Chinese characters".

### Emoji Shortcodes

:smile: :heart: :rocket: :fire: :tada:

### Media

!audio[Background Music](https://example.com/music.mp3)

!video[Demo Video](https://example.com/demo.mp4)

## Complex Nesting

### List with Nested Content

- First item with **bold** text
  - Nested item with `code`
    - Deeply nested with [link](url)
- Second item
  > Blockquote inside list

### Blockquote with Nested Elements

> ## Heading in quote
>
> Paragraph in quote with **bold** and *italic*.
>
> - List item 1 in quote
> - List item 2 in quote
>
> ```python
> print("Code in quote")
> ```

### Table with Rich Content

| Feature | Syntax | Example |
|---------|--------|---------|
| **Bold** | `**text**` | **bold text** |
| *Italic* | `*text*` | *italic text* |
| ~~Strike~~ | `~~text~~` | ~~deleted~~ |
| `Code` | `` `code` `` | `inline code` |
| [Link](url) | `[text](url)` | [example](https://example.com) |
| ==Highlight== | `==text==` | ==marked== |

## Setext Headings

Heading Level 1
================

Heading Level 2
----------------

## Edge Cases

### Empty Elements

- 

> 

### Consecutive Different Blocks

# Heading
> Quote
- List
```
Code
```
---

### Special Characters

Backslash: \\

Asterisks: \*not italic\*

Brackets: \[not a link\]

Angle brackets: \<not html\>

### Autolinks

<https://example.com>

<user@example.com>

### HTML Inline

This is <strong>HTML bold</strong> and <em>HTML italic</em>.

### Long Paragraph

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
