# 0014. Header shortcuts live on the User row

Status: accepted · 2026-09-14

**Context** — The header's tabs were a fixed list. People want to pin the pages
they use, and to find the same tabs on any device they sign in from, so the
choice can't live in a cookie or in localStorage the way the Income chart's
settings and the transactions panel do.

**Decision** — A text array on `User`, `shortcuts`, holding ids from
`$lib/shortcuts`, which owns the catalog — href, label, what each page is for —
and the order the header draws them in. It defaults to `{overview,transactions}`.
Overview is locked rather than fixed: it's stored like the rest, but taking it
away takes four presses on its lock and a confirmation, and pinning it again
locks it again. `PATCH /api/me/shortcuts` pins or unpins one id in a single
statement (`array_append` / `array_remove`), so two devices changing different
shortcuts can't overwrite each other. The session's profile carries the array,
and the app layout seeds the query with it, so the header draws on the server;
the query then refetches like any other, which is how a change on another device
arrives.

The column came from v1's migration `20260914230000_add_user_shortcuts`, holding
Transactions alone while Overview wasn't stored; v2's
`20260915031723_overview_shortcut` ([0015](0015-drizzle-kit-owns-migrations.md))
added Overview to every row and to the default.

**Consequences** — A new destination is a catalog entry, not a migration; an id
the catalog drops simply stops drawing. Order is the catalog's, not the order
things were pinned in: reordering would need the array's order to mean
something. The column is v2's alone; v1 ignores it.
