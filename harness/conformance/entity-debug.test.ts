import { describe, it } from 'vitest'
import { parse } from '@pre-markdown/parser'
import { renderToHtml } from '@pre-markdown/renderer'
import { resetNodeIds } from '@pre-markdown/core'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const specPath = resolve(__dirname, '../../harness/fixtures/commonmark-spec.json')
const spec = JSON.parse(readFileSync(specPath, 'utf-8'))
const norm = (s: string) => s.replace(/\r\n/g, '\n').replace(/\n+$/, '\n')

describe('Entity refs', () => {
  for (const ex of spec.filter((e: any) => e.section === 'Entity and numeric character references')) {
    it(`Ex ${ex.example}`, () => {
      resetNodeIds()
      const actual = renderToHtml(parse(ex.markdown), { sanitize: false })
      if (norm(actual) !== norm(ex.html)) {
        console.log(`Ex ${ex.example}: md=${JSON.stringify(ex.markdown).slice(0, 50)}`)
        console.log(`  exp: ${JSON.stringify(ex.html).slice(0, 70)}`)
        console.log(`  got: ${JSON.stringify(actual).slice(0, 70)}`)
      }
    })
  }
})
