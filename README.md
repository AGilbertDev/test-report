# test-report

A GitHub Action that runs Vitest and reports on the pull request. One comment, updated in place. A job summary. Failed tests annotated on their lines. A check that is red when a test fails or a changed file is under the coverage threshold.

> Published for viewing and reference only. It is not open source. See [License](#license).

## Contents

- [What the comment shows](#what-the-comment-shows)
- [Install](#install)
- [Inputs](#inputs)
- [Outputs](#outputs)
- [The exclusions file](#the-exclusions-file)
- [Acceptance criteria](#acceptance-criteria)
- [The verdict](#the-verdict)
- [Custom test command](#custom-test-command)
- [Design](#design)
- [Development](#development)
- [License](#license)

## What the comment shows

Top to bottom, in the order a reviewer's attention moves.

1. Badges for tests, coverage, and the change against the base branch.
2. One line that says it. `🏆 Good job, @you!` when everything is green. `😬 Uh oh, @you. 1 test is failing.` when it is not.
3. Tests. Failed ones grouped by file with the message and the line, expanded. Skipped ones by name. The five slowest. Collapsed when green.
4. Coverage of your changes. One row per source file the pull request touched, with lines, branches, the delta against the base branch, and the uncovered line ranges. A changed test file counts for the source it covers.
5. Acceptance criteria, when the pull request touches a spec. Which criteria have a passing test, which are failing, which have none.
6. The whole project, collapsed. Only the files under the threshold.
7. Excluded files with their reasons, collapsed.
8. The commit, the run, and the baseline it compares against.

The same report goes to the job summary on the run page, so a push to the default branch has a report too.

## Install

Add one workflow to the project. The project installs its own dependencies with its own runner. The action runs the tests and reports.

```yaml
name: Tests
on:
  pull_request:
  push:
    branches: [main] # a push to main saves the baseline the next pull request compares against
permissions:
  contents: read
  pull-requests: write
  actions: read
jobs:
  tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - uses: AGilbertDev/test-report@v1
        with:
          threshold: 80
```

The project needs `vitest` and `@vitest/coverage-v8` as dev dependencies. Nothing else.

## Inputs

| Input | Default | What it does |
| --- | --- | --- |
| `command` | detected | Runs Vitest with coverage and the JSON reporter through bun, pnpm, or npm, whichever lockfile is present. See [Custom test command](#custom-test-command). |
| `working-directory` | `.` | Folder holding `package.json`, for monorepos. |
| `threshold` | `80` | Minimum line coverage for each changed file, in percent. |
| `fail-on` | `tests,coverage` | What fails the check. `tests` alone turns coverage into a warning. `none` never fails. |
| `exclusions` | `.github/test-exclusions.json` | Files left out of coverage, each with a reason. |
| `test-suffixes` | `.test.ts,.spec.ts,…` | Suffixes that mark a test file, used to credit a changed test to its source. |
| `baseline` | `true` | Compare with the default branch's last run and show deltas. |
| `comment` | `true` | Post the sticky pull request comment. |
| `summary` | `true` | Write the job summary. |
| `annotations` | `true` | Annotate failed tests on their file and line. |
| `badges` | `true` | Show shields.io badges at the top of the comment. |
| `token` | `github.token` | Needs `pull-requests: write` to comment and `actions: read` for the baseline. |

## Outputs

`tests-passed`, `tests-failed`, `coverage`, `coverage-delta`, `changed-files-coverage`, and `verdict` (`pass` or `fail`). A later step can read them.

## The exclusions file

Some files hold no logic worth testing. Route wiring, plugin registration, generated types. Listing them, each with a reason, keeps the numbers honest and the decision visible.

```json
{
  "files": [
    { "path": "server/plugins/session.ts", "reason": "Nitro plugin wiring with no logic of its own." }
  ]
}
```

Read the same file from the Vitest config so the totals agree with the report.

```js
import { readFileSync } from 'node:fs'
import { coverageConfigDefaults, defineConfig } from 'vitest/config'

const exclusions = JSON.parse(readFileSync(new URL('./.github/test-exclusions.json', import.meta.url), 'utf8'))

export default defineConfig({
  test: {
    coverage: {
      exclude: [...coverageConfigDefaults.exclude, ...exclusions.files.map((f) => f.path)]
    }
  }
})
```

## Acceptance criteria

When a spec under `docs/specs/` numbers its criteria as `AC1`, `AC2`, and so on, and test names carry the same ids, the comment shows which criteria have a passing test and which have none. Name the test after the criterion it proves.

```ts
it('AC2 clears work_schedule rows for the acting admin only', () => { ... })
```

The section appears when the pull request touches a spec, or when any test name carries an id.

## The verdict

The check fails when a test fails, when the test command exits non-zero for any other reason such as Vitest's own coverage thresholds, or when a changed file is under the threshold and `fail-on` includes `coverage`. The comment always posts, whatever the verdict. The tests step never fails on its own, so the report step can read the results and decide.

## Custom test command

Pass `command` to run anything. The action then expects two files. `.test-report/results.json` from Vitest's `json` reporter, and `coverage/coverage-summary.json` from the `json-summary` coverage reporter. Add the `json` coverage reporter as well to get uncovered lines, `--coverage.reportOnFailure` to keep coverage on a red run, and `--includeTaskLocation` for exact failure lines.

## Design

A composite action with no build step and no runtime dependencies. The test runner writes structured files. One adapter reads them into a report model. Four renderers consume the model.

```
scripts/run-tests.sh        runs Vitest with the reporters, records the exit code
scripts/fetch-baseline.sh   downloads the base branch's last coverage summary
src/adapters/vitest.cjs     results and coverage files in, report data out
src/model.cjs               changed files, deltas, the verdict
src/render/markdown.cjs     the comment and the job summary
src/github/comment.cjs      one sticky comment, updated in place
src/annotations.cjs         failed tests on their lines
src/report.cjs              wiring only
```

The adapter is the only Vitest-specific file. Another runner slots in beside it without touching the renderers.

## Development

```bash
bun install
bun run test            # the suite
bun run test:report     # the suite with the reporters the action uses, writes .test-report/ and coverage/
```

This repository is the action's first consumer. Every pull request here gets the report the action produces.

## License

All rights reserved. This code is published for viewing and reference only, and is not open source. See [LICENSE](./LICENSE).
