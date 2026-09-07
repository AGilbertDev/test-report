#!/usr/bin/env bash
# Downloads the newest coverage summary the base branch produced, so the report
# can show deltas. The artifact is saved by push runs on that branch. Missing
# baseline is not an error, the report just says there is none yet.
set -uo pipefail

mkdir -p .test-report/baseline
name="test-report-baseline"

run_id="$(gh api "repos/${GITHUB_REPOSITORY}/actions/artifacts?name=${name}&per_page=50" \
  --jq "[.artifacts[] | select(.expired == false and .workflow_run.head_branch == \"${BASE_REF}\")] | sort_by(.created_at) | reverse | .[0].workflow_run.id // empty" 2>/dev/null)"

if [ -z "$run_id" ]; then
  echo "No baseline artifact on ${BASE_REF} yet."
  exit 0
fi

if gh run download "$run_id" --name "$name" --dir .test-report/baseline >/dev/null 2>&1; then
  echo "run_id=$run_id" >> "$GITHUB_OUTPUT"
  echo "Baseline from run $run_id on ${BASE_REF}."
else
  echo "Could not download the baseline from run $run_id. Continuing without it."
fi
exit 0
