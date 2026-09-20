import assert from 'node:assert/strict'
import test from 'node:test'
import { isValidRange, rangeError, shiftDate, formatDate, periodRange } from '../src/dates.ts'
import { hours, isOverCapacity } from '../src/api.ts'

test('week navigation crosses years, leap days and DST without changing the day', () => {
  assert.equal(shiftDate('2025-12-29', 7), '2026-01-05')
  assert.equal(shiftDate('2026-01-05', -7), '2025-12-29')
  assert.equal(shiftDate('2024-02-26', 7), '2024-03-04')
  assert.equal(shiftDate('2026-03-23', 7), '2026-03-30')
  assert.equal(formatDate('2026-01-01'), '1 Jan')
})

test('ranges have valid dates, inclusive endpoints, and at most 92 days', () => {
  assert.ok(isValidRange('2026-01-01', '2026-01-01'))
  assert.ok(isValidRange('2026-01-01', '2026-04-02'))
  assert.ok(isValidRange('2024-02-29', '2024-03-01'))
  for (const [from, to] of [
    ['', '2026-01-01'],
    ['2026-01-02', '2026-01-01'],
    ['2026-02-29', '2026-03-01'],
    ['2026-01-01', '2026-04-03'],
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

test('range validation explains how to correct the selected dates', () => {
  assert.equal(rangeError('', '2026-01-01'), 'Enter valid start and end dates.')
  assert.equal(
    rangeError('2026-01-02', '2026-01-01'),
    'End date must be on or after the start date.',
  )
  assert.equal(
    rangeError('2026-01-01', '2026-04-03'),
    'Choose up to 92 days. The latest end date is 2026-04-02.',
  )
  assert.equal(rangeError('2026-01-01', '2026-04-02'), '')
})

test('presets follow calendar boundaries and navigation crosses years and leap days', () => {
  assert.deepEqual(periodRange('2026-01-01', 'week'), { from: '2025-12-29', to: '2026-01-04' })
  assert.deepEqual(periodRange('2026-01-01', 'week', 1), { from: '2026-01-05', to: '2026-01-11' })
  assert.deepEqual(periodRange('2024-01-31', 'month', 1), { from: '2024-02-01', to: '2024-02-29' })
  assert.deepEqual(periodRange('2026-01-01', 'month', -1), { from: '2025-12-01', to: '2025-12-31' })
  assert.deepEqual(periodRange('2026-08-15', 'quarter'), { from: '2026-07-01', to: '2026-09-30' })
  assert.deepEqual(periodRange('2026-11-30', 'quarter', 1), {
    from: '2027-01-01',
    to: '2027-03-31',
  })
  for (const month of ['01', '04', '07', '10']) {
    const range = periodRange(`2026-${month}-01`, 'quarter')
    assert.ok(isValidRange(range.from, range.to))
  }
})
