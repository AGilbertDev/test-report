import { readFileSync } from 'node:fs'
import { coverageConfigDefaults, defineConfig } from 'vitest/config'

// The exclusions file is the one source of truth. The action reads it to show
// what was left out, and this config reads it so the totals agree.
const exclusions = JSON.parse(readFileSync(new URL('./.github/test-exclusions.json', import.meta.url), 'utf8'))

export default defineConfig({
  test: {
    include: ['test/**/*.test.js'],
    coverage: {
      include: ['src/**'],
      exclude: [...coverageConfigDefaults.exclude, ...exclusions.files.map((f) => f.path)],
      reportOnFailure: true
    }
  }
})
