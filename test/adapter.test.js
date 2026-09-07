import path from 'node:path'
import { describe, expect, it } from 'vitest'
import vitest from '../src/adapters/vitest.cjs'
import { ROOT, fixtures } from './helpers.js'

describe('readTests', () => {
  const t = vitest.readTests(path.join(fixtures, 'results.json'), ROOT)

  it('counts tests the way Vitest does', () => {
    expect(t.available).toBe(true)
    expect({ total: t.total, passed: t.passed, failed: t.failed, skipped: t.skipped }).toEqual({ total: 5, passed: 3, failed: 1, skipped: 1 })
  })
  it('makes paths repository-relative', () => {
    expect(t.files.map((f) => f.file)).toEqual(['test/server/utils/onboardingReset.test.ts', 'test/shared/planning.test.ts'])
  })
  it('strips colour codes and the stack from a failure message', () => {
    expect(t.failures[0].message).toBe('AssertionError: expected 0 rows for user 2, received 3')
  })
  it('finds the failure location in the stack when Vitest gave none', () => {
    expect(t.failures[0]).toMatchObject({ line: 41, column: 7 })
  })
  it('lists skipped tests by name and the slowest tests first', () => {
    expect(t.skippedTests).toEqual([{ file: 'test/server/utils/onboardingReset.test.ts', name: 'onboardingReset AC3 keeps the password' }])
    expect(t.slowest[0].name).toContain('AC4 rounds a duration')
  })
  it('reports missing results as unavailable', () => {
    expect(vitest.readTests(path.join(fixtures, 'missing.json'), ROOT)).toEqual({ available: false })
  })
})

describe('readCoverage', () => {
  const c = vitest.readCoverage(path.join(fixtures, 'coverage'), ROOT)

  it('reads the total and the files with relative keys', () => {
    expect(c.available).toBe(true)
    expect(c.total.lines.pct).toBe(84.2)
    expect(Object.keys(c.files)).toContain('app/pages/settings.vue')
  })
  it('gives uncovered line ranges from the detailed report', () => {
    expect(c.uncovered('app/pages/settings.vue')).toEqual([[88, 90], [104, 104], [131, 131]])
    expect(c.uncovered('shared/planning.ts')).toEqual([])
  })
  it('reports a missing summary as unavailable', () => {
    expect(vitest.readCoverage(path.join(fixtures, 'nowhere'), ROOT)).toEqual({ available: false })
  })
})

describe('readBaseline', () => {
  it('reads the base branch summary', () => {
    const b = vitest.readBaseline(path.join(fixtures, 'baseline'), ROOT)
    expect(b.total.lines.pct).toBe(83.6)
    expect(b.files['shared/planning.ts'].lines.pct).toBe(89.9)
  })
  it('is null when there is none', () => {
    expect(vitest.readBaseline(path.join(fixtures, 'nowhere'), ROOT)).toBeNull()
  })
})

describe('locate', () => {
  it('prefers the test file over a library frame', () => {
    const msg = ['Error\n    at file:///work/repo/node_modules/x/index.js:1:1\n    at /work/repo/test/a.test.ts:9:5']
    expect(vitest.locate({}, 'test/a.test.ts', msg)).toEqual({ line: 9, column: 5 })
  })
  it('falls back to the first frame when the test file is not named', () => {
    expect(vitest.locate({}, 'test/a.test.ts', ['at /work/repo/src/b.ts:3:2'])).toEqual({ line: 3, column: 2 })
  })
  it('returns null with no frames at all', () => {
    expect(vitest.locate({}, 'test/a.test.ts', ['boom'])).toBeNull()
  })
})
