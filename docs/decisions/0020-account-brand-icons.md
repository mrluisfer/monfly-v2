# 0020. An account's brand icon is read from its name, and kept only when picked

Status: accepted · 2026-09-16

**Context** — People want an account to wear its bank's or network's mark —
BBVA, Nu, American Express — at the head of its card on the accounts page.
Asking everyone to pick one would leave most accounts bare, when the name
almost always says it already ("tarjeta de débito BBVA"). The libraries that
name a card's brand read its number, which Monfly never has; nothing public
reads a bank from free text.

**Decision** — `$lib/account-icons` lists the brands with the words that name
each, and `detectAccountIcon` matches them as whole words against the
account's issuer and name read together — lower-cased, accents off, banks
before networks, so "BBVA Visa" is BBVA and "menu" is nothing. Where nothing
matches, the account wears no icon. Pressing the icon, or _Icon_ in the card's
`⋯`, opens the same list (`AccountIconOptions`): the brands to pick one, or
_Automatic_ to go back to the name. Both read the account from the one cached
list the pick writes to, so they always agree. A pick is stored in
`Card.icon` (text, nullable), added by the Drizzle migration
`20260916200712_account_icon`, and set with `PATCH /api/accounts/[id]`
`{ "icon": … }`; NULL means "read it from the name", which is most rows. It
isn't activity, so `updatedAt` stays.

**Consequences** — A brand not in the list gets no icon until it's added there,
with its mark in `AccountLogo`. There's no "no icon" pick: an account whose
name names no brand is left with none by _Automatic_, and the `⋯` gives it one
back; one whose name does always wears a mark. The
marks are the brands' own, shown only to say which bank an account is with.
v1 ignores the column.
