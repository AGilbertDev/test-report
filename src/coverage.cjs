'use strict'

// Istanbul writes "Unknown" when a file has nothing to measure.
function pct(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function pick(entry) {
  if (!entry) return null
  const m = (k) => ({ pct: pct(entry[k]?.pct), covered: entry[k]?.covered ?? 0, total: entry[k]?.total ?? 0 })
  return { lines: m('lines'), statements: m('statements'), functions: m('functions'), branches: m('branches') }
}

// Lines whose statements never ran, merged into ranges. From coverage-final.json.
function uncoveredLines(fileEntry) {
  if (!fileEntry || !fileEntry.statementMap || !fileEntry.s) return []
  const lines = new Set()
  for (const [id, count] of Object.entries(fileEntry.s)) {
    if (count !== 0) continue
    const loc = fileEntry.statementMap[id]
    if (!loc) continue
    for (let l = loc.start.line; l <= (loc.end.line || loc.start.line); l++) lines.add(l)
  }
  return mergeRanges([...lines].sort((a, b) => a - b))
}

function mergeRanges(sorted) {
  const ranges = []
  for (const line of sorted) {
    const last = ranges[ranges.length - 1]
    if (last && line === last[1] + 1) last[1] = line
    else ranges.push([line, line])
  }
  return ranges
}

function formatRanges(ranges, cap = 6) {
  const shown = ranges.slice(0, cap).map(([a, b]) => (a === b ? `${a}` : `${a}-${b}`))
  return ranges.length > cap ? `${shown.join(', ')} and ${ranges.length - cap} more` : shown.join(', ')
}

function formatPct(value) {
  return value === null || value === undefined ? '–' : `${Number(value).toFixed(1)}%`
}

// Delta in percentage points, with the sign a reviewer reads at a glance.
function formatDelta(current, base) {
  if (base === null || base === undefined) return 'new'
  if (current === null || current === undefined) return '–'
  const d = Math.round((current - base) * 10) / 10
  if (d === 0) return '±0'
  return d > 0 ? `+${d.toFixed(1)}` : d.toFixed(1)
}

module.exports = { pct, pick, uncoveredLines, mergeRanges, formatRanges, formatPct, formatDelta }
