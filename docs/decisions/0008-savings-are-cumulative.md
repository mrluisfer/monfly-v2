# 0008. Savings are a running total, not a monthly allowance

Status: accepted · 2026-09-11

**Context** — The dashboard's second meter ran on placeholder figures, and
building it for real forced a question: is a savings goal measured over the
current month, or across every month? Measured monthly it becomes a second
budget — the same shape as "Spent this month", answering the same question, in
the slot beside it. The schema already leaned the other way: `Pot` carries
`goalAmount` and `currentAmount` and has no month column. But it held no rows,
`Transaction.type` held only `income` and `expense`, and `MonthlySummary` was
empty, so nothing in the database recorded savings at all.

**Decision** — A savings goal is cumulative. The meter measures what has been
put away in total against the goal; the month belongs in the reading of pace,
never in the scale. It is stored in the `Pot` table v1 created and never grew a
screen for — one goal per person, the newest. Clearing a goal writes zero to
`goalAmount` rather than deleting the row, so the record of what is already
saved is never thrown away with it. An addition is applied to `currentAmount`
in one statement, since the HTTP driver holds no transaction open.

Recording contributions as transactions under a third `type` ("saving") was
rejected. It needs no migration — the column is free text — but v1 validates
with `z.enum(["income", "expense"])` and moves the balance with
`type === "income" ? +amount : -amount`, so rows written from v2 would fall out
of its charts and its own form could not edit them.

**Consequences** — No migration, and v1 is untouched. Spending and saving keep
their different shapes: one a flow that resets each month, the other a stock
that accumulates. The cost is that `Pot` keeps no history, so there is no true
"added this month", no pace and no estimated arrival — `updatedAt` says only
when the row last moved, goal edits included. Adding those means a
contributions ledger, and that is a Prisma migration in v1 ([0001](0001-shared-database.md)).
The table allows several goals at once; the dashboard shows one.
