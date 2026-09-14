# 0011. The transactions panel is kept per browser, in localStorage

Status: accepted · 2026-09-14

**Context** — The Transactions page's panel reads a row, edits it, or writes a
new one, and it lived only in the page's state: a reload, or a trip to another
page to work out a figure, lost whatever was half written. Keeping it could
mean the URL (amounts and notes end up in history and server logs), the
database (v1 has no drafts, so that's a Prisma migration for a convenience),
sessionStorage (gone with the tab) or localStorage.

**Decision** — localStorage, through `$lib/transaction-panel`, which declares
the format. One JSON document per signed-in user under
`monfly:transactions-panel:<User.id>`, holding a version, the mode (`view`,
`edit`, `new`), the row's id, and for `edit` and `new` the fields as typed:

```json
{
  "v": 1,
  "mode": "edit",
  "id": "<transaction id>",
  "draft": {
    "amount": "1,234.5",
    "type": "expense",
    "category": "Groceries",
    "description": "",
    "date": "2026-09-14",
    "account": null
  }
}
```

The page writes it on every change and removes it when the panel closes (×,
Escape, Cancel on a new one, or saving one). It reads it once, after hydration,
when the ledger has loaded: a row that isn't in the ledger any more, another
version, or anything malformed is dropped.

- **The category is kept by name**, as `Transaction.category` stores it and
  v1's category select writes it (`value={category.name}`), never as a
  `Category.id`. Rows carry names no `Category` row has, because categories
  were free text first; a renamed or deleted category would leave an id
  pointing at nothing; and saving sends a name. When the field becomes a
  select, the stored format doesn't change. The select has to show a name that
  isn't among its options, which an old row being edited needs anyway, so a
  restored draft needs nothing extra.
- **The amount is kept as its text**, not cents: half written ("12.") it isn't
  a number yet. The editor parses and checks every field on saving, restored
  or typed, and the endpoint checks them again.

**Consequences** — A draft outlives the tab and a sign-out: until the panel is
closed, its amount and note sit in plain text in this browser profile. The key
is per user, so another Monfly account in the same browser never opens on it,
but anyone with the device can read it. Two tabs on Transactions share the key:
the last write wins, and a new tab opens on what the other left. An edit
restored over a row changed elsewhere in the meantime shows the draft, not the
new values, and saving writes the draft. Changing the shape means bumping
`PANEL_VERSION`, and older documents are dropped rather than migrated.
