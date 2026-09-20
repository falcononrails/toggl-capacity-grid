# Worklog

- Monday weeks, Mon-Fri workdays, inclusive dates. Partial capacity is prorated.
- Repeated-looking assignments have distinct IDs: count all hours. Retain people with no work.
- SQL aggregates allocations; requests are capped at 93 days.
- Capacity edits apply to all dates. Save, then invalidate every cached range; no optimistic updates.
- Search keeps rows mounted and hides non-matches. No debounce or new dependency. Virtualize if teams grow beyond this 500-person dataset.
- Checked seeded totals, partial weeks, zero capacity, edits and failures. Go tests/vet and frontend tests/build pass.
- Limits: no holidays, capacity history or edit-conflict detection. Browser checks are manual; no end-to-end suite.
