import { eq, sql } from 'drizzle-orm';
import { DEFAULT_SHORTCUTS, type ShortcutId } from '../../shortcuts';
import type { db as appDb } from '../db';
import { user } from '../db/schema';

/** The shortcuts a user has pinned to the header, by id. */
export async function getPinnedShortcuts(
	db: Pick<typeof appDb, 'select'>,
	userId: string
): Promise<string[]> {
	const [row] = await db
		.select({ shortcuts: user.shortcuts })
		.from(user)
		.where(eq(user.id, userId))
		.limit(1);
	return row?.shortcuts ?? [...DEFAULT_SHORTCUTS];
}

/**
 * Pins one shortcut, or takes it away, inside the array in a single statement,
 * so two devices changing different shortcuts at once can't overwrite each
 * other. Pinning one twice keeps it once. Validate `id` first. Returns every
 * pinned id.
 */
export async function setShortcutPinned(
	db: Pick<typeof appDb, 'update'>,
	userId: string,
	id: ShortcutId,
	pinned: boolean
): Promise<string[]> {
	// The column's own default stands in for a row that has none.
	const current = sql`coalesce(${user.shortcuts}, ARRAY['overview', 'transactions']::text[])`;
	const next = pinned
		? sql`case when ${id}::text = any(${current}) then ${current} else array_append(${current}, ${id}::text) end`
		: sql`array_remove(${current}, ${id}::text)`;

	const [row] = await db
		.update(user)
		.set({ shortcuts: next })
		.where(eq(user.id, userId))
		.returning({ shortcuts: user.shortcuts });
	return row?.shortcuts ?? [];
}
