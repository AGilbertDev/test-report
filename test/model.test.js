import { describe, expect, it } from 'vitest'
import model from '../src/model.cjs'
import { loadReport } from './helpers.js'

describe('parseFailOn', () => {
  it('reads the two switches', () => {
    expect(model.parseFailOn('tests,coverage')).toEqual({ tests: true, coverage: true })
    expect(model.parseFailOn('tests')).toEqual({ tests: true, coverage: false })
    expect(model.parseFailOn('none')).toEqual({ tests: false, coverage: false })
  })
})

describe('verdict', () => {
  it('fails on a failing test and on a low changed file, with both reasons', () => {
    const r = loadReport()
    expect(r.verdict.ok).toBe(false)
    expect(r.verdict.reasons).toEqual(['1 test is failing.', '1 changed file is under 80% line coverage.'])
  })
  it('turns coverage into a warning when only tests gate', () => {
    const r = loadReport({ green: true, failOn: 'tests', files: [{ filename: 'app/pages/settings.vue', status: 'modified' }] })
    expect(r.verdict.ok).toBe(true)
    expect(r.changed.low).toBe(1)
  })
  it('fails when the command exited non-zero without a failing test', () => {
    const r = loadReport({ green: true, testExit: 1, files: [] })
    expect(r.verdict.ok).toBe(false)
    expect(r.verdict.reasons[0]).toBe('The test command exited with code 1.')
  })
  it('fails when the tests did not run', () => {
    const r = loadReport({ noResults: true })
    expect(r.verdict.reasons[0]).toBe('The tests did not run.')
  })
  it('passes a green run', () => {
    const r = loadReport({ green: true, files: [{ filename: 'test/shared/planning.test.ts', status: 'modified' }] })
    expect(r.verdict).toMatchObject({ ok: true, reasons: [] })
  })
})

describe('buildReport', () => {
  const r = loadReport()
  it('computes the changed-files coverage and the project delta', () => {
    expect(r.changed.linesPct).toBe(77.3)
    expect(r.delta).toBe('+0.6')
  })
  it('lists project files under the threshold, excluded ones left out', () => {
    expect(r.projectLow.map((f) => f.path)).toEqual(['server/utils/legacy.ts', 'app/pages/settings.vue'])
  })
})
