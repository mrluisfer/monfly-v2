import { error, json } from '@sveltejs/kit';
import { MAX_BUDGET, currentMonth, isBudget, isMonthKey, toCurrency } from '$lib/finance';
import { requireMonflyUser } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { getBudgetMonth, setCategoryBudget } from '$lib/server/finance';
import { MAX_CATEGORY } from '$lib/transactions';
import type { RequestHandler } from './$types';

/** Personal data: never stored by a shared cache. */
const PRIVATE = { 'cache-control': 'private, no-store' };

/**
 * The signed-in user's month against their budgets: `?month=2026-09`, this
 * month in their time zone when it's left out. A month still to come has
 * nothing in it to measure, so it's refused.
 */
export const GET: RequestHandler = async ({ locals, url }) => {
	const profile = await requireMonflyUser(locals);

	const latest = currentMonth(locals.timeZone);
	const month = url.searchParams.get('month') ?? latest;
	if (!isMonthKey(month)) error(400, 'month must be YYYY-MM');
	if (month > latest) error(400, 'month must not be after this one');

	const budgets = await getBudgetMonth(db, {
		userEmail: profile.email,
		month,
		timeZone: locals.timeZone,
		currency: toCurrency(profile.preferredCurrency)
	});
	return json(budgets, { headers: PRIVATE });
};

/**
 * Sets one category's monthly limit: `{ "category": "Comida", "limit": 400000 }`
 * in cents, or `"limit": null` to take it away. The category is its name as
 * transactions store it, so it's kept as sent. Answers with what was stored.
 */
export const PUT: RequestHandler = async ({ locals, request }) => {
	const profile = await requireMonflyUser(locals);

	if (!request.headers.get('content-type')?.startsWith('application/json')) {
		error(415, 'Send the limit as JSON');
	}
	const body: unknown = await request.json().catch(() => undefined);
	const { category, limit } = (typeof body === 'object' && body !== null ? body : {}) as Record<
		string,
		unknown
	>;
	if (typeof category !== 'string' || !category.trim() || category.length > MAX_CATEGORY) {
		error(400, `category must be a name of 1 to ${MAX_CATEGORY} characters`);
	}
	if (limit !== null && !isBudget(limit)) {
		error(400, `limit must be null or whole cents from 1 to ${MAX_BUDGET}`);
	}

	await setCategoryBudget(db, profile.email, category, limit);
	return json({ category, limit }, { headers: PRIVATE });
};
