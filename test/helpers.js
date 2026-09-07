import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import vitest from '../src/adapters/vitest.cjs'
import exclusionsMod from '../src/exclusions.cjs'
import acceptance from '../src/acceptance.cjs'
import model from '../src/model.cjs'

export const here = path.dirname(fileURLToPath(import.meta.url))
export const fixtures = path.join(here, 'fixtures')
export const ROOT = '/work/repo'

export const changedFiles = [
  { filename: 'server/utils/onboardingReset.ts', status: 'added' },
  { filename: 'test/server/utils/onboardingReset.test.ts', status: 'added' },
  { filename: 'test/shared/planning.test.ts', status: 'modified' },
  { filename: 'app/pages/settings.vue', status: 'modified' },
  { filename: 'docs/specs/admin/onboarding-reset.md', status: 'added' },
  { filename: 'server/plugins/session.ts', status: 'modified' }
]

export function loadReport({ green = false, noResults = false, withBaseline = true, files = changedFiles, failOn = 'tests,coverage', threshold = 80, testExit } = {}) {
  const resultsFile = noResults ? path.join(fixtures, 'missing.json') : path.join(fixtures, green ? 'results-green.json' : 'results.json')
  const tests = vitest.readTests(resultsFile, ROOT)
  const coverage = vitest.readCoverage(path.join(fixtures, 'coverage'), ROOT)
  const baseline = withBaseline ? vitest.readBaseline(path.join(fixtures, 'baseline'), ROOT) : null
  const exclusions = exclusionsMod.readExclusions(path.join(fixtures, 'test-exclusions.json'))
  exclusions.path = '.github/test-exclusions.json'
  const specIds = acceptance.criteriaFromSpec(fs.readFileSync(path.join(fixtures, 'spec.md'), 'utf8'))
  const acc = { rows: acceptance.acceptanceTable(specIds, acceptance.criteriaFromTests(tests.all || [])) }
  const exit = testExit ?? (green ? 0 : 1)
  return model.buildReport({
    tests,
    coverage,
    changedFiles: files,
    baseline,
    exclusions,
    acceptance: acc,
    meta: { sha: 'abc1234def', runUrl: 'https://github.com/o/r/actions/runs/1', author: 'alex', baseRef: 'main', baselineRunId: withBaseline ? '42' : null, version: '1.0.0' },
    options: { threshold, failOn: model.parseFailOn(failOn), suffixes: ['.test.ts', '.spec.ts', '.test.js'], testExit: exit, badges: true }
  })
}
