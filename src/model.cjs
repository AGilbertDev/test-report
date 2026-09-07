'use strict'
const { changedRows, changedTotal } = require('./changes.cjs')
const { formatDelta } = require('./coverage.cjs')

function parseFailOn(value) {
  const parts = String(value || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  return { tests: parts.includes('tests'), coverage: parts.includes('coverage') }
}

// One truthful verdict. Red tests fail. A changed file under the threshold fails
// when asked to. A test command that exits non-zero with no failing test still
// fails, because Vitest's own thresholds or a crash live in that exit code.
function verdict({ tests, rows, threshold, failOn, testExit }) {
  const reasons = []
  const failingTests = tests.available ? tests.failed : null
  const lowFiles = rows.filter((r) => r.coverage?.lines.pct !== null && r.coverage.lines.pct < threshold)

  if (!tests.available) reasons.push('The tests did not run.')
  else if (failingTests > 0) reasons.push(`${failingTests} ${failingTests === 1 ? 'test is' : 'tests are'} failing.`)
  else if (testExit !== 0) reasons.push(`The test command exited with code ${testExit}.`)

  if (failOn.coverage && lowFiles.length > 0) {
    reasons.push(`${lowFiles.length} changed ${lowFiles.length === 1 ? 'file is' : 'files are'} under ${threshold}% line coverage.`)
  }

  const testsFail = !tests.available || failingTests > 0 || testExit !== 0
  const ok = !(failOn.tests && testsFail) && !(failOn.coverage && lowFiles.length > 0)
  return { ok, reasons, failingTests: failingTests || 0, lowFiles }
}

function buildReport({ tests, coverage, changedFiles, baseline, exclusions, acceptance, meta, options }) {
  const rows = coverage.available ? changedRows({ changedFiles, coverage, suffixes: options.suffixes, exclusions, baseline }) : []
  const changed = {
    rows,
    linesPct: changedTotal(rows),
    low: rows.filter((r) => r.coverage?.lines.pct !== null && r.coverage.lines.pct < options.threshold).length
  }
  const projectLow = coverage.available
    ? Object.entries(coverage.files)
        .filter(([p, c]) => c.lines.pct !== null && c.lines.pct < options.threshold && !exclusions.files.some((e) => p === e.path))
        .map(([p, c]) => ({ path: p, coverage: c, baseline: baseline?.files?.[p] || null }))
        .sort((a, b) => a.coverage.lines.pct - b.coverage.lines.pct)
    : []
  const v = verdict({ tests, rows, threshold: options.threshold, failOn: options.failOn, testExit: options.testExit })
  const delta = coverage.available && baseline ? formatDelta(coverage.total.lines.pct, baseline.total.lines.pct) : null

  return { tests, coverage, changed, projectLow, baseline, delta, exclusions, acceptance, meta, options, verdict: v }
}

module.exports = { parseFailOn, verdict, buildReport }
