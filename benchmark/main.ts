/**
 * PreMarkdown vs Cherry — 性能压测主逻辑
 */
import { parse } from '@pre-markdown/parser'
import { renderToHtml } from '@pre-markdown/renderer'
import { resetNodeIds } from '@pre-markdown/core'

// ============================================================
// DOM elements
// ============================================================
const $log = document.getElementById('log')!
const $status = document.getElementById('status')!
const $results = document.getElementById('results')!
const $cherryStatus = document.getElementById('cherry-status')!

// ============================================================
// Cherry Engine detection
// ============================================================
declare global {
  interface Window {
    CherryEngine?: { default?: new (opts: any) => any } & (new (opts: any) => any)
  }
}

const CherryEngineClass: (new (opts: any) => any) | null = (() => {
  const ce = window.CherryEngine
  if (!ce) return null
  // engine core build: CherryEngine.default is the constructor
  if (typeof (ce as any).default === 'function') return (ce as any).default
  // or CherryEngine itself is the constructor
  if (typeof ce === 'function') return ce as unknown as new (opts: any) => any
  return null
})()

const cherryAvailable = CherryEngineClass !== null

if (cherryAvailable) {
  $cherryStatus.textContent = '✓ Cherry Engine 已加载'
  $cherryStatus.className = 'cherry-status cherry-ok'
} else {
  $cherryStatus.textContent = '✗ Cherry Engine 未加载'
  $cherryStatus.className = 'cherry-status cherry-fail'
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
// File loading (from benchmark/fixtures/)
// ============================================================
const fileCache = new Map<string, string>()

async function loadFile(name: string): Promise<string> {
  if (fileCache.has(name)) return fileCache.get(name)!
  log(`加载文件: ${name}...`, 'info')
  const resp = await fetch(`./fixtures/${name}`)
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  const text = await resp.text()
  fileCache.set(name, text)
  const lines = text.split('\n').length
  log(`  → ${(text.length / 1024).toFixed(1)}KB, ${lines.toLocaleString()} 行`, 'info')
  return text
}

// ============================================================
// PreMarkdown benchmark
// ============================================================
interface PreResult {
  parse: number
  render: number
  total: number
  allParse: number[]
  allRender: number[]
}

function benchPreMarkdown(md: string, iterations: number): PreResult {
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
  return {
    parse: median(parseTimes),
    render: median(renderTimes),
    total: median(parseTimes.map((p, i) => p + renderTimes[i]!)),
    allParse: parseTimes,
    allRender: renderTimes,
  }
}

// ============================================================
// Cherry benchmark
// ============================================================
interface CherryResult {
  total: number
  allTotal: number[]
}

let cherryEngineInstance: any = null

function getCherryEngine(): any {
  if (cherryEngineInstance) return cherryEngineInstance
  if (!CherryEngineClass) return null
  try {
    cherryEngineInstance = new CherryEngineClass({
      global: { flowSessionContext: false },
    })
    return cherryEngineInstance
  } catch (e: any) {
    log(`Cherry Engine 创建失败: ${e.message}`, 'err')
    return null
  }
}

function benchCherry(md: string, iterations: number): CherryResult {
  const engine = getCherryEngine()
  if (!engine) return { total: -1, allTotal: [] }

  const times: number[] = []
  for (let i = 0; i < iterations; i++) {
    const t0 = performance.now()
    try {
      engine.makeHtml(md)
    } catch (e: any) {
      log(`Cherry makeHtml 错误: ${e.message}`, 'err')
      return { total: -1, allTotal: [] }
    }
    const t1 = performance.now()
    times.push(t1 - t0)
  }
  return { total: median(times), allTotal: times }
}

// ============================================================
// Utilities
// ============================================================
function median(arr: number[]): number {
  if (arr.length === 0) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!
}

function formatMs(ms: number): string {
  if (ms < 0) return 'N/A'
  if (ms < 1) return ms.toFixed(3) + 'ms'
  if (ms < 1000) return ms.toFixed(2) + 'ms'
  return (ms / 1000).toFixed(2) + 's'
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + 'B'
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + 'KB'
  return (bytes / 1048576).toFixed(1) + 'MB'
}

// ============================================================
// Results table
// ============================================================
function addResult(name: string, size: number, lines: number, pre: PreResult, cherry: CherryResult) {
  const tr = document.createElement('tr')
  const ratio = (cherry.total > 0 && pre.total > 0) ? (cherry.total / pre.total) : null
  const preWins = ratio !== null && ratio > 1
  tr.innerHTML = `
    <td>${name}</td>
    <td>${formatSize(size)}</td>
    <td>${lines.toLocaleString()}</td>
    <td>${formatMs(pre.parse)}</td>
    <td>${formatMs(pre.render)}</td>
    <td class="${preWins ? 'winner' : (ratio !== null ? 'loser' : '')}">${formatMs(pre.total)}</td>
    <td class="${ratio !== null ? (preWins ? 'loser' : 'winner') : ''}">${formatMs(cherry.total)}</td>
    <td class="ratio">${ratio !== null ? ratio.toFixed(2) + 'x' : 'N/A'}</td>
    <td>${ratio !== null ? (preWins ? '<span class="winner">PreMarkdown</span>' : '<span class="loser">Cherry</span>') : '-'}</td>
  `
  $results.appendChild(tr)
}

// ============================================================
// Benchmark runner
// ============================================================
const ALL_FILES = [
  'test_basic.md', 'test_code.md', 'test_table.md', 'test_special.md', 'test_complex.md',
  'test_50KB.md', 'test_100KB.md', 'test_200KB.md', 'test_300KB.md', 'test_500KB.md',
  'test_long_1MB.md',
]

async function runBenchmark() {
  const fileSelect = (document.getElementById('file-select') as HTMLSelectElement).value
  const iterations = parseInt((document.getElementById('iterations') as HTMLInputElement).value) || 3
  const btn = document.getElementById('btn-run') as HTMLButtonElement
  btn.disabled = true
  $status.textContent = '压测进行中...'

  const files = fileSelect === 'ALL' ? ALL_FILES : [fileSelect]

  log(`\n${'='.repeat(60)}`, 'info')
  log(`压测开始 — ${new Date().toLocaleTimeString()} — ${iterations} 次迭代`, 'info')
  log(`${'='.repeat(60)}`, 'info')

  for (const fileName of files) {
    $status.textContent = `测试: ${fileName}...`
    log(`\n▶ ${fileName}`, 'info')
    await new Promise(r => setTimeout(r, 50))

    let md: string
    try {
      md = await loadFile(fileName)
    } catch (e: any) {
      log(`  加载失败: ${e.message}`, 'err')
      continue
    }

    const size = new Blob([md]).size
    const lines = md.split('\n').length
    const skipCherry = size > 5 * 1024 * 1024

    // PreMarkdown
    log(`  PreMarkdown (${iterations}x)...`)
    await new Promise(r => setTimeout(r, 10))
    const pre = benchPreMarkdown(md, iterations)
    log(`    Parse:  ${pre.allParse.map(t => formatMs(t)).join(', ')}`)
    log(`    Render: ${pre.allRender.map(t => formatMs(t)).join(', ')}`)
    log(`    Total median: ${formatMs(pre.total)}`, 'info')

    // Cherry
    let cherry: CherryResult = { total: -1, allTotal: [] }
    if (!skipCherry && cherryAvailable) {
      log(`  Cherry (${iterations}x)...`)
      await new Promise(r => setTimeout(r, 10))
      cherry = benchCherry(md, iterations)
      if (cherry.total >= 0) {
        log(`    Total: ${cherry.allTotal.map(t => formatMs(t)).join(', ')}`)
        log(`    Total median: ${formatMs(cherry.total)}`, 'info')
      } else {
        log(`    Cherry 执行失败`, 'err')
      }
    } else if (skipCherry) {
      log(`  Cherry: 跳过（文件 > 5MB）`, 'warn')
    } else {
      log(`  Cherry: 未加载，跳过`, 'warn')
    }

    if (pre.total > 0 && cherry.total > 0) {
      const ratio = cherry.total / pre.total
      const winner = ratio > 1 ? 'PreMarkdown' : 'Cherry'
      log(`  → ${winner} 胜出 (${ratio.toFixed(2)}x)`, ratio > 1 ? 'info' : 'warn')
    }

    addResult(fileName, size, lines, pre, cherry)
  }

  log(`\n${'='.repeat(60)}`, 'info')
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
