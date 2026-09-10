# CLAUDE.md

Monfly v2: the SvelteKit rewrite of Monfly (`../monfly-v1` is the legacy React app).

- **UI work:** follow `DESIGN.md` — layout, motion specs, floating layers, the
  header, hotkeys. Compose from `$lib/components/ui`; extend a primitive rather
  than restyling per page. When a design decision changes, update `DESIGN.md`.
- **Data work:** read `README.md` → Data flow and Database first. Money is
  integer cents (`$lib/finance/money`); months are drawn in the viewer's time
  zone; endpoints live under `/api` and call `requireMonflyUser`.
- **The database is shared with v1 and is live.** Never run `drizzle-kit push`
  or `migrate`. Schema changes are Prisma migrations in v1; v1's `.env` points
  at the Neon `develop` branch, production is the URL in v1's `.env.local`.
- **Shortcuts** are added to `src/lib/hotkeys/registry.ts`, nowhere else.
- **Verify** with `pnpm check` (0 errors, 0 warnings) and `pnpm build`.
