import { and, desc, eq, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { Currency } from '../../finance/money';
import { addMonths, type MonthKey } from '../../finance/period';
import { MAX_TRANSACTIONS, type TransactionList } from '../../transactions';
import type { db as appDb } from '../db';
import { card, loan, transaction } from '../db/schema';
import { EXPENSE, INCOME, amountCents, notTransfer, utcMidnight } from '../finance/fragments';

// A transfer's two sides and the accounts they sit on, joined back to either side.
const outSide = alias(transaction, 'out_side');
const inSide = alias(transaction, 'in_side');
const fromCard = alias(card, 'from_card');
const toCard = alias(card, 'to_card');

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
 * month. A transfer's two sides are rows like any other, each naming both of
 * its accounts, but neither is money received or spent. Read-only.
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
				loanLinked: sql<boolean>`${transaction.appliedToLoanId} is not null or exists (select 1 from ${loan} where ${loan.transactionId} = ${transaction.id})`,
				transferId: transaction.transferId,
				fromId: fromCard.id,
				fromName: fromCard.name,
				toId: toCard.id,
				toName: toCard.name
			})
			.from(transaction)
			.leftJoin(card, and(eq(card.id, transaction.cardId), eq(card.status, 'active')))
			.leftJoin(
				outSide,
				and(eq(outSide.transferId, transaction.transferId), eq(outSide.type, EXPENSE))
			)
			.leftJoin(fromCard, and(eq(fromCard.id, outSide.cardId), eq(fromCard.status, 'active')))
			.leftJoin(inSide, and(eq(inSide.transferId, transaction.transferId), eq(inSide.type, INCOME)))
			.leftJoin(toCard, and(eq(toCard.id, inSide.cardId), eq(toCard.status, 'active')))
			.where(inMonth ? and(theirs, inMonth) : theirs)
			.orderBy(desc(transaction.date), desc(transaction.id))
			.limit(MAX_TRANSACTIONS + 1),
		// Unscoped on purpose: these are the figures over the whole record.
		db
			.select({
				received: sql<string>`coalesce(sum(${amountCents}) filter (where ${transaction.type} = ${INCOME} and ${notTransfer}), 0)`,
				spent: sql<string>`coalesce(sum(${amountCents}) filter (where ${transaction.type} <> ${INCOME} and ${notTransfer}), 0)`,
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
			loanLinked: row.loanLinked,
			transfer: row.transferId
				? {
						id: row.transferId,
						from: row.fromId && row.fromName ? { id: row.fromId, name: row.fromName } : null,
						to: row.toId && row.toName ? { id: row.toId, name: row.toName } : null
					}
				: null
		}))
	};
}
