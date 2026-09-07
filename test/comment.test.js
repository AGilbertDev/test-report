import { describe, expect, it } from 'vitest'
import comment from '../src/github/comment.cjs'
import changes from '../src/github/changes.cjs'

const MARKER = '<!-- agilbertdev/test-report -->'

function fakeGithub(existing) {
  const calls = { updated: [], created: [], deleted: [] }
  const github = {
    paginate: async (fn, params) => fn(params),
    rest: {
      issues: {
        listComments: async () => existing,
        updateComment: async (p) => calls.updated.push(p),
        createComment: async (p) => (calls.created.push(p), { data: { id: 999 } }),
        deleteComment: async (p) => calls.deleted.push(p)
      },
      pulls: { listFiles: async () => [{ filename: 'a.ts', status: 'modified', sha: 'x' }] }
    }
  }
  return { github, calls }
}
const context = { repo: { owner: 'o', repo: 'r' }, payload: { pull_request: { number: 7 } } }

describe('upsertComment', () => {
  it('updates its own comment in place', async () => {
    const { github, calls } = fakeGithub([{ id: 1, body: 'someone else' }, { id: 2, body: `${MARKER}\nold` }])
    const r = await comment.upsertComment({ github, context, body: 'new', marker: MARKER })
    expect(r).toEqual({ action: 'updated', id: 2 })
    expect(calls.updated[0]).toMatchObject({ comment_id: 2, body: 'new' })
    expect(calls.created).toHaveLength(0)
  })
  it('creates one when none exists and never deletes anything', async () => {
    const { github, calls } = fakeGithub([{ id: 5, body: '<!-- vitest-coverage-report-action -->' }])
    const r = await comment.upsertComment({ github, context, body: 'new', marker: MARKER })
    expect(r).toEqual({ action: 'created', id: 999 })
    expect(calls.deleted).toHaveLength(0)
  })
})

describe('changed files', () => {
  it('keeps only the name and the status of each file', async () => {
    const { github } = fakeGithub([])
    expect(await changes.listChangedFiles({ github, context })).toEqual([{ filename: 'a.ts', status: 'modified' }])
  })
  it('strips a working-directory prefix and drops files outside it', () => {
    const files = [{ filename: 'apps/web/a.ts' }, { filename: 'apps/api/b.ts' }]
    expect(changes.stripPrefix(files, 'apps/web')).toEqual([{ filename: 'a.ts' }])
    expect(changes.stripPrefix(files, '')).toEqual(files)
  })
})
