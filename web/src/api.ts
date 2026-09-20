export type Week = { start: string; end: string; workingDays: number }
export type Cell = { weekStart: string; allocatedHours: number; capacityHours: number }
export type Person = { id: number; name: string; weeklyHours: number; weeks: Cell[] }
export type Capacity = { from: string; to: string; weeks: Week[]; people: Person[] }

export async function requestJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options)
  if (!response.ok) {
    throw new Error((await response.text()).trim() || 'The request failed. Please try again.')
  }
  return response.json()
}

const hourFormatter = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 2 })
export const hours = (value: number) => hourFormatter.format(value)
export const isOverCapacity = (cell: Cell) => cell.allocatedHours > cell.capacityHours
