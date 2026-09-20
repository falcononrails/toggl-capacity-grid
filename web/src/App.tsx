import { useLayoutEffect, useState, type FormEvent } from 'react'
import { ArrowLeft, ArrowRight, Moon, Sun } from 'lucide-react'
import { CapacityGrid } from './CapacityGrid'
import {
  formatDate,
  isValidRange,
  MAX_RANGE_DAYS,
  periodRange,
  rangeError,
  shiftDate,
  type Period,
} from './dates'

const initialRange = { from: '2025-12-29', to: '2026-01-16' }

export function App() {
  const [range, setRange] = useState(initialRange)
  const [period, setPeriod] = useState<Period | 'custom'>('custom')
  const [dark, setDark] = useState(() => {
    try {
      const saved = localStorage.getItem('capacity-theme')
      if (saved === 'dark' || saved === 'light') return saved === 'dark'
    } catch {
      /* Storage can be unavailable in private browsing. */
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    try {
      localStorage.setItem('capacity-theme', dark ? 'dark' : 'light')
    } catch {
      /* The toggle still works without persistence. */
    }
  }, [dark])

  function applyRange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    const draft = { from: String(fields.get('from')), to: String(fields.get('to')) }
    const endInput = event.currentTarget.elements.namedItem('to') as HTMLInputElement
    endInput.setCustomValidity(rangeError(draft.from, draft.to))
    if (!endInput.reportValidity()) return
    setRange(draft)
  }

  function adjacentRange(offset: number) {
    return period === 'custom'
      ? { from: shiftDate(range.from, offset * 7), to: shiftDate(range.to, offset * 7) }
      : periodRange(range.from, period, offset)
  }

  const previous = adjacentRange(-1)
  const next = adjacentRange(1)
  const step = period === 'custom' ? 'week' : period

  return (
    <main>
      <header className="page-heading">
        <h1>Toggl</h1>
        <button
          className="icon-button"
          aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          onClick={() => setDark(!dark)}
        >
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </header>
      <section aria-label="Capacity planning">
        <CapacityGrid from={range.from} to={range.to}>
          <div className="range-toolbar">
            <div className="week-navigation">
              <button
                className="icon-button"
                aria-label={`Previous ${step}`}
                title={`Previous ${step}`}
                disabled={!isValidRange(previous.from, previous.to)}
                onClick={() => setRange(previous)}
              >
                <ArrowLeft size={18} />
              </button>
              <button
                className="icon-button"
                aria-label={`Next ${step}`}
                title={`Next ${step}`}
                disabled={!isValidRange(next.from, next.to)}
                onClick={() => setRange(next)}
              >
                <ArrowRight size={18} />
              </button>
            </div>
            <div className="period-switch" role="group" aria-label="Date range presets">
              {(['week', 'month', 'quarter', 'custom'] as const).map((option) => (
                <button
                  key={option}
                  aria-pressed={period === option}
                  onClick={() => {
                    if (option !== 'custom') {
                      const selected = periodRange(range.from, option)
                      if (!isValidRange(selected.from, selected.to)) return
                      setRange(selected)
                    }
                    setPeriod(option)
                  }}
                >
                  {option[0].toUpperCase() + option.slice(1)}
                </button>
              ))}
            </div>
            {period === 'custom' ? (
              <form
                className="date-range"
                key={`${range.from}:${range.to}`}
                onSubmit={applyRange}
                onInput={(event) => {
                  const endInput = event.currentTarget.elements.namedItem('to') as HTMLInputElement
                  endInput.setCustomValidity('')
                }}
              >
                <label>
                  From
                  <input
                    aria-label="From date"
                    name="from"
                    type="date"
                    min="0001-01-01"
                    max="9999-12-31"
                    required
                    defaultValue={range.from}
                  />
                </label>
                <label>
                  To
                  <input
                    aria-label="To date"
                    aria-describedby="range-limit"
                    name="to"
                    type="date"
                    min="0001-01-01"
                    max="9999-12-31"
                    required
                    defaultValue={range.to}
                  />
                </label>
                <button className="button secondary" type="submit">
                  Apply
                </button>
                <span className="range-limit" id="range-limit">
                  {MAX_RANGE_DAYS} days max
                </span>
              </form>
            ) : (
              <span className="period-label">
                {formatDate(range.from)} {range.from.slice(0, 4)} - {formatDate(range.to)}{' '}
                {range.to.slice(0, 4)}
              </span>
            )}
            <div className="legend" aria-label="Allocation legend">
              <span>
                <i className="legend-dot available" /> Within capacity
              </span>
              <span>
                <i className="legend-dot over" /> Over capacity
              </span>
            </div>
          </div>
        </CapacityGrid>
      </section>
      <footer className="page-footer">
        by <a href="https://github.com/falcononrails">falcononrails (Anas Limouri)</a>
      </footer>
    </main>
  )
}
