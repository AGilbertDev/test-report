'use strict'
// Wiring. Reads the inputs, runs the adapter, builds the model, and sends the
// four outputs. Every decision lives in a tested module. This file only orders them.
const fs = require('node:fs')
const path = require('node:path')
const { toRelative } = require('./paths.cjs')
const { readTests, readCoverage, readBaseline } = require('./adapters/vitest.cjs')
const { readExclusions } = require('./exclusions.cjs')
const { criteriaFromSpec, criteriaFromTests, acceptanceTable } = require('./acceptance.cjs')
const { parseFailOn, buildReport } = require('./model.cjs')
const { render, MARKER } = require('./render/markdown.cjs')
const { upsertComment } = require('./github/comment.cjs')
const { listChangedFiles, stripPrefix } = require('./github/changes.cjs')
const { annotate } = require('./annotations.cjs')

const truthy = (v) => String(v).toLowerCase() === 'true'
const list = (v) => String(v || '').split(',').map((s) => s.trim()).filter(Boolean)

module.exports = async function run({ github, context, core, inputs, testExit }) {
  const workspace = process.env.GITHUB_WORKSPACE || process.cwd()
  const workdir = path.resolve(workspace, inputs['working-directory'] || '.')
  const prefix = toRelative(workdir, workspace) === '' || toRelative(workdir, workspace) === '.' ? '' : toRelative(workdir, workspace)

  const options = {
    threshold: Number(inputs.threshold) || 80,
    failOn: parseFailOn(inputs['fail-on']),
    suffixes: list(inputs['test-suffixes']),
    testExit: Number.isFinite(testExit) ? testExit : 1,
    badges: truthy(inputs.badges)
  }

  const tests = readTests(path.join(workdir, '.test-report/results.json'), workdir)
  const coverage = readCoverage(path.join(workdir, 'coverage'), workdir)
  const baseline = truthy(inputs.baseline) ? readBaseline(path.join(workdir, '.test-report/baseline'), workdir) : null
  const exclusions = readExclusions(path.join(workdir, inputs.exclusions || '.github/test-exclusions.json'))
  exclusions.path = inputs.exclusions || '.github/test-exclusions.json'

  const pr = context.payload?.pull_request || null
  let changedFiles = []
  if (pr) {
    try {
      changedFiles = stripPrefix(await listChangedFiles({ github, context }), prefix)
    } catch (e) {
      core.warning(`Could not list the pull request files. ${e.message}`)
    }
  }

  const specIds = new Set()
  for (const f of changedFiles.filter((f) => /^docs\/specs\/.+\.md$/.test(f.filename) && f.status !== 'removed')) {
    const file = path.join(workdir, f.filename)
    if (fs.existsSync(file)) for (const id of criteriaFromSpec(fs.readFileSync(file, 'utf8'))) specIds.add(id)
  }
  const byTest = criteriaFromTests(tests.all || [])
  const acceptance = { rows: specIds.size > 0 || byTest.size > 0 ? acceptanceTable(specIds, byTest) : [] }

  const server = process.env.GITHUB_SERVER_URL || 'https://github.com'
  const meta = {
    sha: pr ? pr.head.sha : context.sha,
    runUrl: `${server}/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId}`,
    author: pr?.user?.login || null,
    baseRef: pr?.base?.ref || null,
    baselineRunId: process.env.BASELINE_RUN_ID || null,
    version: require('../package.json').version
  }

  const report = buildReport({ tests, coverage, changedFiles, baseline, exclusions, acceptance, meta, options })

  if (truthy(inputs.summary)) await core.summary.addRaw(render(report, { comment: false, limit: 900000 }), true).write()

  if (truthy(inputs.comment) && pr) {
    try {
      const result = await upsertComment({ github, context, body: render(report, { comment: true }), marker: MARKER })
      core.info(`Comment ${result.action} (${result.id}).`)
    } catch (e) {
      core.warning(`Could not post the comment. The job summary has the same report. ${e.message}`)
    }
  }

  if (truthy(inputs.annotations) && tests.available) annotate(core, tests.failures, prefix)

  core.setOutput('tests-passed', tests.available ? tests.passed : 0)
  core.setOutput('tests-failed', tests.available ? tests.failed : 0)
  core.setOutput('coverage', coverage.available ? coverage.total.lines.pct : '')
  core.setOutput('coverage-delta', report.delta ?? '')
  core.setOutput('changed-files-coverage', report.changed.linesPct ?? '')
  core.setOutput('verdict', report.verdict.ok ? 'pass' : 'fail')

  if (!report.verdict.ok) core.setFailed(report.verdict.reasons.join(' '))
  else core.info('All green.')
}
