import { error, json } from '@sveltejs/kit';
import { currentMonth, isMonthKey, toCurrency } from '$lib/finance';
import { requireMonflyUser } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { getTransactions } from '$lib/server/transactions';
import type { RequestHandler } from './$types';

/**
 * The signed-in person's transactions, newest first. `?month=2026-09` narrows
 * them to one calendar month in their time zone — what the page opens with —
 * and no `month` returns the whole record. The totals alongside always cover
 * everything either way.
 */
export const GET: RequestHandler = async ({ locals, url }) => {
	const profile = await requireMonflyUser(locals);

	const asked = url.searchParams.get('month');
	if (asked !== null && (!isMonthKey(asked) || asked > currentMonth(locals.timeZone))) {
		error(400, 'month must be YYYY-MM, and not a future month');
	}

	const list = await getTransactions(db, {
		userEmail: profile.email,
		currency: toCurrency(profile.preferredCurrency),
		month: asked,
		timeZone: locals.timeZone
	});
	// Personal data: never stored by a shared cache.
	return json(list, { headers: { 'cache-control': 'private, no-store' } });
};
