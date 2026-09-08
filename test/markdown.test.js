import { describe, expect, it } from 'vitest'
import md from '../src/render/markdown.cjs'
import { loadReport } from './helpers.js'

describe('verdict line', () => {
  it('praises a green run by name', () => {
    expect(md.verdictLine(loadReport({ green: true, files: [] }))).toBe('## 🏆 Good job, @alex!')
  })
  it('opens with uh oh and the reasons when something failed', () => {
    expect(md.verdictLine(loadReport())).toBe('## 😬 Uh oh, @alex. 1 test is failing. 1 changed file is under 80% line coverage.')
  })
  it('says the tests did not run when there are no results', () => {
    expect(md.verdictLine(loadReport({ noResults: true }))).toBe('## ⛔ Uh oh, @alex. The tests did not run.')
  })
})

describe('render', () => {
  const out = md.render(loadReport(), { comment: true })

  it('starts with the marker and the badges', () => {
    expect(out.startsWith(md.MARKER)).toBe(true)
    expect(out).toContain('img.shields.io/badge/tests-1%20failing-red')
    expect(out).toContain('img.shields.io/badge/vs%20main-%2B0.6-brightgreen')
  })
  it('shows the failed test with its line and message, expanded', () => {
    expect(out).toContain('<details open>\n<summary><b>Tests</b>')
    expect(out).toContain('AC2 clears work_schedule rows for the acting admin only (line 41)')
    expect(out).toContain('> AssertionError: expected 0 rows for user 2, received 3')
  })
  it('orders both coverage summaries the same way, percentage before file count', () => {
    expect(out).toContain('<b>Coverage of your changes</b> · 77.3% lines · 3 files · 1 under 80%')
    expect(out).toContain('<b>Whole project</b> · 84.2% lines · 5 files · 2 under 80%')
  })
  it('shows changed files with deltas and uncovered lines', () => {
    expect(out).toContain('| ❌ | `app/pages/settings.vue` | 61.5% | 50.0% | -4.3 | 88-90, 104, 131 |')
    expect(out).toContain('| ✅ | `shared/planning.ts` | 92.0% | 85.7% | +2.1 |')
    expect(out).toContain('| ✅ | `server/utils/onboardingReset.ts` | 96.2% | 88.9% | new |')
  })
  it('traces acceptance criteria to tests', () => {
    expect(out).toContain('<b>Acceptance criteria</b> · 2 of 5 have a passing test')
    expect(out).toContain('| AC5 | 0 | ⚠️ no test |')
    expect(out).toContain('| AC3 | 1 | ⏭️ skipped only |')
  })
  it('lists project files under the threshold and the exclusions with reasons', () => {
    expect(out).toContain('<b>Whole project</b> · 84.2% lines · 5 files · 2 under 80%')
    expect(out).toContain('| `server/plugins/session.ts` | Nitro plugin wiring with no logic of its own. |')
  })
  it('ends with the commit, the run, and the baseline', () => {
    expect(out).toContain('Reporting on `abc1234` · [run](https://github.com/o/r/actions/runs/1) · baseline main run 42 · threshold 80% per changed file · test-report v1.0.0')
  })
  it('leaves the marker out of the job summary', () => {
    expect(md.render(loadReport(), { comment: false }).includes(md.MARKER)).toBe(false)
  })
})

describe('render under the comment limit', () => {
  it('trims section by section until it fits', () => {
    const r = loadReport()
    for (let i = 0; i < 900; i++) {
      r.changed.rows.push({ path: `server/api/generated/handlers/handler-${i}.ts`, coverage: { lines: { pct: 50, covered: 5, total: 10 }, branches: { pct: 40 } }, baseline: null, uncovered: [[1, 9], [20, 44], [60, 61]] })
    }
    const out = md.render(r, { comment: true })
    expect(out.length).toBeLessThanOrEqual(md.COMMENT_LIMIT)
    expect(out).toContain("Trimmed to fit GitHub's comment limit")
    expect(out).toContain('more changed files')
    expect(md.render(r, { comment: false, limit: 900000 })).not.toContain('Trimmed')
  })
})
