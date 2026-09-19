import { and, eq, sql } from 'drizzle-orm';
import {
	HISTORY_MONTHS,
	USUAL_MONTHS,
	type BudgetMonth,
	type CategoryLine
} from '../../finance/budget-month';
import type { Currency } from '../../finance/money';
import { addMonths, daysInMonth, type MonthKey } from '../../finance/period';
import type { db as appDb } from '../db';
import { categoryBudget, transaction, user } from '../db/schema';
import { EXPENSE, amountCents, notTransfer, utcMidnight } from './fragments';

type Input = {
	/** The stored `User.email` — `profile.email`, never the Auth0 spelling. */
	userEmail: string;
	month: MonthKey;
	timeZone: string;
	currency: Currency;
};

/**
 * One user's month against their budgets: the monthly budget and every
 * category's limit, what went out each day of the month and the one before,
 * the months leading up to it, and each category's month beside the month
 * before and a usual one. Four reads in parallel, each summed in SQL; money
 * moved between their own accounts isn't spending. Read-only.
 */
export async function getBudgetMonth(
	db: Pick<typeof appDb, 'select'>,
	{ userEmail, month, timeZone, currency }: Input
): Promise<BudgetMonth> {
	const first = addMonths(month, -(HISTORY_MONTHS - 1));
	const before = addMonths(month, -1);
	const next = addMonths(month, 1);

	const local = sql`((${transaction.date} at time zone 'UTC') at time zone ${timeZone})`;
	const spentSince = (from: MonthKey) =>
		and(
			eq(transaction.userEmail, userEmail),
			eq(transaction.type, EXPENSE),
			notTransfer,
			sql`${transaction.date} >= ${utcMidnight(`${from}-01`, timeZone)}`,
			sql`${transaction.date} < ${utcMidnight(`${next}-01`, timeZone)}`
		);
	const total = sql<string>`sum(${amountCents})`;

	// Grouped by position: the local-time expression carries the zone as a
	// parameter, and Postgres won't match two copies of it by value.
	const [byMonth, byDay, limits, owners] = await Promise.all([
		db
			.select({
				category: transaction.category,
				month: sql<MonthKey>`to_char(${local}, 'YYYY-MM')`,
				total,
				count: sql<number>`count(*)::int`
			})
			.from(transaction)
			.where(spentSince(first))
			.groupBy(sql`1, 2`),
		db
			.select({ day: sql<string>`to_char(${local}, 'YYYY-MM-DD')`, total })
			.from(transaction)
			.where(spentSince(before))
			.groupBy(sql`1`),
		db
			.select({ category: categoryBudget.category, limit: categoryBudget.limitCents })
			.from(categoryBudget)
			.where(eq(categoryBudget.userEmail, userEmail)),
		db.select({ budget: user.monthlyBudgetCents }).from(user).where(eq(user.email, userEmail))
	]);

	const months = Array.from({ length: HISTORY_MONTHS }, (_, i) => addMonths(first, i));
	/** The months a usual one is averaged over: the few right before this one. */
	const usualMonths = months.slice(-1 - USUAL_MONTHS, -1);

	const lines = new Map<string, CategoryLine>();
	const line = (name: string) => {
		let found = lines.get(name);
		if (!found) {
			found = { name, limit: null, spent: 0, count: 0, last: 0, usual: 0 };
			lines.set(name, found);
		}
		return found;
	};

	const spentIn = new Map<MonthKey, number>();
	const earlier = new Map<string, number>();
	let count = 0;
	for (const row of byMonth) {
		const cents = Number(row.total);
		spentIn.set(row.month, (spentIn.get(row.month) ?? 0) + cents);
		if (row.month === month) {
			const found = line(row.category);
			found.spent += cents;
			found.count += row.count;
			count += row.count;
		} else if (usualMonths.includes(row.month)) {
			const found = line(row.category);
			if (row.month === before) found.last += cents;
			earlier.set(row.category, (earlier.get(row.category) ?? 0) + cents);
		}
	}
	for (const { category, limit } of limits) line(category).limit = limit;

	const active = usualMonths.filter((m) => (spentIn.get(m) ?? 0) > 0).length;
	for (const [name, sum] of earlier) line(name).usual = active > 0 ? Math.round(sum / active) : 0;

	const perDay = new Map(byDay.map((row) => [row.day, Number(row.total)]));
	const daysOf = (m: MonthKey) =>
		Array.from(
			{ length: daysInMonth(m) },
			(_, i) => perDay.get(`${m}-${String(i + 1).padStart(2, '0')}`) ?? 0
		);

	return {
		month,
		timeZone,
		currency,
		budget: owners[0]?.budget ?? null,
		spent: spentIn.get(month) ?? 0,
		count,
		days: daysOf(month),
		daysBefore: daysOf(before),
		history: months.map((m) => ({ month: m, spent: spentIn.get(m) ?? 0 })),
		categories: [...lines.values()].sort(
			(a, b) => b.spent - a.spent || b.usual - a.usual || a.name.localeCompare(b.name)
		)
	};
}
