# Decisions

One short file per decision that someone would otherwise reopen, named
`NNNN-short-title.md` and never renumbered. When a decision changes, add a new
record and mark the old one superseded.

- [0001. v2 shares v1's database; Prisma owns migrations](0001-shared-database.md) — superseded by 0015
- [0002. Auth0 Universal Login with a server-side session](0002-auth0-universal-login.md)
- [0003. Repo tooling that works on GitHub Free](0003-github-free-tooling.md)
- [0004. Proprietary code, commercial-friendly dependencies](0004-proprietary-code.md)
- [0005. Secrets stay out of the repo](0005-secrets-out-of-repo.md)
- [0006. Oxfmt formats, ESLint lints](0006-oxfmt.md)
- [0007. Node 24 LTS](0007-node-24.md)
- [0008. Savings are a running total, not a monthly allowance](0008-savings-are-cumulative.md)
- [0009. A savings goal can read an account, and adding is a transfer](0009-savings-account-link.md)
- [0010. Animated icons: three Svelte 5 sets beside Lucide](0010-animated-icons.md)
- [0011. The transactions panel is kept per browser, in localStorage](0011-transactions-panel-in-local-storage.md)
- [0012. The ledger's filters live in the page's address](0012-ledger-filters-in-the-address.md)
- [0013. Storybook shows the design system](0013-storybook.md)
- [0014. Header shortcuts live on the User row](0014-shortcuts-on-the-user.md)
- [0015. v2 owns the schema: Drizzle Kit writes and runs migrations](0015-drizzle-kit-owns-migrations.md)
- [0016. Shortcut changes are kept as events](0016-shortcut-events.md)
- [0017. Monfly installs as a PWA; a desktop shell comes later](0017-installable-pwa.md)
- [0018. The dashboard's choices are kept per browser, in cookies](0018-dashboard-choices-in-cookies.md)
- [0019. A balance set by hand is kept as an adjustment](0019-balance-adjustments.md)
- [0020. An account's brand icon is read from its name, and kept only when picked](0020-account-brand-icons.md)

## Template

```md
# NNNN. Title

Status: accepted · YYYY-MM-DD

**Context** — what forced a choice.

**Decision** — what we do.

**Consequences** — what it costs and what it rules out.
```
