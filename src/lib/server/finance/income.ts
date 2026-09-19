import { and, eq, sql, type SQL } from 'drizzle-orm';
import {
	incomeBuckets,
	incomeRange,
	type IncomePeriod,
	type IncomeSummary,
	type IncomeUnit
} from '../../finance/income';
import type { Currency } from '../../finance/money';
import { localDate } from '../../finance/period';
import type { db as appDb } from '../db';
import { transaction } from '../db/schema';
import { EXPENSE, INCOME, amountCents, notTransfer, utcMidnight } from './fragments';

type Input = {
	/** The stored `User.email` — `profile.email`, never the Auth0 spelling. */
	userEmail: string;
	period: IncomePeriod;
	/** What each bucket covers: one of `INCOME_UNITS[period]`. */
	unit: IncomeUnit;
	timeZone: string;
	currency: Currency;
	now?: Date;
};

/** Bucket keys, matching `incomeBuckets`: the number each unit groups by, prefixed. */
const PREFIX: Record<IncomeUnit, string> = { week: 'w', month: 'm', quarter: 'q', year: 'y' };

/**
 * One user's income for a period, bucketed on their own calendar: this month
 * by week, this quarter by month, this year by quarter or month, all time by
 * year. Every bucket is returned, empty ones at 0. Money moved in from
 * another of their accounts wasn't earned, so it isn't here. Read-only.
 */
export function getIncome(db: Pick<typeof appDb, 'select'>, input: Input) {
	return bucketed(db, INCOME, input);
}

/**
 * What one user spent over a period, in the same buckets as their income, so
 * the Income card's Spent tab draws the same bars. Money moved out to another
 * of their accounts wasn't spent, so it isn't here either. Read-only.
 */
export function getExpenses(db: Pick<typeof appDb, 'select'>, input: Input) {
	return bucketed(db, EXPENSE, input);
}

/** One `type` of transaction over a period, bucketed: `getIncome` and `getExpenses`. */
async function bucketed(
	db: Pick<typeof appDb, 'select'>,
	type: typeof INCOME | typeof EXPENSE,
	{ userEmail, period, unit, timeZone, currency, now = new Date() }: Input
): Promise<IncomeSummary> {
	const today = localDate(timeZone, now);
	const local = sql`((${transaction.date} at time zone 'UTC') at time zone ${timeZone})`;
	const bucket: Record<IncomeUnit, SQL<number>> = {
		week: sql<number>`floor((extract(day from ${local}) - 1) / 7)::int`,
		month: sql<number>`extract(month from ${local})::int`,
		quarter: sql<number>`extract(quarter from ${local})::int`,
		year: sql<number>`extract(year from ${local})::int`
	};

	const conditions: SQL[] = [
		eq(transaction.userEmail, userEmail),
		eq(transaction.type, type),
		notTransfer
	];
	const range = incomeRange(period, today);
	if (range) {
		conditions.push(
			sql`${transaction.date} >= ${utcMidnight(range.from, timeZone)}`,
			sql`${transaction.date} < ${utcMidnight(range.to, timeZone)}`
		);
	}

	// Grouped by position: the bucket expression carries the zone as a
	// parameter, and Postgres won't match two copies of it by value.
	const rows = await db
		.select({
			bucket: bucket[unit],
			total: sql<string>`sum(${amountCents})`,
			count: sql<number>`count(*)::int`
		})
		.from(transaction)
		.where(and(...conditions))
		.groupBy(sql`1`)
		.orderBy(sql`1`);

	const found = new Map(rows.map((row) => [`${PREFIX[unit]}${row.bucket}`, row]));
	const firstYear = unit === 'year' && rows.length > 0 ? rows[0].bucket : today.year;
	const buckets = incomeBuckets(period, unit, today, firstYear).map((b) => ({
		...b,
		total: Number(found.get(b.key)?.total ?? 0),
		count: found.get(b.key)?.count ?? 0
	}));

	return {
		period,
		unit,
		timeZone,
		currency,
		total: buckets.reduce((sum, b) => sum + b.total, 0),
		count: buckets.reduce((sum, b) => sum + b.count, 0),
		buckets
	};
}
