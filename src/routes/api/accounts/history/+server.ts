import { error, json } from '@sveltejs/kit';
import { HISTORY_RANGES, isHistoryRange } from '$lib/accounts';
import { toCurrency } from '$lib/finance';
import { requireMonflyUser } from '$lib/server/auth';
import { getBalanceHistory } from '$lib/server/accounts';
import { db } from '$lib/server/db';
import type { RequestHandler } from './$types';

/**
 * Every active account's balance day by day, back from today: `?range=` one
 * of 1m, 3m (the default), 6m, 1y or all, drawn in the viewer's zone — and
 * the openings and corrections in that stretch. See `BalanceHistory`.
 */
export const GET: RequestHandler = async ({ locals, url }) => {
	const profile = await requireMonflyUser(locals);

	const range = url.searchParams.get('range') ?? '3m';
	if (!isHistoryRange(range)) {
		error(400, `range must be one of ${HISTORY_RANGES.map((r) => `"${r}"`).join(', ')}`);
	}

	const history = await getBalanceHistory(db, {
		userEmail: profile.email,
		range,
		timeZone: locals.timeZone,
		currency: toCurrency(profile.preferredCurrency)
	});
	// Personal data: never stored by a shared cache.
	return json(history, { headers: { 'cache-control': 'private, no-store' } });
};
