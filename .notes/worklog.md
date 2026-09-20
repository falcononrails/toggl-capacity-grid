# Worklog

Running notes on how this got built — decisions, assumptions, dead ends, and anything
left unfinished. Append as you go; a line or two per entry is right.

---

## Initial exploration - 20 September 2026

- Read the brief, agent rules and both endpoint stubs. No feature implementation yet. `DECISIONS.md` stays human-authored; schema, seed and run environment stay unchanged.
- The seed contains 500 people, 12 projects and 126,195 assignments, spanning 2025-06-02 through 2027-01-03. Repeated-looking assignment rows have different IDs and their hours add up: Ana's first block has 15 rows totalling 8 hours/day. Do not deduplicate them on their visible fields.
- Independently summed the first three displayed weeks with a read-only Node script. Assuming inclusive dates and Monday-Friday workdays, Ana has 40/0/30 hours; Bo 0/32/8; Cem 0/4/12; Dee 0/45/40; Eli 0/20/0. Their weekly capacities are 40, 40, 20, 40 and 0. These are test expectations under an assumption, not rules specified by the brief.
- Open decisions to discuss: week boundaries and weekends; partial-week capacity; global versus dated capacity edits; query shape and range bounds; refresh behavior after saving. Prefer the existing pgx connection and SQL aggregation; avoid loading all assignments into the browser.
- Setup check: Docker, Make and Go were not found on Windows PATH or at their usual install paths, or via `which` in Ubuntu-22.04 WSL. Port 3000 is occupied by the website preview. The assignment has not been started yet. Resolve the runtime and free that port without changing Compose.
- Created a separate private repository, retained the starter history, and created `feature/capacity-view`. No public fork or public solution was created.

## Runtime check

- Installed Docker Engine, Compose and Make in the existing Ubuntu WSL environment. Started the original Compose stack without changing its files. `/api/health` returns `{"ok":true,"people":500}` and the browser shows the starter placeholder for 2025-12-29 through 2026-01-16. The setup blocker is resolved; feature work has not started.
