# 0001. v2 shares v1's database; Prisma owns migrations

Status: superseded by [0015](0015-drizzle-kit-owns-migrations.md) · 2026-09-14

**Context** — v1 (React + Prisma) is live on the Neon project `monfly`. v2 is a
rewrite that has to read and write the same data while v1 keeps running.

**Decision** — v2 reaches the same database through Drizzle and never changes
its schema. Schema changes are Prisma migrations in v1; v2 introspects them with
`pnpm db:pull` and ports them into `src/lib/server/db/schema.ts` by hand.
`drizzle-kit push` and `migrate` are never run — there are no scripts for them
on purpose.

**Consequences** — no data migration while v1 lives, but v2 inherits v1's shape:
ownership by `userEmail`, `double precision` money, client-generated ids
recreated with `$defaultFn`. A schema change ships as a v1 migration first.
