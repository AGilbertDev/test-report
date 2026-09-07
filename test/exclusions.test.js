import path from 'node:path'
import { describe, expect, it } from 'vitest'
import ex from '../src/exclusions.cjs'
import { fixtures } from './helpers.js'

describe('parseExclusions', () => {
  it('reads the current shape with reasons', () => {
    expect(ex.parseExclusions({ files: [{ path: 'a.ts', reason: 'wiring' }] })).toEqual([{ path: 'a.ts', reason: 'wiring' }])
  })
  it('reads the older plain list without reasons', () => {
    expect(ex.parseExclusions({ excludeFromReports: ['a.ts', 'b.ts'] })).toEqual([{ path: 'a.ts', reason: '' }, { path: 'b.ts', reason: '' }])
  })
  it('ignores garbage', () => {
    expect(ex.parseExclusions(null)).toEqual([])
    expect(ex.parseExclusions({ files: [{}] })).toEqual([])
  })
})

describe('readExclusions', () => {
  it('reports a missing file as absent, not as an error', () => {
    expect(ex.readExclusions(path.join(fixtures, 'nope.json')).present).toBe(false)
  })
  it('reads the fixture', () => {
    const r = ex.readExclusions(path.join(fixtures, 'test-exclusions.json'))
    expect(r.files[0].path).toBe('server/plugins/session.ts')
  })
})

describe('isExcluded', () => {
  const list = { files: [{ path: 'server/plugins/session.ts', reason: '' }] }
  it('matches the exact path and a suffix path', () => {
    expect(ex.isExcluded('server/plugins/session.ts', list)).toBe(true)
    expect(ex.isExcluded('apps/web/server/plugins/session.ts', list)).toBe(true)
    expect(ex.isExcluded('server/plugins/session-store.ts', list)).toBe(false)
  })
})
