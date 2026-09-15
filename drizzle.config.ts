import { databaseConfig } from './drizzle.shared';

/**
 * Develop, from `.env.develop` — where every migration is rehearsed first, and
 * what `pnpm db:generate`, `db:migrate`, `db:pull` and `db:studio` read.
 * Production has its own config: see drizzle.shared.ts.
 */
export default databaseConfig('.env.develop');
