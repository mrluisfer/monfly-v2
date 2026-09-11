import { and, eq, ne, sql } from 'drizzle-orm';
import type { AccountRole } from '../../accounts';
import type { db as appDb } from '../db';
import { card } from '../db/schema';

type Input = {
	/** The stored `User.email` — `profile.email`, never the Auth0 spelling. */
	userEmail: string;
	accountId: string;
	/** The role to give it, or null to take its role away. */
	role: AccountRole | null;
};

/**
 * Gives one of the user's accounts a role, or takes it away. Whoever held the
 * role before loses it in the same transaction, so a user never has two mains
 * (the unique index would refuse it anyway). A role is not activity: the
 * accounts' `updatedAt` is left as it was. False when the account isn't theirs.
 */
export async function setAccountRole(
	db: Pick<typeof appDb, 'batch' | 'update'>,
	{ userEmail, accountId, role }: Input
): Promise<boolean> {
	const theirs = and(eq(card.id, accountId), eq(card.userEmail, userEmail));
	const untouched = sql`${card.updatedAt}`;

	if (role === null) {
		const rows = await db
			.update(card)
			.set({ role: null, updatedAt: untouched })
			.where(theirs)
			.returning({ id: card.id });
		return rows.length > 0;
	}

	const [, rows] = await db.batch([
		// Only clear the old holder when the account exists and is theirs.
		db
			.update(card)
			.set({ role: null, updatedAt: untouched })
			.where(
				and(
					eq(card.userEmail, userEmail),
					eq(card.role, role),
					ne(card.id, accountId),
					sql`exists (select 1 from ${card} where ${theirs})`
				)
			),
		db.update(card).set({ role, updatedAt: untouched }).where(theirs).returning({ id: card.id })
	]);
	return rows.length > 0;
}
