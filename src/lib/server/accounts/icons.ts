import { and, eq, sql } from 'drizzle-orm';
import type { AccountIcon } from '../../account-icons';
import type { db as appDb } from '../db';
import { card } from '../db/schema';

/**
 * Picks the brand icon one of the user's accounts wears, or with null leaves
 * it to the account's name again. An icon is not activity: `updatedAt` is left
 * as it was. False when the account isn't theirs.
 */
export async function setAccountIcon(
	db: Pick<typeof appDb, 'update'>,
	{ userEmail, id, icon }: { userEmail: string; id: string; icon: AccountIcon | null }
): Promise<boolean> {
	const rows = await db
		.update(card)
		.set({ icon, updatedAt: sql`${card.updatedAt}` })
		.where(and(eq(card.id, id), eq(card.userEmail, userEmail)))
		.returning({ id: card.id });
	return rows.length > 0;
}
