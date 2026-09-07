'use strict'

// Specs number their acceptance criteria AC1, AC2, and so on. When test names
// carry the same ids, the report can say which criteria have a passing test and
// which have none. This only makes sense when the pull request touches a spec.
const SPEC_LINE = /^\s*(?:[-*]\s*)?(?:\*\*)?AC(\d+)\b/
const IN_NAME = /\bAC(\d+)\b/g

function criteriaFromSpec(markdown) {
  const ids = new Set()
  for (const line of markdown.split('\n')) {
    const m = line.match(SPEC_LINE)
    if (m) ids.add(Number(m[1]))
  }
  return ids
}

function criteriaFromTests(tests) {
  const byId = new Map()
  for (const t of tests) {
    const ids = new Set()
    let m
    IN_NAME.lastIndex = 0
    while ((m = IN_NAME.exec(t.name)) !== null) ids.add(Number(m[1]))
    for (const id of ids) {
      const entry = byId.get(id) || { total: 0, passed: 0, failed: 0, skipped: 0 }
      entry.total++
      if (t.status === 'failed') entry.failed++
      else if (t.status === 'passed') entry.passed++
      else entry.skipped++
      byId.set(id, entry)
    }
  }
  return byId
}

// A criterion is passing when at least one test for it passed and none failed.
// A criterion whose only tests are skipped is not passing, it is deferred.
function acceptanceTable(specIds, byTest) {
  const ids = new Set([...specIds, ...byTest.keys()])
  return [...ids]
    .sort((a, b) => a - b)
    .map((id) => {
      const t = byTest.get(id) || { total: 0, passed: 0, failed: 0, skipped: 0 }
      const state = t.failed > 0 ? 'failing' : t.passed > 0 ? 'passing' : t.skipped > 0 ? 'skipped' : 'missing'
      return { id: `AC${id}`, tests: t.total, failed: t.failed, state, inSpec: specIds.has(id) }
    })
}

module.exports = { criteriaFromSpec, criteriaFromTests, acceptanceTable }
