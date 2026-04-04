/**
 * @pre-markdown/layout — Worker-Based Measurement Backend
 *
 * Offloads expensive pretext prepare() calls to a Web Worker,
 * keeping the main thread free for rendering and user interaction.
 *
 * The backend transparently proxies prepare()/prepareWithSegments() to the
 * worker thread and caches results on the main thread.
 *
 * Usage:
 *   const backend = createWorkerBackend()
 *   const engine = new LayoutEngine(config, backend)
 *
 *   // Bulk prepare paragraphs in background (non-blocking)
 *   await backend.prepareAsync(texts, font)
 *
 *   // After prepareAsync, computeLayout() hits cache — synchronous & instant
 *   engine.computeLayout(text)
 *
 *   // Clean up when done
 *   backend.terminate()
 */

import {
  prepare,
  prepareWithSegments,
  layout,
  layoutWithLines,
  clearCache as pretextClearCache,
  setLocale as pretextSetLocale,
} from '@chenglou/pretext'

import type {
  PreparedText,
  PreparedTextWithSegments,
  LayoutResult as PretextLayoutResult,
  LayoutLinesResult as PretextLinesResult,
  PrepareOptions,
} from '@chenglou/pretext'

import type { MeasurementBackend } from './index.js'
import type { WorkerRequest, WorkerResponse } from './worker-script.js'

// ============================================================
// Worker Backend Interface
// ============================================================

export interface WorkerMeasurementBackend extends MeasurementBackend {
  /**
   * Asynchronously prepare multiple text blocks in the Worker thread.
   * Results are cached so subsequent synchronous prepare() calls are instant.
   *
   * Use this for bulk preparation of large documents:
   *   await backend.prepareAsync(paragraphs, font)
   *   // Now all paragraphs are cached, computeLayout() is O(1)
   */
  prepareAsync(texts: string[], font: string, options?: PrepareOptions): Promise<PreparedText[]>

  /**
   * Asynchronously prepare with segments (for layoutWithLines).
   */
  prepareWithSegmentsAsync(
    texts: string[],
    font: string,
    options?: PrepareOptions,
  ): Promise<PreparedTextWithSegments[]>

  /**
   * Check if the worker is alive.
   */
  readonly isAlive: boolean

  /**
   * Terminate the worker. After this, async methods will reject.
   * Synchronous methods fall back to main-thread pretext.
   */
  terminate(): void
}

// ============================================================
// Implementation
// ============================================================

/**
 * Create a Worker-based measurement backend.
 *
 * On the main thread:
 *  - prepare() / prepareWithSegments() — synchronous, uses main-thread pretext (with cache)
 *  - prepareAsync() / prepareWithSegmentsAsync() — offloads to Worker
 *  - layout() / layoutWithLines() — always synchronous (pure arithmetic)
 *
 * The typical workflow:
 *  1. Call prepareAsync() for bulk paragraphs → Worker runs prepare() in background
 *  2. Results are stored in main-thread cache
 *  3. Subsequent computeLayout() hits cache → no main-thread blocking
 *
 * @param workerUrl - Optional custom URL for the worker script.
 *                    Defaults to auto-resolving the bundled worker.
 */
export function createWorkerBackend(workerUrl?: URL | string): WorkerMeasurementBackend {
  // Cache for prepared results (key → PreparedText)
  const preparedCache = new Map<string, PreparedText>()
  const segmentCache = new Map<string, PreparedTextWithSegments>()

  // Worker setup
  let worker: Worker | null = null
  let alive = true
  let nextId = 1
  const pending = new Map<number, {
    resolve: (value: unknown) => void
    reject: (reason: unknown) => void
  }>()

  function getWorker(): Worker {
    if (worker) return worker

    const url = workerUrl
      ?? new URL('./worker-script.js', import.meta.url)

    worker = new Worker(url, { type: 'module' })
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const { id, type, result, error } = event.data
      const handlers = pending.get(id)
      if (!handlers) return
      pending.delete(id)
      if (type === 'error') {
        handlers.reject(new Error(error ?? 'Worker error'))
      } else {
        handlers.resolve(result)
      }
    }
    worker.onerror = (event) => {
      // Reject all pending requests
      for (const [id, handlers] of pending) {
        handlers.reject(new Error(`Worker error: ${event.message}`))
      }
      pending.clear()
    }
    return worker
  }

  function sendMessage(msg: Omit<WorkerRequest, 'id'>): Promise<unknown> {
    if (!alive) return Promise.reject(new Error('Worker has been terminated'))
    return new Promise((resolve, reject) => {
      const id = nextId++
      pending.set(id, { resolve, reject })
      getWorker().postMessage({ ...msg, id } as WorkerRequest)
    })
  }

  function cacheKey(text: string, font: string, options?: PrepareOptions): string {
    return `${font}|${options?.whiteSpace ?? 'normal'}|${text}`
  }

  // --------------------------------------------------------
  // Backend Implementation
  // --------------------------------------------------------

  const backend: WorkerMeasurementBackend = {
    // Synchronous prepare — uses main-thread pretext (with cache fallback)
    prepare(text: string, font: string, options?: PrepareOptions): PreparedText {
      const key = cacheKey(text, font, options)
      let cached = preparedCache.get(key)
      if (!cached) {
        cached = prepare(text, font, options)
        preparedCache.set(key, cached)
      }
      return cached
    },

    prepareWithSegments(
      text: string,
      font: string,
      options?: PrepareOptions,
    ): PreparedTextWithSegments {
      const key = cacheKey(text, font, options)
      let cached = segmentCache.get(key)
      if (!cached) {
        cached = prepareWithSegments(text, font, options)
        segmentCache.set(key, cached)
      }
      return cached
    },

    // Layout is always synchronous (pure arithmetic)
    layout(
      prepared: PreparedText,
      maxWidth: number,
      lineHeight: number,
    ): PretextLayoutResult {
      return layout(prepared, maxWidth, lineHeight)
    },

    layoutWithLines(
      prepared: PreparedTextWithSegments,
      maxWidth: number,
      lineHeight: number,
    ): PretextLinesResult {
      return layoutWithLines(prepared, maxWidth, lineHeight)
    },

    clearCache(): void {
      preparedCache.clear()
      segmentCache.clear()
      pretextClearCache()
      // Also clear worker's cache
      if (alive && worker) {
        sendMessage({ type: 'clearCache' }).catch(() => {})
      }
    },

    setLocale(locale?: string): void {
      pretextSetLocale(locale)
      if (alive && worker) {
        sendMessage({ type: 'setLocale', locale }).catch(() => {})
      }
    },

    // --------------------------------------------------------
    // Async API — offloads to Worker
    // --------------------------------------------------------

    async prepareAsync(
      texts: string[],
      font: string,
      options?: PrepareOptions,
    ): Promise<PreparedText[]> {
      const results: PreparedText[] = new Array(texts.length)
      const toProcess: { index: number; text: string }[] = []

      // Check cache first
      for (let i = 0; i < texts.length; i++) {
        const key = cacheKey(texts[i]!, font, options)
        const cached = preparedCache.get(key)
        if (cached) {
          results[i] = cached
        } else {
          toProcess.push({ index: i, text: texts[i]! })
        }
      }

      // Process uncached items in batches via Worker
      if (toProcess.length > 0) {
        const BATCH_SIZE = 50
        for (let b = 0; b < toProcess.length; b += BATCH_SIZE) {
          const batch = toProcess.slice(b, b + BATCH_SIZE)
          const promises = batch.map(({ text }) =>
            sendMessage({ type: 'prepare', text, font, options })
              .then((result) => result as PreparedText)
          )
          const batchResults = await Promise.all(promises)

          for (let j = 0; j < batch.length; j++) {
            const { index, text } = batch[j]!
            const prepared = batchResults[j]!
            const key = cacheKey(text, font, options)
            preparedCache.set(key, prepared)
            results[index] = prepared
          }
        }
      }

      return results
    },

    async prepareWithSegmentsAsync(
      texts: string[],
      font: string,
      options?: PrepareOptions,
    ): Promise<PreparedTextWithSegments[]> {
      const results: PreparedTextWithSegments[] = new Array(texts.length)
      const toProcess: { index: number; text: string }[] = []

      // Check cache first
      for (let i = 0; i < texts.length; i++) {
        const key = cacheKey(texts[i]!, font, options)
        const cached = segmentCache.get(key)
        if (cached) {
          results[i] = cached
        } else {
          toProcess.push({ index: i, text: texts[i]! })
        }
      }

      // Process uncached items
      if (toProcess.length > 0) {
        const BATCH_SIZE = 50
        for (let b = 0; b < toProcess.length; b += BATCH_SIZE) {
          const batch = toProcess.slice(b, b + BATCH_SIZE)
          const promises = batch.map(({ text }) =>
            sendMessage({ type: 'prepareWithSegments', text, font, options })
              .then((result) => result as PreparedTextWithSegments)
          )
          const batchResults = await Promise.all(promises)

          for (let j = 0; j < batch.length; j++) {
            const { index, text } = batch[j]!
            const prepared = batchResults[j]!
            const key = cacheKey(text, font, options)
            segmentCache.set(key, prepared)
            results[index] = prepared
          }
        }
      }

      return results
    },

    get isAlive() {
      return alive
    },

    terminate(): void {
      alive = false
      if (worker) {
        worker.terminate()
        worker = null
      }
      // Reject all pending requests
      for (const [, handlers] of pending) {
        handlers.reject(new Error('Worker terminated'))
      }
      pending.clear()
    },
  }

  return backend
}
