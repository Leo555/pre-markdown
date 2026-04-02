/**
 * Quick profiling script — measures parse/render performance and identifies bottlenecks.
 * Run with: npx tsx harness/profile.ts
 */
import { parse } from '../packages/parser/src/index.js'
import { renderToHtml } from '../packages/renderer/src/index.js'
import { resetNodeIds } from '../packages/core/src/index.js'

function generateMarkdown(lineCount: number): string {
  const lines: string[] = []
  for (let i = 0; i < lineCount; i++) {
    const mod = i % 20
    if (mod === 0) lines.push(`# Heading ${Math.floor(i / 20) + 1}`)
    else if (mod === 1 || mod === 4 || mod === 8 || mod === 10 || mod === 14 || mod === 18) lines.push('')
    else if (mod === 2) lines.push(`This is paragraph ${i}. It contains **bold text**, *italic text*, and \`inline code\`.`)
    else if (mod === 3) lines.push(`More text with a [link](https://example.com) and an ![image](img.png).`)
    else if (mod === 5) lines.push('- List item one')
    else if (mod === 6) lines.push('- List item two')
    else if (mod === 7) lines.push('- List item three')
    else if (mod === 9) lines.push('> This is a blockquote with some content.')
    else if (mod === 11) lines.push('```javascript')
    else if (mod === 12) lines.push(`const value_${i} = ${i};`)
    else if (mod === 13) lines.push('```')
    else if (mod === 15) lines.push('| Column A | Column B | Column C |')
    else if (mod === 16) lines.push('|----------|----------|----------|')
    else if (mod === 17) lines.push(`| Cell ${i}-1 | Cell ${i}-2 | Cell ${i}-3 |`)
    else lines.push('---')
  }
  return lines.join('\n')
}

function generateInlineHeavy(lineCount: number): string {
  const lines: string[] = []
  for (let i = 0; i < lineCount; i++) {
    lines.push(`This **bold ${i}** text has *italic* and ~~strike~~ plus \`code\` and [link ${i}](url${i}) and $x^${i}$ math.`)
  }
  return lines.join('\n\n')
}

function benchmark(name: string, fn: () => void, iterations = 50): { median: number; min: number; max: number; p95: number } {
  // Warmup
  for (let i = 0; i < 5; i++) fn()

  const times: number[] = []
  for (let i = 0; i < iterations; i++) {
    const t0 = performance.now()
    fn()
    times.push(performance.now() - t0)
  }
  times.sort((a, b) => a - b)
  return {
    median: times[Math.floor(times.length / 2)]!,
    min: times[0]!,
    max: times[times.length - 1]!,
    p95: times[Math.floor(times.length * 0.95)]!,
  }
}

// Generate test data
const doc100 = generateMarkdown(100)
const doc1K = generateMarkdown(1000)
const doc10K = generateMarkdown(10000)
const inlineHeavy1K = generateInlineHeavy(1000)

console.log('=== PreMarkdown Performance Profile ===\n')
console.log(`doc100: ${doc100.length} bytes, ${doc100.split('\n').length} lines`)
console.log(`doc1K: ${doc1K.length} bytes, ${doc1K.split('\n').length} lines`)
console.log(`doc10K: ${doc10K.length} bytes, ${doc10K.split('\n').length} lines`)
console.log(`inlineHeavy1K: ${inlineHeavy1K.length} bytes, ${inlineHeavy1K.split('\n').length} lines`)
console.log('')

// Parse benchmarks
const results: { name: string; median: number; p95: number }[] = []

for (const [name, input] of [
  ['Parse 100 lines', doc100],
  ['Parse 1K lines', doc1K],
  ['Parse 10K lines', doc10K],
  ['Parse 1K inline-heavy', inlineHeavy1K],
] as const) {
  const r = benchmark(name, () => { resetNodeIds(); parse(input) })
  results.push({ name, median: r.median, p95: r.p95 })
  console.log(`${name.padEnd(25)} median: ${r.median.toFixed(3)}ms  min: ${r.min.toFixed(3)}ms  p95: ${r.p95.toFixed(3)}ms  max: ${r.max.toFixed(3)}ms`)
}

console.log('')

// Render benchmarks
const ast100 = parse(doc100)
const ast1K = parse(doc1K)

for (const [name, ast] of [
  ['Render 100 lines', ast100],
  ['Render 1K lines', ast1K],
] as const) {
  const r = benchmark(name, () => { renderToHtml(ast) })
  results.push({ name, median: r.median, p95: r.p95 })
  console.log(`${name.padEnd(25)} median: ${r.median.toFixed(3)}ms  min: ${r.min.toFixed(3)}ms  p95: ${r.p95.toFixed(3)}ms  max: ${r.max.toFixed(3)}ms`)
}

console.log('')

// Full pipeline
for (const [name, input] of [
  ['Pipeline 100 lines', doc100],
  ['Pipeline 1K lines', doc1K],
] as const) {
  const r = benchmark(name, () => { resetNodeIds(); renderToHtml(parse(input)) })
  results.push({ name, median: r.median, p95: r.p95 })
  console.log(`${name.padEnd(25)} median: ${r.median.toFixed(3)}ms  min: ${r.min.toFixed(3)}ms  p95: ${r.p95.toFixed(3)}ms  max: ${r.max.toFixed(3)}ms`)
}

console.log('\n=== Performance Targets ===')
console.log('Parse 1K:  target < 10ms, actual:', results.find(r => r.name.includes('1K lines') && r.name.startsWith('Parse'))?.median.toFixed(3) + 'ms')
console.log('Parse 10K: target < 100ms, actual:', results.find(r => r.name.includes('10K'))?.median.toFixed(3) + 'ms')
console.log('Render 1K: target < 5ms, actual:', results.find(r => r.name.includes('1K') && r.name.startsWith('Render'))?.median.toFixed(3) + 'ms')

// Identify bottleneck: parse vs render proportion
const parse1K = results.find(r => r.name === 'Parse 1K lines')!.median
const pipeline1K = results.find(r => r.name === 'Pipeline 1K lines')!.median
const render1K = pipeline1K - parse1K
console.log(`\nPipeline 1K: parse ${parse1K.toFixed(3)}ms (${(parse1K/pipeline1K*100).toFixed(0)}%) + render ${render1K.toFixed(3)}ms (${(render1K/pipeline1K*100).toFixed(0)}%)`)

// Incremental parse benchmark
import { IncrementalParser } from '../packages/parser/src/incremental.js'

console.log('\n--- Incremental Parse ---')
const incParser = new IncrementalParser(doc1K)
const incResult = benchmark('Incremental single-line edit', () => {
  incParser.applyEdit({ fromLine: 50, toLine: 51, newText: 'Modified line content here' })
  // Restore for next iteration
  incParser.applyEdit({ fromLine: 50, toLine: 51, newText: 'This is paragraph 52. It contains **bold text**, *italic text*, and `inline code`.' })
}, 200)
results.push({ name: 'Incremental edit', median: incResult.median, p95: incResult.p95 })
console.log(`Incremental vs full parse: ${(incResult.median / parse1K * 100).toFixed(1)}% of full parse time`)
