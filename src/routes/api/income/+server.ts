import { error, json } from '@sveltejs/kit';
import { isIncomePeriod, toCurrency } from '$lib/finance';
import { requireMonflyUser } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { getIncome } from '$lib/server/finance';
import type { RequestHandler } from './$types';

/**
 * The signed-in user's income, bucketed for the chart:
 * `?period=month|quarter|year|all`, this quarter when omitted.
 */
export const GET: RequestHandler = async ({ locals, url }) => {
	const profile = await requireMonflyUser(locals);

	const period = url.searchParams.get('period') ?? 'quarter';
	if (!isIncomePeriod(period)) error(400, 'period must be month, quarter, year or all');

	const income = await getIncome(db, {
		userEmail: profile.email,
		period,
		timeZone: locals.timeZone,
		currency: toCurrency(profile.preferredCurrency)
	});
	// Personal data: never stored by a shared cache.
	return json(income, { headers: { 'cache-control': 'private, no-store' } });
};
