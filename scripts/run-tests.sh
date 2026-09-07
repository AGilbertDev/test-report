#!/usr/bin/env bash
# Runs the project's tests with the reporters the report needs, and records the
# exit code instead of failing here. The report step reads the results and
# decides the verdict, so a red run still produces a comment.
set -uo pipefail

mkdir -p .test-report

if [ -n "${INPUT_COMMAND:-}" ]; then
  cmd="$INPUT_COMMAND"
else
  if [ -f bun.lock ] || [ -f bun.lockb ]; then pm="bunx"
  elif [ -f pnpm-lock.yaml ]; then pm="pnpm exec"
  else pm="npx"; fi
  cmd="$pm vitest run --coverage --coverage.reporter=json-summary --coverage.reporter=json --coverage.reportOnFailure --includeTaskLocation --reporter=default --reporter=json --outputFile.json=.test-report/results.json"
fi

echo "::group::Test command"
echo "$cmd"
echo "::endgroup::"

bash -c "$cmd"
code=$?

echo "exit=$code" >> "$GITHUB_OUTPUT"
if [ "$code" -ne 0 ]; then
  echo "Tests exited with $code. The report step posts the details and sets the verdict."
fi
exit 0
