import { and, asc, eq, sql } from 'drizzle-orm';
import { isAccountRole, type AccountList } from '../../accounts';
import type { Currency } from '../../finance/money';
import { addMonths, type MonthKey } from '../../finance/period';
import type { db as appDb } from '../db';
import { card, transaction } from '../db/schema';
import { EXPENSE, amountCents, utcMidnight } from '../finance/fragments';

type Input = {
	/** The stored `User.email` — `profile.email`, never the Auth0 spelling. */
	userEmail: string;
	/** The month "tracked" covers — and, for `month-end`, the one whose closing balance is asked for. */
	month: MonthKey;
	balanceAt: AccountList['balanceAt'];
	timeZone: string;
	currency: Currency;
};

/**
 * The user's active accounts, oldest first, each with its figures — see
 * `Account`. One query: the cards, left-joined to their transactions. Read-only.
 */
export async function getAccounts(
	db: Pick<typeof appDb, 'select'>,
	{ userEmail, month, balanceAt, timeZone, currency }: Input
): Promise<AccountList> {
	const monthEnd = utcMidnight(`${addMonths(month, 1)}-01`, timeZone);
	const inMonth = sql`${transaction.date} >= ${utcMidnight(`${month}-01`, timeZone)} and ${transaction.date} < ${monthEnd}`;
	const current = sql`round(coalesce(${card.balance}, 0)::numeric * 100)`;
	// v1's rule: income adds to a card's balance, anything else takes from it.
	const signed = sql`case when ${transaction.type} = 'income' then ${amountCents} else -${amountCents} end`;

	const rows = await db
		.select({
			id: card.id,
			name: card.name,
			role: card.role,
			balance:
				balanceAt === 'now'
					? sql<string>`${current}`
					: sql<string>`${current} - coalesce(sum(${signed}) filter (where ${transaction.date} >= ${monthEnd}), 0)`,
			tracked: sql<string>`coalesce(sum(${amountCents}) filter (where ${transaction.type} = ${EXPENSE} and ${inMonth}), 0)`,
			change: sql<string>`coalesce(sum(${signed}) filter (where ${inMonth}), 0)`,
			toReview: sql<number>`count(${transaction.id}) filter (where ${transaction.description} is null or btrim(${transaction.description}) = '')::int`,
			updatedAt: sql<string>`to_char(greatest(${card.updatedAt}, max(${transaction.updatedAt})), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`,
			existed: balanceAt === 'now' ? sql<boolean>`true` : sql<boolean>`${card.createdAt} < ${monthEnd}`
		})
		.from(card)
		.leftJoin(transaction, eq(transaction.cardId, card.id))
		.where(and(eq(card.userEmail, userEmail), eq(card.status, 'active')))
		.groupBy(card.id)
		.orderBy(asc(card.createdAt), asc(card.id));

	return {
		currency,
		month,
		balanceAt,
		accounts: rows.map((row) => ({
			id: row.id,
			name: row.name,
			role: isAccountRole(row.role) ? row.role : null,
			balance: Number(row.balance),
			tracked: Number(row.tracked),
			change: Number(row.change),
			toReview: row.toReview,
			updatedAt: row.updatedAt,
			existed: row.existed
		}))
	};
}
