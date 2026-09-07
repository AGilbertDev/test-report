'use strict'

// Every file the pull request touched, across every page. A single page silently
// drops rows past one hundred files.
async function listChangedFiles({ github, context }) {
  const { owner, repo } = context.repo
  const pull_number = context.payload.pull_request.number
  const files = await github.paginate(github.rest.pulls.listFiles, { owner, repo, pull_number, per_page: 100 })
  return files.map((f) => ({ filename: f.filename, status: f.status }))
}

// Pull request paths are repository-relative. Coverage paths are relative to the
// working directory. In a monorepo the two differ by a prefix.
function stripPrefix(files, prefix) {
  if (!prefix) return files
  const p = prefix.endsWith('/') ? prefix : prefix + '/'
  return files.filter((f) => f.filename.startsWith(p)).map((f) => ({ ...f, filename: f.filename.slice(p.length) }))
}

module.exports = { listChangedFiles, stripPrefix }
