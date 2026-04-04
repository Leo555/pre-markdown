/**
 * VirtualList Performance Benchmarks
 *
 * Validates that virtual scrolling and resize meet performance targets:
 *  - 10K+ items: viewport computation < 1ms
 *  - Resize relayout: < 5ms for 1K items, < 16ms for 10K items
 *  - Scroll performance: < 16ms/frame
 */
import { describe, it, expect } from 'vitest'
import { LayoutEngine, createFallbackBackend, VirtualList } from '@pre-markdown/layout'

const AVG_CHAR = 8
const fallback = createFallbackBackend(AVG_CHAR)

function makeEngine(): LayoutEngine {
  return new LayoutEngine(
    { font: '16px Inter', lineHeight: 24, maxWidth: 800 },
    fallback,
  )
}

describe('VirtualList Performance', () => {
  it('10K items: setItems < 100ms', () => {
    const list = new VirtualList({
      engine: makeEngine(),
      viewportHeight: 800,
    })

    const texts = Array.from({ length: 10_000 }, (_, i) =>
      `Paragraph ${i}: This is a medium-length text block for testing layout performance.`,
    )

    const start = performance.now()
    list.setItems(texts)
    const elapsed = performance.now() - start

    expect(elapsed).toBeLessThan(100)
    expect(list.getItemCount()).toBe(10_000)
    expect(list.getTotalHeight()).toBeGreaterThan(0)
  })

  it('10K items: viewport computation < 1ms', () => {
    const list = new VirtualList({
      engine: makeEngine(),
      viewportHeight: 800,
      overscan: 10,
    })

    const texts = Array.from({ length: 10_000 }, (_, i) =>
      `Item ${i}: Testing virtual scroll performance with binary search.`,
    )
    list.setItems(texts)

    // Warm up
    list.setScrollTop(0)

    // Measure viewport computation at various scroll positions
    const positions = [0, 1000, 5000, 10000, 50000, list.getTotalHeight() / 2]
    let maxElapsed = 0

    for (const scrollTop of positions) {
      const start = performance.now()
      list.setScrollTop(scrollTop)
      const elapsed = performance.now() - start
      if (elapsed > maxElapsed) maxElapsed = elapsed
    }

    expect(maxElapsed).toBeLessThan(1) // < 1ms for any scroll position
  })

  it('10K items: rapid scroll simulation < 16ms/frame', () => {
    const list = new VirtualList({
      engine: makeEngine(),
      viewportHeight: 800,
      overscan: 5,
    })

    const texts = Array.from({ length: 10_000 }, (_, i) =>
      `Scroll test item ${i}: ${i % 2 === 0 ? 'Short' : 'Slightly longer text to simulate variable heights in documents'}`,
    )
    list.setItems(texts)

    // Simulate 60fps scroll (16ms per frame, 100 frames)
    const totalHeight = list.getTotalHeight()
    const scrollStep = totalHeight / 100
    let maxFrameTime = 0

    for (let i = 0; i < 100; i++) {
      const start = performance.now()
      list.setScrollTop(i * scrollStep)
      const elapsed = performance.now() - start
      if (elapsed > maxFrameTime) maxFrameTime = elapsed
    }

    expect(maxFrameTime).toBeLessThan(16) // < 16ms per frame
  })

  it('1K items: relayout < 5ms', () => {
    const engine = makeEngine()
    const list = new VirtualList({
      engine,
      viewportHeight: 800,
    })

    const texts = Array.from({ length: 1_000 }, (_, i) =>
      `Resize test paragraph ${i}: content that will be relaid out after width change.`,
    )
    list.setItems(texts)

    // Simulate resize
    engine.updateConfig({ maxWidth: 600 })
    const elapsed = list.relayout()

    expect(elapsed).toBeLessThan(5) // < 5ms for 1K items
  })

  it('10K items: relayout < 16ms', () => {
    const engine = makeEngine()
    const list = new VirtualList({
      engine,
      viewportHeight: 800,
    })

    const texts = Array.from({ length: 10_000 }, (_, i) =>
      `Resize paragraph ${i}: standard content.`,
    )
    list.setItems(texts)

    // Simulate resize
    engine.updateConfig({ maxWidth: 600 })
    const elapsed = list.relayout()

    expect(elapsed).toBeLessThan(16) // < 16ms for 10K items
  })

  it('incremental update: change 10 of 10K items < 5ms', () => {
    const list = new VirtualList({
      engine: makeEngine(),
      viewportHeight: 800,
    })

    const texts = Array.from({ length: 10_000 }, (_, i) =>
      `Original item ${i}`,
    )
    list.setItems(texts)

    // Change 10 items scattered through the list
    const updated = [...texts]
    for (let i = 0; i < 10; i++) {
      updated[i * 1000] = `Modified item ${i * 1000}: new content`
    }

    const start = performance.now()
    const changed = list.updateItems(updated)
    const elapsed = performance.now() - start

    expect(changed.length).toBe(10)
    expect(elapsed).toBeLessThan(5)
  })

  it('binary search hitTest: 10K items < 0.1ms', () => {
    const list = new VirtualList({
      engine: makeEngine(),
      viewportHeight: 800,
    })

    const texts = Array.from({ length: 10_000 }, (_, i) => `Item ${i}`)
    list.setItems(texts)

    const totalHeight = list.getTotalHeight()

    const start = performance.now()
    // 1000 hit tests at random positions
    for (let i = 0; i < 1000; i++) {
      list.hitTest((i / 1000) * totalHeight)
    }
    const elapsed = performance.now() - start

    expect(elapsed).toBeLessThan(10) // 1000 lookups in < 10ms = < 0.01ms each
  })
})
