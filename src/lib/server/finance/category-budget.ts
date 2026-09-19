import { and, eq } from 'drizzle-orm';
import type { Cents } from '../../finance/money';
import type { db as appDb } from '../db';
import { categoryBudget } from '../db/schema';
import { nowUtc } from './fragments';

/**
 * Sets — or with null, clears — the monthly limit on one of a user's
 * categories, by its name as transactions store it. One statement either
 * way: setting one that exists rewrites it in place. Validate the limit with
 * `isBudget` and the name's length first.
 */
export async function setCategoryBudget(
	db: Pick<typeof appDb, 'insert' | 'delete'>,
	userEmail: string,
	category: string,
	limit: Cents | null
): Promise<void> {
	if (limit === null) {
		await db
			.delete(categoryBudget)
			.where(and(eq(categoryBudget.userEmail, userEmail), eq(categoryBudget.category, category)));
		return;
	}
	await db
		.insert(categoryBudget)
		.values({ userEmail, category, limitCents: limit })
		.onConflictDoUpdate({
			target: [categoryBudget.userEmail, categoryBudget.category],
			set: { limitCents: limit, updatedAt: nowUtc }
		});
}
