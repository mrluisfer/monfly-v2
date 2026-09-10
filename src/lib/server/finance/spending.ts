import { and, eq, sql } from 'drizzle-orm';
import type { Currency } from '../../finance/money';
import { addMonths, type MonthKey } from '../../finance/period';
import type { MonthSpending } from '../../finance/spending';
import type { db as appDb } from '../db';
import { transaction, user } from '../db/schema';

/** v1's `Transaction.type` values are "income" and "expense"; amounts are always positive. */
const EXPENSE = 'expense';

/**
 * Local midnight on the 1st of `month` in `timeZone`, as the UTC wall-clock
 * timestamp the `date` column stores. Postgres does the zone maths, DST
 * included, and the bound is a constant, so the (userEmail, date) index applies.
 */
function monthStart(month: MonthKey, timeZone: string) {
	const localMidnight = `${month}-01 00:00:00`;
	return sql`((${localMidnight}::timestamp at time zone ${timeZone}) at time zone 'UTC')`;
}

/** Each stored amount is rounded to cents before summing — integers from here on. */
const cents = sql`round(${transaction.amount}::numeric * 100)`;

type Input = {
	/** The stored `User.email` — `profile.email`, never the Auth0 spelling. */
	userEmail: string;
	month: MonthKey;
	timeZone: string;
	currency: Currency;
};

/** One user's expenses for a calendar month, and their budget, in one round trip. Read-only. */
export async function getMonthSpending(
	db: Pick<typeof appDb, 'select'>,
	{ userEmail, month, timeZone, currency }: Input
): Promise<MonthSpending> {
	const [row] = await db
		.select({
			spent: sql<string>`coalesce(sum(${cents}), 0)`,
			count: sql<number>`count(*)::int`,
			budget: sql<number | null>`(select ${user.monthlyBudgetCents} from ${user} where ${user.email} = ${userEmail})`
		})
		.from(transaction)
		.where(
			and(
				eq(transaction.userEmail, userEmail),
				eq(transaction.type, EXPENSE),
				sql`${transaction.date} >= ${monthStart(month, timeZone)}`,
				sql`${transaction.date} < ${monthStart(addMonths(month, 1), timeZone)}`
			)
		);

	return { month, timeZone, currency, spent: Number(row.spent), budget: row.budget, count: row.count };
}
