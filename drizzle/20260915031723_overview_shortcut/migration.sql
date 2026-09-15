ALTER TABLE "User" ALTER COLUMN "shortcuts" SET DEFAULT ARRAY['overview', 'transactions']::text[];--> statement-breakpoint
-- Overview used to show without being stored. Now that it is stored, and can be
-- taken away, every account that lacks it gets it first, so nobody loses it.
UPDATE "User" SET "shortcuts" = array_prepend('overview', coalesce("shortcuts", ARRAY['transactions']::text[])) WHERE "shortcuts" IS NULL OR NOT ('overview' = ANY("shortcuts"));
