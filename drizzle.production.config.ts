import { databaseConfig } from './drizzle.shared';

/** Production, from `.env` — the database the app runs on. Only `pnpm db:migrate:production` reads this. */
export default databaseConfig('.env');
