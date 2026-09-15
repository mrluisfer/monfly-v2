# 0015. v2 owns the schema: Drizzle Kit writes and runs migrations

Status: accepted · 2026-09-14

Supersedes [0001](0001-shared-database.md).

**Context** — Schema changes were Prisma migrations in monfly-v1, ported into
v2's `schema.ts` by hand. v1 is about to be retired, and one change took two
repos, two schema files and a manual port. Production's Prisma history also
turned out to be missing migrations applied by hand, which blocked the first
`migrate deploy` there in days.

**Decision** — `src/lib/server/db/schema.ts` is the source of truth and Drizzle
Kit owns the migrations, in `drizzle/`: tracked, and never reformatted, since a
migration is recorded by its hash. `pnpm db:generate` writes the next one from
the schema; its SQL is read, any backfill goes in the same file, `pnpm
db:migrate` applies it to develop (`.env.develop`), and `pnpm
db:migrate:production` to production (`.env`) once develop is right. Each
config reads only its own env file and runs on Neon's direct host. The first
migration, `20260915031229_baseline`, is the database as it stood: its snapshot,
and a `SELECT 1` so recording it runs nothing. The foreign keys keep Prisma's
names in `schema.ts`, so the first diff against it was empty. `push` is never
run.

**Consequences** — One repo and one schema. While v1 still runs on the same
database, migrations stay additive — columns, defaults, backfills — because
v1's Prisma Client breaks on a renamed or dropped column. `_prisma_migrations`
stays as history, and v1 must not run `prisma migrate` again: it would see
Drizzle's changes as drift. A change applied by hand is now drift in Drizzle's
history too, so every change goes through a migration. Drizzle Kit 1.0 is still
a release candidate.
