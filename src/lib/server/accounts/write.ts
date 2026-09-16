import { and, eq, ne, sql, type SQL } from 'drizzle-orm';
import type { AccountDraft, AccountRole, AccountStatus } from '../../accounts';
import type { db as appDb } from '../db';
import { balanceAdjustment, card, transaction, user } from '../db/schema';
import { nowUtc, signedCents } from '../finance/fragments';

/**
 * Writing an account — adding, rewriting, archiving, removing — the way v1
 * does it: `User.totalBalance` moves with every balance that isn't backed by a
 * transaction, so the total and the accounts never drift apart.
 *
 * Each write is one statement (data-modifying CTEs), since Neon's HTTP driver
 * holds no session open. Giving an account a role that another holds takes a
 * statement before it, in the same `db.batch` transaction: the unique index on
 * (userEmail, role) is checked row by row, and the CTEs of one statement run in
 * no promised order.
 */

type Db = Pick<typeof appDb, 'batch' | 'execute' | 'update'>;

/** Whoever else holds `role` gives it up. `guard` keeps it from running for an account that isn't theirs. */
const releaseRole = (
	db: Pick<typeof appDb, 'update'>,
	{
		userEmail,
		role,
		keep,
		guard
	}: { userEmail: string; role: AccountRole; keep: string; guard?: SQL }
) =>
	db
		.update(card)
		// A role is not activity: the holder's `updatedAt` stays as it was.
		.set({ role: null, updatedAt: sql`${card.updatedAt}` })
		.where(
			and(eq(card.userEmail, userEmail), eq(card.role, role), ne(card.id, keep), guard ?? sql`true`)
		);

/** Blank details are stored as null, as v1's form leaves them. */
const blank = (value: string | null) => (value?.trim() ? value.trim() : null);

/**
 * Adds an account, active, and moves the total by the balance it opens with,
 * as v1 does. The opening balance leaves no correction behind: the account's
 * history starts the moment it's added, at that balance. Answers with its id.
 */
export async function createAccount(
	db: Db,
	{ userEmail, draft }: { userEmail: string; draft: AccountDraft }
): Promise<string> {
	// Prisma generated ids in its client rather than the database, so the
	// column has no default of its own (see the schema).
	const id = crypto.randomUUID();

	const insert = db.execute(sql`
		with written as (
			insert into ${card}
				("id", "userEmail", "name", "type", "provider", "last4", "balance", "status", "role", "createdAt", "updatedAt")
			values (${id}, ${userEmail}, ${draft.name.trim()}, ${draft.type}, ${blank(draft.provider)},
				${draft.last4}, round(${draft.balance}::numeric / 100, 2), 'active', ${draft.role},
				${nowUtc}, ${nowUtc})
			returning ${card.id}
		),
		totalled as (
			update ${user} set
				"totalBalance" = round(${user.totalBalance}::numeric + ${draft.balance}::numeric / 100, 2),
				"updatedAt" = ${nowUtc}
			where ${user.email} = ${userEmail}
				and ${draft.balance}::numeric <> 0
				and exists (select 1 from written)
			returning ${user.id}
		)
		select (select count(*) from written)::int as done
	`);

	if (draft.role === null) await insert;
	else await db.batch([releaseRole(db, { userEmail, role: draft.role, keep: id }), insert]);
	return id;
}

/**
 * Rewrites an account's details, balance and role together. A new balance is a
 * correction: the total moves by the difference, as v1 moves it, and a
 * `BalanceAdjustment` records it, so the history chart shows a step on the
 * day it was made instead of redrawing every day before it. False when the
 * account isn't the user's.
 */
export async function updateAccount(
	db: Db,
	{ userEmail, id, draft }: { userEmail: string; id: string; draft: AccountDraft }
): Promise<boolean> {
	const theirs = sql`exists (select 1 from ${card} where ${card.id} = ${id} and ${card.userEmail} = ${userEmail})`;

	const rewrite = db.execute<{ done: number }>(sql`
		with target as (
			select ${card.id} as id, round(coalesce(${card.balance}, 0)::numeric * 100) as was
			from ${card}
			where ${card.id} = ${id} and ${card.userEmail} = ${userEmail}
		),
		written as (
			update ${card} set
				"name" = ${draft.name.trim()},
				"type" = ${draft.type},
				"provider" = ${blank(draft.provider)},
				"last4" = ${draft.last4},
				"balance" = round(${draft.balance}::numeric / 100, 2),
				"role" = ${draft.role},
				"updatedAt" = ${nowUtc}
			where ${card.id} = (select id from target)
			returning ${card.id}
		),
		moved as (
			select ${draft.balance}::numeric - (select was from target) as cents
			where exists (select 1 from written)
				and ${draft.balance}::numeric <> (select was from target)
		),
		adjusted as (
			insert into ${balanceAdjustment} ("id", "userEmail", "cardId", "amountCents", "createdAt")
			select ${crypto.randomUUID()}::text, ${userEmail}::text, ${id}::text, cents::bigint, ${nowUtc}
			from moved
			returning 1
		),
		totalled as (
			update ${user} set
				"totalBalance" = round(${user.totalBalance}::numeric + (select cents from moved) / 100, 2),
				"updatedAt" = ${nowUtc}
			where ${user.email} = ${userEmail} and exists (select 1 from moved)
			returning ${user.id}
		)
		select (select count(*) from written)::int as done
	`);

	if (draft.role === null) {
		const { rows } = await rewrite;
		return (rows[0]?.done ?? 0) > 0;
	}
	const [, { rows }] = await db.batch([
		releaseRole(db, { userEmail, role: draft.role, keep: id, guard: theirs }),
		rewrite
	]);
	return (rows[0]?.done ?? 0) > 0;
}

/**
 * Archives an account or brings it back. Archived, it gives up its role — it
 * isn't featured, and the savings goal reads active accounts only — and the
 * total keeps its balance, as v1 leaves it. False when it isn't the user's.
 */
export async function setAccountStatus(
	db: Pick<typeof appDb, 'update'>,
	{ userEmail, id, status }: { userEmail: string; id: string; status: AccountStatus }
): Promise<boolean> {
	const rows = await db
		.update(card)
		.set(status === 'archived' ? { status, role: null } : { status })
		.where(and(eq(card.id, id), eq(card.userEmail, userEmail)))
		.returning({ id: card.id });
	return rows.length > 0;
}

/**
 * Removes an account, as v1 does. Its transactions stay, with no account (the
 * key is `ON DELETE SET NULL`), and keep counting in the total; its
 * corrections go with it. What the total loses is the part of its balance no
 * transaction backs — what it was opened with and set to by hand — and its
 * colour choice is forgotten. False when it isn't the user's.
 */
export async function deleteAccount(
	db: Pick<typeof appDb, 'execute'>,
	{ userEmail, id }: { userEmail: string; id: string }
): Promise<boolean> {
	const { rows } = await db.execute<{ done: number }>(sql`
		with target as (
			select ${card.id} as id, round(coalesce(${card.balance}, 0)::numeric * 100) as cents
			from ${card}
			where ${card.id} = ${id} and ${card.userEmail} = ${userEmail}
		),
		backed as (
			select coalesce(sum(${signedCents}), 0) as cents
			from ${transaction}
			where ${transaction.cardId} = (select id from target)
		),
		removed as (
			delete from ${card} where ${card.id} = (select id from target)
			returning ${card.id}
		),
		totalled as (
			update ${user} set
				"totalBalance" = round(
					${user.totalBalance}::numeric - ((select cents from target) - (select cents from backed)) / 100,
					2
				),
				"colors" = ${user.colors} #- array['account', ${id}]::text[],
				"updatedAt" = ${nowUtc}
			where ${user.email} = ${userEmail} and exists (select 1 from removed)
			returning ${user.id}
		)
		select (select count(*) from removed)::int as done
	`);
	return (rows[0]?.done ?? 0) > 0;
}
