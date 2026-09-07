'use strict'
const path = require('node:path')

// Coverage tools write absolute paths. Everything downstream wants the path as
// it appears in the repository, with forward slashes.
function toRelative(file, root) {
  const rel = path.isAbsolute(file) ? path.relative(root, file) : file
  return rel.split(path.sep).join('/').replace(/^\.\//, '')
}

// A changed test file points at the source it covers. `test/server/x.test.ts`
// and `server/x.test.ts` both point at `server/x.ts`, and the candidates keep the
// extensions a project might use.
function sourceCandidates(testPath, suffixes) {
  const suffix = suffixes.find((s) => testPath.endsWith(s))
  if (!suffix) return []
  const ext = path.posix.extname(suffix)
  const base = testPath.slice(0, -suffix.length)
  const stripped = base.replace(/^(tests?|__tests__|spec)\//, '').replace(/\/__tests__\//, '/')
  const stems = [...new Set([base, stripped])]
  const exts = [...new Set([ext, '.ts', '.js', '.mjs', '.cjs', '.vue', '.tsx', '.jsx'])]
  return stems.flatMap((stem) => exts.map((e) => stem + e))
}

function isTestFile(file, suffixes) {
  return suffixes.some((s) => file.endsWith(s))
}

module.exports = { toRelative, sourceCandidates, isTestFile }
