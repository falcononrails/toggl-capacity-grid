import { useState, type FormEvent } from 'react'
import { ArrowLeft, ArrowRight, CalendarDays, Grid2X2 } from 'lucide-react'
import { CapacityGrid } from './CapacityGrid'
import { shiftDate } from './dates'

const initialRange = { from: '2025-12-29', to: '2026-01-16' }

export function App() {
  const [range, setRange] = useState(initialRange)
  const [draft, setDraft] = useState(initialRange)
  const [error, setError] = useState('')

  function applyRange(event: FormEvent) {
    event.preventDefault()
    if (!draft.from || !draft.to || draft.to < draft.from || draft.to > shiftDate(draft.from, 92)) {
      setError('Choose a range of 1 to 93 days.')
      return
    }
    setError('')
    setRange(draft)
  }

  function moveWeek(days: number) {
    const next = { from: shiftDate(range.from, days), to: shiftDate(range.to, days) }
    setRange(next)
    setDraft(next)
    setError('')
  }

  return (
    <>
      <header className="app-header">
        <div className="brand"><Grid2X2 size={21} aria-hidden="true" /> Capacity</div>
        <span className="workspace-label">Team planning</span>
      </header>
      <main>
        <div className="page-heading">
          <div><p className="eyebrow">TEAM OVERVIEW</p><h1>Team capacity</h1></div>
          <span className="schedule"><CalendarDays size={16} aria-hidden="true" /> Mon-Fri schedule</span>
        </div>
        <section aria-label="Capacity planning">
          <div className="range-toolbar">
            <div className="week-navigation">
              <button className="icon-button" aria-label="Previous week" title="Previous week" onClick={() => moveWeek(-7)}><ArrowLeft size={18} /></button>
              <button className="icon-button" aria-label="Next week" title="Next week" onClick={() => moveWeek(7)}><ArrowRight size={18} /></button>
            </div>
            <form className="date-range" onSubmit={applyRange}>
              <label>From<input aria-label="From date" type="date" required value={draft.from} onChange={e => setDraft({ ...draft, from: e.target.value })} /></label>
              <label>To<input aria-label="To date" type="date" required value={draft.to} onChange={e => setDraft({ ...draft, to: e.target.value })} /></label>
              <button className="button secondary" type="submit">Apply</button>
            </form>
            <div className="legend" aria-label="Allocation legend"><span><i className="legend-dot available" /> Within capacity</span><span><i className="legend-dot over" /> Over capacity</span></div>
          </div>
          {error && <p className="error range-error" role="alert">{error}</p>}
          <CapacityGrid from={range.from} to={range.to} />
        </section>
      </main>
    </>
  )
}
