# 0019. A balance set by hand is kept as an adjustment

Status: accepted · 2026-09-16

**Context** — The accounts page draws each account's balance over time. v1
keeps only the balance as it is now, so a past day's balance is today's wound
back through the transactions dated after it — the way `GET /api/accounts`
already winds a balance back to a month's end. That holds for every change a
transaction makes, but not for a balance typed in by hand: with no record of
when it happened, a correction made today would be wound back through nothing
and redraw every earlier day at the new figure, as if it had always been so.

**Decision** — A `BalanceAdjustment` table, added by the Drizzle migration
`20260916161440_balance_adjustments`: who (`userEmail`, named and behaving as
every other table's key), which account (`cardId`), what the balance moved by
(`amountCents`, signed whole cents, `bigint` because a correction can span
`MAX_BALANCE` both ways) and when, indexed by account and time.
`PATCH /api/accounts/[id]` writes it in the same statement that rewrites the
balance and moves `User.totalBalance` by the same difference, and only when the
balance really changed. `GET /api/accounts/history` subtracts the corrections
made after a day along with the transactions dated after it, so a correction is
a step on the day it was made. Opening an account writes none: its history
starts the moment it's added, at the balance it opens with.

**Consequences** — Only corrections made from v2 are kept: v1's hand edits, and
every one made before this, still count as if they had always been there. The
key cascades, so deleting an account — from v2 or v1, which doesn't know the
table — deletes its corrections too; deleting a user is restricted by it as by
every other table. v1 never reads it.
