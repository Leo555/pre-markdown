/**
 * Extended Inline Parser Tests — Font styles, Ruby, Emoji, Audio, Video
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { parseInline } from '@pre-markdown/parser'
import { resetNodeIds } from '@pre-markdown/core'
import type {
  FontColor,
  FontSize,
  FontBgColor,
  Ruby,
  Emoji,
  Audio,
  Video,
  Text,
} from '@pre-markdown/core'

describe('Extended Inline Parser', () => {
  beforeEach(() => {
    resetNodeIds()
  })

  // ================================================================
  // Font Color
  // ================================================================
  describe('Font Color', () => {
    it('should parse named color', () => {
      const nodes = parseInline('{color:red}hello{/color}')
      expect(nodes).toHaveLength(1)
      const fc = nodes[0] as FontColor
      expect(fc.type).toBe('fontColor')
      expect(fc.color).toBe('red')
      expect(fc.children).toHaveLength(1)
      expect((fc.children[0] as Text).value).toBe('hello')
    })

    it('should parse hex color', () => {
      const nodes = parseInline('{color:#ff0000}red text{/color}')
      const fc = nodes[0] as FontColor
      expect(fc.color).toBe('#ff0000')
    })

    it('should parse rgb color', () => {
      const nodes = parseInline('{color:rgb(255,0,0)}content{/color}')
      const fc = nodes[0] as FontColor
      expect(fc.color).toBe('rgb(255,0,0)')
    })

    it('should handle nested inline content', () => {
      const nodes = parseInline('{color:blue}**bold text**{/color}')
      const fc = nodes[0] as FontColor
      expect(fc.type).toBe('fontColor')
      expect(fc.children).toHaveLength(1)
      expect(fc.children[0]!.type).toBe('strong')
    })

    it('should not match unclosed font color', () => {
      const nodes = parseInline('{color:red}no close tag')
      expect(nodes[0]!.type).toBe('text')
    })

    it('should preserve surrounding text', () => {
      const nodes = parseInline('before {color:red}colored{/color} after')
      expect(nodes).toHaveLength(3)
      expect((nodes[0] as Text).value).toBe('before ')
      expect(nodes[1]!.type).toBe('fontColor')
      expect((nodes[2] as Text).value).toBe(' after')
    })
  })

  // ================================================================
  // Font Size
  // ================================================================
  describe('Font Size', () => {
    it('should parse pixel size', () => {
      const nodes = parseInline('{size:20px}big text{/size}')
      expect(nodes).toHaveLength(1)
      const fs = nodes[0] as FontSize
      expect(fs.type).toBe('fontSize')
      expect(fs.size).toBe('20px')
      expect((fs.children[0] as Text).value).toBe('big text')
    })

    it('should parse em size', () => {
      const nodes = parseInline('{size:1.5em}text{/size}')
      const fs = nodes[0] as FontSize
      expect(fs.size).toBe('1.5em')
    })

    it('should parse rem size', () => {
      const nodes = parseInline('{size:2rem}text{/size}')
      const fs = nodes[0] as FontSize
      expect(fs.size).toBe('2rem')
    })

    it('should not match unclosed font size', () => {
      const nodes = parseInline('{size:20px}no close')
      expect(nodes[0]!.type).toBe('text')
    })
  })

  // ================================================================
  // Font Background Color
  // ================================================================
  describe('Font Background Color', () => {
    it('should parse named bgcolor', () => {
      const nodes = parseInline('{bgcolor:yellow}highlighted{/bgcolor}')
      expect(nodes).toHaveLength(1)
      const bg = nodes[0] as FontBgColor
      expect(bg.type).toBe('fontBgColor')
      expect(bg.color).toBe('yellow')
      expect((bg.children[0] as Text).value).toBe('highlighted')
    })

    it('should parse hex bgcolor', () => {
      const nodes = parseInline('{bgcolor:#ffff00}text{/bgcolor}')
      const bg = nodes[0] as FontBgColor
      expect(bg.color).toBe('#ffff00')
    })

    it('should not match unclosed bgcolor', () => {
      const nodes = parseInline('{bgcolor:yellow}no close')
      expect(nodes[0]!.type).toBe('text')
    })
  })

  // ================================================================
  // Ruby Annotation
  // ================================================================
  describe('Ruby Annotation', () => {
    it('should parse basic ruby', () => {
      const nodes = parseInline('{漢字}(かんじ)')
      expect(nodes).toHaveLength(1)
      const ruby = nodes[0] as Ruby
      expect(ruby.type).toBe('ruby')
      expect(ruby.base).toBe('漢字')
      expect(ruby.annotation).toBe('かんじ')
    })

    it('should parse ruby with Latin text', () => {
      const nodes = parseInline('{hello}(həˈloʊ)')
      const ruby = nodes[0] as Ruby
      expect(ruby.base).toBe('hello')
      expect(ruby.annotation).toBe('həˈloʊ')
    })

    it('should not match empty base', () => {
      const nodes = parseInline('{}(annotation)')
      expect(nodes[0]!.type).toBe('text')
    })

    it('should not match empty annotation', () => {
      const nodes = parseInline('{text}()')
      expect(nodes[0]!.type).toBe('text')
    })

    it('should not confuse ruby with font color', () => {
      const nodes = parseInline('{color:red}text{/color}')
      expect(nodes[0]!.type).toBe('fontColor')
    })

    it('should preserve surrounding text', () => {
      const nodes = parseInline('prefix {字}(じ) suffix')
      expect(nodes).toHaveLength(3)
      expect(nodes[1]!.type).toBe('ruby')
    })
  })

  // ================================================================
  // Emoji Shortcodes
  // ================================================================
  describe('Emoji Shortcodes', () => {
    it('should parse :smile: emoji', () => {
      const nodes = parseInline(':smile:')
      expect(nodes).toHaveLength(1)
      const emoji = nodes[0] as Emoji
      expect(emoji.type).toBe('emoji')
      expect(emoji.shortcode).toBe('smile')
      expect(emoji.value).toBe('😄')
    })

    it('should parse :heart: emoji', () => {
      const nodes = parseInline(':heart:')
      const emoji = nodes[0] as Emoji
      expect(emoji.shortcode).toBe('heart')
      expect(emoji.value).toBe('❤️')
    })

    it('should parse :rocket: emoji', () => {
      const nodes = parseInline(':rocket:')
      const emoji = nodes[0] as Emoji
      expect(emoji.value).toBe('🚀')
    })

    it('should parse :+1: emoji', () => {
      const nodes = parseInline(':+1:')
      const emoji = nodes[0] as Emoji
      expect(emoji.value).toBe('👍')
    })

    it('should not parse unknown shortcode', () => {
      const nodes = parseInline(':unknown_emoji_xyz:')
      expect(nodes[0]!.type).toBe('text')
    })

    it('should preserve surrounding text', () => {
      const nodes = parseInline('hello :smile: world')
      expect(nodes).toHaveLength(3)
      expect((nodes[0] as Text).value).toBe('hello ')
      expect(nodes[1]!.type).toBe('emoji')
      expect((nodes[2] as Text).value).toBe(' world')
    })

    it('should parse multiple emojis', () => {
      const nodes = parseInline(':fire::rocket:')
      expect(nodes).toHaveLength(2)
      expect((nodes[0] as Emoji).shortcode).toBe('fire')
      expect((nodes[1] as Emoji).shortcode).toBe('rocket')
    })
  })

  // ================================================================
  // Audio
  // ================================================================
  describe('Audio', () => {
    it('should parse audio syntax', () => {
      const nodes = parseInline('!audio[My Song](https://example.com/song.mp3)')
      expect(nodes).toHaveLength(1)
      const audio = nodes[0] as Audio
      expect(audio.type).toBe('audio')
      expect(audio.url).toBe('https://example.com/song.mp3')
      expect(audio.title).toBe('My Song')
    })

    it('should parse audio without title', () => {
      const nodes = parseInline('!audio[](https://example.com/audio.wav)')
      const audio = nodes[0] as Audio
      expect(audio.type).toBe('audio')
      expect(audio.url).toBe('https://example.com/audio.wav')
      expect(audio.title).toBeUndefined()
    })

    it('should not confuse with image syntax', () => {
      const nodes = parseInline('![alt](image.png)')
      expect(nodes[0]!.type).toBe('image')
    })

    it('should preserve surrounding text', () => {
      const nodes = parseInline('before !audio[title](url.mp3) after')
      expect(nodes).toHaveLength(3)
      expect(nodes[1]!.type).toBe('audio')
    })
  })

  // ================================================================
  // Video
  // ================================================================
  describe('Video', () => {
    it('should parse video syntax', () => {
      const nodes = parseInline('!video[My Video](https://example.com/video.mp4)')
      expect(nodes).toHaveLength(1)
      const video = nodes[0] as Video
      expect(video.type).toBe('video')
      expect(video.url).toBe('https://example.com/video.mp4')
      expect(video.title).toBe('My Video')
    })

    it('should parse video without title', () => {
      const nodes = parseInline('!video[](https://example.com/clip.webm)')
      const video = nodes[0] as Video
      expect(video.type).toBe('video')
      expect(video.url).toBe('https://example.com/clip.webm')
      expect(video.title).toBeUndefined()
    })

    it('should preserve surrounding text', () => {
      const nodes = parseInline('see !video[demo](demo.mp4) here')
      expect(nodes).toHaveLength(3)
      expect(nodes[1]!.type).toBe('video')
    })
  })

  // ================================================================
  // Mixed Extended Syntax
  // ================================================================
  describe('Mixed Extended Syntax', () => {
    it('should parse font color with emoji inside', () => {
      const nodes = parseInline('{color:red}:fire: hot{/color}')
      const fc = nodes[0] as FontColor
      expect(fc.type).toBe('fontColor')
      expect(fc.children.length).toBeGreaterThanOrEqual(2)
    })

    it('should handle multiple different extensions in one line', () => {
      const nodes = parseInline(':smile: {color:blue}blue{/color} {漢}(かん)')
      expect(nodes.length).toBeGreaterThanOrEqual(3)
      const types = nodes.map((n) => n.type)
      expect(types).toContain('emoji')
      expect(types).toContain('fontColor')
      expect(types).toContain('ruby')
    })
  })
})
