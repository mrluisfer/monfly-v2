# Decisions

One short file per decision that someone would otherwise reopen, named
`NNNN-short-title.md` and never renumbered. When a decision changes, add a new
record and mark the old one superseded.

- [0001. v2 shares v1's database; Prisma owns migrations](0001-shared-database.md)
- [0002. Auth0 Universal Login with a server-side session](0002-auth0-universal-login.md)
- [0003. Repo tooling that works on GitHub Free](0003-github-free-tooling.md)
- [0004. Proprietary code, commercial-friendly dependencies](0004-proprietary-code.md)
- [0005. Secrets stay out of the repo](0005-secrets-out-of-repo.md)

## Template

```md
# NNNN. Title

Status: accepted · YYYY-MM-DD

**Context** — what forced a choice.

**Decision** — what we do.

**Consequences** — what it costs and what it rules out.
```
