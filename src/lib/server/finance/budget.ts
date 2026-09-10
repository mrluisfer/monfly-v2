import { eq } from 'drizzle-orm';
import type { Cents } from '../../finance/money';
import type { db as appDb } from '../db';
import { user } from '../db/schema';

/** Sets — or with null, clears — a user's standing monthly budget. Validate with `isBudget` first. */
export async function setMonthlyBudget(
	db: Pick<typeof appDb, 'update'>,
	userId: string,
	budget: Cents | null
): Promise<void> {
	await db.update(user).set({ monthlyBudgetCents: budget }).where(eq(user.id, userId));
}
