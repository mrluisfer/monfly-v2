import { json } from '@sveltejs/kit';
import { toCurrency } from '$lib/finance';
import { requireMonflyUser } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { getMonthSpending } from '$lib/server/finance';
import type { RequestHandler } from './$types';

/** One month of the signed-in user's expenses. The route matcher validates `month`. */
export const GET: RequestHandler = async ({ locals, params }) => {
	const profile = await requireMonflyUser(locals);
	const spending = await getMonthSpending(db, {
		userEmail: profile.email,
		month: params.month,
		timeZone: locals.timeZone,
		currency: toCurrency(profile.preferredCurrency)
	});
	// Personal data: never stored by a shared cache.
	return json(spending, { headers: { 'cache-control': 'private, no-store' } });
};
