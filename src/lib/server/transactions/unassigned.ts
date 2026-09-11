import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import type { Currency } from '../../finance/money';
import type { AssignResult, UnassignedList } from '../../transactions';
import type { db as appDb } from '../db';
import { card, transaction } from '../db/schema';
import { INCOME, amountCents, signedCents, sinceFirstAccount } from '../finance/fragments';

/** Prisma's `@updatedAt` writes UTC wall-clock time into a zone-less column; so does this. */
const nowUtc = sql`(now() at time zone 'utc')`;

/** The user's card-less transactions, newest first. Read-only. */
export async function getUnassigned(
	db: Pick<typeof appDb, 'select'>,
	{ userEmail, currency }: { userEmail: string; currency: Currency }
): Promise<UnassignedList> {
	const rows = await db
		.select({
			id: transaction.id,
			date: sql<string>`to_char(${transaction.date}, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`,
			type: transaction.type,
			amount: sql<string>`${amountCents}`,
			category: transaction.category,
			description: transaction.description,
			beforeAccounts: sql<boolean>`not ${sinceFirstAccount(userEmail)}`
		})
		.from(transaction)
		.where(and(eq(transaction.userEmail, userEmail), isNull(transaction.cardId)))
		.orderBy(desc(transaction.date), desc(transaction.id));

	return {
		currency,
		transactions: rows.map((row) => ({
			id: row.id,
			date: row.date,
			type: row.type === INCOME ? 'income' : 'expense',
			amount: Number(row.amount),
			category: row.category,
			description: row.description?.trim() || null,
			beforeAccounts: row.beforeAccounts
		}))
	};
}

type Assign = {
	/** The stored `User.email` — `profile.email`, never the Auth0 spelling. */
	userEmail: string;
	/** Transactions to give the account; any not theirs, or with an account already, are skipped. */
	ids: string[];
	accountId: string;
};

/**
 * Gives card-less transactions one of the user's active accounts, the way v1
 * links one: the account's balance takes each one's signed amount, and
 * `User.totalBalance` stays as it is — v1 counted them in it when they were
 * recorded. Those dated before the first account are the exception: the
 * balance that account was opened with already holds them, so they only
 * record where they came from.
 *
 * One statement, so it's atomic without a session: the balance moves by
 * exactly what the update touched, and a transaction another request got to
 * first is skipped rather than counted twice. Null when the account isn't the
 * user's or isn't active.
 */
export async function assignAccount(
	db: Pick<typeof appDb, 'execute'>,
	{ userEmail, ids, accountId }: Assign
): Promise<AssignResult | null> {
	const { rows } = await db.execute<{ found: boolean; assigned: number; moved: string }>(sql`
		with target as (
			select ${card.id} as id from ${card}
			where ${card.id} = ${accountId} and ${card.userEmail} = ${userEmail} and ${card.status} = 'active'
		),
		moved as (
			update ${transaction} set "cardId" = (select id from target), "updatedAt" = ${nowUtc}
			where ${inArray(transaction.id, ids)} and ${transaction.userEmail} = ${userEmail}
				and ${transaction.cardId} is null and exists (select 1 from target)
			returning case when ${sinceFirstAccount(userEmail)} then ${signedCents} else 0 end as cents
		),
		credited as (
			update ${card}
			set "balance" = round(coalesce(${card.balance}, 0)::numeric + (select sum(cents) from moved) / 100, 2),
				"updatedAt" = ${nowUtc}
			where ${card.id} = (select id from target) and (select coalesce(sum(cents), 0) from moved) <> 0
			returning ${card.id}
		)
		select exists (select 1 from target) as found,
			(select count(*) from moved)::int as assigned,
			(select coalesce(sum(cents), 0) from moved)::text as moved
	`);
	const [row] = rows;
	if (!row?.found) return null;
	return { assigned: row.assigned, moved: Number(row.moved) };
}
