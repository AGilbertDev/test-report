'use strict'

// One comment per pull request, found by its marker and updated in place. No
// deletions, no notification per run, permalinks stay valid. Only comments
// carrying this action's own marker are ever touched.
async function upsertComment({ github, context, body, marker }) {
  const { owner, repo } = context.repo
  const issue_number = context.payload.pull_request.number
  const comments = await github.paginate(github.rest.issues.listComments, { owner, repo, issue_number, per_page: 100 })
  const mine = comments.find((c) => typeof c.body === 'string' && c.body.includes(marker))
  if (mine) {
    await github.rest.issues.updateComment({ owner, repo, comment_id: mine.id, body })
    return { action: 'updated', id: mine.id }
  }
  const { data } = await github.rest.issues.createComment({ owner, repo, issue_number, body })
  return { action: 'created', id: data.id }
}

module.exports = { upsertComment }
