'use strict'

// Static shields.io badges. They read in the notification preview before the
// comment is opened, which is the whole point. Dashes and underscores are the
// two characters shields treats as separators, so they are doubled.
function shield(label, message, color) {
  const enc = (s) => encodeURIComponent(String(s)).replace(/-/g, '--').replace(/_/g, '__')
  return `![${label}: ${message}](https://img.shields.io/badge/${enc(label)}-${enc(message)}-${color})`
}

function coverageColor(pct, threshold) {
  if (pct === null || pct === undefined) return 'lightgrey'
  if (pct >= threshold) return 'brightgreen'
  if (pct >= threshold - 20) return 'yellow'
  return 'red'
}

function badgesLine(report) {
  const { tests, coverage, delta, options, meta } = report
  const out = []
  if (!tests.available) out.push(shield('tests', 'did not run', 'red'))
  else if (tests.failed > 0) out.push(shield('tests', `${tests.failed} failing`, 'red'))
  else out.push(shield('tests', `${tests.passed} passed`, 'brightgreen'))

  if (coverage.available) out.push(shield('coverage', `${coverage.total.lines.pct.toFixed(1)}%`, coverageColor(coverage.total.lines.pct, options.threshold)))
  else out.push(shield('coverage', 'no data', 'lightgrey'))

  if (delta !== null && meta.baseRef) {
    const color = delta === 'new' || delta === '±0.0' ? 'lightgrey' : delta.startsWith('+') ? 'brightgreen' : 'red'
    out.push(shield(`vs ${meta.baseRef}`, delta, color))
  }
  return out.join(' ')
}

module.exports = { shield, coverageColor, badgesLine }
