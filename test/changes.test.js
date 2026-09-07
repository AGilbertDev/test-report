import path from 'node:path'
import { describe, expect, it } from 'vitest'
import vitest from '../src/adapters/vitest.cjs'
import changes from '../src/changes.cjs'
import exclusionsMod from '../src/exclusions.cjs'
import { ROOT, changedFiles, fixtures } from './helpers.js'

const coverage = vitest.readCoverage(path.join(fixtures, 'coverage'), ROOT)
const exclusions = exclusionsMod.readExclusions(path.join(fixtures, 'test-exclusions.json'))
const suffixes = ['.test.ts', '.spec.ts']

describe('changedRows', () => {
  const rows = changes.changedRows({ changedFiles, coverage, suffixes, exclusions, baseline: null })

  it('keeps one row per covered source file, excluded files left out', () => {
    expect(rows.map((r) => r.path)).toEqual(['app/pages/settings.vue', 'server/utils/onboardingReset.ts', 'shared/planning.ts'])
  })
  it('credits a changed test file to the source it covers', () => {
    expect(rows.find((r) => r.path === 'shared/planning.ts').viaTest).toBe(true)
    expect(rows.find((r) => r.path === 'server/utils/onboardingReset.ts').viaTest).toBe(false)
  })
  it('does not duplicate a source that changed along with its test', () => {
    expect(rows.filter((r) => r.path === 'server/utils/onboardingReset.ts')).toHaveLength(1)
  })
  it('carries uncovered lines for each row', () => {
    expect(rows.find((r) => r.path === 'app/pages/settings.vue').uncovered).toEqual([[88, 90], [104, 104], [131, 131]])
  })
})

describe('changedTotal', () => {
  it('is lines covered over lines total across the rows', () => {
    const rows = changes.changedRows({ changedFiles, coverage, suffixes, exclusions, baseline: null })
    expect(changes.changedTotal(rows)).toBe(77.3)
  })
  it('is null with nothing measured', () => {
    expect(changes.changedTotal([])).toBeNull()
  })
})
