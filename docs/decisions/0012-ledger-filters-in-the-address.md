# 0012. The ledger's filters live in the page's address

Status: accepted · 2026-09-14

**Context** — The Transactions page's period, search, kind and advanced
filters lived only in the page's state, so nothing could open the ledger
already narrowed: an account on the dashboard couldn't lead to its own rows,
and a reload lost what was picked. [0011](0011-transactions-panel-in-local-storage.md)
kept the panel out of the URL because amounts and notes would land in history
and server logs; filters are what someone is looking for, not what they wrote.

**Decision** — Query parameters, read and written by `$lib/ledger-view`, which
declares the format: `month`, `type`, `q`, `account` and `category` (repeated,
one per pick; `account=none` for rows with no account), `from`, `to`, `min`,
`max`. A default is left out, and a value that doesn't read is dropped, so the
ledger opens on the rest.

The page reads its address on arrival and on every navigation that lands on it
again, and rewrites it with SvelteKit's shallow `replaceState` as the filters
move: no load runs and no history entry is added, so Back leaves the page
rather than stepping back through each filter. In the browser it reads
`location`, not `page.url`: going back to an address rewritten this way,
SvelteKit loads the one the page first arrived at.

Sorting, the page of rows and hidden columns stay out — they shape the list
rather than choose its rows — and so does the panel, for 0011's reasons.

**Consequences** — The search and the amount bounds sit in the address: in
browser history, and on a reload in the request logs. A search can hold words
from a note. A link names account ids and category names, which mean nothing in
another person's ledger: opened there, it narrows to nothing they have.
Renaming a parameter breaks links already made.
