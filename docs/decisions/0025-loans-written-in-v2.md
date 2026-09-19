# 0025. v2 writes loans, with v1's rules

Status: accepted · 2026-09-19 · builds on [0015](0015-drizzle-kit-owns-migrations.md) and [0021](0021-transfers.md)

**Context** — Loans lived only in v1. v2 read the rows that pay one
(`loanLinked`) and refused to change them, sending people to v1, and the
dashboard's Loans tab was a placeholder. v1's `Loan` holds what's owed
(`amount`), what's settled (`amountPaid`, which drives `status`: nothing,
some, all), the days it was made, falls due and was settled, and which way it
runs. A payment is either a transaction applied to it (`appliedToLoanId`),
which moves an account like any other, or — v1's quick payment and "mark as
paid" — `amountPaid` moved by hand with nothing written anywhere else. Most
paid loans on record were settled that second way. The days picked in v1's form
are stored as that day's UTC midnight (`new Date('2026-05-02')`), and v1 reads
them back in local time, a day early west of Greenwich.

**Decision** — The loans page (`/loans`) reads and writes the table itself,
keeping v1's rules so both apps agree on every figure while they share it. No
schema change.

- **The status always follows what's settled** — `amountPaid ≤ 0` pending,
  `≥ amount` paid, partial between — and `paidAt` is set on settling and cleared
  on reopening. `GET /api/loans` derives it again rather than trusting the column.
- **A payment never settles more than is left.** With an account it's a
  transaction on it — `income` for a loan they made, `expense` for one they
  owe, filed under `Loan` — and the account and `User.totalBalance` move with
  it, in the same statement as the loan (`POST /api/loans/[id]/payments`).
  Without one only `amountPaid` moves, as v1's quick payment. Undoing a payment
  (`DELETE …/payments/[paymentId]`) takes all of it back.
- **Recorded payments stand.** A loan's amount can't go under them and its
  direction can't turn once they're made (409), and a loan with payments can't
  be deleted (409, as v1) — undo them first. _Mark as settled_ is v1's "mark
  as paid"; _Open it again_ goes back to what the recorded payments cover.
- **Days are calendar days.** A stamp at exactly UTC midnight is that day as
  written; any other — a moment, a local midnight — is the day it fell on in
  the viewer's zone. v2 writes the days it's given as UTC midnight, as v1's form
  does, and keeps a stamp whose day didn't change.
- The ledger still refuses to edit or delete a row a loan has a claim on, now
  pointing at the Loans page instead of v1.

**Consequences** — Loans can be run from v2 alone, and v1 reads every write
the same way. Settling off the record keeps its v1 meaning — no balance moves —
so the page shows how much of a loan was settled that way beside its payments.
A loan opened from a transaction (`Loan.transactionId`) is read but not yet
linked from v2's form.
