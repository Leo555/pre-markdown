/**
 * @pre-markdown/core - Event Bus
 *
 * Type-safe event emitter for communication between layers.
 */

/** Event handler type */
type Handler<T = unknown> = (data: T) => void

/** Pre-defined editor events */
export interface EditorEvents {
  /** Content has changed */
  'content:change': { text: string; from: number; to: number; inserted: string }
  /** Parse completed */
  'parse:done': { documentId: number; duration: number }
  /** Layout completed */
  'layout:done': { lineCount: number; duration: number }
  /** Render completed */
  'render:done': { nodeCount: number; duration: number }
  /** Scroll position changed */
  'scroll:change': { scrollTop: number; scrollLeft: number }
  /** Selection changed */
  'selection:change': { from: number; to: number }
  /** Editor focused */
  'editor:focus': void
  /** Editor blurred */
  'editor:blur': void
}

export class EventBus<Events extends object = EditorEvents> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  private handlers = new Map<keyof Events, Set<Function>>()

  /** Subscribe to an event */
  on<K extends keyof Events>(event: K, handler: Handler<Events[K]>): () => void {
    let set = this.handlers.get(event)
    if (!set) {
      set = new Set()
      this.handlers.set(event, set)
    }
    set.add(handler)

    // Return unsubscribe function
    return (): void => {
      set.delete(handler)
      if (set.size === 0) {
        this.handlers.delete(event)
      }
    }
  }

  /** Subscribe to an event, auto-unsubscribe after first call */
  once<K extends keyof Events>(event: K, handler: Handler<Events[K]>): () => void {
    const wrapper: Handler<Events[K]> = (data: Events[K]) => {
      unsub()
      handler(data)
    }
    const unsub = this.on(event, wrapper)
    return unsub
  }

  /** Emit an event */
  emit<K extends keyof Events>(event: K, data: Events[K]): void {
    const set = this.handlers.get(event)
    if (set) {
      for (const handler of set) {
        ;(handler as Handler<Events[K]>)(data)
      }
    }
  }

  /** Remove all handlers for an event, or all events */
  off<K extends keyof Events>(event?: K): void {
    if (event !== undefined) {
      this.handlers.delete(event)
    } else {
      this.handlers.clear()
    }
  }

  /** Check if there are handlers for an event */
  hasListeners<K extends keyof Events>(event: K): boolean {
    return (this.handlers.get(event)?.size ?? 0) > 0
  }
}
