import { error, json } from '@sveltejs/kit';
import { currentMonth, isMonthKey, toCurrency } from '$lib/finance';
import { requireMonflyUser } from '$lib/server/auth';
import { getAccounts } from '$lib/server/accounts';
import { db } from '$lib/server/db';
import type { RequestHandler } from './$types';

/**
 * The signed-in user's active accounts, oldest first. Without `month`: their
 * balances now and this month's spending. With `?month=2026-08`: their
 * balances when that month ended, and its spending. Never a future month.
 */
export const GET: RequestHandler = async ({ locals, url }) => {
	const profile = await requireMonflyUser(locals);

	const now = currentMonth(locals.timeZone);
	const asked = url.searchParams.get('month');
	if (asked !== null && (!isMonthKey(asked) || asked > now)) {
		error(400, 'month must be YYYY-MM, and not a future month');
	}

	const list = await getAccounts(db, {
		userEmail: profile.email,
		month: asked ?? now,
		balanceAt: asked === null ? 'now' : 'month-end',
		timeZone: locals.timeZone,
		currency: toCurrency(profile.preferredCurrency)
	});
	// Personal data: never stored by a shared cache.
	return json(list, { headers: { 'cache-control': 'private, no-store' } });
};
