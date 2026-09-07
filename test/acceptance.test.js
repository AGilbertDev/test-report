import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import acc from '../src/acceptance.cjs'
import { fixtures } from './helpers.js'

describe('criteriaFromSpec', () => {
  it('finds numbered criteria written as lines, list items, or bold', () => {
    const ids = acc.criteriaFromSpec(fs.readFileSync(path.join(fixtures, 'spec.md'), 'utf8'))
    expect([...ids]).toEqual([1, 2, 3, 4, 5])
  })
  it('ignores AC inside other words', () => {
    expect([...acc.criteriaFromSpec('ACCESS is granted. ACME ships.')]).toEqual([])
  })
})

describe('criteriaFromTests and acceptanceTable', () => {
  const tests = [
    { name: 'AC1 clears settings', status: 'passed' },
    { name: 'AC2 clears rows', status: 'failed' },
    { name: 'AC3 keeps the password', status: 'skipped' },
    { name: 'AC4 rounds and AC1 too', status: 'passed' }
  ]
  const table = acc.acceptanceTable(new Set([1, 2, 3, 4, 5]), acc.criteriaFromTests(tests))

  it('counts a test once per criterion it names', () => {
    expect(table.find((r) => r.id === 'AC1').tests).toBe(2)
  })
  it('states passing, failing, skipped, and missing', () => {
    expect(table.map((r) => r.state)).toEqual(['passing', 'failing', 'skipped', 'passing', 'missing'])
  })
  it('flags a criterion that tests name but the spec does not', () => {
    const t = acc.acceptanceTable(new Set([1]), acc.criteriaFromTests([{ name: 'AC9 stray', status: 'passed' }]))
    expect(t.find((r) => r.id === 'AC9').inSpec).toBe(false)
  })
})
