import { and, eq, sql, type SQL } from 'drizzle-orm';
import {
	incomeBuckets,
	incomeRange,
	type IncomePeriod,
	type IncomeSummary
} from '../../finance/income';
import type { Currency } from '../../finance/money';
import { localDate } from '../../finance/period';
import type { db as appDb } from '../db';
import { transaction } from '../db/schema';
import { amountCents, utcMidnight } from './fragments';

type Input = {
	/** The stored `User.email` — `profile.email`, never the Auth0 spelling. */
	userEmail: string;
	period: IncomePeriod;
	timeZone: string;
	currency: Currency;
	now?: Date;
};

/** Bucket keys, matching `incomeBuckets`: the number each period groups by, prefixed. */
const PREFIX: Record<IncomePeriod, string> = { month: 'w', quarter: 'm', year: 'q', all: 'y' };

/**
 * One user's income for a period, bucketed on their own calendar: this month
 * by week, this quarter by month, this year by quarter, all time by year.
 * Every bucket is returned, empty ones at 0. Read-only.
 */
export async function getIncome(
	db: Pick<typeof appDb, 'select'>,
	{ userEmail, period, timeZone, currency, now = new Date() }: Input
): Promise<IncomeSummary> {
	const today = localDate(timeZone, now);
	const local = sql`((${transaction.date} at time zone 'UTC') at time zone ${timeZone})`;
	const bucket: Record<IncomePeriod, SQL<number>> = {
		month: sql<number>`floor((extract(day from ${local}) - 1) / 7)::int`,
		quarter: sql<number>`extract(month from ${local})::int`,
		year: sql<number>`extract(quarter from ${local})::int`,
		all: sql<number>`extract(year from ${local})::int`
	};

	const conditions: SQL[] = [eq(transaction.userEmail, userEmail), eq(transaction.type, 'income')];
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
			bucket: bucket[period],
			total: sql<string>`sum(${amountCents})`,
			count: sql<number>`count(*)::int`
		})
		.from(transaction)
		.where(and(...conditions))
		.groupBy(sql`1`)
		.orderBy(sql`1`);

	const found = new Map(rows.map((row) => [`${PREFIX[period]}${row.bucket}`, row]));
	const firstYear = period === 'all' && rows.length > 0 ? rows[0].bucket : today.year;
	const buckets = incomeBuckets(period, today, firstYear).map((b) => ({
		...b,
		total: Number(found.get(b.key)?.total ?? 0),
		count: found.get(b.key)?.count ?? 0
	}));

	return {
		period,
		timeZone,
		currency,
		total: buckets.reduce((sum, b) => sum + b.total, 0),
		count: buckets.reduce((sum, b) => sum + b.count, 0),
		buckets
	};
}
