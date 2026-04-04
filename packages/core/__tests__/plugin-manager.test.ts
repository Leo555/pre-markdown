/**
 * Plugin System Tests
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  PluginManager,
  createText,
  createLink,
  createCodeBlock,
  createParagraph,
  createDocument,
} from '@pre-markdown/core'
import type { Plugin, BlockParseContext, InlineParseContext, RenderContext } from '@pre-markdown/core'

describe('PluginManager', () => {
  let pm: PluginManager

  beforeEach(() => {
    pm = new PluginManager()
  })

  describe('registration', () => {
    it('should register a plugin', () => {
      const plugin: Plugin = { name: 'test' }
      pm.use(plugin)
      expect(pm.has('test')).toBe(true)
      expect(pm.getPluginNames()).toEqual(['test'])
    })

    it('should register multiple plugins', () => {
      pm.use({ name: 'a' }, { name: 'b' }, { name: 'c' })
      expect(pm.getPluginNames()).toEqual(['a', 'b', 'c'])
    })

    it('should skip duplicate plugin names', () => {
      pm.use({ name: 'test' })
      pm.use({ name: 'test' })
      expect(pm.getPluginNames()).toEqual(['test'])
    })

    it('should remove a plugin by name', () => {
      pm.use({ name: 'a' }, { name: 'b' })
      pm.remove('a')
      expect(pm.has('a')).toBe(false)
      expect(pm.has('b')).toBe(true)
    })

    it('should support chaining', () => {
      const result = pm.use({ name: 'a' }).use({ name: 'b' })
      expect(result).toBe(pm)
    })
  })

  describe('render hooks', () => {
    it('should call render hook for matching node type', () => {
      const plugin: Plugin = {
        name: 'custom-code',
        render: {
          codeBlock: ({ node }) => {
            const cb = node as any
            return `<pre class="highlight"><code class="lang-${cb.lang || ''}">${cb.value}</code></pre>`
          },
        },
      }
      pm.use(plugin)
      expect(pm.hasRenderHook('codeBlock')).toBe(true)

      const result = pm.tryRender({
        node: createCodeBlock('const x = 1', 'javascript'),
        defaultHtml: '<pre><code>const x = 1</code></pre>',
        renderChildren: () => '',
      })
      expect(result).toContain('class="highlight"')
      expect(result).toContain('lang-javascript')
    })

    it('should return undefined when no hook matches', () => {
      const result = pm.tryRender({
        node: createText('hello'),
        defaultHtml: 'hello',
        renderChildren: () => '',
      })
      expect(result).toBeUndefined()
    })

    it('should execute hooks in registration order', () => {
      const calls: string[] = []
      pm.use({
        name: 'first',
        render: {
          codeBlock: () => {
            calls.push('first')
            return undefined // pass through
          },
        },
      })
      pm.use({
        name: 'second',
        render: {
          codeBlock: () => {
            calls.push('second')
            return '<custom />'
          },
        },
      })

      const result = pm.tryRender({
        node: createCodeBlock('x', 'js'),
        defaultHtml: '<pre><code>x</code></pre>',
        renderChildren: () => '',
      })
      expect(calls).toEqual(['first', 'second'])
      expect(result).toBe('<custom />')
    })
  })

  describe('inline parse hooks', () => {
    it('should trigger on matching character code', () => {
      const plugin: Plugin = {
        name: 'mention',
        inlineParse: {
          64: (ctx) => { // @ char
            const rest = ctx.input.slice(ctx.pos)
            const match = rest.match(/^@(\w+)/)
            if (!match) return null
            return {
              node: createLink('/' + match[1], [createText('@' + match[1])]),
              end: ctx.pos + match[0].length,
            }
          },
        },
      }
      pm.use(plugin)
      expect(pm.hasInlineHook(64)).toBe(true)

      const result = pm.tryInlineParse({
        input: 'hello @user world',
        pos: 6,
        charCode: 64,
      })
      expect(result).not.toBeNull()
      expect(result!.node.type).toBe('link')
      expect(result!.end).toBe(11)
    })

    it('should return null when no hook matches', () => {
      const result = pm.tryInlineParse({
        input: 'hello',
        pos: 0,
        charCode: 104, // h
      })
      expect(result).toBeNull()
    })
  })

  describe('block parse hooks', () => {
    it('should consume lines for custom block syntax', () => {
      const plugin: Plugin = {
        name: 'chart',
        blockParse: (ctx) => {
          if (!ctx.line.startsWith(':::chart')) return 0
          let end = 1
          while (end < ctx.lines.length && !ctx.lines[end]!.startsWith(':::')) end++
          return end + 1 // include closing :::
        },
      }
      pm.use(plugin)
      expect(pm.hasBlockHooks()).toBe(true)

      const consumed = pm.tryBlockParse({
        line: ':::chart',
        lineIndex: 0,
        lines: [':::chart', 'data: [1,2,3]', ':::', 'next paragraph'],
        addNode: () => {},
      })
      expect(consumed).toBe(3)
    })

    it('should return 0 when no hook matches', () => {
      pm.use({
        name: 'noop',
        blockParse: () => 0,
      })
      const consumed = pm.tryBlockParse({
        line: 'regular paragraph',
        lineIndex: 0,
        lines: ['regular paragraph'],
        addNode: () => {},
      })
      expect(consumed).toBe(0)
    })
  })

  describe('transform hooks', () => {
    it('should transform the AST after parsing', () => {
      const plugin: Plugin = {
        name: 'auto-heading-id',
        transform: (doc) => {
          // Just a simple test — add an id to headings
          for (const child of doc.children) {
            if (child.type === 'heading') {
              ;(child as any).data = { id: 'auto-id' }
            }
          }
        },
      }
      pm.use(plugin)
      expect(pm.hasTransformHooks()).toBe(true)

      const doc = createDocument([])
      const result = pm.applyTransforms(doc)
      expect(result).toBe(doc) // in-place transform returns same object
    })

    it('should chain multiple transforms', () => {
      const order: number[] = []
      pm.use({
        name: 'first',
        transform: () => { order.push(1) },
      })
      pm.use({
        name: 'second',
        transform: () => { order.push(2) },
      })

      pm.applyTransforms(createDocument([]))
      expect(order).toEqual([1, 2])
    })
  })

  describe('plugin removal updates caches', () => {
    it('should clear hooks when plugin is removed', () => {
      pm.use({
        name: 'test',
        render: { codeBlock: () => '<custom />' },
        inlineParse: { 64: () => null },
        blockParse: () => 0,
        transform: () => {},
      })

      expect(pm.hasRenderHook('codeBlock')).toBe(true)
      expect(pm.hasInlineHook(64)).toBe(true)
      expect(pm.hasBlockHooks()).toBe(true)
      expect(pm.hasTransformHooks()).toBe(true)

      pm.remove('test')

      expect(pm.hasRenderHook('codeBlock')).toBe(false)
      expect(pm.hasInlineHook(64)).toBe(false)
      expect(pm.hasBlockHooks()).toBe(false)
      expect(pm.hasTransformHooks()).toBe(false)
    })
  })
})
