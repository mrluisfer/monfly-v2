# 0023. Insights work their figures out from the ledger, in the browser

Status: accepted · 2026-09-16

**Context** — `/insights` is a place to turn the numbers over without changing
them: pick a year or the last twelve months, leave an account or a category
out of every chart, try a what-if on income and the biggest categories, and
take a month-by-month statement away as a spreadsheet. Every one of those
re-slices the whole stretch — each chart, the figures beside them, the
comparison with the stretch before — on every tick of a box or step of a
slider. The README's convention is that charts aggregate in the database; an
endpoint per chart, asked again on every change, would put a round trip under
each of those gestures.

**Decision** — The page reads the ledger's whole record, `transactionsQuery()`
— the cache entry the Transactions and Accounts pages already read — and
`$lib/insights` works every figure out from it in the browser: pure functions
from rows to entries on the viewer's days, to a stretch's totals by day, month,
category and account, to the same under a what-if. Transfers stay out at the
door, as every other figure of income and spending leaves them. What the page
is set to — the period, what counts, the what-if — lives in component state,
for the visit: nothing is written anywhere, not even to the browser.

Not endpoints per chart: the questions change with every gesture, and a person
has a few hundred transactions a year, which the browser adds up in well under a
frame. Not the address or a cookie for the settings: they are ways of looking
for a moment, and a what-if that came back on the next visit would read as fact.

**Consequences** — Insights see what the ledger sees, capped at
`MAX_TRANSACTIONS` rows; past it the page says it reads the most recent only,
and this decision is the one to revisit, with the aggregation moving into SQL
behind the same `Stretch` shape. A change to what counts as income or spending
has to reach `$lib/insights` as well as the server's `notTransfer`. The server
still draws the page with real figures: the load prefetches the record, as the
other two pages' loads do.
