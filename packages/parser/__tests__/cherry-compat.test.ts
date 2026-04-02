/**
 * Cherry Markdown Compatibility Tests
 * Tests for syntax formats matching Cherry Markdown's implementation.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { parse, parseInline } from '@pre-markdown/parser'
import { renderToHtml } from '@pre-markdown/renderer'
import { resetNodeIds } from '@pre-markdown/core'
import type {
  FontColor,
  FontSize,
  FontBgColor,
  Ruby,
  Subscript,
  Text,
  Details,
  Heading,
  Container,
} from '@pre-markdown/core'

function render(md: string): string {
  resetNodeIds()
  return renderToHtml(parse(md))
}

describe('Cherry Markdown Compatibility', () => {
  beforeEach(() => {
    resetNodeIds()
  })

  // ================================================================
  // Cherry-style Font Color: !!color text!!
  // ================================================================
  describe('Cherry Font Color (!!color text!!)', () => {
    it('should parse !!red text!!', () => {
      const nodes = parseInline('!!red 红色文字!!')
      expect(nodes).toHaveLength(1)
      const fc = nodes[0] as FontColor
      expect(fc.type).toBe('fontColor')
      expect(fc.color).toBe('red')
    })

    it('should parse !!#ff0000 text!!', () => {
      const nodes = parseInline('!!#ff0000 红色!!')
      const fc = nodes[0] as FontColor
      expect(fc.color).toBe('#ff0000')
    })

    it('should parse with surrounding text', () => {
      const nodes = parseInline('before !!blue 蓝色!! after')
      expect(nodes.length).toBeGreaterThanOrEqual(3)
      const fc = nodes.find(n => n.type === 'fontColor') as FontColor
      expect(fc).toBeDefined()
      expect(fc.color).toBe('blue')
    })

    it('should render !!color!! to colored span', () => {
      const html = render('!!red 红色文字!!')
      expect(html).toContain('color:red')
    })
  })

  // ================================================================
  // Cherry-style Font Size: !size text!
  // ================================================================
  describe('Cherry Font Size (!size text!)', () => {
    it('should parse !24 text!', () => {
      const nodes = parseInline('!24 大号文字!')
      expect(nodes).toHaveLength(1)
      const fs = nodes[0] as FontSize
      expect(fs.type).toBe('fontSize')
      expect(fs.size).toBe('24px')
    })

    it('should parse !12 small!', () => {
      const nodes = parseInline('!12 小字!')
      const fs = nodes[0] as FontSize
      expect(fs.size).toBe('12px')
    })

    it('should render to sized span', () => {
      const html = render('!20 文字!')
      expect(html).toContain('font-size:20px')
    })
  })

  // ================================================================
  // Cherry-style Background Color: !!!color text!!!
  // ================================================================
  describe('Cherry Background Color (!!!color text!!!)', () => {
    it('should parse !!!yellow text!!!', () => {
      const nodes = parseInline('!!!yellow 高亮!!!')
      expect(nodes).toHaveLength(1)
      const bg = nodes[0] as FontBgColor
      expect(bg.type).toBe('fontBgColor')
      expect(bg.color).toBe('yellow')
    })

    it('should parse !!!#ffff00 text!!!', () => {
      const nodes = parseInline('!!!#ffff00 黄色背景!!!')
      const bg = nodes[0] as FontBgColor
      expect(bg.color).toBe('#ffff00')
    })

    it('should render to bg-colored span', () => {
      const html = render('!!!red 红色背景!!!')
      expect(html).toContain('background-color:red')
    })
  })

  // ================================================================
  // Cherry-style Subscript: ^^text^^
  // ================================================================
  describe('Cherry Subscript (^^text^^)', () => {
    it('should parse ^^sub^^', () => {
      const nodes = parseInline('^^下标^^')
      expect(nodes).toHaveLength(1)
      expect(nodes[0]!.type).toBe('subscript')
    })

    it('should render to <sub>', () => {
      const html = render('H^^2^^O')
      expect(html).toContain('<sub>')
    })

    it('should work alongside single ^ superscript', () => {
      const nodes = parseInline('^上标^ and ^^下标^^')
      const types = nodes.map(n => n.type)
      expect(types).toContain('superscript')
      expect(types).toContain('subscript')
    })
  })

  // ================================================================
  // Cherry-style Ruby: {text|annotation}
  // ================================================================
  describe('Cherry Ruby ({text|annotation})', () => {
    it('should parse {漢字|かんじ}', () => {
      const nodes = parseInline('{漢字|かんじ}')
      expect(nodes).toHaveLength(1)
      const ruby = nodes[0] as Ruby
      expect(ruby.type).toBe('ruby')
      expect(ruby.base).toBe('漢字')
      expect(ruby.annotation).toBe('かんじ')
    })

    it('should render to <ruby> tag', () => {
      const html = render('{漢字|かんじ}')
      expect(html).toContain('<ruby>')
      expect(html).toContain('<rt>かんじ</rt>')
    })

    it('should still support our format {text}(annotation)', () => {
      const nodes = parseInline('{漢字}(かんじ)')
      const ruby = nodes[0] as Ruby
      expect(ruby.type).toBe('ruby')
      expect(ruby.base).toBe('漢字')
    })
  })

  // ================================================================
  // Cherry-style Underline: /text/
  // ================================================================
  describe('Cherry Underline (/text/)', () => {
    it('should parse /underlined text/', () => {
      const nodes = parseInline('/underlined/')
      expect(nodes).toHaveLength(1)
      expect(nodes[0]!.type).toBe('underline')
    })

    it('should render to underline span', () => {
      const html = render('/下划线文字/')
      expect(html).toContain('text-decoration:underline')
    })

    it('should require boundary (space or line start)', () => {
      // At start of line — should work
      const nodes1 = parseInline('/text/')
      expect(nodes1[0]!.type).toBe('underline')

      // After space — should work
      const nodes2 = parseInline('before /text/ after')
      const types = nodes2.map(n => n.type)
      expect(types).toContain('underline')
    })
  })

  // ================================================================
  // Detail/Collapsible: +++title / +++
  // ================================================================
  describe('Cherry Detail (+++title / +++)', () => {
    it('should parse basic detail block', () => {
      const doc = parse('+++ 点击展开\n内容\n+++')
      expect(doc.children).toHaveLength(1)
      const detail = doc.children[0] as Details
      expect(detail.type).toBe('details')
      expect(detail.summary).toBe('点击展开')
    })

    it('should render to <details><summary>', () => {
      const html = render('+++ 标题\n内容\n+++')
      expect(html).toContain('<details>')
      expect(html).toContain('<summary>')
      expect(html).toContain('标题')
    })

    it('should parse +++- (default open)', () => {
      const doc = parse('+++- 默认展开\n内容\n+++')
      const detail = doc.children[0] as Details
      expect(detail.type).toBe('details')
    })
  })

  // ================================================================
  // FrontMatter: ---yaml---
  // ================================================================
  describe('FrontMatter (---yaml---)', () => {
    it('should parse front matter at document start', () => {
      const doc = parse('---\ntitle: Hello\n---\n\n# Content')
      expect(doc.children.length).toBeGreaterThanOrEqual(2)
    })

    it('should not parse --- as front matter mid-document', () => {
      const doc = parse('# Title\n\n---\ntitle: Hello\n---')
      // First block is heading, second is thematic break
      expect(doc.children[0]!.type).toBe('heading')
    })

    it('should not parse empty front matter', () => {
      const doc = parse('---\n\n---\n\nContent')
      // Empty front matter should be treated as thematic breaks
      expect(doc.children[0]!.type).not.toBe('htmlBlock')
    })
  })

  // ================================================================
  // Extended TOC formats
  // ================================================================
  describe('TOC Extended Formats', () => {
    it('should parse [toc]', () => {
      const doc = parse('[toc]')
      expect(doc.children).toHaveLength(1)
      expect(doc.children[0]!.type).toBe('toc')
    })

    it('should parse [[toc]]', () => {
      const doc = parse('[[toc]]')
      expect(doc.children).toHaveLength(1)
      expect(doc.children[0]!.type).toBe('toc')
    })

    it('should parse 【【toc】】', () => {
      const doc = parse('【【toc】】')
      expect(doc.children).toHaveLength(1)
      expect(doc.children[0]!.type).toBe('toc')
    })

    it('should parse [TOC] (case insensitive)', () => {
      const doc = parse('[TOC]')
      expect(doc.children).toHaveLength(1)
      expect(doc.children[0]!.type).toBe('toc')
    })
  })

  // ================================================================
  // Panel Type Shorthands
  // ================================================================
  describe('Panel Type Shorthands', () => {
    it('should expand ::: p to primary', () => {
      const doc = parse('::: p Title\nContent\n:::')
      const container = doc.children[0] as Container
      expect(container.kind).toBe('primary')
    })

    it('should expand ::: i to info', () => {
      const doc = parse('::: i Info\nContent\n:::')
      const container = doc.children[0] as Container
      expect(container.kind).toBe('info')
    })

    it('should expand ::: w to warning', () => {
      const doc = parse('::: w Warning\nContent\n:::')
      const container = doc.children[0] as Container
      expect(container.kind).toBe('warning')
    })

    it('should expand ::: d to danger', () => {
      const doc = parse('::: d Danger\nContent\n:::')
      const container = doc.children[0] as Container
      expect(container.kind).toBe('danger')
    })

    it('should expand ::: s to success', () => {
      const doc = parse('::: s Success\nContent\n:::')
      const container = doc.children[0] as Container
      expect(container.kind).toBe('success')
    })

    it('should expand ::: tip to info', () => {
      const doc = parse('::: tip Notice\nContent\n:::')
      const container = doc.children[0] as Container
      expect(container.kind).toBe('info')
    })

    it('should keep full names as-is', () => {
      const doc = parse('::: warning Alert\nContent\n:::')
      const container = doc.children[0] as Container
      expect(container.kind).toBe('warning')
    })
  })

  // ================================================================
  // Both formats coexist
  // ================================================================
  describe('Dual Format Compatibility', () => {
    it('should support both {color:red}text{/color} and !!red text!!', () => {
      const nodes1 = parseInline('{color:red}test{/color}')
      expect(nodes1[0]!.type).toBe('fontColor')

      const nodes2 = parseInline('!!red test!!')
      expect(nodes2[0]!.type).toBe('fontColor')
    })

    it('should support both {size:20px}text{/size} and !20 text!', () => {
      const nodes1 = parseInline('{size:20px}test{/size}')
      expect(nodes1[0]!.type).toBe('fontSize')

      const nodes2 = parseInline('!20 test!')
      expect(nodes2[0]!.type).toBe('fontSize')
    })

    it('should support both {bgcolor:yellow}text{/bgcolor} and !!!yellow text!!!', () => {
      const nodes1 = parseInline('{bgcolor:yellow}test{/bgcolor}')
      expect(nodes1[0]!.type).toBe('fontBgColor')

      const nodes2 = parseInline('!!!yellow test!!!')
      expect(nodes2[0]!.type).toBe('fontBgColor')
    })

    it('should support both {text}(ann) and {text|ann} ruby formats', () => {
      const nodes1 = parseInline('{字}(じ)')
      expect(nodes1[0]!.type).toBe('ruby')

      const nodes2 = parseInline('{字|じ}')
      expect(nodes2[0]!.type).toBe('ruby')
    })

    it('should support both ~sub~ and ^^sub^^ subscript formats', () => {
      const nodes1 = parseInline('~sub~')
      expect(nodes1[0]!.type).toBe('subscript')

      const nodes2 = parseInline('^^sub^^')
      expect(nodes2[0]!.type).toBe('subscript')
    })
  })
})
