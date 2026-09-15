# 0016. Shortcut changes are kept as events

Status: accepted · 2026-09-14

**Context** — `User.shortcuts` says what's pinned now, not how it got there.
The shortcuts page should show how people use them — how often the header
changes, which shortcuts come and go, and where changes are made — and a
current-state array can't answer any of that.

**Decision** — A `ShortcutEvent` table, added by the Drizzle migration
`20260915040253_shortcut_events`: who (`userEmail`, the key named and behaving
as every other table's), which shortcut, which way (`pinned`), where
(`source`: `page`, `header` or `lock`, held by a check constraint) and when,
indexed by user and time. `PATCH /api/me/shortcuts` writes the event in the same
statement that changes the array, with data-modifying CTEs, and only when the
shortcut's membership really changed, so the array and its history can't
disagree. `GET /api/me/shortcuts/activity` counts the last eight weeks in SQL —
by week in the viewer's zone, by shortcut, by source — and the page draws three
charts from it.

**Consequences** — Only changes made from here on are counted: nothing
reconstructs what happened before. The table grows by one row per real change,
which is small, and deleting a user is restricted by it as by every other table.
A new source means a new check constraint, so a migration. v1 never reads it.
