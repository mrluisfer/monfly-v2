import { databaseConfig } from './drizzle.shared';

/**
 * `pnpm db:pull`: develop's structure as Drizzle reads it, written to the
 * gitignored `drizzle-pull/` rather than `drizzle/`, where it would land as a
 * migration. For checking the database against schema.ts. Drizzle Kit won't
 * take `--out` next to `--config`, so the folder is set here.
 */
export default databaseConfig('.env.develop', { out: './drizzle-pull' });
