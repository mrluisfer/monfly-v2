# 0018. The dashboard's choices are kept per browser, in cookies

Status: accepted · 2026-09-16

**Context** — The Income card's period and the accounts left out of the total
lived only in component state: picking _This month_, or leaving an account
out, and going to another page and back put the card back on _This quarter_
and every account back in the total. Keeping them could mean the URL (as the
ledger's filters, [0012](0012-ledger-filters-in-the-address.md)),
localStorage (as the transactions panel,
[0011](0011-transactions-panel-in-local-storage.md)), a cookie (as the Income
card's chart settings already were), or the database.

**Decision** — Cookies, which the dashboard's `+page.server.ts` reads:

- `income-view` (`$lib/income-view`) gains `period`, beside the gear's
  settings. The page prefetches that period, so SSR draws it.
- `accounts-left-out` (`$lib/accounts-view`) holds the ids the total leaves out
  — account ids, and `unknown` for the card-less line — as a JSON list, and is
  removed when nothing is left out. Only lines still on the page are written,
  so a deleted account drops out on the next press.

Not the URL: the way back to the dashboard is the header's _Overview_ tab,
which links to `/dashboard` bare, so a choice kept in the address is lost on
exactly the trip it has to survive. Not localStorage: the server can't
read it, so every load would render the defaults and then switch — the total
counting to a new sum and the bars regrowing on each visit — or render
mismatched markup on hydration. Not the database: v1 has no column for either,
and they're how this browser looks at the figures, not facts about the money.

**Consequences** — The choices are per browser, not per person: another
device opens on the defaults, and two Monfly accounts sharing a browser share
the period and, for the card-less line, whether it's left out (account ids
don't collide). A left-out account stays out across visits until it's pressed
again; the label saying how many are left out is what keeps that from passing
unnoticed. Both cookies ride on every request to the site, a few hundred bytes
at most. Changing either shape means reading the old one leniently, as
`parseIncomeView` and `parseLeftOut` already do for anything they don't
recognise.
