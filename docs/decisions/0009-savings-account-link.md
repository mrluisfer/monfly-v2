# 0009. A savings goal can read an account, and adding is a transfer

Status: accepted · 2026-09-11 · amends [0008](0008-savings-are-cumulative.md)

**Context** — [0008](0008-savings-are-cumulative.md) left savings as a tally of
their own in `Pot.currentAmount`, with no history and so no pace. People
already keep the money somewhere: an account. Reading the goal from that
account makes the two agree by construction, and gives every contribution a
date. The catch is v1's arithmetic — it moves `User.totalBalance` by a signed
delta on every transaction — so recording a contribution as plain income would
inflate the total by the amount saved. The money did not arrive from outside;
it changed places.

**Decision** — An account may hold the role `savings`, alongside `main` and
`secondary`. `Card.role` is free text with a unique index on (userEmail, role),
so this needs no migration; `featuredAccounts` excludes it, or the dashboard
would draw it twice.

With an account linked it is the truth: what is saved is its balance, so income
landing there raises the goal on its own, from v1 or anywhere else. Adding from
the widget writes a **transfer** — one expense on the account the money leaves,
one income on the savings account — in a single statement, so neither row can
land without the other. `User.totalBalance` is deliberately untouched: the two
rows cancel, which is what a transfer means. The account the money comes from
is chosen per contribution, never fixed.

Without an account linked, 0008 stands: the pot keeps its own tally.

**Consequences** — Savings gain a dated history, which is what "added this
month", pace and an estimated arrival need; 0008's main limitation is lifted
for anyone who links an account. v2 now writes financial records, where before
it only ever re-pointed existing ones — the statement must stay atomic and must
never touch the total. Two accounts are required before the transfer is usable,
and the linked account's whole balance counts as saved, including anything that
was in it beforehand.

That last point was put to the person and kept deliberately (2026-09-11), so it
is not an oversight to be tidied away. Two alternatives were weighed:

- _Start from zero at linking._ Only money arriving afterwards would count.
  Rejected because the goal would read $0 saved while the account plainly holds
  its balance — two figures disagreeing, which is the thing this decision set
  out to prevent.
- _Let the person say how much of it counts_, stored as an adjustment in the
  otherwise unused `Pot.currentAmount`, so that
  `saved = (linked ? balance : 0) + currentAmount` stays one rule. Fairer to a
  mixed-use account, and it needs no migration, but it puts a second number
  behind the figure and the widget stops being a plain reading of the account.

So linking is for an account that genuinely holds savings. Link one that also
pays for the shopping and progress jumps the moment it is linked, then falls
as the account is spent from — the figure follows the balance, both ways.
