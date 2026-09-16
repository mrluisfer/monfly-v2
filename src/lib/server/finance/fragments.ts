import { sql } from 'drizzle-orm';
import { card, transaction } from '../db/schema';

/** v1's `Transaction.type` values are "income" and "expense"; amounts are always positive. */
export const EXPENSE = 'expense';
export const INCOME = 'income';

/** Prisma's `@updatedAt` writes UTC wall-clock time into a zone-less column; so does this. */
export const nowUtc = sql`(now() at time zone 'utc')`;

/** Each stored amount rounded to cents before summing — integers from here on. */
export const amountCents = sql`round(${transaction.amount}::numeric * 100)`;

/** An amount signed the way v1 moves a balance: income adds, anything else takes. */
export const signedCents = sql`case when ${transaction.type} = ${INCOME} then ${amountCents} else -${amountCents} end`;

/**
 * Not one side of a transfer. Money moved between two of the user's own
 * accounts was neither earned nor spent, so income, spending and their
 * categories leave it out; balances, which it really moves, don't.
 */
export const notTransfer = sql`${transaction.transferId} is null`;

/**
 * True for a transaction dated on or after the user's first account was added
 * — and for every one when they have none. Card-less ones before it are
 * already in the balance that account was opened with: they aren't among the
 * unknown line's parts, and giving one an account moves no balance. A deleted
 * first account takes its date with it (v1 keeps no record), so the next
 * oldest stands in.
 */
export const sinceFirstAccount = (userEmail: string) =>
	sql`coalesce(${transaction.date} >= (select min(${card.createdAt}) from ${card} where ${card.userEmail} = ${userEmail}), true)`;

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
