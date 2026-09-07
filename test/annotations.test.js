import { describe, expect, it } from 'vitest'
import annotations from '../src/annotations.cjs'

function fakeCore() {
  const errors = []
  return { errors, core: { error: (message, props) => errors.push({ message, props }) } }
}

describe('annotate', () => {
  it('puts a located failure on its file and line with the test name as the title', () => {
    const { core, errors } = fakeCore()
    annotations.annotate(core, [{ file: 'test/a.test.ts', name: 'AC2 clears rows', message: 'expected 0, received 3', line: 41, column: 7 }])
    expect(errors).toEqual([{ message: 'expected 0, received 3', props: { title: 'AC2 clears rows', file: 'test/a.test.ts', startLine: 41, startColumn: 7 } }])
  })
  it('keeps an unlocated failure as a plain error with a title', () => {
    const { core, errors } = fakeCore()
    annotations.annotate(core, [{ file: 'test/a.test.ts', name: 'boom', message: '' }])
    expect(errors).toEqual([{ message: 'Test failed', props: { title: 'boom' } }])
  })
  it('prefixes the file with the working directory in a monorepo', () => {
    const { core, errors } = fakeCore()
    annotations.annotate(core, [{ file: 'test/a.test.ts', name: 'x', message: 'm', line: 3 }], 'apps/web/')
    expect(errors[0].props.file).toBe('apps/web/test/a.test.ts')
    expect(errors[0].props.startColumn).toBeUndefined()
  })
})
