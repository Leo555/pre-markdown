/**
 * EventBus Tests
 */
import { describe, it, expect, vi } from 'vitest'
import { EventBus } from '@pre-markdown/core'

describe('EventBus', () => {
  it('should subscribe and emit events', () => {
    const bus = new EventBus()
    const handler = vi.fn()

    bus.on('content:change', handler)
    bus.emit('content:change', { text: 'hello', from: 0, to: 0, inserted: 'hello' })

    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith({ text: 'hello', from: 0, to: 0, inserted: 'hello' })
  })

  it('should support multiple handlers', () => {
    const bus = new EventBus()
    const h1 = vi.fn()
    const h2 = vi.fn()

    bus.on('parse:done', h1)
    bus.on('parse:done', h2)
    bus.emit('parse:done', { documentId: 1, duration: 5 })

    expect(h1).toHaveBeenCalledTimes(1)
    expect(h2).toHaveBeenCalledTimes(1)
  })

  it('should unsubscribe with returned function', () => {
    const bus = new EventBus()
    const handler = vi.fn()

    const unsub = bus.on('content:change', handler)
    bus.emit('content:change', { text: '', from: 0, to: 0, inserted: '' })
    expect(handler).toHaveBeenCalledTimes(1)

    unsub()
    bus.emit('content:change', { text: '', from: 0, to: 0, inserted: '' })
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('should support once()', () => {
    const bus = new EventBus()
    const handler = vi.fn()

    bus.once('parse:done', handler)
    bus.emit('parse:done', { documentId: 1, duration: 5 })
    bus.emit('parse:done', { documentId: 2, duration: 3 })

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('should remove all handlers with off()', () => {
    const bus = new EventBus()
    const h1 = vi.fn()
    const h2 = vi.fn()

    bus.on('content:change', h1)
    bus.on('parse:done', h2)
    bus.off()

    bus.emit('content:change', { text: '', from: 0, to: 0, inserted: '' })
    bus.emit('parse:done', { documentId: 1, duration: 5 })

    expect(h1).not.toHaveBeenCalled()
    expect(h2).not.toHaveBeenCalled()
  })

  it('should remove handlers for specific event with off(event)', () => {
    const bus = new EventBus()
    const h1 = vi.fn()
    const h2 = vi.fn()

    bus.on('content:change', h1)
    bus.on('parse:done', h2)
    bus.off('content:change')

    bus.emit('content:change', { text: '', from: 0, to: 0, inserted: '' })
    bus.emit('parse:done', { documentId: 1, duration: 5 })

    expect(h1).not.toHaveBeenCalled()
    expect(h2).toHaveBeenCalledTimes(1)
  })

  it('should check for listeners with hasListeners()', () => {
    const bus = new EventBus()
    expect(bus.hasListeners('content:change')).toBe(false)

    const unsub = bus.on('content:change', () => {})
    expect(bus.hasListeners('content:change')).toBe(true)

    unsub()
    expect(bus.hasListeners('content:change')).toBe(false)
  })
})
