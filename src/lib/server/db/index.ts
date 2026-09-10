import { env } from '$env/dynamic/private';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { relations } from './relations';

if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

/**
 * Drizzle over Neon's HTTP driver: one fetch per query, no socket to manage —
 * a good fit for serverless. It cannot hold an interactive transaction open:
 * use `db.batch([...])` for atomic multi-statement writes, or switch that flow
 * to `drizzle-orm/neon-serverless` (WebSocket) if it needs `db.transaction()`.
 */
export const db = drizzle({ client: neon(env.DATABASE_URL), relations });
