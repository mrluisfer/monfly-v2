import { sql } from 'drizzle-orm';
import { transaction } from '../db/schema';

/** v1's `Transaction.type` values are "income" and "expense"; amounts are always positive. */
export const EXPENSE = 'expense';

/** Each stored amount rounded to cents before summing — integers from here on. */
export const amountCents = sql`round(${transaction.amount}::numeric * 100)`;

/**
 * Local midnight at the start of `localDate` ("2026-09-01") in `timeZone`, as
 * the UTC wall-clock timestamp the `date` column stores. Postgres does the
 * zone maths, DST included, and the bound is a constant, so the
 * (userEmail, date) index still applies.
 */
export function utcMidnight(localDate: string, timeZone: string) {
	const localMidnight = `${localDate} 00:00:00`;
	return sql`((${localMidnight}::timestamp at time zone ${timeZone}) at time zone 'UTC')`;
}
