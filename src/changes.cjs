'use strict'
const { sourceCandidates, isTestFile } = require('./paths.cjs')
const { isExcluded } = require('./exclusions.cjs')

// One row per source file the pull request touched, with its coverage when the
// file is instrumented. A changed test file counts for the source it covers, so
// a pull request that only adds tests still shows what it covered.
function changedRows({ changedFiles, coverage, suffixes, exclusions, baseline }) {
  const rows = []
  const seen = new Set()
  for (const f of changedFiles) {
    const filename = f.filename
    let key = null
    if (coverage.files[filename]) key = filename
    else if (isTestFile(filename, suffixes)) key = sourceCandidates(filename, suffixes).find((c) => coverage.files[c]) || null
    if (!key || seen.has(key) || isExcluded(key, exclusions)) continue
    seen.add(key)
    rows.push({
      path: key,
      viaTest: key !== filename,
      status: f.status,
      coverage: coverage.files[key],
      baseline: baseline?.files?.[key] || null,
      uncovered: coverage.uncovered ? coverage.uncovered(key) : []
    })
  }
  return rows.sort((a, b) => a.path.localeCompare(b.path))
}

// Coverage of the changed files as one number, lines covered over lines total.
function changedTotal(rows) {
  const covered = rows.reduce((s, r) => s + (r.coverage?.lines.covered || 0), 0)
  const total = rows.reduce((s, r) => s + (r.coverage?.lines.total || 0), 0)
  return total > 0 ? Math.round((covered / total) * 1000) / 10 : null
}

module.exports = { changedRows, changedTotal }
