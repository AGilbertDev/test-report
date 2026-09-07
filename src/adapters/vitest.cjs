'use strict'
const fs = require('node:fs')
const path = require('node:path')
const { toRelative } = require('../paths.cjs')
const { pick, uncoveredLines } = require('../coverage.cjs')

// Colour codes Vitest leaves in failure messages.
const ANSI = /\u001b\[[0-9;]*m/g

function readJson(file) {
  if (!fs.existsSync(file)) return null
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return null
  }
}

// The first meaningful line of a Vitest failure, without colour codes or the stack.
function firstLine(messages) {
  const text = (messages || []).join('\n').replace(ANSI, '')
  const line = text
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l && !l.startsWith('at ') && !l.startsWith('❯'))
  return line ? line.slice(0, 240) : ''
}

// Vitest writes a location when run with --includeTaskLocation. Otherwise the
// stack usually names the test file with a line and column.
function locate(assertion, testFile, messages) {
  if (assertion.location?.line) return { line: assertion.location.line, column: assertion.location.column || 1 }
  const text = (messages || []).join('\n').replace(ANSI, '')
  const base = path.posix.basename(testFile)
  const re = /([^\s()]+\.(?:[cm]?[jt]sx?|vue)):(\d+):(\d+)/g
  let m
  let fallback = null
  while ((m = re.exec(text)) !== null) {
    const hit = { line: Number(m[2]), column: Number(m[3]) }
    if (m[1].endsWith(base)) return hit
    fallback = fallback || hit
  }
  return fallback
}

function readTests(resultsFile, root) {
  const json = readJson(resultsFile)
  if (!json || !Array.isArray(json.testResults)) return { available: false }

  const files = []
  const failures = []
  const skipped = []
  const all = []

  for (const suite of json.testResults) {
    const file = toRelative(suite.name || '', root)
    let fileFailed = 0
    let fileSkipped = 0
    for (const a of suite.assertionResults || []) {
      const name = a.fullName || [...(a.ancestorTitles || []), a.title].filter(Boolean).join(' › ')
      const duration = Number(a.duration) || 0
      all.push({ file, name, duration, status: a.status })
      if (a.status === 'failed') {
        fileFailed++
        failures.push({ file, name, message: firstLine(a.failureMessages), ...(locate(a, file, a.failureMessages) || {}) })
      } else if (a.status === 'skipped' || a.status === 'pending' || a.status === 'todo') {
        fileSkipped++
        skipped.push({ file, name })
      }
    }
    files.push({
      file,
      tests: (suite.assertionResults || []).length,
      failed: fileFailed,
      skipped: fileSkipped,
      durationMs: Math.max(0, (suite.endTime || 0) - (suite.startTime || 0))
    })
  }

  const total = json.numTotalTests ?? all.length
  const failed = json.numFailedTests ?? failures.length
  const skippedCount = (json.numPendingTests ?? 0) + (json.numTodoTests ?? 0) || skipped.length
  const durationMs = files.reduce((s, f) => s + f.durationMs, 0)
  const slowest = [...all]
    .filter((t) => t.status === 'passed' || t.status === 'failed')
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 5)

  return {
    available: true,
    total,
    passed: total - failed - skippedCount,
    failed,
    skipped: skippedCount,
    durationMs,
    files,
    failures,
    skippedTests: skipped,
    slowest,
    all
  }
}

function readCoverage(coverageDir, root) {
  const summary = readJson(path.join(coverageDir, 'coverage-summary.json'))
  if (!summary || !summary.total) return { available: false }
  const detail = readJson(path.join(coverageDir, 'coverage-final.json')) || {}

  const files = {}
  for (const [key, entry] of Object.entries(summary)) {
    if (key === 'total') continue
    files[toRelative(key, root)] = pick(entry)
  }
  const detailByRel = {}
  for (const [key, entry] of Object.entries(detail)) detailByRel[toRelative(key, root)] = entry

  return {
    available: true,
    total: pick(summary.total),
    files,
    uncovered: (rel) => uncoveredLines(detailByRel[rel])
  }
}

function readBaseline(dir, root) {
  const summary = readJson(path.join(dir, 'coverage-summary.json'))
  if (!summary || !summary.total) return null
  const files = {}
  for (const [key, entry] of Object.entries(summary)) {
    if (key === 'total') continue
    files[toRelative(key, root)] = pick(entry)
  }
  return { total: pick(summary.total), files }
}

module.exports = { readTests, readCoverage, readBaseline, firstLine, locate }
