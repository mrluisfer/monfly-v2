import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

/**
 * Drizzle Kit owns this database's migrations (docs/decisions/0015):
 * `schema.ts` is the source of truth, `pnpm db:generate` writes the next
 * migration into `drizzle/`, and `db:migrate` applies what's pending.
 *
 * Each config names the env file it reads — `drizzle.config.ts` develop's,
 * `drizzle.production.config.ts` production's — and reads only that file, never
 * the shell: a DATABASE_URL exported for something else can't turn a develop
 * migration into a production one. Migrations run on the direct host rather
 * than Neon's pooler, which is no place for DDL.
 *
 * Never `drizzle-kit push`: it reconciles the database with no migration to
 * review, and it drops what schema.ts doesn't declare.
 */
export function databaseConfig(envFile: string, { out = './drizzle' } = {}) {
	const { parsed } = config({ path: envFile, processEnv: {}, quiet: true });
	const url = parsed?.DATABASE_URL;
	if (!url) throw new Error(`DATABASE_URL is not set in ${envFile}`);

	return defineConfig({
		dialect: 'postgresql',
		schema: './src/lib/server/db/schema.ts',
		out,
		dbCredentials: { url: url.replace('-pooler.', '.') },
		// v1's Prisma history: kept while v1 lives, never introspected or diffed.
		tablesFilter: ['!_prisma_migrations'],
		strict: true,
		verbose: true
	});
}
