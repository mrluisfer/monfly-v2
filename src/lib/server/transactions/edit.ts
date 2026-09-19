import { sql } from 'drizzle-orm';
import type { TransactionEdit, TransactionNew } from '../../transactions';
import type { db as appDb } from '../db';
import { card, loan, transaction, user } from '../db/schema';
import { nowUtc, signedCents, utcAt } from '../finance/fragments';

/**
 * Writing one transaction — adding, changing, removing — the way v1 does it:
 * the balances move with it. `User.totalBalance` always, and the account it
 * sits on with it, so the total and the accounts never drift apart.
 *
 * Each is one statement, since Neon's HTTP driver holds no session open (see
 * `$lib/server/db`): the row and the balances move together or not at all, and
 * a request that got there first can't be counted twice.
 *
 * Transactions tied to a loan are left alone. A loan has rules of its own —
 * how much of it is paid, whether that settles it, which way it may be paid —
 * and they live with the loan (`../loans`), where a payment is recorded and
 * undone. Rather than keep a second copy of them here, the write is refused.
 *
 * So is one side of a transfer: changed or removed on its own, it would leave
 * the other side behind and move the total by money that never arrived or
 * left. Both sides are written together, in `./transfer`.
 */

/** What became of a write: the row changed, isn't the user's, belongs to a loan, or to a transfer. */
export type WriteOutcome = 'done' | 'missing' | 'locked' | 'transfer';

type Target = { userEmail: string; id: string };

/**
 * The row to write to: what it moves now (`was`), the account holding it, and
 * whether a loan or a transfer has a claim on it. Scoped to the user, so
 * another person's id simply isn't found.
 */
const target = ({ userEmail, id }: Target) => sql`
	select ${transaction.id} as id,
		${signedCents} as was,
		${transaction.cardId} as card_id,
		(${transaction.appliedToLoanId} is not null
			or exists (select 1 from ${loan} where ${loan.transactionId} = ${transaction.id})) as locked,
		${transaction.transferId} is not null as transfer
	from ${transaction}
	where ${transaction.id} = ${id} and ${transaction.userEmail} = ${userEmail}
`;

type Answer = { found: boolean; transfer: boolean; done: number };

const outcome = (row: Answer | undefined): WriteOutcome =>
	!row?.found ? 'missing' : row.done > 0 ? 'done' : row.transfer ? 'transfer' : 'locked';

/** The three figures every write answers with, whatever it did. */
const said = sql`
	select exists (select 1 from target) as found,
		coalesce((select transfer from target), false) as transfer,
		(select count(*) from written)::int as done
`;

/**
 * Rewrites a transaction's amount, direction, category, note and day, and
 * moves the balances by the difference between what it used to be worth and
 * what it is now. The account it sits on isn't touched — giving a card-less
 * one an account is `assignAccount`, which knows the rule about the balance an
 * account was opened with.
 *
 * A day and minute it is already on keep the moment it was recorded at, to the
 * millisecond, so an edit that leaves them alone doesn't quietly move the row
 * within its minute; a new one lands on it in the viewer's zone, where the
 * table draws it.
 */
export async function updateTransaction(
	db: Pick<typeof appDb, 'execute'>,
	{ userEmail, id, edit, timeZone }: Target & { edit: TransactionEdit; timeZone: string }
): Promise<WriteOutcome> {
	const { rows } = await db.execute<Answer>(sql`
		with target as (${target({ userEmail, id })}),
		written as (
			update ${transaction} set
				"amount" = ${edit.amount}::numeric / 100,
				"type" = ${edit.type},
				"category" = ${edit.category},
				"description" = ${edit.description},
				"date" = case
					when to_char(${transaction.date} at time zone 'UTC' at time zone ${timeZone}, 'YYYY-MM-DD HH24:MI') = ${`${edit.date} ${edit.time}`}
					then ${transaction.date}
					else ${utcAt(edit.date, edit.time, timeZone)}
				end,
				"updatedAt" = ${nowUtc}
			where ${transaction.id} = (select id from target where not locked and not transfer)
			returning ${signedCents} as cents
		),
		moved as (
			select (select cents from written) - (select was from target) as cents
			where exists (select 1 from written)
				and (select cents from written) <> (select was from target)
		),
		credited as (
			update ${card} set
				"balance" = round(coalesce(${card.balance}, 0)::numeric + (select cents from moved)::numeric / 100, 2),
				"updatedAt" = ${nowUtc}
			where ${card.id} = (select card_id from target)
				and ${card.userEmail} = ${userEmail}
				and exists (select 1 from moved)
			returning ${card.id}
		),
		totalled as (
			update ${user} set
				"totalBalance" = round(${user.totalBalance}::numeric + (select cents from moved)::numeric / 100, 2),
				"updatedAt" = ${nowUtc}
			where ${user.email} = ${userEmail} and exists (select 1 from moved)
			returning ${user.id}
		)
		${said}
	`);
	return outcome(rows[0]);
}

/**
 * Removes a transaction and takes back what it moved: the account's balance
 * and the user's total both lose its signed amount.
 */
export async function deleteTransaction(
	db: Pick<typeof appDb, 'execute'>,
	{ userEmail, id }: Target
): Promise<WriteOutcome> {
	const { rows } = await db.execute<Answer>(sql`
		with target as (${target({ userEmail, id })}),
		written as (
			delete from ${transaction}
			where ${transaction.id} = (select id from target where not locked and not transfer)
			returning ${signedCents} as cents
		),
		credited as (
			update ${card} set
				"balance" = round(coalesce(${card.balance}, 0)::numeric - (select cents from written)::numeric / 100, 2),
				"updatedAt" = ${nowUtc}
			where ${card.id} = (select card_id from target)
				and ${card.userEmail} = ${userEmail}
				and exists (select 1 from written)
			returning ${card.id}
		),
		totalled as (
			update ${user} set
				"totalBalance" = round(${user.totalBalance}::numeric - (select cents from written)::numeric / 100, 2),
				"updatedAt" = ${nowUtc}
			where ${user.email} = ${userEmail} and exists (select 1 from written)
			returning ${user.id}
		)
		${said}
	`);
	return outcome(rows[0]);
}

/**
 * Writes a new transaction and moves the balances by what it is worth, signed
 * the way v1 signs it. The account is part of it here, unlike an edit: a row
 * written today was in no account's opening balance, whatever day it is dated,
 * so its amount always moves the balance of the account it names. `missing`
 * when that account isn't the user's, or isn't active.
 */
export async function createTransaction(
	db: Pick<typeof appDb, 'execute'>,
	{ userEmail, entry, timeZone }: { userEmail: string; entry: TransactionNew; timeZone: string }
): Promise<{ outcome: Extract<WriteOutcome, 'done' | 'missing'>; id: string }> {
	// Prisma generated ids in its client rather than the database, so the
	// column has no default of its own (see the schema).
	const id = crypto.randomUUID();
	const cents = entry.type === 'income' ? entry.amount : -entry.amount;

	const { rows } = await db.execute<{ done: number }>(sql`
		with account as (
			select ${card.id} as id from ${card}
			where ${card.id} = ${entry.accountId}
				and ${card.userEmail} = ${userEmail}
				and ${card.status} = 'active'
		),
		written as (
			insert into ${transaction}
				("id", "userEmail", "amount", "type", "category", "description", "date", "cardId", "createdAt", "updatedAt")
			select ${id}, ${userEmail}, ${entry.amount}::numeric / 100, ${entry.type}, ${entry.category},
				${entry.description}, ${utcAt(entry.date, entry.time, timeZone)},
				(select id from account), ${nowUtc}, ${nowUtc}
			-- An account it doesn't have can't be missing; one it names has to be there.
			where ${entry.accountId}::text is null or exists (select 1 from account)
			returning ${transaction.id} as id
		),
		credited as (
			update ${card} set
				"balance" = round(coalesce(${card.balance}, 0)::numeric + ${cents}::numeric / 100, 2),
				"updatedAt" = ${nowUtc}
			where ${card.id} = (select id from account) and exists (select 1 from written)
			returning ${card.id}
		),
		totalled as (
			update ${user} set
				"totalBalance" = round(${user.totalBalance}::numeric + ${cents}::numeric / 100, 2),
				"updatedAt" = ${nowUtc}
			where ${user.email} = ${userEmail} and exists (select 1 from written)
			returning ${user.id}
		)
		select (select count(*) from written)::int as done
	`);

	return { outcome: rows[0]?.done ? 'done' : 'missing', id };
}
