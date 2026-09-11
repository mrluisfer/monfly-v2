# Contributing

Branch, open a PR, keep CI green. That's most of it.

- **Branches** come off `main`: `feat/…`, `fix/…`, `chore/…`.
- **PRs are squash-merged,** so the PR title becomes the commit — write it as
  one: `feat: …`, `fix: …` ([Conventional Commits](https://www.conventionalcommits.org)).
- **CI** runs `pnpm check` (0 errors, 0 warnings) and `pnpm build`. Run them
  before pushing.
- **The database is shared with monfly-v1 and live.** Never run `drizzle-kit push`
  or `migrate`; schema changes are Prisma migrations in v1. Details in
  [Database](../README.md#database).
- **UI** follows [DESIGN.md](../DESIGN.md).

Setup and commands: [README](../README.md#commands).
