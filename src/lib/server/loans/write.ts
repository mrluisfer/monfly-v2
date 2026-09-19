import { sql, type SQL } from 'drizzle-orm';
import { LOAN_CATEGORY, type LoanDraft, type LoanPaymentEntry } from '../../loans';
import type { db as appDb } from '../db';
import { card, loan, transaction, user } from '../db/schema';
import { nowUtc, utcAt } from '../finance/fragments';
import { calendarDay } from './list';

/**
 * Writing a loan the way v1 does, so both apps keep agreeing on it: its status
 * always follows what's paid (nothing, some, all), a payment never settles more
 * than is left, and a payment recorded on an account is a transaction on it
 * that moves its balance and the total with it — money in for a loan they
 * made, money out for one they owe.
 *
 * Each write is one statement (data-modifying CTEs), since Neon's HTTP driver
 * holds no session open: the loan, the transaction and the balances move
 * together or not at all.
 */

type Db = Pick<typeof appDb, 'execute'>;

/** What became of a write: done, not the user's, or refused by one of v1's rules. */
export type LoanOutcome = 'done' | 'missing' | 'refused';

type Answer = { found: boolean; done: number };

const outcome = (row: Answer | undefined): LoanOutcome =>
	!row?.found ? 'missing' : row.done > 0 ? 'done' : 'refused';

/** v1's status for a paid and an amount, both in cents. */
const statusOf = (paid: SQL, amount: SQL) =>
	sql`case when ${paid} <= 0 then 'pending' when ${paid} >= ${amount} then 'paid' else 'partial' end`;

/** Cents as v1's double-precision money. */
const money = (cents: SQL | number) => sql`round(${cents}::numeric / 100, 2)`;

/** What the payments recorded on a loan's transactions come to, in cents. */
const recorded = sql`(
	select coalesce(sum(round(t."amount"::numeric * 100)), 0)
	from ${transaction} t
	where t."appliedToLoanId" = ${loan.id}
)`;

/** A day picked in the form, stored as v1's form stores one: that day's UTC midnight. */
const day = (key: string | null) => (key === null ? sql`null` : sql`${key}::timestamp`);

/** Adds a loan, with nothing paid yet. Answers with its id. */
export async function createLoan(
	db: Db,
	{ userEmail, draft }: { userEmail: string; draft: LoanDraft }
): Promise<string> {
	// Prisma generated ids in its client rather than the database (see the schema).
	const id = crypto.randomUUID();
	await db.execute(sql`
		insert into ${loan}
			("id", "userEmail", "debtor", "amount", "amountPaid", "status", "issuedAt", "dueAt", "notes", "direction", "createdAt", "updatedAt")
		values (${id}, ${userEmail}, ${draft.person.trim()}, ${money(draft.amount)}, 0, 'pending',
			${day(draft.issuedOn)}, ${day(draft.dueOn)}, ${draft.notes?.trim() || null}, ${draft.direction},
			${nowUtc}, ${nowUtc})
	`);
	return id;
}

/**
 * Rewrites a loan whole. What's paid stays, trimmed to a smaller amount, and
 * the status follows it. A day left as it was keeps its stamp to the
 * millisecond. Refused when the amount would fall under the payments on
 * record, or the direction would turn with payments already made the old way.
 */
export async function updateLoan(
	db: Db,
	{
		userEmail,
		id,
		draft,
		timeZone
	}: { userEmail: string; id: string; draft: LoanDraft; timeZone: string }
): Promise<LoanOutcome> {
	const { rows } = await db.execute<Answer>(sql`
		with target as (
			select ${loan.id} as id, ${loan.direction} as direction,
				round(${loan.amountPaid}::numeric * 100) as paid,
				${recorded} as recorded,
				exists (select 1 from ${transaction} t where t."appliedToLoanId" = ${loan.id}) as has_payments
			from ${loan}
			where ${loan.id} = ${id} and ${loan.userEmail} = ${userEmail}
		),
		allowed as (
			select id, least(paid, ${draft.amount}::numeric) as paid from target
			where ${draft.amount}::numeric >= recorded and (not has_payments or direction = ${draft.direction})
		),
		written as (
			update ${loan} set
				"debtor" = ${draft.person.trim()},
				"direction" = ${draft.direction},
				"amount" = ${money(draft.amount)},
				"amountPaid" = ${money(sql`(select paid from allowed)`)},
				"status" = ${statusOf(sql`(select paid from allowed)`, sql`${draft.amount}::numeric`)},
				"paidAt" = case when (select paid from allowed) >= ${draft.amount}::numeric
					then coalesce(${loan.paidAt}, ${nowUtc}) else null end,
				"issuedAt" = case when ${calendarDay(loan.issuedAt, timeZone)} = ${draft.issuedOn}
					then ${loan.issuedAt} else ${day(draft.issuedOn)} end,
				"dueAt" = case when ${loan.dueAt} is not null
						and ${calendarDay(loan.dueAt, timeZone)} = ${draft.dueOn}::text
					then ${loan.dueAt} else ${day(draft.dueOn)} end,
				"notes" = ${draft.notes?.trim() || null},
				"updatedAt" = ${nowUtc}
			where ${loan.id} = (select id from allowed)
			returning ${loan.id}
		)
		select exists (select 1 from target) as found, (select count(*) from written)::int as done
	`);
	return outcome(rows[0]);
}

/**
 * Marks a loan settled, or opens it again. Settled, all of it is paid, as
 * v1's "mark as paid" leaves it — nothing moves on an account. Opened again,
 * it goes back to what the payments on record cover.
 */
export async function settleLoan(
	db: Db,
	{ userEmail, id, settled }: { userEmail: string; id: string; settled: boolean }
): Promise<LoanOutcome> {
	const { rows } = await db.execute<Answer>(sql`
		with target as (
			select ${loan.id} as id, round(${loan.amount}::numeric * 100) as amount, ${recorded} as recorded
			from ${loan}
			where ${loan.id} = ${id} and ${loan.userEmail} = ${userEmail}
		),
		next as (
			select id, amount, case when ${settled}::boolean then amount else least(recorded, amount) end as paid
			from target
		),
		written as (
			update ${loan} set
				"amountPaid" = ${money(sql`(select paid from next)`)},
				"status" = ${statusOf(sql`(select paid from next)`, sql`(select amount from next)`)},
				"paidAt" = case when (select paid from next) >= (select amount from next)
					then coalesce(${loan.paidAt}, ${nowUtc}) else null end,
				"updatedAt" = ${nowUtc}
			where ${loan.id} = (select id from next)
			returning ${loan.id}
		)
		select exists (select 1 from target) as found, (select count(*) from written)::int as done
	`);
	return outcome(rows[0]);
}

/**
 * Removes a loan. Refused while payments are recorded against it, as v1
 * refuses: removing it would quietly turn them into ordinary transactions.
 */
export async function deleteLoan(
	db: Db,
	{ userEmail, id }: { userEmail: string; id: string }
): Promise<LoanOutcome> {
	const { rows } = await db.execute<Answer>(sql`
		with target as (
			select ${loan.id} as id,
				exists (select 1 from ${transaction} t where t."appliedToLoanId" = ${loan.id}) as has_payments
			from ${loan}
			where ${loan.id} = ${id} and ${loan.userEmail} = ${userEmail}
		),
		removed as (
			delete from ${loan}
			where ${loan.id} = (select id from target where not has_payments)
			returning ${loan.id}
		)
		select exists (select 1 from target) as found, (select count(*) from removed)::int as done
	`);
	return outcome(rows[0]);
}

/**
 * Settles part of a loan. With an account, the payment is a transaction on it
 * — income for a loan they made, an expense for one they owe, filed under
 * "Loan" — and its balance and the total move with it. With none, only the
 * loan moves. Refused when it's more than is left; `missing` when the loan, or
 * the account it names, isn't the user's. Answers with the transaction's id.
 */
export async function payLoan(
	db: Db,
	{
		userEmail,
		id,
		entry,
		timeZone
	}: { userEmail: string; id: string; entry: LoanPaymentEntry; timeZone: string }
): Promise<{ outcome: LoanOutcome; paymentId: string | null }> {
	const paymentId = entry.accountId ? crypto.randomUUID() : null;

	const { rows } = await db.execute<Answer>(sql`
		with target as (
			select ${loan.id} as id, ${loan.direction} as direction,
				round(${loan.amount}::numeric * 100) as amount,
				round(${loan.amountPaid}::numeric * 100) as paid
			from ${loan}
			where ${loan.id} = ${id} and ${loan.userEmail} = ${userEmail}
		),
		account as (
			select ${card.id} as id from ${card}
			where ${card.id} = ${entry.accountId} and ${card.userEmail} = ${userEmail}
				and ${card.status} = 'active'
		),
		allowed as (
			select id, amount, paid + ${entry.amount}::numeric as paid,
				-- Money back on a loan they made comes in; paying one they owe goes out.
				case when direction = 'borrowed' then -${entry.amount}::numeric
					else ${entry.amount}::numeric end as cents
			from target
			where paid + ${entry.amount}::numeric <= amount
				and (${entry.accountId}::text is null or exists (select 1 from account))
		),
		written as (
			insert into ${transaction}
				("id", "userEmail", "amount", "type", "category", "description", "date", "cardId", "appliedToLoanId", "createdAt", "updatedAt")
			select ${paymentId}, ${userEmail}, ${money(entry.amount)},
				case when cents < 0 then 'expense' else 'income' end, ${LOAN_CATEGORY},
				${entry.description?.trim() || null}, ${utcAt(entry.date, entry.time, timeZone)},
				(select id from account), id, ${nowUtc}, ${nowUtc}
			from allowed
			where ${paymentId}::text is not null
			returning ${transaction.id}
		),
		settled as (
			update ${loan} set
				"amountPaid" = ${money(sql`(select paid from allowed)`)},
				"status" = ${statusOf(sql`(select paid from allowed)`, sql`(select amount from allowed)`)},
				"paidAt" = case when (select paid from allowed) >= (select amount from allowed)
					then coalesce(${loan.paidAt}, ${nowUtc}) else null end,
				"updatedAt" = ${nowUtc}
			where ${loan.id} = (select id from allowed)
			returning ${loan.id}
		),
		credited as (
			update ${card} set
				"balance" = round(coalesce(${card.balance}, 0)::numeric + (select cents from allowed)::numeric / 100, 2),
				"updatedAt" = ${nowUtc}
			where ${card.id} = (select id from account) and exists (select 1 from written)
			returning ${card.id}
		),
		totalled as (
			update ${user} set
				"totalBalance" = round(${user.totalBalance}::numeric + (select cents from allowed)::numeric / 100, 2),
				"updatedAt" = ${nowUtc}
			where ${user.email} = ${userEmail} and exists (select 1 from written)
			returning ${user.id}
		)
		select exists (select 1 from target)
				and (${entry.accountId}::text is null or exists (select 1 from account)) as found,
			(select count(*) from settled)::int as done
	`);

	const result = outcome(rows[0]);
	return { outcome: result, paymentId: result === 'done' ? paymentId : null };
}

/**
 * Takes back a payment recorded on an account: the transaction goes, its
 * account and the total lose what it moved, and the loan what it settled.
 */
export async function undoPayment(
	db: Db,
	{ userEmail, loanId, paymentId }: { userEmail: string; loanId: string; paymentId: string }
): Promise<boolean> {
	const { rows } = await db.execute<{ done: number }>(sql`
		with target as (
			select ${transaction.id} as id, ${transaction.cardId} as card_id,
				round(${transaction.amount}::numeric * 100) as cents,
				case when ${transaction.type} = 'income' then 1 else -1 end as sign
			from ${transaction}
			where ${transaction.id} = ${paymentId} and ${transaction.userEmail} = ${userEmail}
				and ${transaction.appliedToLoanId} = ${loanId}
		),
		owed as (
			select ${loan.id} as id, round(${loan.amount}::numeric * 100) as amount,
				greatest(round(${loan.amountPaid}::numeric * 100) - (select cents from target), 0) as paid
			from ${loan}
			where ${loan.id} = ${loanId} and ${loan.userEmail} = ${userEmail}
		),
		removed as (
			delete from ${transaction} where ${transaction.id} = (select id from target)
			returning ${transaction.id}
		),
		reopened as (
			update ${loan} set
				"amountPaid" = ${money(sql`(select paid from owed)`)},
				"status" = ${statusOf(sql`(select paid from owed)`, sql`(select amount from owed)`)},
				"paidAt" = case when (select paid from owed) >= (select amount from owed)
					then ${loan.paidAt} else null end,
				"updatedAt" = ${nowUtc}
			where ${loan.id} = (select id from owed) and exists (select 1 from removed)
			returning ${loan.id}
		),
		credited as (
			update ${card} set
				"balance" = round(coalesce(${card.balance}, 0)::numeric
					- (select sign * cents from target)::numeric / 100, 2),
				"updatedAt" = ${nowUtc}
			where ${card.id} = (select card_id from target) and ${card.userEmail} = ${userEmail}
				and exists (select 1 from removed)
			returning ${card.id}
		),
		totalled as (
			update ${user} set
				"totalBalance" = round(${user.totalBalance}::numeric
					- (select sign * cents from target)::numeric / 100, 2),
				"updatedAt" = ${nowUtc}
			where ${user.email} = ${userEmail} and exists (select 1 from removed)
			returning ${user.id}
		)
		select (select count(*) from removed)::int as done
	`);
	return (rows[0]?.done ?? 0) > 0;
}
