import { sql } from 'drizzle-orm';
import { TRANSFER_CATEGORY, type TransferEntry } from '../../transactions';
import type { db as appDb } from '../db';
import { card, transaction, user } from '../db/schema';
import { EXPENSE, INCOME, nowUtc, signedCents, utcAt } from '../finance/fragments';

/**
 * Money moved between two of the user's own accounts: two transactions that
 * share a `transferId` — money out of one, money in to the other — written,
 * rewritten and removed together. v1 and every balance read them as the
 * transactions they are, while income and spending leave them out (see
 * `notTransfer`).
 *
 * Each write is one statement, as every write here is: the two rows and both
 * balances move together or not at all. `User.totalBalance` moves by what the
 * rows add up to, which for a whole transfer is nothing — the money changed
 * places, it wasn't earned or spent. Only a side left on its own (v1 deleted
 * the other) adds up to something, and removing it takes that out of the total
 * as removing any transaction does.
 *
 * Balances are moved through one sum per account (`deltas`): Postgres updates a
 * row once per statement, and a rewrite can touch the same account twice —
 * taken out of the old sides, put into the new ones.
 */

/** What became of a transfer write: done, not the user's, or refused for its accounts. */
export type TransferOutcome = 'done' | 'missing' | 'refused';

type Owner = { userEmail: string };

/** Both accounts are the user's, active, and not the same one. */
const bothActive = ({ userEmail, from, to }: Owner & Pick<TransferEntry, 'from' | 'to'>) => sql`
	select 1 where ${from}::text <> ${to}::text and (
		select count(*) from ${card}
		where ${card.userEmail} = ${userEmail} and ${card.status} = 'active'
			and ${card.id} in (${from}, ${to})
	) = 2
`;

/** Each account's balance moved by its share of `deltas`, in the same statement. */
const moveBalances = (userEmail: string) => sql`
	update ${card} set
		"balance" = round(coalesce(${card.balance}, 0)::numeric + deltas.cents::numeric / 100, 2),
		"updatedAt" = ${nowUtc}
	from deltas
	where ${card.id} = deltas.card_id and ${card.userEmail} = ${userEmail} and deltas.cents <> 0
	returning ${card.id}
`;

/** Writes a new transfer. `refused` when either account isn't the user's and active, or they're one. */
export async function createTransfer(
	db: Pick<typeof appDb, 'execute'>,
	{ userEmail, entry, timeZone }: Owner & { entry: TransferEntry; timeZone: string }
): Promise<{ outcome: Extract<TransferOutcome, 'done' | 'refused'>; id: string }> {
	// Prisma generated ids in its client, so the columns have no default (see the schema).
	const id = crypto.randomUUID();
	const out = crypto.randomUUID();
	const into = crypto.randomUUID();
	const day = utcAt(entry.date, entry.time, timeZone);

	const { rows } = await db.execute<{ done: number }>(sql`
		with ok as (${bothActive({ userEmail, ...entry })}),
		written as (
			insert into ${transaction}
				("id", "userEmail", "amount", "type", "category", "description", "date", "cardId", "createdAt", "updatedAt", "transferId")
			select side.id, ${userEmail}, ${entry.amount}::numeric / 100, side.type, ${TRANSFER_CATEGORY},
				${entry.description}, ${day}, side.card_id, ${nowUtc}, ${nowUtc}, ${id}
			from (values
				(${out}::text, ${EXPENSE}::text, ${entry.from}::text),
				(${into}::text, ${INCOME}::text, ${entry.to}::text)
			) as side (id, type, card_id)
			where exists (select 1 from ok)
			returning ${transaction.cardId} as card_id, ${signedCents} as cents
		),
		deltas as (select card_id, cents from written),
		moved as (${moveBalances(userEmail)})
		select (select count(*) from written)::int as done
	`);

	return { outcome: rows[0]?.done ? 'done' : 'refused', id };
}

/**
 * Rewrites a transfer — its amount, its two accounts, its day, time and note —
 * taking both sides out of the balances they moved and putting them into the
 * ones they move now. A day and minute it is already on keep the moment it was
 * recorded at, as a transaction's edit does. `refused` when the new accounts don't
 * hold up, or when a side is missing: a transfer with one side is no longer
 * one to rewrite, only to remove.
 */
export async function updateTransfer(
	db: Pick<typeof appDb, 'execute'>,
	{ userEmail, id, entry, timeZone }: Owner & { id: string; entry: TransferEntry; timeZone: string }
): Promise<TransferOutcome> {
	const { rows } = await db.execute<{ found: boolean; done: number }>(sql`
		with sides as (
			select ${transaction.id} as id, ${transaction.cardId} as card_id, ${signedCents} as cents
			from ${transaction}
			where ${transaction.transferId} = ${id} and ${transaction.userEmail} = ${userEmail}
		),
		ok as (
			${bothActive({ userEmail, ...entry })}
				and (select count(*) from sides) = 2
		),
		written as (
			update ${transaction} set
				"amount" = ${entry.amount}::numeric / 100,
				"cardId" = case when ${transaction.type} = ${INCOME} then ${entry.to} else ${entry.from} end,
				"description" = ${entry.description},
				"date" = case
					when to_char(${transaction.date} at time zone 'UTC' at time zone ${timeZone}, 'YYYY-MM-DD HH24:MI') = ${`${entry.date} ${entry.time}`}
					then ${transaction.date}
					else ${utcAt(entry.date, entry.time, timeZone)}
				end,
				"updatedAt" = ${nowUtc}
			where ${transaction.id} in (select id from sides) and exists (select 1 from ok)
			returning ${transaction.cardId} as card_id, ${signedCents} as cents
		),
		deltas as (
			select card_id, sum(cents) as cents from (
				select card_id, -cents as cents from sides
				where card_id is not null and exists (select 1 from written)
				union all
				select card_id, cents from written
			) as moves
			group by card_id
		),
		moved as (${moveBalances(userEmail)})
		select exists (select 1 from sides) as found, (select count(*) from written)::int as done
	`);

	const row = rows[0];
	return !row?.found ? 'missing' : row.done > 0 ? 'done' : 'refused';
}

/**
 * Removes a transfer: both sides leave the ledger and both balances go back
 * to what they were without it. The total moves only by what the removed
 * rows add up to — nothing, unless a side was already gone.
 */
export async function deleteTransfer(
	db: Pick<typeof appDb, 'execute'>,
	{ userEmail, id }: Owner & { id: string }
): Promise<Extract<TransferOutcome, 'done' | 'missing'>> {
	const { rows } = await db.execute<{ done: number }>(sql`
		with written as (
			delete from ${transaction}
			where ${transaction.transferId} = ${id} and ${transaction.userEmail} = ${userEmail}
			returning ${transaction.cardId} as card_id, ${signedCents} as cents
		),
		deltas as (
			select card_id, -sum(cents) as cents from written where card_id is not null group by card_id
		),
		moved as (${moveBalances(userEmail)}),
		totalled as (
			update ${user} set
				"totalBalance" = round(${user.totalBalance}::numeric - (select sum(cents) from written)::numeric / 100, 2),
				"updatedAt" = ${nowUtc}
			where ${user.email} = ${userEmail} and (select coalesce(sum(cents), 0) from written) <> 0
			returning ${user.id}
		)
		select (select count(*) from written)::int as done
	`);

	return rows[0]?.done ? 'done' : 'missing';
}
