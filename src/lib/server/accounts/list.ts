import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import { isAccountRole, type AccountList, type Unassigned } from '../../accounts';
import type { Currency } from '../../finance/money';
import { addMonths, type MonthKey } from '../../finance/period';
import type { db as appDb } from '../db';
import { card, transaction, user } from '../db/schema';
import {
	EXPENSE,
	INCOME,
	amountCents,
	signedCents as signed,
	sinceFirstAccount,
	utcMidnight
} from '../finance/fragments';

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
 * `Account` — and what v1's total balance holds beyond them — see
 * `Unassigned`. Three queries, run together: the cards left-joined to their
 * transactions, v1's stored total, and one aggregate over the card-less
 * transactions. Read-only.
 */
export async function getAccounts(
	db: Pick<typeof appDb, 'select'>,
	{ userEmail, month, balanceAt, timeZone, currency }: Input
): Promise<AccountList> {
	const monthEnd = utcMidnight(`${addMonths(month, 1)}-01`, timeZone);
	const inMonth = sql`${transaction.date} >= ${utcMidnight(`${month}-01`, timeZone)} and ${transaction.date} < ${monthEnd}`;
	const current = sql`round(coalesce(${card.balance}, 0)::numeric * 100)`;
	const isIncome = sql`${transaction.type} = ${INCOME}`;

	// Which transactions a balance takes in: all of them, or those dated
	// before the month ended. `after` is the rest, wound back off stored totals.
	const upTo = balanceAt === 'now' ? sql`true` : sql`${transaction.date} < ${monthEnd}`;
	const after = balanceAt === 'now' ? sql`false` : sql`${transaction.date} >= ${monthEnd}`;
	// Card-less ones from before the first account sit in its opening balance, not among the parts.
	const since = sinceFirstAccount(userEmail);
	const counted = sql`${upTo} and ${since}`;

	const [rows, [ledger], [orphans]] = await Promise.all([
		db
			.select({
				id: card.id,
				name: card.name,
				role: card.role,
				balance:
					balanceAt === 'now'
						? sql<string>`${current}`
						: sql<string>`${current} - coalesce(sum(${signed}) filter (where ${after}), 0)`,
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
			.orderBy(asc(card.createdAt), asc(card.id)),
		// v1's total as v1 shows it — or, for a past month, less everything
		// dated after the month ended, the way account balances are wound back.
		db
			.select({
				total: sql<string>`round(${user.totalBalance}::numeric * 100) - coalesce(sum(${signed}), 0)`
			})
			.from(user)
			.leftJoin(transaction, and(eq(transaction.userEmail, user.email), after))
			.where(eq(user.email, userEmail))
			.groupBy(user.id),
		// No group by, so this comes back as exactly one row.
		db
			.select({
				tracked: sql<string>`coalesce(sum(${amountCents}) filter (where ${transaction.type} = ${EXPENSE} and ${inMonth}), 0)`,
				change: sql<string>`coalesce(sum(${signed}) filter (where ${inMonth}), 0)`,
				incomeCount: sql<number>`count(*) filter (where ${counted} and ${isIncome})::int`,
				incomeAmount: sql<string>`coalesce(sum(${amountCents}) filter (where ${counted} and ${isIncome}), 0)`,
				expenseCount: sql<number>`count(*) filter (where ${counted} and not ${isIncome})::int`,
				expenseAmount: sql<string>`coalesce(sum(${amountCents}) filter (where ${counted} and not ${isIncome}), 0)`,
				beforeAccounts: sql<number>`count(*) filter (where ${upTo} and not ${since})::int`
			})
			.from(transaction)
			.where(and(eq(transaction.userEmail, userEmail), isNull(transaction.cardId)))
	]);

	const accounts = rows.map((row) => ({
		id: row.id,
		name: row.name,
		role: isAccountRole(row.role) ? row.role : null,
		balance: Number(row.balance),
		tracked: Number(row.tracked),
		change: Number(row.change),
		toReview: row.toReview,
		updatedAt: row.updatedAt,
		existed: row.existed
	}));

	// Both aggregates always return a row; only a missing User row — never,
	// past requireMonflyUser — would leave nothing to compare the accounts to.
	if (!ledger || !orphans) return { currency, month, balanceAt, accounts, unassigned: null };

	// Everything v1's total holds that the accounts don't, read at the same cutoff.
	const balance = Number(ledger.total) - accounts.reduce((sum, a) => sum + a.balance, 0);
	const change = Number(orphans.change);
	const income = { count: orphans.incomeCount, amount: Number(orphans.incomeAmount) };
	const expense = { count: orphans.expenseCount, amount: Number(orphans.expenseAmount) };

	// Nothing to draw when the accounts add up to the total and nothing moved outside them.
	const unassigned: Unassigned | null =
		balance === 0 && change === 0
			? null
			: {
					balance,
					tracked: Number(orphans.tracked),
					change,
					income,
					expense,
					other: balance - (income.amount - expense.amount),
					beforeAccounts: orphans.beforeAccounts
				};

	return { currency, month, balanceAt, accounts, unassigned };
}
