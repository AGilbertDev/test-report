'use strict'
const { formatPct, formatDelta, formatRanges } = require('../coverage.cjs')
const { badgesLine } = require('./badges.cjs')

const MARKER = '<!-- agilbertdev/test-report -->'
const COMMENT_LIMIT = 60000

const n = (v) => Number(v || 0).toLocaleString('en-US')
const seconds = (ms) => `${(ms / 1000).toFixed(1)}s`
const code = (s) => `\`${s}\``
const plural = (count, one, many) => (count === 1 ? one : many)

// The line the whole comment is read for. Green keeps the praise, red opens with
// an honest "Uh oh" and the reasons. Both are the author's personal touch.
function verdictLine(report) {
  const who = report.meta.author ? `, @${report.meta.author}` : ''
  if (!report.tests.available) return `## ⛔ Uh oh${who}. The tests did not run.`
  if (report.verdict.ok) return `## 🏆 Good job${who}!`
  return `## 😬 Uh oh${who}. ${report.verdict.reasons.join(' ')}`
}

function details(summary, body, open) {
  return [`<details${open ? ' open' : ''}>`, `<summary>${summary}</summary>`, '', ...body, '', '</details>'].join('\n')
}

function testsSection(report, level) {
  const t = report.tests
  if (!t.available) {
    return details('<b>Tests</b> · no results', [
      '> No test results were produced. The install or the test command failed before Vitest could report.',
      '>',
      '> Usual causes. The lockfile does not match `package.json`. The coverage provider `@vitest/coverage-v8` is not installed. A network error during install. The run log has the exact error.'
    ], true)
  }
  const parts = [`<b>Tests</b> · ${n(t.passed)} passed`]
  if (t.failed > 0) parts.push(`${n(t.failed)} failed`)
  if (t.skipped > 0) parts.push(`${n(t.skipped)} skipped`)
  parts.push(`${n(t.files.length)} ${plural(t.files.length, 'file', 'files')}`, seconds(t.durationMs))

  const body = []
  if (t.failures.length > 0) {
    const cap = level === 'full' ? Infinity : level === 'reduced' ? 50 : 20
    const shown = t.failures.slice(0, cap)
    body.push('**Failed**', '')
    const byFile = new Map()
    for (const f of shown) byFile.set(f.file, [...(byFile.get(f.file) || []), f])
    for (const [file, list] of [...byFile.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      body.push(`**${code(file)}**`)
      for (const f of list) {
        body.push(`- ${f.name}${f.line ? ` (line ${f.line})` : ''}`)
        if (f.message && level !== 'minimal') body.push(`  > ${f.message.replace(/\|/g, '\\|')}`)
      }
      body.push('')
    }
    if (t.failures.length > cap) body.push(`_and ${t.failures.length - cap} more failures. The job summary has all of them._`, '')
  }
  if (t.skippedTests.length > 0 && level === 'full') {
    body.push(`**Skipped** · ${n(t.skippedTests.length)}`, '')
    for (const s of t.skippedTests.slice(0, 20)) body.push(`- ${code(s.file)} › ${s.name}`)
    if (t.skippedTests.length > 20) body.push(`- and ${t.skippedTests.length - 20} more`)
    body.push('')
  }
  if (t.slowest.length > 0 && level === 'full') {
    body.push('**Slowest**', '', '| Test | Duration |', '|---|--:|')
    for (const s of t.slowest) body.push(`| ${code(s.file)} › ${s.name.replace(/\|/g, '\\|')} | ${Math.round(s.duration)} ms |`)
    body.push('')
  }
  if (body.length === 0) body.push('_Every test passed._')
  return details(parts.join(' · '), body, t.failed > 0)
}

function statusIcon(pct, threshold) {
  if (pct === null) return '➖'
  return pct >= threshold ? '✅' : '❌'
}

function coverageSection(report, level) {
  const { coverage, changed, options, baseline } = report
  if (!coverage.available) {
    return details('<b>Coverage</b> · no data', [
      '> No coverage summary was produced. Check that `@vitest/coverage-v8` is installed and that the command writes `coverage/coverage-summary.json`.'
    ], false)
  }
  if (changed.rows.length === 0) {
    return details(`<b>Coverage of your changes</b> · no instrumented files changed`, ['_Nothing this pull request touched is measured by coverage._'], false)
  }
  const head = [`<b>Coverage of your changes</b>`, `${n(changed.rows.length)} ${plural(changed.rows.length, 'file', 'files')}`, `${formatPct(changed.linesPct)} lines`]
  if (changed.low > 0) head.push(`${changed.low} under ${options.threshold}%`)

  const withDelta = Boolean(baseline)
  const withLines = level === 'full'
  const header = ['', 'File', 'Lines', 'Branches']
  const align = [':-:', '---', '--:', '--:']
  if (withDelta) { header.push(`vs ${report.meta.baseRef || 'base'}`); align.push('--:') }
  if (withLines) { header.push('Uncovered lines'); align.push('---') }
  const body = [`| ${header.join(' | ')} |`, `| ${align.join(' | ')} |`]
  const cap = level === 'full' ? Infinity : level === 'reduced' ? 50 : 20
  for (const r of changed.rows.slice(0, cap)) {
    const c = r.coverage
    const cells = [statusIcon(c.lines.pct, options.threshold), code(r.path), formatPct(c.lines.pct), formatPct(c.branches.pct)]
    if (withDelta) cells.push(formatDelta(c.lines.pct, r.baseline?.lines.pct ?? null))
    if (withLines) cells.push(r.uncovered.length ? formatRanges(r.uncovered) : '')
    body.push(`| ${cells.join(' | ')} |`)
  }
  if (changed.rows.length > cap) body.push('', `_and ${changed.rows.length - cap} more changed files. The job summary has all of them._`)
  return details(head.join(' · '), body, changed.low > 0)
}

function acceptanceSection(report) {
  const rows = report.acceptance?.rows || []
  if (rows.length === 0) return ''
  const passing = rows.filter((r) => r.state === 'passing').length
  const body = ['| Criterion | Tests | Status |', '|---|--:|---|']
  for (const r of rows) {
    const status = { passing: '✅ passing', failing: '❌ failing', skipped: '⏭️ skipped only', missing: '⚠️ no test' }[r.state]
    body.push(`| ${r.id}${r.inSpec ? '' : ' (not in the spec)'} | ${r.tests} | ${status} |`)
  }
  return details(`<b>Acceptance criteria</b> · ${passing} of ${rows.length} have a passing test`, body, rows.some((r) => r.state !== 'passing'))
}

function projectSection(report, level) {
  const { coverage, projectLow, options } = report
  if (!coverage.available) return ''
  const total = Object.keys(coverage.files).length
  const head = [`<b>Whole project</b>`, `${formatPct(coverage.total.lines.pct)} lines`, `${n(total)} ${plural(total, 'file', 'files')}`]
  if (projectLow.length > 0) head.push(`${projectLow.length} under ${options.threshold}%`)
  const body = []
  if (projectLow.length === 0) body.push(`_Every measured file is at or above ${options.threshold}%._`)
  else if (level === 'minimal') body.push(`_${projectLow.length} files under the threshold. The full report is in the run's coverage artifact._`)
  else {
    const cap = level === 'full' ? 25 : 10
    body.push('| | File | Lines | Branches |', '|:-:|---|--:|--:|')
    for (const f of projectLow.slice(0, cap)) body.push(`| ❌ | ${code(f.path)} | ${formatPct(f.coverage.lines.pct)} | ${formatPct(f.coverage.branches.pct)} |`)
    if (projectLow.length > cap) body.push('', `_and ${projectLow.length - cap} more. The full report is in the run's coverage artifact._`)
  }
  return details(head.join(' · '), body, false)
}

function excludedSection(report, level) {
  const ex = report.exclusions
  if (!ex || ex.files.length === 0) return ''
  const head = `<b>Excluded from coverage</b> · ${ex.files.length} ${plural(ex.files.length, 'file', 'files')}`
  if (level !== 'full') return details(head, [`_Listed with reasons in ${code(ex.path)}._`], false)
  const body = ['| File | Reason |', '|---|---|']
  for (const f of ex.files.slice(0, 30)) body.push(`| ${code(f.path)} | ${f.reason || ''} |`)
  if (ex.files.length > 30) body.push('', `_and ${ex.files.length - 30} more in ${code(ex.path)}._`)
  return details(head, body, false)
}

function footer(report) {
  const m = report.meta
  const bits = [`Reporting on ${code(String(m.sha || '').slice(0, 7))}`]
  if (m.runUrl) bits.push(`[run](${m.runUrl})`)
  if (report.baseline) bits.push(`baseline ${m.baseRef || 'base'}${m.baselineRunId ? ` run ${m.baselineRunId}` : ''}`)
  else if (m.baseRef) bits.push('no baseline yet')
  bits.push(`threshold ${report.options.threshold}% per changed file`, `test-report v${m.version || '?'}`)
  return `<sub>${bits.join(' · ')}</sub>`
}

function assemble(report, { comment, level }) {
  const blocks = []
  if (comment) blocks.push(MARKER, '')
  if (report.options.badges) blocks.push(badgesLine(report), '')
  blocks.push(verdictLine(report), '')
  blocks.push(testsSection(report, level), '')
  blocks.push(coverageSection(report, level), '')
  const ac = acceptanceSection(report)
  if (ac) blocks.push(ac, '')
  const proj = projectSection(report, level)
  if (proj) blocks.push(proj, '')
  const ex = excludedSection(report, level)
  if (ex) blocks.push(ex, '')
  if (level !== 'full') blocks.push("_Trimmed to fit GitHub's comment limit. The job summary and the coverage artifact hold the rest._", '')
  blocks.push(footer(report))
  return blocks.join('\n')
}

// The comment is cut back a level at a time until it fits under GitHub's limit.
// The job summary allows far more, so it is rendered with a higher limit.
function render(report, { comment = true, limit = COMMENT_LIMIT } = {}) {
  for (const level of ['full', 'reduced', 'minimal']) {
    const md = assemble(report, { comment, level })
    if (md.length <= limit || level === 'minimal') return md
  }
  return ''
}

module.exports = { MARKER, COMMENT_LIMIT, render, verdictLine, testsSection, coverageSection, acceptanceSection, projectSection, excludedSection, footer }
