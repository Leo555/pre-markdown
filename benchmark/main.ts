/**
 * PreMarkdown vs 主流 Markdown 库 — 性能压测
 *
 * 引擎列表:
 *   1. PreMarkdown (本项目)
 *   2. Cherry Markdown Engine (腾讯)
 *   3. marked (最流行, 速度型)
 *   4. markdown-it (功能完整, 插件丰富)
 *   5. commonmark.js (严格 CommonMark 规范)
 *   6. showdown (历史悠久)
 *   7. remarkable (markdown-it 前身)
 */
import { parse } from '@pre-markdown/parser'
import { renderToHtml } from '@pre-markdown/renderer'
import { resetNodeIds } from '@pre-markdown/core'
import { marked } from 'marked'
import MarkdownIt from 'markdown-it'
import * as commonmark from 'commonmark'
import Showdown from 'showdown'
import { Remarkable } from 'remarkable'
import CherryEngine from 'cherry-markdown/engine'

// ============================================================
// DOM
// ============================================================
const $log = document.getElementById('log')!
const $status = document.getElementById('status')!
const $results = document.getElementById('results')!
const $cherryStatus = document.getElementById('cherry-status')!

// ============================================================
// Engine setup
// ============================================================

// Cherry Engine (ESM import)
let cherryAvailable = false
try {
  if (typeof CherryEngine === 'function') {
    cherryAvailable = true
  }
} catch { /* ignore */ }
$cherryStatus.textContent = cherryAvailable ? '✓ Cherry Engine 已加载' : '✗ Cherry Engine 未加载'
$cherryStatus.className = cherryAvailable ? 'cherry-status cherry-ok' : 'cherry-status cherry-fail'

// markdown-it instance
const mdit = new MarkdownIt()

// commonmark parser + renderer
const cmReader = new commonmark.Parser()
const cmWriter = new commonmark.HtmlRenderer()

// showdown converter
const sdConverter = new Showdown.Converter()

// remarkable instance
const remarkableInst = new Remarkable()

// Cherry engine instance (lazy)
let cherryEngineInstance: any = null
function getCherryEngine(): any {
  if (cherryEngineInstance) return cherryEngineInstance
  if (!cherryAvailable) return null
  try {
    cherryEngineInstance = new CherryEngine({ global: { flowSessionContext: false } })
    return cherryEngineInstance
  } catch (e: any) {
    log(`Cherry Engine 创建失败: ${e.message}`, 'err')
    return null
  }
}

// ============================================================
// Logging
// ============================================================
function log(msg: string, cls = '') {
  const span = document.createElement('span')
  span.className = cls
  span.textContent = msg + '\n'
  $log.appendChild(span)
  $log.scrollTop = $log.scrollHeight
}

// ============================================================
// File loading
// ============================================================
const fileCache = new Map<string, string>()
async function loadFile(name: string): Promise<string> {
  if (fileCache.has(name)) return fileCache.get(name)!
  log(`加载: ${name}...`, 'info')
  const resp = await fetch(`./fixtures/${name}`)
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  const text = await resp.text()
  fileCache.set(name, text)
  log(`  → ${(text.length / 1024).toFixed(1)}KB, ${text.split('\n').length.toLocaleString()} 行`, 'info')
  return text
}

// ============================================================
// Benchmark helpers
// ============================================================
interface EngineResult {
  name: string
  total: number
  parse: number
  render: number
  all: number[]
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0
  const s = [...arr].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 === 0 ? (s[m - 1]! + s[m]!) / 2 : s[m]!
}

function benchEngine(
  name: string,
  fn: (md: string) => void,
  md: string,
  iterations: number,
): EngineResult {
  const times: number[] = []
  for (let i = 0; i < iterations; i++) {
    const t0 = performance.now()
    fn(md)
    const t1 = performance.now()
    times.push(t1 - t0)
  }
  return { name, total: median(times), parse: 0, render: 0, all: times }
}

function benchPreMarkdown(md: string, iterations: number): EngineResult {
  const parseTimes: number[] = []
  const renderTimes: number[] = []
  for (let i = 0; i < iterations; i++) {
    resetNodeIds()
    const t0 = performance.now()
    const ast = parse(md)
    const t1 = performance.now()
    renderToHtml(ast, { sanitize: true })
    const t2 = performance.now()
    parseTimes.push(t1 - t0)
    renderTimes.push(t2 - t1)
  }
  const totals = parseTimes.map((p, i) => p + renderTimes[i]!)
  return {
    name: 'PreMarkdown',
    total: median(totals),
    parse: median(parseTimes),
    render: median(renderTimes),
    all: totals,
  }
}

// ============================================================
// Format helpers
// ============================================================
function fms(ms: number): string {
  if (ms < 0) return 'N/A'
  if (ms < 1) return ms.toFixed(3) + 'ms'
  if (ms < 1000) return ms.toFixed(2) + 'ms'
  return (ms / 1000).toFixed(2) + 's'
}
function fsize(b: number): string {
  if (b < 1024) return b + 'B'
  if (b < 1048576) return (b / 1024).toFixed(1) + 'KB'
  return (b / 1048576).toFixed(1) + 'MB'
}

// ============================================================
// Results rendering
// ============================================================
function addResult(fileName: string, size: number, lines: number, results: EngineResult[]) {
  // Find fastest
  const valid = results.filter(r => r.total > 0)
  const fastest = valid.length > 0 ? valid.reduce((a, b) => a.total < b.total ? a : b) : null

  const tr = document.createElement('tr')
  let cells = `<td>${fileName}</td><td>${fsize(size)}</td><td>${lines.toLocaleString()}</td>`

  for (const r of results) {
    const isFastest = fastest && r.name === fastest.name
    const cls = r.total < 0 ? '' : (isFastest ? 'winner' : '')

    if (r.name === 'PreMarkdown') {
      cells += `<td>${fms(r.parse)}</td><td>${fms(r.render)}</td>`
    }
    cells += `<td class="${cls}">${fms(r.total)}</td>`
  }

  // Ratio vs PreMarkdown
  const pre = results.find(r => r.name === 'PreMarkdown')
  if (pre && pre.total > 0) {
    for (const r of results) {
      if (r.name === 'PreMarkdown') continue
      if (r.total > 0) {
        const ratio = r.total / pre.total
        cells += `<td class="ratio">${ratio.toFixed(2)}x</td>`
      } else {
        cells += `<td>-</td>`
      }
    }
  }

  tr.innerHTML = cells
  $results.appendChild(tr)
}

// ============================================================
// Engine names & order
// ============================================================
const ENGINE_NAMES = ['PreMarkdown', 'Cherry', 'marked', 'markdown-it', 'commonmark', 'showdown', 'remarkable']

const ALL_FILES = [
  'test_basic.md', 'test_code.md', 'test_table.md', 'test_special.md', 'test_complex.md',
  'test_50KB.md', 'test_100KB.md', 'test_200KB.md', 'test_300KB.md', 'test_500KB.md',
  'test_long_1MB.md',
]

// ============================================================
// Main runner
// ============================================================
async function runBenchmark() {
  const fileSelect = (document.getElementById('file-select') as HTMLSelectElement).value
  const iterations = parseInt((document.getElementById('iterations') as HTMLInputElement).value) || 3
  const btn = document.getElementById('btn-run') as HTMLButtonElement
  btn.disabled = true
  $status.textContent = '压测进行中...'

  const files = fileSelect === 'ALL' ? ALL_FILES : [fileSelect]

  log(`\n${'='.repeat(70)}`, 'info')
  log(`压测开始 — ${new Date().toLocaleTimeString()} — ${iterations} 次迭代 — ${files.length} 个文件`, 'info')
  log(`引擎: ${ENGINE_NAMES.join(' | ')}`, 'info')
  log(`${'='.repeat(70)}`, 'info')

  for (const fileName of files) {
    $status.textContent = `测试: ${fileName}...`
    log(`\n▶ ${fileName}`, 'info')
    await new Promise(r => setTimeout(r, 30))

    let md: string
    try {
      md = await loadFile(fileName)
    } catch (e: any) {
      log(`  加载失败: ${e.message}`, 'err')
      continue
    }

    const size = new Blob([md]).size
    const lines = md.split('\n').length
    const skipHeavy = size > 5 * 1024 * 1024 // >5MB skip slow engines

    const results: EngineResult[] = []

    // 1. PreMarkdown
    log(`  PreMarkdown...`)
    await new Promise(r => setTimeout(r, 5))
    const pre = benchPreMarkdown(md, iterations)
    results.push(pre)
    log(`    Parse: ${pre.all.map(fms).join(', ')}  |  median: ${fms(pre.parse)}`)
    log(`    Render: ${fms(pre.render)}  |  Total: ${fms(pre.total)}`, 'info')

    // 2. Cherry
    if (!skipHeavy && cherryAvailable) {
      log(`  Cherry...`)
      await new Promise(r => setTimeout(r, 5))
      const engine = getCherryEngine()
      if (engine) {
        const r = benchEngine('Cherry', (m) => engine.makeHtml(m), md, iterations)
        results.push(r)
        log(`    ${r.all.map(fms).join(', ')}  |  median: ${fms(r.total)}`, 'info')
      } else {
        results.push({ name: 'Cherry', total: -1, parse: 0, render: 0, all: [] })
      }
    } else {
      results.push({ name: 'Cherry', total: -1, parse: 0, render: 0, all: [] })
      if (skipHeavy) log(`  Cherry: 跳过 (>5MB)`, 'warn')
    }

    // 3. marked
    log(`  marked...`)
    await new Promise(r => setTimeout(r, 5))
    const rMarked = benchEngine('marked', (m) => marked(m), md, iterations)
    results.push(rMarked)
    log(`    ${rMarked.all.map(fms).join(', ')}  |  median: ${fms(rMarked.total)}`, 'info')

    // 4. markdown-it
    log(`  markdown-it...`)
    await new Promise(r => setTimeout(r, 5))
    const rMdit = benchEngine('markdown-it', (m) => mdit.render(m), md, iterations)
    results.push(rMdit)
    log(`    ${rMdit.all.map(fms).join(', ')}  |  median: ${fms(rMdit.total)}`, 'info')

    // 5. commonmark
    log(`  commonmark...`)
    await new Promise(r => setTimeout(r, 5))
    const rCm = benchEngine('commonmark', (m) => cmWriter.render(cmReader.parse(m)), md, iterations)
    results.push(rCm)
    log(`    ${rCm.all.map(fms).join(', ')}  |  median: ${fms(rCm.total)}`, 'info')

    // 6. showdown
    if (!skipHeavy) {
      log(`  showdown...`)
      await new Promise(r => setTimeout(r, 5))
      const rSd = benchEngine('showdown', (m) => sdConverter.makeHtml(m), md, iterations)
      results.push(rSd)
      log(`    ${rSd.all.map(fms).join(', ')}  |  median: ${fms(rSd.total)}`, 'info')
    } else {
      results.push({ name: 'showdown', total: -1, parse: 0, render: 0, all: [] })
      log(`  showdown: 跳过 (>5MB)`, 'warn')
    }

    // 7. remarkable
    log(`  remarkable...`)
    await new Promise(r => setTimeout(r, 5))
    const rRm = benchEngine('remarkable', (m) => remarkableInst.render(m), md, iterations)
    results.push(rRm)
    log(`    ${rRm.all.map(fms).join(', ')}  |  median: ${fms(rRm.total)}`, 'info')

    // Summary
    const valid = results.filter(r => r.total > 0)
    if (valid.length > 1) {
      const sorted = [...valid].sort((a, b) => a.total - b.total)
      log(`  🏆 ${sorted[0]!.name} 最快 (${fms(sorted[0]!.total)})`, 'info')
    }

    addResult(fileName, size, lines, results)
  }

  log(`\n${'='.repeat(70)}`, 'info')
  log(`压测完成 — ${new Date().toLocaleTimeString()}`, 'info')
  $status.textContent = '完成！'
  btn.disabled = false
}

function clearResults() {
  $results.innerHTML = ''
  $log.innerHTML = ''
  $status.textContent = ''
}

// ============================================================
// Bind UI
// ============================================================
document.getElementById('btn-run')!.addEventListener('click', runBenchmark)
document.getElementById('btn-clear')!.addEventListener('click', clearResults)
