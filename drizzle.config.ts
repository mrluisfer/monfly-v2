import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

config({ quiet: true });

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

/**
 * This database is shared with monfly-v1, and Prisma owns its migrations.
 * Until v1 is retired, Drizzle only reads its structure: `pnpm db:pull`, never
 * `drizzle-kit push` or `migrate` — those reconcile the database to this schema
 * with ALTERs and DROPs.
 */
export default defineConfig({
	dialect: 'postgresql',
	schema: './src/lib/server/db/schema.ts',
	out: './drizzle',
	dbCredentials: { url: process.env.DATABASE_URL },
	// Prisma's own bookkeeping table: never introspect it, never diff against it.,
	tablesFilter: ['!_prisma_migrations'],
	strict: true,
	verbose: true
});
