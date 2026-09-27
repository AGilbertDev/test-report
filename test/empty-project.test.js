import path from 'node:path'
import { describe, expect, it } from 'vitest'
import vitest from '../src/adapters/vitest.cjs'
import model from '../src/model.cjs'
import badges from '../src/render/badges.cjs'
import { render } from '../src/render/markdown.cjs'
import { fixtures, ROOT } from './helpers.js'

// A new project with no test files yet: Vitest passes (passWithNoTests) and
// writes a coverage summary whose percentages are all "Unknown".
function emptyReport() {
  const dir = path.join(fixtures, 'empty')
  return model.buildReport({
    tests: vitest.readTests(path.join(dir, 'results.json'), ROOT),
    coverage: vitest.readCoverage(path.join(dir, 'coverage'), ROOT),
    changedFiles: [],
    baseline: null,
    exclusions: { files: [], path: '.github/test-exclusions.json', present: false },
    acceptance: { rows: [] },
    meta: { sha: 'abc1234def', runUrl: 'https://github.com/o/r/actions/runs/1', author: 'alex', baseRef: 'main', baselineRunId: null, version: '1.0.0' },
    options: { threshold: 80, failOn: model.parseFailOn('tests,coverage'), suffixes: ['.test.ts'], testExit: 0, badges: true }
  })
}

describe('a project with no tests yet', () => {
  it('passes, with a grey coverage badge instead of a crash', () => {
    const report = emptyReport()
    expect(report.verdict).toMatchObject({ ok: true, reasons: [] })
    expect(badges.badgesLine(report)).toContain('coverage-no%20data-lightgrey')
  })
  it('renders the comment', () => {
    expect(() => render(emptyReport())).not.toThrow()
  })
})
