import { error, json } from '@sveltejs/kit';
import { parseYear, toCurrency } from '$lib/finance';
import { requireMonflyUser } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { getExpenseBreakdown } from '$lib/server/finance';
import type { RequestHandler } from './$types';

/**
 * The signed-in user's expenses by category: `?year=2025` for one calendar
 * year in their time zone, no `year` for everything on record.
 */
export const GET: RequestHandler = async ({ locals, url }) => {
	const profile = await requireMonflyUser(locals);

	const raw = url.searchParams.get('year');
	const year = raw === null ? null : parseYear(raw);
	if (raw !== null && year === null) error(400, 'year must be a four-digit year');

	const breakdown = await getExpenseBreakdown(db, {
		userEmail: profile.email,
		year,
		timeZone: locals.timeZone,
		currency: toCurrency(profile.preferredCurrency)
	});
	// Personal data: never stored by a shared cache.
	return json(breakdown, { headers: { 'cache-control': 'private, no-store' } });
};
