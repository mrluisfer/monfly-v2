# 0022. An account's own In, Out and Net count its transfers

Status: accepted · 2026-09-16 · revises the account figures in [0021](0021-transfers.md)

**Context** — 0021 left transfers out of everything that reads as income or
spending, the account panel's _In_, _Out_ and _Net this month_ included, with a
lavender line under them for what moved. On the first real transfer that read
wrong: $2,000 arrived in an account, its dial's change said +$2,000.00, and the
three figures under it said $0.00. The ledger's account tip already drew _Net
this month_ from `change`, transfers in, so the same words gave two numbers.

**Decision** — On one account, _In_, _Out_ and _Net_ are what really arrived
and left: transfers count. _Net_ is `change`, the dial's figure; _Out_ is
`tracked + movedOut`; _In_ is `change + Out`. `Account.movedOut` (new, additive
in `GET /api/accounts`) is what left for another of the user's accounts, since
`moved` alone is a net and can't split in from out. The lavender line stays and
says how much of each was theirs moving: "Includes $500.00 moved in from and
$2,000.00 out to your other accounts."

Everything that adds accounts up, or reads as earning and spending, keeps
leaving transfers out, as 0021 decided: the month's spending and budget, the
income chart, expenses by category, the ledger's received and spent, _Tracked_,
the savings account's charges, and the accounts page's _Came in_ — where both
sides of a transfer would count the same money twice.

**Consequences** — An account's _In_ and _Out_ no longer mean income and
spending, and no longer add up across accounts into the page's totals; _Tracked_
is still the spending figure. A savings account fed by transfers shows them as
money in.
