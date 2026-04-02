/**
 * Inline parser micro-benchmark — identify which tryXxx functions cost the most.
 */
import { parse } from '../packages/parser/src/index.js'
import { resetNodeIds } from '../packages/core/src/index.js'

function generateInlineHeavy(lineCount: number): string {
  const lines: string[] = []
  for (let i = 0; i < lineCount; i++) {
    lines.push(
      `This **bold ${i}** text has *italic* and ~~strike~~ plus \`code\` and [link ${i}](url${i}) and $x^${i}$ math.`,
    )
  }
  return lines.join('\n\n')
}

function generatePlainParagraphs(lineCount: number): string {
  const lines: string[] = []
  for (let i = 0; i < lineCount; i++) {
    lines.push(`This is plain paragraph number ${i} with no special formatting at all, just regular text content.`)
  }
  return lines.join('\n\n')
}

function generateLinksHeavy(lineCount: number): string {
  const lines: string[] = []
  for (let i = 0; i < lineCount; i++) {
    lines.push(`See [link one](url1) and [link two](url2) and [link three](url3 "title") for details.`)
  }
  return lines.join('\n\n')
}

function generateEmphasisHeavy(lineCount: number): string {
  const lines: string[] = []
  for (let i = 0; i < lineCount; i++) {
    lines.push(`This **bold** and *italic* and ***bold italic*** and **more bold** and *more italic* text.`)
  }
  return lines.join('\n\n')
}

function generateCodeHeavy(lineCount: number): string {
  const lines: string[] = []
  for (let i = 0; i < lineCount; i++) {
    lines.push(`Use \`code1\` and \`code2\` and \`\`code with \`backtick\`\`\` inside.`)
  }
  return lines.join('\n\n')
}

function bench(name: string, fn: () => void, iters = 100): number {
  for (let i = 0; i < 5; i++) fn()
  const times: number[] = []
  for (let i = 0; i < iters; i++) {
    const t0 = performance.now()
    fn()
    times.push(performance.now() - t0)
  }
  times.sort((a, b) => a - b)
  const median = times[Math.floor(times.length / 2)]!
  console.log(`${name.padEnd(30)} median: ${median.toFixed(3)}ms`)
  return median
}

const N = 500
console.log(`=== Inline Parser Micro-Benchmark (${N} paragraphs each) ===\n`)

const plain = generatePlainParagraphs(N)
const emphasis = generateEmphasisHeavy(N)
const links = generateLinksHeavy(N)
const code = generateCodeHeavy(N)
const mixed = generateInlineHeavy(N)

const tPlain = bench('Plain text only', () => { resetNodeIds(); parse(plain) })
const tEmphasis = bench('Emphasis heavy', () => { resetNodeIds(); parse(emphasis) })
const tLinks = bench('Links heavy', () => { resetNodeIds(); parse(links) })
const tCode = bench('Code spans heavy', () => { resetNodeIds(); parse(code) })
const tMixed = bench('Mixed inline', () => { resetNodeIds(); parse(mixed) })

console.log('\n=== Cost Attribution ===')
console.log(`Emphasis overhead: ${(tEmphasis - tPlain).toFixed(3)}ms (${((tEmphasis - tPlain) / tEmphasis * 100).toFixed(0)}% of emphasis time)`)
console.log(`Links overhead:    ${(tLinks - tPlain).toFixed(3)}ms (${((tLinks - tPlain) / tLinks * 100).toFixed(0)}% of links time)`)
console.log(`Code overhead:     ${(tCode - tPlain).toFixed(3)}ms (${((tCode - tPlain) / tCode * 100).toFixed(0)}% of code time)`)
