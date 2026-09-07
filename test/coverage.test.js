import { describe, expect, it } from 'vitest'
import cov from '../src/coverage.cjs'

describe('pct and pick', () => {
  it('turns Istanbul\'s "Unknown" into null', () => {
    expect(cov.pct('Unknown')).toBeNull()
    expect(cov.pct(84.2)).toBe(84.2)
  })
  it('picks the four metrics with counts', () => {
    const p = cov.pick({ lines: { pct: 50, covered: 1, total: 2 }, statements: {}, functions: {}, branches: { pct: 'Unknown' } })
    expect(p.lines).toEqual({ pct: 50, covered: 1, total: 2 })
    expect(p.branches.pct).toBeNull()
  })
})

describe('uncoveredLines', () => {
  it('merges the lines of statements that never ran into ranges', () => {
    const entry = {
      statementMap: {
        0: { start: { line: 12 }, end: { line: 12 } },
        1: { start: { line: 88 }, end: { line: 90 } },
        2: { start: { line: 91 }, end: { line: 91 } },
        3: { start: { line: 104 }, end: { line: 104 } },
        4: { start: { line: 131 }, end: { line: 131 } }
      },
      s: { 0: 4, 1: 0, 2: 2, 3: 0, 4: 0 }
    }
    expect(cov.uncoveredLines(entry)).toEqual([[88, 90], [104, 104], [131, 131]])
  })
  it('returns nothing for a missing entry', () => {
    expect(cov.uncoveredLines(undefined)).toEqual([])
  })
})

describe('formatting', () => {
  it('formats ranges and caps them', () => {
    expect(cov.formatRanges([[88, 90], [104, 104], [131, 131]])).toBe('88-90, 104, 131')
    expect(cov.formatRanges([[1, 1], [3, 3], [5, 5]], 2)).toBe('1, 3 and 1 more')
  })
  it('formats percentages with one decimal and a dash for nothing', () => {
    expect(cov.formatPct(61.54)).toBe('61.5%')
    expect(cov.formatPct(null)).toBe('–')
  })
  it('formats deltas with a sign', () => {
    expect(cov.formatDelta(92, 89.9)).toBe('+2.1')
    expect(cov.formatDelta(61.5, 65.8)).toBe('-4.3')
    expect(cov.formatDelta(50, 50)).toBe('±0')
    expect(cov.formatDelta(50, null)).toBe('new')
  })
})
