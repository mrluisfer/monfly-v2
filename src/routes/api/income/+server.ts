import { error, json } from '@sveltejs/kit';
import {
	DEFAULT_INCOME_PERIOD,
	INCOME_UNITS,
	isIncomePeriod,
	isIncomeUnit,
	toCurrency
} from '$lib/finance';
import { requireMonflyUser } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { getIncome } from '$lib/server/finance';
import type { RequestHandler } from './$types';

/**
 * The signed-in user's income, bucketed for the chart:
 * `?period=month|quarter|year|all`, this quarter when omitted, and `&by=` for
 * what each bucket covers — `quarter` (the default) or `month` for this year;
 * every other period has one unit only.
 */
export const GET: RequestHandler = async ({ locals, url }) => {
	const profile = await requireMonflyUser(locals);

	const period = url.searchParams.get('period') ?? DEFAULT_INCOME_PERIOD;
	if (!isIncomePeriod(period)) error(400, 'period must be month, quarter, year or all');
	const units = INCOME_UNITS[period];
	const unit = url.searchParams.get('by') ?? units[0];
	if (!isIncomeUnit(period, unit))
		error(400, `by must be ${units.join(' or ')} for period=${period}`);

	const income = await getIncome(db, {
		userEmail: profile.email,
		period,
		unit,
		timeZone: locals.timeZone,
		currency: toCurrency(profile.preferredCurrency)
	});
	// Personal data: never stored by a shared cache.
	return json(income, { headers: { 'cache-control': 'private, no-store' } });
};
