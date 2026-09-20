// A full calendar quarter is at most 92 days.
export const MAX_RANGE_DAYS = 92
export type Period = 'week' | 'month' | 'quarter'

export function periodRange(value: string, period: Period, offset = 0) {
  const date = new Date(`${value}T00:00:00Z`)
  if (period === 'week') {
    date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7) + offset * 7)
    const from = date.toISOString().slice(0, 10)
    date.setUTCDate(date.getUTCDate() + 6)
    return { from, to: date.toISOString().slice(0, 10) }
  }
  const months = period === 'quarter' ? 3 : 1
  date.setUTCDate(1)
  date.setUTCMonth(Math.floor(date.getUTCMonth() / months) * months + offset * months)
  const from = date.toISOString().slice(0, 10)
  date.setUTCMonth(date.getUTCMonth() + months)
  date.setUTCDate(0)
  return { from, to: date.toISOString().slice(0, 10) }
}

// Calendar dates stay in UTC so local offsets and DST cannot move a day.
function isCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) return false
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export function isValidRange(from: string, to: string) {
  return rangeError(from, to) === ''
}

export function rangeError(from: string, to: string) {
  if (!isCalendarDate(from) || !isCalendarDate(to)) return 'Enter valid start and end dates.'
  if (to < from) return 'End date must be on or after the start date.'
  if (
    new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime() >
    (MAX_RANGE_DAYS - 1) * 86_400_000
  ) {
    return `Choose up to ${MAX_RANGE_DAYS} days. The latest end date is ${shiftDate(from, MAX_RANGE_DAYS - 1)}.`
  }
  return ''
}

export function shiftDate(value: string, days: number) {
  const date = new Date(`${value}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00Z`))
}
