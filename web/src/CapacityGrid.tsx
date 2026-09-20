import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  AlertCircle,
  AlertTriangle,
  Check,
  Pencil,
  RefreshCw,
  Search,
  Users,
  X,
} from 'lucide-react'
import { hours, isOverCapacity, requestJSON, type Capacity, type Person } from './api'
import { formatDate } from './dates'
import { CapacityEditor } from './CapacityEditor'

type Props = {
  from: string
  to: string
}

export function CapacityGrid({ from, to }: Props) {
  const [search, setSearch] = useState('')
  const [onlyOver, setOnlyOver] = useState(false)
  const [editing, setEditing] = useState<Person | null>(null)
  const [saved, setSaved] = useState('')
  const query = useQuery({
    queryKey: ['capacity', from, to],
    queryFn: ({ signal }) =>
      requestJSON<Capacity>(`/api/capacity?${new URLSearchParams({ from, to })}`, { signal }),
  })
  const data = query.data
  const people =
    data?.people.filter(
      (person) =>
        person.name.toLowerCase().includes(search.trim().toLowerCase()) &&
        (!onlyOver || person.weeks.some(isOverCapacity)),
    ) ?? []
  const overCount = data?.people.filter((person) => person.weeks.some(isOverCapacity)).length ?? 0
  const totalAllocated =
    data?.people.reduce(
      (total, person) => total + person.weeks.reduce((sum, week) => sum + week.allocatedHours, 0),
      0,
    ) ?? 0
  const totalCapacity =
    data?.people.reduce(
      (total, person) => total + person.weeks.reduce((sum, week) => sum + week.capacityHours, 0),
      0,
    ) ?? 0

  return (
    <>
      <div className="summary-band" aria-live="polite">
        <div className="summary-total">
          <span>Total allocated</span>
          <strong>
            {data ? hours(totalAllocated) : '...'} <small>h</small>
          </strong>
        </div>
        <div className="summary-total">
          <span>Total capacity</span>
          <strong>
            {data ? hours(totalCapacity) : '...'} <small>h</small>
          </strong>
        </div>
        <div className={`summary-warning ${overCount ? 'has-over' : ''}`}>
          <AlertTriangle size={18} aria-hidden="true" />
          <span>
            <strong>{overCount}</strong> people over capacity
          </span>
        </div>
      </div>
      <div className="people-toolbar">
        <label className="search">
          <Search size={17} aria-hidden="true" />
          <input
            aria-label="Search people"
            placeholder="Search people"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              className="icon-button"
              aria-label="Clear search"
              title="Clear search"
              onClick={() => setSearch('')}
            >
              <X size={15} />
            </button>
          )}
        </label>
        <label className="filter">
          <input
            type="checkbox"
            checked={onlyOver}
            onChange={(e) => setOnlyOver(e.target.checked)}
          />{' '}
          Over capacity only
        </label>
        <span className="people-count">
          {data ? `${people.length} of ${data.people.length} people` : 'Loading people'}
        </span>
        <button
          className="icon-button refresh"
          onClick={() => void query.refetch()}
          disabled={query.isFetching}
          aria-label="Refresh capacity"
          title="Refresh capacity"
        >
          <RefreshCw size={17} className={query.isFetching ? 'spinning' : ''} />
        </button>
      </div>
      {saved && (
        <div className="save-notice" role="status">
          <Check size={15} /> {saved}'s capacity saved.
          <button
            className="icon-button"
            aria-label="Dismiss confirmation"
            title="Dismiss confirmation"
            onClick={() => setSaved('')}
          >
            <X size={14} />
          </button>
        </div>
      )}
      {query.isError && (
        <div className="error-banner" role="alert">
          <AlertCircle size={18} />
          <span>
            {data ? 'Could not refresh. The numbers below may be out of date. ' : ''}
            {query.error.message}
          </span>
          <button className="button secondary" onClick={() => void query.refetch()}>
            Try again
          </button>
        </div>
      )}
      {query.isPending ? (
        <div className="grid-loading" role="status">
          <RefreshCw size={20} className="spinning" /> Loading capacity...
        </div>
      ) : (
        data && (
          <div
            className="table-scroll"
            tabIndex={0}
            role="region"
            aria-label="Weekly capacity grid"
          >
            <table>
              <caption className="sr-only">
                Weekly allocation and capacity, {from} to {to}. Hours use Monday-Friday working
                days.
              </caption>
              <thead>
                <tr>
                  <th scope="col" className="person-column">
                    Person
                  </th>
                  {data.weeks.map((week) => (
                    <th key={week.start} scope="col" className="week-column">
                      <span>
                        {formatDate(week.start)} - {formatDate(week.end)}
                      </span>
                      <small>
                        {week.start.slice(0, 4)}
                        {week.end.slice(0, 4) !== week.start.slice(0, 4)
                          ? ` / ${week.end.slice(0, 4)}`
                          : ''}{' '}
                        <span className={week.workingDays < 5 ? 'partial-week' : ''}>
                          {week.workingDays} workdays{week.workingDays < 5 ? ' · partial' : ''}
                        </span>
                      </small>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {people.map((person) => (
                  <tr key={person.id}>
                    <th scope="row" className="person-column">
                      <div className="person-name">
                        <span className={`avatar avatar-${person.id % 5}`} aria-hidden="true">
                          {person.name
                            .split(' ')
                            .map((part) => part[0])
                            .slice(0, 2)
                            .join('')}
                        </span>
                        <div>
                          <bdi>{person.name}</bdi>
                          <button
                            className="edit-capacity"
                            aria-label={`Edit capacity for ${person.name}`}
                            title={`Edit capacity for ${person.name}`}
                            onClick={() => {
                              setSaved('')
                              setEditing(person)
                            }}
                          >
                            <span className="weekly-hours">
                              {hours(person.weeklyHours)} <span>h / week</span>
                            </span>
                            <Pencil size={12} aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    </th>
                    {person.weeks.map((week) => {
                      const over = isOverCapacity(week)
                      const ratio =
                        week.capacityHours > 0
                          ? Math.min(week.allocatedHours / week.capacityHours, 1)
                          : week.allocatedHours > 0
                            ? 1
                            : 0
                      return (
                        <td key={week.weekStart} className="allocation-cell">
                          <div
                            className={`allocation ${over ? 'over' : week.allocatedHours === 0 ? 'idle' : 'available'}`}
                          >
                            <div className="cell-numbers">
                              <span>
                                <strong>{hours(week.allocatedHours)}</strong>
                                <span className="cell-capacity">
                                  {' '}
                                  / {hours(week.capacityHours)} h
                                </span>
                              </span>
                              {over && <AlertTriangle size={14} aria-hidden="true" />}
                            </div>
                            <div className="capacity-bar" aria-hidden="true">
                              <span style={{ width: `${ratio * 100}%` }} />
                            </div>
                            <small>
                              {over
                                ? `${hours(week.allocatedHours - week.capacityHours)} h over`
                                : week.capacityHours === 0
                                  ? 'No capacity'
                                  : `${hours(week.capacityHours - week.allocatedHours)} h available`}
                            </small>
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            {people.length === 0 && (
              <div className="empty-state">
                <Users size={26} />
                <strong>{data.people.length === 0 ? 'No people yet' : 'No matching people'}</strong>
                {(search || onlyOver) && (
                  <button
                    className="button secondary"
                    onClick={() => {
                      setSearch('')
                      setOnlyOver(false)
                    }}
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}
          </div>
        )
      )}
      <div className="grid-footer">
        <span>
          {data?.weeks.length ?? 0} weeks · {formatDate(from)} - {formatDate(to)}
        </span>
        <span>Hours shown for the selected dates</span>
      </div>
      {editing && (
        <CapacityEditor
          key={editing.id}
          person={editing}
          onClose={() => setEditing(null)}
          onSaved={setSaved}
        />
      )}
    </>
  )
}
