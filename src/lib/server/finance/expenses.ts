import { and, desc, eq, sql, type SQL } from 'drizzle-orm';
import type { ExpenseBreakdown } from '../../finance/expenses';
import type { Currency } from '../../finance/money';
import type { db as appDb } from '../db';
import { transaction } from '../db/schema';
import { EXPENSE, amountCents, notTransfer, utcMidnight } from './fragments';

type Input = {
	/** The stored `User.email` — `profile.email`, never the Auth0 spelling. */
	userEmail: string;
	/** A calendar year in the viewer's zone, or null for everything on record. */
	year: number | null;
	timeZone: string;
	currency: Currency;
};

/**
 * One user's expenses by category — for a calendar year, or all time —
 * largest first. `Transaction.category` is v1's free-text name, grouped as
 * stored; transfers between their own accounts aren't spending. Read-only.
 */
export async function getExpenseBreakdown(
	db: Pick<typeof appDb, 'select'>,
	{ userEmail, year, timeZone, currency }: Input
): Promise<ExpenseBreakdown> {
	const conditions: SQL[] = [
		eq(transaction.userEmail, userEmail),
		eq(transaction.type, EXPENSE),
		notTransfer
	];
	if (year !== null) {
		conditions.push(
			sql`${transaction.date} >= ${utcMidnight(`${year}-01-01`, timeZone)}`,
			sql`${transaction.date} < ${utcMidnight(`${year + 1}-01-01`, timeZone)}`
		);
	}

	const total = sql<string>`sum(${amountCents})`;
	const rows = await db
		.select({ name: transaction.category, total, count: sql<number>`count(*)::int` })
		.from(transaction)
		.where(and(...conditions))
		.groupBy(transaction.category)
		.orderBy(desc(total), transaction.category);

	const categories = rows.map((row) => ({
		name: row.name,
		total: Number(row.total),
		count: row.count
	}));
	return {
		year,
		timeZone,
		currency,
		total: categories.reduce((sum, c) => sum + c.total, 0),
		count: categories.reduce((sum, c) => sum + c.count, 0),
		categories
	};
}
