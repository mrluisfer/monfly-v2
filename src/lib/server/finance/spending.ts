import { and, eq, sql } from 'drizzle-orm';
import type { Currency } from '../../finance/money';
import { addMonths, type MonthKey } from '../../finance/period';
import type { MonthSpending } from '../../finance/spending';
import type { db as appDb } from '../db';
import { transaction, user } from '../db/schema';
import { EXPENSE, amountCents, notTransfer, utcMidnight } from './fragments';

type Input = {
	/** The stored `User.email` — `profile.email`, never the Auth0 spelling. */
	userEmail: string;
	month: MonthKey;
	timeZone: string;
	currency: Currency;
};

/**
 * One user's expenses for a calendar month, and their budget, in one round
 * trip. Money moved to another of their accounts wasn't spent. Read-only.
 */
export async function getMonthSpending(
	db: Pick<typeof appDb, 'select'>,
	{ userEmail, month, timeZone, currency }: Input
): Promise<MonthSpending> {
	const [row] = await db
		.select({
			spent: sql<string>`coalesce(sum(${amountCents}), 0)`,
			count: sql<number>`count(*)::int`,
			budget: sql<
				number | null
			>`(select ${user.monthlyBudgetCents} from ${user} where ${user.email} = ${userEmail})`
		})
		.from(transaction)
		.where(
			and(
				eq(transaction.userEmail, userEmail),
				eq(transaction.type, EXPENSE),
				notTransfer,
				sql`${transaction.date} >= ${utcMidnight(`${month}-01`, timeZone)}`,
				sql`${transaction.date} < ${utcMidnight(`${addMonths(month, 1)}-01`, timeZone)}`
			)
		);

	return {
		month,
		timeZone,
		currency,
		spent: Number(row.spent),
		budget: row.budget,
		count: row.count
	};
}
