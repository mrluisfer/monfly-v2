import { error, json } from '@sveltejs/kit';
import { MAX_BUDGET, isBudget } from '$lib/finance';
import { requireMonflyUser } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { setMonthlyBudget } from '$lib/server/finance';
import type { RequestHandler } from './$types';

/**
 * Sets the signed-in user's monthly budget: `{ "budget": 754000 }` in cents,
 * or `{ "budget": null }` to clear it. Answers with the stored value.
 */
export const PUT: RequestHandler = async ({ locals, request }) => {
	const profile = await requireMonflyUser(locals);

	if (!request.headers.get('content-type')?.startsWith('application/json')) {
		error(415, 'Send the budget as JSON');
	}
	const body: unknown = await request.json().catch(() => undefined);
	const budget = typeof body === 'object' && body !== null && 'budget' in body ? body.budget : undefined;
	if (budget !== null && !isBudget(budget)) {
		error(400, `budget must be null or whole cents from 1 to ${MAX_BUDGET}`);
	}

	await setMonthlyBudget(db, profile.id, budget);
	return json({ budget }, { headers: { 'cache-control': 'private, no-store' } });
};
