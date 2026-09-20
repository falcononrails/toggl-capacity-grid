import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'

test('filtering hides rows without dropping their cells, and clearing restores them', async (t) => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
  t.after(() => server.close())
  const { CapacityTable } = await server.ssrLoadModule('/src/CapacityTable.tsx')
  const people = [
    {
      id: 4,
      name: 'Dee Okafor',
      weeklyHours: 40,
      weeks: [{ weekStart: '2026-01-05', allocatedHours: 45, capacityHours: 40 }],
    },
    {
      id: 5,
      name: 'Eli Park',
      weeklyHours: 0,
      weeks: [{ weekStart: '2026-01-05', allocatedHours: 20, capacityHours: 0 }],
    },
  ]
  const render = (visiblePeople: typeof people) =>
    renderToStaticMarkup(
      createElement(CapacityTable, {
        from: '2026-01-05',
        to: '2026-01-09',
        weeks: [{ start: '2026-01-05', end: '2026-01-11', workingDays: 5 }],
        people,
        visiblePeople,
        onEdit() {},
        onClearFilters() {},
      }),
    )

  const filtered = render([people[0]])
  assert.equal((filtered.match(/<tr hidden="">/g) ?? []).length, 1)
  assert.match(filtered, /Eli Park/)
  assert.match(filtered, /5 h over/)
  assert.match(filtered, /20 h over/)
  assert.doesNotMatch(filtered, /Infinity|NaN/)
  assert.doesNotMatch(render(people), /<tr hidden="">|No matching people/)
  assert.match(render([]), /No matching people/)
  assert.equal((render([]).match(/<tr hidden="">/g) ?? []).length, 2)
})
