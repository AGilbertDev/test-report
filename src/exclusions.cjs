'use strict'
const fs = require('node:fs')

// Two shapes are accepted. The current one is a list of { path, reason }. The
// older one, a plain list under excludeFromReports, still reads, with no reason.
function parseExclusions(json) {
  const raw = Array.isArray(json?.files) ? json.files : Array.isArray(json?.excludeFromReports) ? json.excludeFromReports : []
  return raw
    .map((item) => (typeof item === 'string' ? { path: item, reason: '' } : { path: String(item.path || ''), reason: String(item.reason || '') }))
    .filter((item) => item.path)
}

function readExclusions(file) {
  if (!file || !fs.existsSync(file)) return { files: [], path: file, present: false }
  try {
    return { files: parseExclusions(JSON.parse(fs.readFileSync(file, 'utf8'))), path: file, present: true }
  } catch {
    return { files: [], path: file, present: true, invalid: true }
  }
}

function isExcluded(relPath, exclusions) {
  return exclusions.files.some((f) => relPath === f.path || relPath.endsWith('/' + f.path))
}

module.exports = { parseExclusions, readExclusions, isExcluded }
