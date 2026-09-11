# Contributing

Branch, open a PR, keep CI green. That's most of it.

- **Setup:** use the Node version in `.nvmrc` (`nvm use`), then `pnpm install` —
  it also installs the git hooks. VS Code suggests the extensions to add.
- **Secrets** never go in git: `.env` is gitignored and `.env.example` lists what
  you need. Ask the owner for the values — they are shared through a password
  manager, not chat or commits.
- **Branches** come off `main`: `feat/…`, `fix/…`, `chore/…`.
- **PRs are squash-merged,** so the PR title becomes the commit and the changelog
  entry — write it as one: `feat: …`, `fix: …`
  ([Conventional Commits](https://www.conventionalcommits.org)).
- **Formatting and lint:** the pre-commit hook formats and lints what you stage;
  `pnpm format` and `pnpm lint` cover the whole repo.
- **CI** runs `pnpm lint`, `pnpm check` (0 errors, 0 warnings) and `pnpm build`.
- **The database is shared with monfly-v1 and live.** Never run `drizzle-kit push`
  or `migrate`; schema changes are Prisma migrations in v1. Details in
  [Database](../README.md#database).
- **UI** follows [DESIGN.md](../DESIGN.md).
- **Ownership:** Monfly is proprietary; what you contribute belongs to its
  owner ([LICENSE](../LICENSE)).
- **Conduct:** [code of conduct](CODE_OF_CONDUCT.md).

Setup and commands: [README](../README.md#commands). Why things are the way they
are: [docs/decisions](../docs/decisions/).
