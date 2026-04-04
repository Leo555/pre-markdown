/**
 * @pre-markdown/layout — Web Worker Script
 *
 * Runs pretext prepare() in a background thread to avoid blocking
 * the main thread on large documents.
 *
 * Communication protocol:
 *   Main → Worker:  { id, type: 'prepare'|'prepareWithSegments', text, font, options? }
 *   Worker → Main:  { id, type: 'result', result }  or  { id, type: 'error', error }
 *
 * Usage: new Worker(new URL('./worker-script.js', import.meta.url), { type: 'module' })
 */

import {
  prepare,
  prepareWithSegments,
  clearCache as pretextClearCache,
  setLocale as pretextSetLocale,
} from '@chenglou/pretext'

import type { PrepareOptions } from '@chenglou/pretext'

// ============================================================
// Message Types
// ============================================================

export interface WorkerRequest {
  id: number
  type: 'prepare' | 'prepareWithSegments' | 'clearCache' | 'setLocale'
  text?: string
  font?: string
  options?: PrepareOptions
  locale?: string
}

export interface WorkerResponse {
  id: number
  type: 'result' | 'error'
  result?: unknown
  error?: string
}

// ============================================================
// Worker Message Handler
// ============================================================

const ctx = globalThis as unknown as DedicatedWorkerGlobalScope

ctx.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { id, type, text, font, options, locale } = event.data

  try {
    switch (type) {
      case 'prepare': {
        const result = prepare(text!, font!, options)
        ctx.postMessage({ id, type: 'result', result } satisfies WorkerResponse)
        break
      }
      case 'prepareWithSegments': {
        const result = prepareWithSegments(text!, font!, options)
        ctx.postMessage({ id, type: 'result', result } satisfies WorkerResponse)
        break
      }
      case 'clearCache': {
        pretextClearCache()
        ctx.postMessage({ id, type: 'result' } satisfies WorkerResponse)
        break
      }
      case 'setLocale': {
        pretextSetLocale(locale)
        ctx.postMessage({ id, type: 'result' } satisfies WorkerResponse)
        break
      }
      default: {
        ctx.postMessage({
          id,
          type: 'error',
          error: `Unknown message type: ${type}`,
        } satisfies WorkerResponse)
      }
    }
  } catch (err) {
    ctx.postMessage({
      id,
      type: 'error',
      error: err instanceof Error ? err.message : String(err),
    } satisfies WorkerResponse)
  }
}
