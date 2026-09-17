# 0021. A transfer is two transactions that share an id

Status: accepted · 2026-09-16 · builds on [0009](0009-savings-account-link.md) · account figures revised by [0022](0022-account-figures-count-transfers.md)

**Context** — Moving money between two of your own accounts took two
transactions written by hand: an expense on one, income on the other. Each
moved `User.totalBalance` on its own, so the total was only right once both
existed; "Spent this month", the income chart and _Where it went_ counted the
money twice, as spending and as earnings; and nothing tied the two rows, so
editing or deleting one left the other behind. The savings widget already wrote
such a pair in one statement ([0009](0009-savings-account-link.md)), with the
same blind spot in the figures. v1 knows nothing of transfers: its form refuses
any `type` but `income` and `expense`, and it moves the total per row.

**Decision** — A transfer stays two ordinary transactions — money out of `from`
(`expense`), money in to `to` (`income`), both filed under `Transfer` — so v1,
every balance and the balance history read them unchanged. A nullable
`Transaction.transferId`, the same on both sides, makes them one move (Drizzle
migration `20260916220358_transfers`, additive).

- **Written whole, in one statement** (`$lib/server/transactions/transfer`):
  `POST /api/transfers` creates both sides, `PATCH /api/transfers/[id]`
  rewrites amount, accounts, day and note, `DELETE` removes both. Each moves the
  balances through one sum per account and moves the total by what the rows add
  up to — nothing for a whole transfer. Both accounts must be the user's, active
  and different.
- **A side on its own is refused** by `PATCH` and `DELETE /api/transactions/[id]`
  (409): changed alone it would leave its pair behind. A transfer v1 has cut in
  half can't be rewritten, only deleted, and deleting it takes the lone side out
  of the total as any deleted transaction does.
- **Not income, not spending** (`notTransfer`): the month's spending and budget,
  the income chart, expenses by category, the ledger's received and spent, an
  account's _Tracked_ and the savings account's charges leave transfers out.
  Balances, an account's net `change` and the history keep them — the money did
  move. `Account.moved` is the transfers' share of `change`, so income on an
  account is `change − moved + tracked`. (An account's own _In_, _Out_ and
  _Net_ now count its transfers: [0022](0022-account-figures-count-transfers.md).)
- The savings widget's transfer writes a `transferId` too, so it stops counting
  as spending.

Rejected: a third `type` (v1 refuses it, and its balance arithmetic would read
it as an expense — [0008](0008-savings-are-cumulative.md)); one row with a second
account column (v1 would move only one balance); recognising transfers by the
category name (people already file one-sided payments to others under
"Transferencia", 168 of them, which really were spent).

**Consequences** — v1 still shows both sides as income and spending, and editing
one side there splits the pair; v2 then offers only to delete it. Transfers
recorded by hand before this have no `transferId` and keep counting as they
always did: they can't be paired reliably. No savings transfers existed to
backfill.
