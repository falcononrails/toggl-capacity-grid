import assert from 'node:assert/strict'
import test from 'node:test'
import { isValidRange, shiftDate, formatDate } from '../src/dates.ts'
import { hours, isOverCapacity } from '../src/api.ts'

test('week navigation crosses years, leap days and DST without changing the day', () => {
  assert.equal(shiftDate('2025-12-29', 7), '2026-01-05')
  assert.equal(shiftDate('2026-01-05', -7), '2025-12-29')
  assert.equal(shiftDate('2024-02-26', 7), '2024-03-04')
  assert.equal(shiftDate('2026-03-23', 7), '2026-03-30')
  assert.equal(formatDate('2026-01-01'), '1 Jan')
})

test('ranges have valid dates, inclusive endpoints, and at most 93 days', () => {
  assert.ok(isValidRange('2026-01-01', '2026-01-01'))
  assert.ok(isValidRange('2026-01-01', '2026-04-03'))
  assert.ok(isValidRange('2024-02-29', '2024-03-01'))
  for (const [from, to] of [
    ['', '2026-01-01'],
    ['2026-01-02', '2026-01-01'],
    ['2026-02-29', '2026-03-01'],
    ['2026-01-01', '2026-04-04'],
    ['0000-01-01', '0000-01-02'],
    ['10000-01-01', '10000-01-02'],
  ])
    assert.equal(isValidRange(from, to), false, `${from} to ${to}`)
})

test('zero capacity is over only when there is allocated work', () => {
  const cell = { weekStart: '2026-01-05', allocatedHours: 0, capacityHours: 0 }
  assert.equal(isOverCapacity(cell), false)
  assert.equal(isOverCapacity({ ...cell, allocatedHours: 20 }), true)
  assert.equal(isOverCapacity({ ...cell, allocatedHours: 40, capacityHours: 40 }), false)
  assert.equal(isOverCapacity({ ...cell, allocatedHours: 45, capacityHours: 40 }), true)
  assert.equal(hours(32.5), '32.5')
})
