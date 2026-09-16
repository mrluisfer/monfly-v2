import { sql, type SQLWrapper } from 'drizzle-orm';
import {
	MAX_HISTORY_POINTS,
	type BalanceEvent,
	type BalanceHistory,
	type HistoryRange
} from '../../accounts';
import type { Currency } from '../../finance/money';
import { todayKey, type DateKey } from '../../finance/period';
import type { db as appDb } from '../db';
import { balanceAdjustment, card, transaction } from '../db/schema';
import { signedCents } from '../finance/fragments';

type Input = {
	/** The stored `User.email` — `profile.email`, never the Auth0 spelling. */
	userEmail: string;
	range: HistoryRange;
	timeZone: string;
	currency: Currency;
};

/** How far back each fixed range reaches from today. */
const REACH: Record<Exclude<HistoryRange, 'all'>, string> = {
	'1m': '1 month',
	'3m': '3 months',
	'6m': '6 months',
	'1y': '1 year'
};

/**
 * Every active account's balance at the end of each point's day, and what
 * happened to them in that stretch — see `BalanceHistory`. Two queries, run
 * together, aggregated in the database: a balance is today's, less every
 * transaction dated after the point's day and every correction made after it.
 *
 * The points run back from today a whole number of days apart, so today is
 * always the last of them, and never more than `MAX_HISTORY_POINTS`. `all`
 * reaches back to the day the oldest active account was added. Read-only.
 */
export async function getBalanceHistory(
	db: Pick<typeof appDb, 'execute'>,
	{ userEmail, range, timeZone, currency }: Input
): Promise<BalanceHistory> {
	const today = todayKey(timeZone);
	// Stored as UTC wall time, as Prisma stored every timestamp: read in the viewer's zone.
	const localDay = (column: SQLWrapper) =>
		sql`((${column} at time zone 'UTC') at time zone ${timeZone})::date`;

	const first =
		range === 'all'
			? sql`least(coalesce((select min(${localDay(sql`created_at`)}) from accounts), ${today}::date), ${today}::date)`
			: sql`(${today}::date - ${REACH[range]}::interval)::date`;

	const window = sql`
		accounts as (
			select ${card.id} as id, ${card.createdAt} as created_at,
				round(coalesce(${card.balance}, 0)::numeric * 100) as now
			from ${card}
			where ${card.userEmail} = ${userEmail} and ${card.status} = 'active'
		),
		bounds as (
			select ${today}::date as last_day, ${first} as first_day
		),
		points as (
			select (last_day - n * step) as day,
				-- The next local midnight, as the UTC wall time a date is stored in.
				(((last_day - n * step + 1)::timestamp at time zone ${timeZone}) at time zone 'UTC') as cutoff
			from (
				select last_day, first_day,
					greatest(1, ceil((last_day - first_day)::numeric / ${MAX_HISTORY_POINTS - 1}))::int as step
				from bounds
			) as spaced,
			generate_series(0, (last_day - first_day) / step) as n
		)
	`;

	const [balances, happened] = await Promise.all([
		db.execute<{ day: DateKey; id: string | null; balance: string | null }>(sql`
			with ${window},
			moves as (
				select ${transaction.cardId} as card_id, ${transaction.date} as at, ${signedCents} as cents
				from ${transaction}
				where ${transaction.userEmail} = ${userEmail} and ${transaction.cardId} is not null
				union all
				select ${balanceAdjustment.cardId}, ${balanceAdjustment.createdAt},
					${balanceAdjustment.amountCents}::numeric
				from ${balanceAdjustment}
				where ${balanceAdjustment.userEmail} = ${userEmail}
			)
			-- Every day comes back, with or without accounts to draw on it.
			select to_char(points.day, 'YYYY-MM-DD') as day, accounts.id,
				case when accounts.created_at < points.cutoff
					then (accounts.now - coalesce(sum(moves.cents), 0))::text
				end as balance
			from points
			left join accounts on true
			left join moves on moves.card_id = accounts.id and moves.at >= points.cutoff
			group by points.day, points.cutoff, accounts.id, accounts.created_at, accounts.now
			order by points.day, accounts.created_at, accounts.id
		`),
		db.execute<{
			day: DateKey;
			account_id: string;
			kind: BalanceEvent['kind'];
			amount: string | null;
		}>(sql`
			with ${window},
			happened as (
				select ${localDay(sql`created_at`)} as day, id as account_id, 'opened' as kind,
					null::bigint as amount, created_at as at
				from accounts
				union all
				select ${localDay(balanceAdjustment.createdAt)}, ${balanceAdjustment.cardId}, 'corrected',
					${balanceAdjustment.amountCents}, ${balanceAdjustment.createdAt}
				from ${balanceAdjustment}
				join accounts on accounts.id = ${balanceAdjustment.cardId}
			)
			select to_char(day, 'YYYY-MM-DD') as day, account_id, kind, amount::text
			from happened
			where day >= (select first_day from bounds)
			order by at, account_id
		`)
	]);

	const days: DateKey[] = [];
	const series = new Map<string, (number | null)[]>();
	for (const row of balances.rows) {
		if (days.at(-1) !== row.day) days.push(row.day);
		if (row.id === null) continue;
		const line = series.get(row.id) ?? [];
		line.push(row.balance === null ? null : Number(row.balance));
		series.set(row.id, line);
	}

	return {
		currency,
		range,
		days,
		// A Map keeps the order the accounts first came in: oldest first.
		series: [...series].map(([id, balances]) => ({ id, balances })),
		events: happened.rows.map((row) => ({
			day: row.day,
			accountId: row.account_id,
			kind: row.kind,
			amount: row.amount === null ? null : Number(row.amount)
		}))
	};
}
