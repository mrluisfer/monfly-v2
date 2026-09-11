# AGENTS.md

Monfly v2: the SvelteKit rewrite of Monfly (`../monfly-v1` is the legacy React
app). This file is for coding agents; people start at the [README](README.md).

## Ground rules

- **UI work:** follow [DESIGN.md](DESIGN.md) — layout, motion specs, floating
  layers, the header, hotkeys. Compose from `$lib/components/ui`; extend a
  primitive rather than restyling per page. When a design decision changes,
  update `DESIGN.md`.
- **Data work:** read README → Data flow and Database first. Money is integer
  cents (`$lib/finance/money`); months are drawn in the viewer's time zone;
  endpoints live under `/api` and call `requireMonflyUser`.
- **The database is shared with v1 and is live.** Never run `drizzle-kit push`
  or `migrate`. Schema changes are Prisma migrations in v1; v1's `.env` points
  at the Neon `develop` branch, production is the URL in v1's `.env.local`.
- **Shortcuts** are added to `src/lib/hotkeys/registry.ts`, nowhere else.
- **Why things are the way they are:** [docs/decisions](docs/decisions/). Don't
  reopen a recorded decision without a new reason; record new ones there.

## Commands

Node 24 (`.nvmrc`): run `nvm use` first — `pnpm install` refuses other majors.

```sh
pnpm dev       # dev server on :5173
pnpm check     # svelte-check: types + a11y
pnpm lint      # Oxfmt + ESLint
pnpm format    # format the whole repo
pnpm build     # production build
```

## Done means

- `pnpm check` (0 errors, 0 warnings), `pnpm lint` and `pnpm build` pass.
- The PR title is a Conventional Commit (`feat: …`, `fix: …`): it becomes the
  squash commit and the changelog entry.
- GitHub Actions steps pin actions by commit SHA
  (`uses: owner/action@<sha> # vX.Y.Z`), or the Semgrep scan fails.
- New dependencies allow commercial, closed-source use
  ([0004](docs/decisions/0004-proprietary-code.md)).
