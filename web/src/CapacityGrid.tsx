import { useCallback, useDeferredValue, useMemo, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, AlertTriangle, Check, RefreshCw, Search, X } from 'lucide-react'
import { hours, isOverCapacity, requestJSON, type Capacity, type Person } from './api'
import { formatDate } from './dates'
import { CapacityEditor } from './CapacityEditor'
import { CapacityTable } from './CapacityTable'

type Props = { from: string; to: string; children: ReactNode }

export function CapacityGrid({ from, to, children }: Props) {
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
  const searchTerm = search.trim().toLowerCase()
  // Keep typing responsive while React renders a larger result set.
  const deferredSearch = useDeferredValue(searchTerm)
  const people = useMemo(
    () =>
      data?.people.filter(
        (person) =>
          person.name.toLowerCase().includes(deferredSearch) &&
          (!onlyOver || person.weeks.some(isOverCapacity)),
      ) ?? [],
    [data, deferredSearch, onlyOver],
  )
  const summary = useMemo(() => {
    let allocated = 0
    let capacity = 0
    let overCount = 0
    for (const person of data?.people ?? []) {
      if (person.weeks.some(isOverCapacity)) overCount++
      for (const week of person.weeks) {
        allocated += week.allocatedHours
        capacity += week.capacityHours
      }
    }
    return { allocated, capacity, overCount }
  }, [data])
  const editPerson = useCallback((person: Person) => {
    setSaved('')
    setEditing(person)
  }, [])
  const clearFilters = useCallback(() => {
    setSearch('')
    setOnlyOver(false)
  }, [])

  return (
    <>
      <div className="summary-band" aria-live="polite">
        <div className="summary-total">
          <span>Total allocated</span>
          <strong>
            {data ? hours(summary.allocated) : '...'} <small>h</small>
          </strong>
        </div>
        <div className="summary-total">
          <span>Total capacity</span>
          <strong>
            {data ? hours(summary.capacity) : '...'} <small>h</small>
          </strong>
        </div>
        <div className={`summary-warning ${summary.overCount ? 'has-over' : ''}`}>
          <AlertTriangle size={18} aria-hidden="true" />
          <span>
            <strong>{summary.overCount}</strong> people over capacity
          </span>
        </div>
      </div>
      {children}
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
        <span className="people-count" aria-live="polite" aria-busy={searchTerm !== deferredSearch}>
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
          <CapacityTable
            from={from}
            to={to}
            weeks={data.weeks}
            people={data.people}
            visiblePeople={people}
            onEdit={editPerson}
            onClearFilters={clearFilters}
          />
        )
      )}
      <div className="grid-footer">
        <span>
          {data?.weeks.length ?? 0} weeks · {formatDate(from)} - {formatDate(to)}
        </span>
        <span>Monday-Friday working days</span>
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
