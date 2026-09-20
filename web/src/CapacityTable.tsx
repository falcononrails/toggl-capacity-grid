import { memo } from 'react'
import { AlertTriangle, Pencil, Users } from 'lucide-react'
import { hours, isOverCapacity, type Person, type Week } from './api'
import { formatDate } from './dates'

type Props = {
  from: string
  to: string
  weeks: Week[]
  people: Person[]
  visiblePeople: Person[]
  onEdit: (person: Person) => void
  onClearFilters: () => void
}

export const CapacityTable = memo(function CapacityTable({
  from,
  to,
  weeks,
  people,
  visiblePeople,
  onEdit,
  onClearFilters,
}: Props) {
  const visibleIds = new Set(visiblePeople.map((person) => person.id))
  return (
    <div className="table-scroll" tabIndex={0} role="region" aria-label="Weekly capacity grid">
      <table>
        <caption className="sr-only">
          Weekly allocation and capacity, {from} to {to}. Hours use Monday-Friday working days.
        </caption>
        <thead>
          <tr>
            <th scope="col" className="person-column">
              Person
            </th>
            {weeks.map((week) => (
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
          {/* ponytail: retain 500 rows to avoid remounting cells on search; virtualize for larger teams. */}
          {people.map((person) => (
            <tr key={person.id} hidden={!visibleIds.has(person.id)}>
              <PersonCells person={person} onEdit={onEdit} />
            </tr>
          ))}
        </tbody>
      </table>
      {visiblePeople.length === 0 && (
        <div className="empty-state">
          <Users size={26} />
          <strong>{people.length ? 'No matching people' : 'No people yet'}</strong>
          {people.length > 0 && (
            <button className="button secondary" onClick={onClearFilters}>
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  )
})

const PersonCells = memo(function PersonCells({
  person,
  onEdit,
}: {
  person: Person
  onEdit: (person: Person) => void
}) {
  return (
    <>
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
              onClick={() => onEdit(person)}
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
                  <span className="cell-capacity"> / {hours(week.capacityHours)} h</span>
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
    </>
  )
})
