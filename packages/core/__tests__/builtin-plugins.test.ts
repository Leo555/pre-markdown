/**
 * Built-in Plugins Tests
 *
 * Tests KaTeX, Mermaid, and Highlight plugins via the PluginManager.
 */
import { describe, it, expect } from 'vitest'
import {
  PluginManager,
  createKatexPlugin,
  createMermaidPlugin,
  createHighlightPlugin,
  createDocument,
  createParagraph,
  createCodeBlock,
  createText,
} from '@pre-markdown/core'
import type { MathBlock, MathInline } from '@pre-markdown/core'
import { renderToHtml } from '@pre-markdown/renderer'

// ============================================================
// Mock KaTeX
// ============================================================

const mockKatex = {
  renderToString(tex: string, options?: { displayMode?: boolean }) {
    const mode = options?.displayMode ? 'display' : 'inline'
    return `<span class="katex-${mode}">${tex}</span>`
  },
}

// ============================================================
// KaTeX Plugin
// ============================================================

describe('KaTeX Plugin', () => {
  it('should render mathBlock nodes', () => {
    const plugin = createKatexPlugin(mockKatex)
    const pm = new PluginManager().use(plugin)

    const doc = createDocument([])
    // Manually build a document with mathBlock
    const mathBlock: MathBlock = {
      type: 'mathBlock',
      id: 1,
      value: 'E = mc^2',
    }
    doc.children.push(mathBlock as any)

    const html = renderToHtml(doc, { plugins: pm })
    expect(html).toContain('katex-display')
    expect(html).toContain('E = mc^2')
    expect(html).toContain('class="math-block"')
  })

  it('should render mathInline nodes', () => {
    const plugin = createKatexPlugin(mockKatex)
    const pm = new PluginManager().use(plugin)

    // Create a paragraph with inline math
    const mathInline: MathInline = {
      type: 'mathInline',
      id: 2,
      value: 'x^2',
    }
    const doc = createDocument([
      createParagraph([mathInline as any]),
    ])

    const html = renderToHtml(doc, { plugins: pm })
    expect(html).toContain('katex-inline')
    expect(html).toContain('x^2')
  })

  it('should handle KaTeX errors gracefully', () => {
    const errorKatex = {
      renderToString() {
        throw new Error('Parse error')
      },
    }
    const plugin = createKatexPlugin(errorKatex, { throwOnError: false })
    const pm = new PluginManager().use(plugin)

    const mathBlock: MathBlock = {
      type: 'mathBlock',
      id: 1,
      value: 'invalid \\',
    }
    const doc = createDocument([])
    doc.children.push(mathBlock as any)

    const html = renderToHtml(doc, { plugins: pm })
    expect(html).toContain('Parse error')
    expect(html).toContain('#cc0000')
  })

  it('should support custom classes', () => {
    const plugin = createKatexPlugin(mockKatex, {
      blockClass: 'my-math',
      inlineClass: 'my-inline-math',
    })
    const pm = new PluginManager().use(plugin)

    const mathBlock: MathBlock = { type: 'mathBlock', id: 1, value: 'x' }
    const doc = createDocument([])
    doc.children.push(mathBlock as any)

    const html = renderToHtml(doc, { plugins: pm })
    expect(html).toContain('class="my-math"')
  })
})

// ============================================================
// Mermaid Plugin
// ============================================================

describe('Mermaid Plugin', () => {
  it('should render mermaid code blocks as containers', () => {
    const plugin = createMermaidPlugin()
    const pm = new PluginManager().use(plugin)

    const doc = createDocument([
      createCodeBlock('graph TD\n  A --> B', 'mermaid'),
    ])

    const html = renderToHtml(doc, { plugins: pm })
    expect(html).toContain('class="mermaid"')
    expect(html).toContain('graph TD')
    expect(html).toContain('A --&gt; B') // HTML escaped
  })

  it('should not affect non-mermaid code blocks', () => {
    const plugin = createMermaidPlugin()
    const pm = new PluginManager().use(plugin)

    const doc = createDocument([
      createCodeBlock('const x = 1', 'javascript'),
    ])

    const html = renderToHtml(doc, { plugins: pm })
    expect(html).toContain('language-javascript')
    expect(html).not.toContain('class="mermaid"')
  })

  it('should support custom container class', () => {
    const plugin = createMermaidPlugin(null, { containerClass: 'diagram' })
    const pm = new PluginManager().use(plugin)

    const doc = createDocument([
      createCodeBlock('graph LR', 'mermaid'),
    ])

    const html = renderToHtml(doc, { plugins: pm })
    expect(html).toContain('class="diagram"')
  })
})

// ============================================================
// Highlight Plugin
// ============================================================

describe('Highlight Plugin', () => {
  const mockHighlight = (code: string, lang?: string) => {
    if (!lang) return code
    return `<span class="hljs-${lang}">${code}</span>`
  }

  it('should highlight code blocks', () => {
    const plugin = createHighlightPlugin(mockHighlight)
    const pm = new PluginManager().use(plugin)

    const doc = createDocument([
      createCodeBlock('const x = 1', 'javascript'),
    ])

    const html = renderToHtml(doc, { plugins: pm })
    expect(html).toContain('hljs-javascript')
    expect(html).toContain('language-javascript')
  })

  it('should handle code blocks without language', () => {
    const plugin = createHighlightPlugin(mockHighlight)
    const pm = new PluginManager().use(plugin)

    const doc = createDocument([
      createCodeBlock('plain text'),
    ])

    const html = renderToHtml(doc, { plugins: pm })
    expect(html).toContain('<pre><code>')
    expect(html).toContain('plain text')
  })

  it('should skip mermaid blocks', () => {
    const plugin = createHighlightPlugin(mockHighlight)
    const pm = new PluginManager().use(plugin)

    const doc = createDocument([
      createCodeBlock('graph TD', 'mermaid'),
    ])

    const html = renderToHtml(doc, { plugins: pm })
    // Should fall through to default rendering (no hljs class)
    expect(html).not.toContain('hljs-mermaid')
  })

  it('should skip specified languages', () => {
    const plugin = createHighlightPlugin(mockHighlight, {
      skipLanguages: ['math'],
    })
    const pm = new PluginManager().use(plugin)

    const doc = createDocument([
      createCodeBlock('E = mc^2', 'math'),
    ])

    const html = renderToHtml(doc, { plugins: pm })
    expect(html).not.toContain('hljs-math')
  })

  it('should add line numbers when enabled', () => {
    const plugin = createHighlightPlugin(mockHighlight, {
      lineNumbers: true,
    })
    const pm = new PluginManager().use(plugin)

    const doc = createDocument([
      createCodeBlock('line1\nline2\nline3', 'javascript'),
    ])

    const html = renderToHtml(doc, { plugins: pm })
    expect(html).toContain('data-line="1"')
    expect(html).toContain('data-line="2"')
  })

  it('should support wrapper class', () => {
    const plugin = createHighlightPlugin(mockHighlight, {
      wrapperClass: 'code-wrapper',
    })
    const pm = new PluginManager().use(plugin)

    const doc = createDocument([
      createCodeBlock('code', 'python'),
    ])

    const html = renderToHtml(doc, { plugins: pm })
    expect(html).toContain('class="code-wrapper"')
  })

  it('should handle highlight errors gracefully', () => {
    const errorHighlight = () => {
      throw new Error('Highlight error')
    }
    const plugin = createHighlightPlugin(errorHighlight)
    const pm = new PluginManager().use(plugin)

    const doc = createDocument([
      createCodeBlock('code', 'javascript'),
    ])

    // Should not throw — falls back to escaped HTML
    const html = renderToHtml(doc, { plugins: pm })
    expect(html).toContain('code')
  })
})

// ============================================================
// Plugin Composition
// ============================================================

describe('Plugin Composition', () => {
  it('should compose multiple plugins correctly', () => {
    const pm = new PluginManager()
      .use(createKatexPlugin(mockKatex))
      .use(createMermaidPlugin())
      .use(createHighlightPlugin((code, lang) => `<em>${code}</em>`))

    expect(pm.getPluginNames()).toEqual(['katex', 'mermaid', 'highlight'])

    // Math should use katex
    const mathBlock: MathBlock = { type: 'mathBlock', id: 1, value: 'x' }
    const doc = createDocument([
      createCodeBlock('graph TD', 'mermaid'),
      createCodeBlock('const x = 1', 'javascript'),
    ])
    doc.children.unshift(mathBlock as any)

    const html = renderToHtml(doc, { plugins: pm })

    // KaTeX rendering
    expect(html).toContain('katex-display')
    // Mermaid container
    expect(html).toContain('class="mermaid"')
    // Highlight for JS
    expect(html).toContain('<em>')
  })
})
