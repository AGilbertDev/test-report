import { describe, expect, it } from 'vitest'
import badges from '../src/render/badges.cjs'
import { loadReport } from './helpers.js'

describe('shield', () => {
  it('encodes the label and the message the way shields expects', () => {
    expect(badges.shield('vs main', '+0.6', 'brightgreen')).toBe('![vs main: +0.6](https://img.shields.io/badge/vs%20main-%2B0.6-brightgreen)')
    expect(badges.shield('tests', 'well-tested_code', 'red')).toContain('/badge/tests-well--tested__code-red')
  })
})

describe('coverageColor', () => {
  it('is green at the threshold, yellow within twenty points, red below, grey for nothing', () => {
    expect(badges.coverageColor(80, 80)).toBe('brightgreen')
    expect(badges.coverageColor(61, 80)).toBe('yellow')
    expect(badges.coverageColor(59.9, 80)).toBe('red')
    expect(badges.coverageColor(null, 80)).toBe('lightgrey')
  })
})

describe('badgesLine', () => {
  it('shows failing tests, coverage, and the delta against the base branch', () => {
    const line = badges.badgesLine(loadReport())
    expect(line).toContain('tests-1%20failing-red')
    expect(line).toContain('coverage-84.2%25-brightgreen')
    expect(line).toContain('vs%20main-%2B0.6-brightgreen')
  })
  it('shows passed tests and no delta badge without a baseline', () => {
    const line = badges.badgesLine(loadReport({ green: true, withBaseline: false, files: [] }))
    expect(line).toContain('tests-2%20passed-brightgreen')
    expect(line).not.toContain('vs%20main')
  })
  it('says the tests did not run and colours a drop red', () => {
    const r = loadReport({ noResults: true })
    r.delta = '-1.2'
    const line = badges.badgesLine(r)
    expect(line).toContain('tests-did%20not%20run-red')
    expect(line).toContain('vs%20main---1.2-red')
  })
  it('greys out an unchanged delta and reports missing coverage', () => {
    const r = loadReport({ green: true, files: [] })
    r.delta = '±0.0'
    expect(badges.badgesLine(r)).toContain('-lightgrey')
    r.coverage = { available: false }
    expect(badges.badgesLine(r)).toContain('coverage-no%20data-lightgrey')
  })
})
