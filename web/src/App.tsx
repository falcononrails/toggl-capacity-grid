import { useLayoutEffect, useState, type FormEvent } from 'react'
import { ArrowLeft, ArrowRight, Moon, Sun } from 'lucide-react'
import { CapacityGrid } from './CapacityGrid'
import { isValidRange, shiftDate } from './dates'

const initialRange = { from: '2025-12-29', to: '2026-01-16' }

export function App() {
  const [range, setRange] = useState(initialRange)
  const [error, setError] = useState('')
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
    if (!isValidRange(draft.from, draft.to)) {
      setError('Choose a range of 1 to 93 days.')
      return
    }
    setError('')
    setRange(draft)
  }

  function moveWeek(days: number) {
    const next = { from: shiftDate(range.from, days), to: shiftDate(range.to, days) }
    if (!isValidRange(next.from, next.to)) {
      setError('This week is outside the supported date range.')
      return
    }
    setRange(next)
    setError('')
  }

  return (
    <main>
      <header className="page-heading">
        <h1>Capacity</h1>
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
                aria-label="Previous week"
                title="Previous week"
                onClick={() => moveWeek(-7)}
              >
                <ArrowLeft size={18} />
              </button>
              <button
                className="icon-button"
                aria-label="Next week"
                title="Next week"
                onClick={() => moveWeek(7)}
              >
                <ArrowRight size={18} />
              </button>
            </div>
            <form className="date-range" key={`${range.from}:${range.to}`} onSubmit={applyRange}>
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
            </form>
            <div className="legend" aria-label="Allocation legend">
              <span>
                <i className="legend-dot available" /> Within capacity
              </span>
              <span>
                <i className="legend-dot over" /> Over capacity
              </span>
            </div>
          </div>
          {error && (
            <p className="error range-error" role="alert">
              {error}
            </p>
          )}
        </CapacityGrid>
      </section>
    </main>
  )
}
