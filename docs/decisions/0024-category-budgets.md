# 0024. A category's monthly limit is a row of its own

Status: accepted · 2026-09-19

**Context** — The budgets page measures a month against more than one figure:
the monthly budget, and a limit for any category worth watching on its own.
The monthly budget already lives on the user (`User.monthlyBudgetCents`), one
standing value. v1's schema has a `Budget` table — a category, a limit and a
spent figure between two dates — that v1 never implemented: nothing reads it
but its data export, and it holds no rows.

**Decision** — Limits are `CategoryBudget` rows (Drizzle migration
`20260919074232_category_budgets`, additive): the user's email, the category by
its name as transactions store it, and `limitCents`, an integer above zero with
the monthly budget's ceiling (`MAX_BUDGET`). One row per name (a unique index
on both), and each is a standing limit, the same every month, as the monthly
budget is.

- **Set and taken away in one statement**: `PUT /api/budgets` with
  `{ category, limit }` inserts or rewrites the row, and `limit: null` deletes
  it. The name travels in the body, not the path: it is free text, and a name
  like `..` or one with a slash doesn't survive a URL.
- **Read with the month**: `GET /api/budgets?month=` returns the monthly budget,
  every limit and what each category took — in the month, the month before and
  on a usual month (the three before, counting only months with anything
  spent) — with the month's days and the six months up to it, all summed in SQL.

Rejected: v1's `Budget` table (money in `double precision`, required dates for
what is a standing value, and a spent figure kept by hand that would disagree
with the ledger the moment a transaction changed); a JSON document on the user,
as `User.colors` is (no constraint on the amounts, and a per-month limit later
would mean rewriting its shape rather than adding a column).

**Consequences** — A limit follows a category's exact name: renaming a category
in v1 leaves its limit on the old name, and two spellings are two categories,
as they are everywhere else. Past months are measured against today's limits.
Deleting a user is restricted by the table, as by every other.
