/**
 * Markdown 语法兼容性测试 — 内嵌版 (用于合并页面)
 *
 * 与 compat.ts 逻辑相同，但操作不同的 DOM 容器 ID
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
// Engines
// ============================================================
const mdit = new MarkdownIt()
const cmReader = new commonmark.Parser()
const cmWriter = new commonmark.HtmlRenderer()
const sdConverter = new Showdown.Converter({ tables: true, strikethrough: true, tasklists: true })
const remarkableInst = new Remarkable()

let cherryEngine: any = null
try { cherryEngine = new CherryEngine({ global: { flowSessionContext: false } }) } catch {}

type RenderFn = (md: string) => string

const engines: { name: string; render: RenderFn }[] = [
  {
    name: 'PreMarkdown',
    render: (md) => { resetNodeIds(); return renderToHtml(parse(md), { sanitize: false }) },
  },
  {
    name: 'Cherry',
    render: (md) => cherryEngine ? cherryEngine.makeHtml(md) : '',
  },
  {
    name: 'marked',
    render: (md) => marked(md) as string,
  },
  {
    name: 'markdown-it',
    render: (md) => mdit.render(md),
  },
  {
    name: 'commonmark',
    render: (md) => cmWriter.render(cmReader.parse(md)),
  },
  {
    name: 'showdown',
    render: (md) => sdConverter.makeHtml(md),
  },
  {
    name: 'remarkable',
    render: (md) => remarkableInst.render(md),
  },
]

// ============================================================
// Test definitions
// ============================================================
interface SyntaxTest {
  name: string
  markdown: string
  expect: string[]
  reject?: string[]
}

interface TestGroup {
  category: string
  tests: SyntaxTest[]
}

const testGroups: TestGroup[] = [
  {
    category: 'CommonMark — 基础块级',
    tests: [
      { name: 'ATX 标题 H1-H6', markdown: '# H1\n## H2\n### H3\n#### H4\n##### H5\n###### H6', expect: ['<h1', '<h2', '<h3', '<h4', '<h5', '<h6'] },
      { name: 'Setext 标题', markdown: 'H1\n===\n\nH2\n---', expect: ['<h1', '<h2'] },
      { name: '段落', markdown: 'Hello world.\n\nSecond paragraph.', expect: ['<p', 'Hello world', 'Second paragraph'] },
      { name: '块引用', markdown: '> Quote line 1\n> Quote line 2', expect: ['<blockquote'] },
      { name: '嵌套块引用', markdown: '> Outer\n>> Inner', expect: ['<blockquote'] },
      { name: '无序列表', markdown: '- Item 1\n- Item 2\n- Item 3', expect: ['<ul', '<li', 'Item 1', 'Item 2'] },
      { name: '有序列表', markdown: '1. First\n2. Second\n3. Third', expect: ['<ol', '<li', 'First', 'Second'] },
      { name: '代码块（围栏）', markdown: '```js\nconst x = 1;\n```', expect: ['<pre', '<code', 'const x'] },
      { name: '代码块（缩进）', markdown: '    code line 1\n    code line 2', expect: ['<pre', '<code', 'code line'] },
      { name: '水平线 ---', markdown: '---', expect: ['<hr'] },
      { name: '水平线 ***', markdown: '***', expect: ['<hr'] },
      { name: 'HTML 块', markdown: '<div>raw html</div>', expect: ['<div', 'raw html'] },
    ],
  },
  {
    category: 'CommonMark — 内联语法',
    tests: [
      { name: '加粗 **text**', markdown: 'Hello **bold** world', expect: ['<strong', 'bold'] },
      { name: '斜体 *text*', markdown: 'Hello *italic* world', expect: ['<em', 'italic'] },
      { name: '加粗斜体 ***text***', markdown: '***bold italic***', expect: ['<strong', '<em'] },
      { name: '行内代码', markdown: 'Use `code` here', expect: ['<code', 'code'] },
      { name: '双反引号代码', markdown: '`` code with ` inside ``', expect: ['<code'] },
      { name: '链接', markdown: '[Google](https://google.com)', expect: ['<a', 'href', 'google.com', 'Google'] },
      { name: '链接 + title', markdown: '[text](url "title")', expect: ['<a', 'title'] },
      { name: '图片', markdown: '![alt text](img.png)', expect: ['<img', 'src', 'img.png', 'alt'] },
      { name: '自动链接', markdown: '<https://example.com>', expect: ['<a', 'example.com'] },
      { name: '邮箱自动链接', markdown: '<user@example.com>', expect: ['<a', 'mailto'] },
      { name: '硬换行（双空格）', markdown: 'line1  \nline2', expect: ['<br'] },
      { name: '转义字符', markdown: '\\*not bold\\*', expect: ['*not bold*'], reject: ['<em', '<strong'] },
      { name: 'HTML 内联', markdown: 'text <em>inline html</em> more', expect: ['<em', 'inline html'] },
    ],
  },
  {
    category: 'GFM 扩展',
    tests: [
      { name: '删除线 ~~text~~', markdown: '~~deleted~~', expect: ['<del', 'deleted'] },
      { name: '任务列表', markdown: '- [x] Done\n- [ ] Todo', expect: ['type="checkbox"'] },
      { name: 'GFM 表格', markdown: '| A | B |\n|---|---|\n| 1 | 2 |', expect: ['<table', '<th', '<td', 'A', '1'] },
      { name: '表格对齐', markdown: '| L | C | R |\n|:--|:-:|--:|\n| l | c | r |', expect: ['<table', 'left', 'center', 'right'] },
      { name: 'URL 自动链接', markdown: 'Visit https://example.com today', expect: ['<a', 'example.com'] },
    ],
  },
  {
    category: '数学公式',
    tests: [
      { name: '行内公式 $...$', markdown: 'The formula $E=mc^2$ is famous.', expect: ['E=mc'] },
      { name: '块级公式 $$...$$', markdown: '$$\n\\sum_{i=1}^{n} i\n$$', expect: ['sum'] },
    ],
  },
  {
    category: '高级内联',
    tests: [
      { name: '高亮 ==text==', markdown: 'This is ==highlighted== text', expect: ['highlighted'] },
      { name: '上标 ^text^', markdown: 'H^2^O', expect: ['<sup', '2'] },
      { name: '下标 ~text~', markdown: 'H~2~O', expect: ['<sub', '2'] },
      { name: '脚注引用 [^1]', markdown: 'Text[^1]\n\n[^1]: Footnote', expect: ['1'] },
    ],
  },
  {
    category: 'Cherry 扩展语法',
    tests: [
      { name: '字体颜色 !!color text!!', markdown: '!!red 红色文字!!', expect: ['color', 'red'] },
      { name: '字体大小 !size text!', markdown: '!24 大号文字!', expect: ['font-size', '24'] },
      { name: '背景色 !!!color text!!!', markdown: '!!!yellow 黄色背景!!!', expect: ['background', 'yellow'] },
      { name: '下划线 /text/', markdown: 'This is /underlined/ text', expect: ['underline'] },
      { name: '下标 ^^text^^', markdown: '^^subscript^^', expect: ['<sub', 'subscript'] },
      { name: 'Ruby 注音 {text|ann}', markdown: '{漢字|かんじ}', expect: ['<ruby', 'かんじ'] },
      { name: '面板 ::: info', markdown: '::: info 提示\n内容\n:::', expect: ['info'] },
      { name: '折叠块 +++', markdown: '+++ 标题\n内容\n+++', expect: ['<details', '<summary', '标题'] },
      { name: 'TOC [toc]', markdown: '# Title\n\n[toc]', expect: ['toc'] },
    ],
  },
  {
    category: '多媒体',
    tests: [
      { name: '音频 !audio[](url)', markdown: '!audio[音频](test.mp3)', expect: ['audio', 'test.mp3'] },
      { name: '视频 !video[](url)', markdown: '!video[视频](test.mp4)', expect: ['video', 'test.mp4'] },
    ],
  },
  {
    category: '边界情况',
    tests: [
      { name: '空文档', markdown: '', expect: [] },
      { name: '纯空行', markdown: '\n\n\n', expect: [] },
      { name: '特殊字符 <>&"', markdown: 'a < b & c > d "e"', expect: ['&lt;', '&amp;', '&gt;'] },
      { name: '中文内容', markdown: '# 你好世界\n\n这是**中文**内容。', expect: ['你好世界', '<strong', '中文'] },
      { name: 'Emoji Unicode', markdown: 'Hello 🌍🚀', expect: ['🌍', '🚀'] },
      { name: '深嵌套列表', markdown: '- L1\n  - L2\n    - L3\n      - L4', expect: ['<ul', 'L1', 'L4'] },
      { name: '长段落（1000字符）', markdown: 'A'.repeat(1000), expect: ['A'] },
    ],
  },
]

// ============================================================
// Test runner
// ============================================================
type TestResult = 'pass' | 'fail' | 'partial'

function runTest(render: RenderFn, test: SyntaxTest): TestResult {
  try {
    const html = render(test.markdown)
    if (!html && test.expect.length === 0) return 'pass'

    const lower = html.toLowerCase()
    let passCount = 0
    for (const exp of test.expect) {
      if (lower.includes(exp.toLowerCase())) passCount++
    }

    if (test.reject) {
      for (const rej of test.reject) {
        if (lower.includes(rej.toLowerCase())) return 'fail'
      }
    }

    if (test.expect.length === 0) return 'pass'
    if (passCount === test.expect.length) return 'pass'
    if (passCount > 0) return 'partial'
    return 'fail'
  } catch {
    return 'fail'
  }
}

// ============================================================
// DOM helpers (compat tab DOM IDs)
// ============================================================
const $results = document.getElementById('compat-results')!
const $scores = document.getElementById('compat-scores')!
const $log = document.getElementById('compat-log')!
const $status = document.getElementById('compat-status')!

function log(msg: string, cls = '') {
  const span = document.createElement('span')
  span.className = cls
  span.textContent = msg + '\n'
  $log.appendChild(span)
  $log.scrollTop = $log.scrollHeight
}

function resultIcon(r: TestResult): string {
  if (r === 'pass') return '<span class="pass">✓</span>'
  if (r === 'partial') return '<span class="partial">~</span>'
  return '<span class="fail">✗</span>'
}

// ============================================================
// Run all
// ============================================================
function runAll() {
  $results.innerHTML = ''
  $scores.innerHTML = ''
  $log.innerHTML = ''
  $status.textContent = '测试中...'

  const totals: Record<string, { pass: number; partial: number; fail: number; total: number }> = {}
  for (const e of engines) {
    totals[e.name] = { pass: 0, partial: 0, fail: 0, total: 0 }
  }

  log(`${'='.repeat(60)}`, 'info')
  log(`语法兼容性测试 — ${new Date().toLocaleTimeString()}`, 'info')
  log(`引擎: ${engines.map(e => e.name).join(' | ')}`, 'info')
  log(`${'='.repeat(60)}\n`, 'info')

  for (const group of testGroups) {
    log(`▶ ${group.category} (${group.tests.length} 项)`, 'info')

    const card = document.createElement('div')
    card.className = 'test-card'

    const header = document.createElement('div')
    header.className = 'test-card-header'
    header.innerHTML = `<h3>${group.category}</h3><span style="color:var(--dim);font-size:12px">${group.tests.length} 项</span>`
    card.appendChild(header)

    const grid = document.createElement('div')
    grid.className = 'test-card-body'

    grid.innerHTML += `<div class="test-cell header">语法</div>`
    for (const e of engines) {
      grid.innerHTML += `<div class="test-cell header">${e.name}</div>`
    }

    for (const test of group.tests) {
      grid.innerHTML += `<div class="test-cell syntax" title="${test.markdown.replace(/"/g, '&quot;')}">${test.name}</div>`

      const row: string[] = []
      for (const engine of engines) {
        const result = runTest(engine.render, test)
        totals[engine.name]!.total++
        totals[engine.name]![result]++
        row.push(result)
        grid.innerHTML += `<div class="test-cell">${resultIcon(result)}</div>`
      }

      const details = row.map((r, i) => `${engines[i]!.name}=${r}`).join(' ')
      log(`  ${test.name}: ${details}`)
    }

    card.appendChild(grid)
    $results.appendChild(card)
    log('')
  }

  // Score cards
  log(`\n${'='.repeat(60)}`, 'info')
  log(`总分:`, 'info')

  for (const engine of engines) {
    const t = totals[engine.name]!
    const pct = t.total > 0 ? Math.round(((t.pass + t.partial * 0.5) / t.total) * 100) : 0
    const color = pct >= 80 ? 'var(--green)' : pct >= 50 ? 'var(--yellow)' : 'var(--red)'

    const card = document.createElement('div')
    card.className = 'score-card'
    card.innerHTML = `
      <div class="name">${engine.name}</div>
      <div class="score" style="color:${color}">${pct}%</div>
      <div style="font-size:11px;color:var(--dim);margin-top:4px">
        <span class="pass">✓${t.pass}</span> &nbsp;
        <span class="partial">~${t.partial}</span> &nbsp;
        <span class="fail">✗${t.fail}</span>
        &nbsp; / ${t.total}
      </div>
    `
    $scores.appendChild(card)

    log(`  ${engine.name}: ${pct}% (✓${t.pass} ~${t.partial} ✗${t.fail} / ${t.total})`, pct >= 80 ? 'info' : 'warn')
  }

  $status.textContent = '完成！'
}

function clearAll() {
  $results.innerHTML = ''
  $scores.innerHTML = ''
  $log.innerHTML = ''
  $status.textContent = ''
}

document.getElementById('btn-run-compat')?.addEventListener('click', runAll)
document.getElementById('btn-clear-compat')?.addEventListener('click', clearAll)
