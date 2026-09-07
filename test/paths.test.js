import { describe, expect, it } from 'vitest'
import paths from '../src/paths.cjs'

const suffixes = ['.test.ts', '.spec.ts', '.test.js']

describe('toRelative', () => {
  it('strips the root from an absolute path', () => {
    expect(paths.toRelative('/work/repo/server/x.ts', '/work/repo')).toBe('server/x.ts')
  })
  it('leaves a relative path alone', () => {
    expect(paths.toRelative('server/x.ts', '/work/repo')).toBe('server/x.ts')
  })
})

describe('sourceCandidates', () => {
  it('maps a mirrored test folder onto the source tree', () => {
    expect(paths.sourceCandidates('test/server/models/x.test.ts', suffixes)).toContain('server/models/x.ts')
  })
  it('maps a colocated test onto its neighbour', () => {
    expect(paths.sourceCandidates('server/models/x.test.ts', suffixes)).toContain('server/models/x.ts')
  })
  it('offers a .vue candidate for a component test', () => {
    expect(paths.sourceCandidates('test/app/components/Row.test.ts', suffixes)).toContain('app/components/Row.vue')
  })
  it('returns nothing for a source file', () => {
    expect(paths.sourceCandidates('server/models/x.ts', suffixes)).toEqual([])
  })
})

describe('isTestFile', () => {
  it('recognises the configured suffixes only', () => {
    expect(paths.isTestFile('a/b.spec.ts', suffixes)).toBe(true)
    expect(paths.isTestFile('a/b.ts', suffixes)).toBe(false)
  })
})
