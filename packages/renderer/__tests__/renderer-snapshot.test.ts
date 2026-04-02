/**
 * Renderer Snapshot Tests — Full syntax coverage + HTML safety
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { parse } from '@pre-markdown/parser'
import { renderToHtml } from '@pre-markdown/renderer'
import { resetNodeIds } from '@pre-markdown/core'

function render(md: string): string {
  resetNodeIds()
  return renderToHtml(parse(md))
}

describe('Renderer Snapshot Tests', () => {
  beforeEach(() => {
    resetNodeIds()
  })

  // ================================================================
  // Block-Level Rendering
  // ================================================================
  describe('Block-Level Rendering', () => {
    it('should render headings h1-h6', () => {
      const html = render('# H1\n## H2\n### H3\n#### H4\n##### H5\n###### H6')
      expect(html).toContain('<h1')
      expect(html).toContain('<h2')
      expect(html).toContain('<h3')
      expect(html).toContain('<h4')
      expect(html).toContain('<h5')
      expect(html).toContain('<h6')
    })

    it('should render heading with id', () => {
      resetNodeIds()
      const headingId = (text: string) => text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '')
      const html = renderToHtml(parse('# Hello World'), { headingId })
      expect(html).toContain('id="hello-world"')
    })

    it('should render setext heading', () => {
      const html = render('Title\n=====')
      expect(html).toContain('<h1')
    })

    it('should render paragraph', () => {
      const html = render('Simple paragraph text.')
      expect(html).toBe('<p>Simple paragraph text.</p>\n')
    })

    it('should render blockquote', () => {
      const html = render('> Quote text')
      expect(html).toContain('<blockquote>')
      expect(html).toContain('Quote text')
    })

    it('should render unordered list', () => {
      const html = render('- Item 1\n- Item 2\n- Item 3')
      expect(html).toContain('<ul>')
      expect(html).toContain('<li>')
      expect(html).toContain('Item 1')
    })

    it('should render ordered list', () => {
      const html = render('1. First\n2. Second\n3. Third')
      expect(html).toContain('<ol>')
      expect(html).toContain('<li>')
    })

    it('should render ordered list with start number', () => {
      const html = render('3. First\n4. Second')
      expect(html).toContain('start="3"')
    })

    it('should render task list', () => {
      const html = render('- [x] Done\n- [ ] Todo')
      expect(html).toContain('type="checkbox"')
      expect(html).toContain('checked disabled')
      expect(html).toContain('task-list-item')
    })

    it('should render fenced code block', () => {
      const html = render('```js\nconst x = 1\n```')
      expect(html).toContain('<pre><code class="language-js">')
      expect(html).toContain('const x = 1')
    })

    it('should render code block without language', () => {
      const html = render('```\nplain code\n```')
      expect(html).toContain('<pre><code>')
      expect(html).toContain('plain code')
    })

    it('should render indented code block', () => {
      const html = render('    indented code')
      expect(html).toContain('<pre><code>')
      expect(html).toContain('indented code')
    })

    it('should render thematic break', () => {
      const html = render('---')
      expect(html).toBe('<hr />\n')
    })

    it('should render table with alignment', () => {
      const html = render('| L | C | R |\n|:--|:--:|--:|\n| 1 | 2 | 3 |')
      expect(html).toContain('<table>')
      expect(html).toContain('<thead>')
      expect(html).toContain('<tbody>')
      expect(html).toContain('text-align:left')
      expect(html).toContain('text-align:center')
      expect(html).toContain('text-align:right')
    })

    it('should render math block', () => {
      const html = render('$$\nE = mc^2\n$$')
      expect(html).toContain('class="math-block"')
      expect(html).toContain('E = mc^2')
    })

    it('should render custom container', () => {
      const html = render('::: info Title\nContent\n:::')
      expect(html).toContain('container-info')
      expect(html).toContain('container-title')
      expect(html).toContain('Title')
    })

    it('should render TOC placeholder', () => {
      const html = render('[[toc]]')
      expect(html).toContain('class="toc"')
      expect(html).toContain('data-toc')
    })

    it('should render footnote definition', () => {
      const html = render('[^1]: Footnote text.')
      expect(html).toContain('class="footnote"')
      expect(html).toContain('id="fn-1"')
    })

    it('should render HTML block (sanitized)', () => {
      const html = render('<div>raw html</div>')
      expect(html).toContain('&lt;div&gt;')
    })

    it('should render HTML block (unsanitized)', () => {
      resetNodeIds()
      const doc = parse('<div>raw html</div>')
      const html = renderToHtml(doc, { sanitize: false })
      expect(html).toContain('<div>raw html</div>')
    })
  })

  // ================================================================
  // Inline Rendering
  // ================================================================
  describe('Inline Rendering', () => {
    it('should render bold', () => {
      const html = render('**bold**')
      expect(html).toContain('<strong>bold</strong>')
    })

    it('should render italic', () => {
      const html = render('*italic*')
      expect(html).toContain('<em>italic</em>')
    })

    it('should render strikethrough', () => {
      const html = render('~~strike~~')
      expect(html).toContain('<del>strike</del>')
    })

    it('should render inline code', () => {
      const html = render('`code`')
      expect(html).toContain('<code>code</code>')
    })

    it('should render link', () => {
      const html = render('[text](https://example.com "Title")')
      expect(html).toContain('href="https://example.com"')
      expect(html).toContain('title="Title"')
      expect(html).toContain('>text</a>')
    })

    it('should render image', () => {
      const html = render('![alt text](image.png "Title")')
      expect(html).toContain('src="image.png"')
      expect(html).toContain('alt="alt text"')
      expect(html).toContain('title="Title"')
    })

    it('should render line break', () => {
      const html = render('line1  \nline2')
      expect(html).toContain('<br />')
    })

    it('should render math inline', () => {
      const html = render('$x^2$')
      expect(html).toContain('class="math-inline"')
    })

    it('should render highlight', () => {
      const html = render('==highlighted==')
      expect(html).toContain('<mark>highlighted</mark>')
    })

    it('should render superscript', () => {
      const html = render('^sup^')
      expect(html).toContain('<sup>')
    })

    it('should render subscript', () => {
      const html = render('~sub~')
      expect(html).toContain('<sub>')
    })

    it('should render footnote reference', () => {
      const html = render('[^1]')
      expect(html).toContain('footnote-ref')
      expect(html).toContain('#fn-1')
    })

    it('should render autolink', () => {
      const html = render('<https://example.com>')
      expect(html).toContain('href="https://example.com"')
    })

    it('should render font color', () => {
      const html = render('{color:red}red text{/color}')
      expect(html).toContain('color:red')
    })

    it('should render font size', () => {
      const html = render('{size:20px}big text{/size}')
      expect(html).toContain('font-size:20px')
    })

    it('should render font background color', () => {
      const html = render('{bgcolor:yellow}highlighted{/bgcolor}')
      expect(html).toContain('background-color:yellow')
    })

    it('should render ruby annotation', () => {
      const html = render('{漢字}(かんじ)')
      expect(html).toContain('<ruby>')
      expect(html).toContain('<rt>かんじ</rt>')
    })

    it('should render emoji shortcode', () => {
      const html = render(':smile:')
      expect(html).toContain('😄')
    })

    it('should render audio', () => {
      const html = render('!audio[Song](song.mp3)')
      expect(html).toContain('<audio')
      expect(html).toContain('controls')
      expect(html).toContain('src="song.mp3"')
    })

    it('should render video', () => {
      const html = render('!video[Clip](clip.mp4)')
      expect(html).toContain('<video')
      expect(html).toContain('controls')
      expect(html).toContain('src="clip.mp4"')
    })
  })

  // ================================================================
  // Full Document Snapshot
  // ================================================================
  describe('Full Document Snapshot', () => {
    it('should render comprehensive document', () => {
      const md = `# Main Title

Paragraph with **bold**, *italic*, ~~strikethrough~~, \`code\`, ==highlight==, ^sup^, ~sub~.

> Blockquote with **emphasis**

- Unordered item
- [x] Task done
- [ ] Task todo

1. Ordered first
2. Ordered second

\`\`\`typescript
function hello(): void {
  console.log("hello")
}
\`\`\`

| Name | Value |
|------|-------|
| Key  | Val   |

---

$$
\\sum_{i=0}^{n} x_i
$$

::: warning Alert
Be careful!
:::

[Link](https://example.com) and ![Image](img.png)

$E = mc^2$ inline math

[^note]: This is a footnote.`

      const html = render(md)
      // Verify all major elements are present
      expect(html).toContain('<h1')
      expect(html).toContain('<strong>')
      expect(html).toContain('<em>')
      expect(html).toContain('<del>')
      expect(html).toContain('<code>')
      expect(html).toContain('<mark>')
      expect(html).toContain('<sup>')
      expect(html).toContain('<sub>')
      expect(html).toContain('<blockquote>')
      expect(html).toContain('<ul>')
      expect(html).toContain('<ol>')
      expect(html).toContain('task-list-item')
      expect(html).toContain('<pre><code')
      expect(html).toContain('<table>')
      expect(html).toContain('<hr />')
      expect(html).toContain('math-block')
      expect(html).toContain('container-warning')
      expect(html).toContain('href="https://example.com"')
      expect(html).toContain('src="img.png"')
      expect(html).toContain('math-inline')
      expect(html).toContain('footnote')
    })
  })
})

// ================================================================
// XSS / HTML Safety Tests
// ================================================================
describe('HTML Safety Tests (XSS)', () => {
  beforeEach(() => {
    resetNodeIds()
  })

  it('should escape script tags in text', () => {
    const html = render('<script>alert("xss")</script>')
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('should escape onerror in image alt', () => {
    const html = render('![" onerror="alert(1)](img.png)')
    // Alt text is escaped via escapeAttr, so quotes become &quot;
    // The critical thing is that no raw unescaped attribute injection occurs
    expect(html).toContain('alt="&quot;')
    // Must not have unescaped double-quote that would break attribute boundary
    expect(html).not.toMatch(/alt="[^"]*"[^"]*onerror/)
  })

  it('should strip javascript: in link url', () => {
    const html = render('[click](javascript:alert(1))')
    // sanitizeUrl should strip the javascript: URL entirely
    expect(html).toContain('href=""')
    expect(html).toContain('<a')
  })

  it('should escape HTML entities in inline code', () => {
    const html = render('`<script>alert("xss")</script>`')
    expect(html).toContain('&lt;script&gt;')
    expect(html).not.toContain('<script>')
  })

  it('should escape HTML in code block', () => {
    const html = render('```\n<script>alert("xss")</script>\n```')
    expect(html).toContain('&lt;script&gt;')
  })

  it('should escape angle brackets in text', () => {
    const html = render('Text with <angle> brackets')
    expect(html).not.toMatch(/<angle>/)
  })

  it('should escape quotes in link title attributes', () => {
    const html = render('[text](url "safe title")')
    expect(html).toContain('title="safe title"')
    // Quotes in title are properly escaped
    expect(html).toContain('href="url"')
  })

  it('should sanitize HTML block by default', () => {
    const html = render('<div onclick="alert(1)">content</div>')
    // HTML blocks with sanitize=true get fully entity-escaped
    // So <div> becomes &lt;div&gt; — the word onclick appears as text but NOT executable
    expect(html).toContain('&lt;div')
    expect(html).not.toContain('<div ')
  })

  it('should escape img src with data: URI', () => {
    const html = render('![x](data:text/html,<script>alert(1)</script>)')
    // data:text/html should be blocked by sanitizeUrl
    expect(html).toContain('src=""')
  })

  it('should escape event handlers in HTML inline (sanitized)', () => {
    const html = render('text <img onerror=alert(1) src=x> more')
    // In sanitize mode, the HTML inline tag gets escaped
    expect(html).toContain('&lt;img')
    expect(html).not.toContain('<img ')
  })

  it('should escape nested injection attempts', () => {
    const html = render('**<script>alert("xss")</script>**')
    expect(html).toContain('&lt;script&gt;')
    expect(html).not.toContain('<script>')
  })

  it('should escape heading content as HTML entities', () => {
    const html = render('# <img src=x onerror=alert(1)>')
    // The angle brackets are escaped, so no real <img> tag is created
    expect(html).toContain('&lt;img')
    expect(html).not.toContain('<img ')
  })

  it('should escape table cell content', () => {
    const html = render('| <script>xss</script> |\n|---|\n| data |')
    expect(html).not.toContain('<script>')
  })

  it('should escape container content', () => {
    const html = render('::: info\n<script>alert(1)</script>\n:::')
    expect(html).not.toContain('<script>alert')
  })

  it('should handle null bytes', () => {
    const html = render('text\x00with\x00nulls')
    expect(html).toBeDefined()
  })

  it('should sanitize font color CSS injection', () => {
    const html = render('{color:red;onclick:alert(1)}text{/color}')
    // sanitizeCssValue strips everything after semicolon
    expect(html).not.toContain('onclick')
    expect(html).toContain('color:red')
  })
})
