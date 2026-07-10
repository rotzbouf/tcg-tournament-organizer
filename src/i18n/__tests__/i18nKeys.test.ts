import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// JSON.parse keeps only the last of duplicate keys, so a duplicated top-level
// section silently swallows every translation of the earlier one (that is how
// export.csv/pdf/pairings/report broke in 1.6.5). Scan the raw text instead.
const files = ['de.json', 'en.json']

describe('i18n resource files', () => {
  it.each(files)('%s has no duplicate top-level keys', file => {
    const raw = readFileSync(resolve(__dirname, '..', file), 'utf8')
    const keys = [...raw.matchAll(/^ {2}"([^"]+)":/gm)].map(m => m[1])
    const seen = new Set<string>()
    const dupes = keys.filter(k => (seen.has(k) ? true : (seen.add(k), false)))
    expect(dupes).toEqual([])
  })

  it('de and en expose the same keys', () => {
    const flatten = (obj: Record<string, unknown>, prefix = ''): string[] =>
      Object.entries(obj).flatMap(([k, v]) =>
        v !== null && typeof v === 'object' ? flatten(v as Record<string, unknown>, `${prefix}${k}.`) : [`${prefix}${k}`]
      )
    const de = JSON.parse(readFileSync(resolve(__dirname, '..', 'de.json'), 'utf8'))
    const en = JSON.parse(readFileSync(resolve(__dirname, '..', 'en.json'), 'utf8'))
    const deKeys = new Set(flatten(de))
    const enKeys = new Set(flatten(en))
    expect([...deKeys].filter(k => !enKeys.has(k))).toEqual([])
    expect([...enKeys].filter(k => !deKeys.has(k))).toEqual([])
  })
})
