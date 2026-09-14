import { and, desc, eq, sql } from 'drizzle-orm';
import type { Currency } from '../../finance/money';
import { addMonths, type MonthKey } from '../../finance/period';
import { MAX_TRANSACTIONS, type TransactionList } from '../../transactions';
import type { db as appDb } from '../db';
import { card, loan, transaction } from '../db/schema';
import { INCOME, amountCents, utcMidnight } from '../finance/fragments';

type Input = {
	/** The stored `User.email` — `profile.email`, never the Auth0 spelling. */
	userEmail: string;
	currency: Currency;
	/** One calendar month, or null for the whole record. */
	month: MonthKey | null;
	/** The viewer's zone: a month's boundaries are drawn in it. */
	timeZone: string;
};

/**
 * A month of transactions — or every one — newest first, with the account each
 * was recorded on. One row over the cap is asked for, so the answer can say it
 * ran out rather than quietly truncating.
 *
 * The totals alongside always cover everything on record, whatever the rows
 * cover: the headline figures shouldn't move when the list is narrowed to a
 * month. Read-only.
 */
export async function getTransactions(
	db: Pick<typeof appDb, 'select'>,
	{ userEmail, currency, month, timeZone }: Input
): Promise<TransactionList> {
	const theirs = eq(transaction.userEmail, userEmail);
	const inMonth =
		month === null
			? undefined
			: sql`${transaction.date} >= ${utcMidnight(`${month}-01`, timeZone)} and ${transaction.date} < ${utcMidnight(`${addMonths(month, 1)}-01`, timeZone)}`;

	const [rows, [sums]] = await Promise.all([
		db
			.select({
				id: transaction.id,
				date: sql<string>`to_char(${transaction.date}, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`,
				type: transaction.type,
				amount: sql<string>`${amountCents}`,
				category: transaction.category,
				description: transaction.description,
				accountId: card.id,
				accountName: card.name,
				loanLinked: sql<boolean>`${transaction.appliedToLoanId} is not null or exists (select 1 from ${loan} where ${loan.transactionId} = ${transaction.id})`
			})
			.from(transaction)
			.leftJoin(card, and(eq(card.id, transaction.cardId), eq(card.status, 'active')))
			.where(inMonth ? and(theirs, inMonth) : theirs)
			.orderBy(desc(transaction.date), desc(transaction.id))
			.limit(MAX_TRANSACTIONS + 1),
		// Unscoped on purpose: these are the figures over the whole record.
		db
			.select({
				received: sql<string>`coalesce(sum(${amountCents}) filter (where ${transaction.type} = ${INCOME}), 0)`,
				spent: sql<string>`coalesce(sum(${amountCents}) filter (where ${transaction.type} <> ${INCOME}), 0)`,
				count: sql<number>`count(*)::int`,
				oldest: sql<
					string | null
				>`to_char(min(${transaction.date}), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`
			})
			.from(transaction)
			.where(theirs)
	]);

	return {
		currency,
		month,
		capped: rows.length > MAX_TRANSACTIONS,
		totals: {
			received: Number(sums?.received ?? 0),
			spent: Number(sums?.spent ?? 0),
			count: sums?.count ?? 0
		},
		oldest: sums?.oldest ?? null,
		transactions: rows.slice(0, MAX_TRANSACTIONS).map((row) => ({
			id: row.id,
			date: row.date,
			type: row.type === INCOME ? ('income' as const) : ('expense' as const),
			amount: Number(row.amount),
			category: row.category,
			description: row.description?.trim() || null,
			account:
				row.accountId && row.accountName ? { id: row.accountId, name: row.accountName } : null,
			loanLinked: row.loanLinked
		}))
	};
}
