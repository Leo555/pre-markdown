/**
 * Layout Performance Benchmarks
 *
 * Uses fallback backend for Node.js environment.
 * For real pretext benchmarks, run in a browser environment.
 */
import { bench, describe } from 'vitest'
import { LayoutEngine, createFallbackBackend } from '@pre-markdown/layout'
import * as fs from 'node:fs'
import * as path from 'node:path'

const fallback = createFallbackBackend(8)
const engine = new LayoutEngine(
  { font: '16px Inter', lineHeight: 24, maxWidth: 800 },
  fallback,
)

// Load test fixtures
const fixturesDir = path.resolve(__dirname, '../../harness/fixtures')
const basicMd = fs.existsSync(path.join(fixturesDir, 'basic.md'))
  ? fs.readFileSync(path.join(fixturesDir, 'basic.md'), 'utf-8')
  : 'Hello world '.repeat(100)
const stressMd = fs.existsSync(path.join(fixturesDir, 'stress-10k.md'))
  ? fs.readFileSync(path.join(fixturesDir, 'stress-10k.md'), 'utf-8')
  : 'Paragraph '.repeat(1000) + '\n'.repeat(1000)

// Split into paragraphs
const basicParagraphs = basicMd.split(/\n{2,}/)
const stressParagraphs = stressMd.split(/\n{2,}/)

describe('Layout Engine — computeLayout', () => {
  bench('single short paragraph', () => {
    engine.computeLayout('Hello world, this is a test.')
  })

  bench('single long paragraph (1000 chars)', () => {
    engine.computeLayout('A'.repeat(1000))
  })

  bench('basic.md full document', () => {
    for (const p of basicParagraphs) {
      engine.computeLayout(p)
    }
  })

  bench('stress-10k.md full document', () => {
    for (const p of stressParagraphs) {
      engine.computeLayout(p)
    }
  })
})

describe('Layout Engine — computeLayoutWithLines', () => {
  bench('single paragraph with lines', () => {
    engine.computeLayoutWithLines('Hello world, this is a test paragraph with enough text to wrap.')
  })

  bench('500 paragraphs with lines', () => {
    for (let i = 0; i < 500 && i < stressParagraphs.length; i++) {
      engine.computeLayoutWithLines(stressParagraphs[i]!)
    }
  })
})

describe('Layout Engine — computeViewportLayout', () => {
  bench('viewport layout (scrollTop=0)', () => {
    engine.computeViewportLayout(stressMd, 0, 800)
  })

  bench('viewport layout (scrollTop=5000)', () => {
    engine.computeViewportLayout(stressMd, 5000, 800)
  })
})

describe('Layout Engine — computeDocumentLayout', () => {
  bench('document layout (basic.md)', () => {
    engine.computeDocumentLayout(basicParagraphs)
  })

  bench('document layout (stress-10k.md)', () => {
    engine.computeDocumentLayout(stressParagraphs)
  })
})

describe('Layout Engine — cache performance', () => {
  bench('cold cache (500 unique paragraphs)', () => {
    engine.clearAllCaches()
    for (let i = 0; i < 500; i++) {
      engine.computeLayout(`Unique paragraph number ${i} with some text content.`)
    }
  })

  bench('warm cache (500 repeated paragraphs)', () => {
    // Ensure cache is warm
    for (let i = 0; i < 10; i++) {
      engine.computeLayout(`Repeated paragraph ${i}`)
    }
    // Now query from cache
    for (let i = 0; i < 500; i++) {
      engine.computeLayout(`Repeated paragraph ${i % 10}`)
    }
  })
})
