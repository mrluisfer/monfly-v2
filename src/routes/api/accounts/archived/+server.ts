import { json } from '@sveltejs/kit';
import { toCurrency } from '$lib/finance';
import { requireMonflyUser } from '$lib/server/auth';
import { getArchivedAccounts } from '$lib/server/accounts';
import { db } from '$lib/server/db';
import type { RequestHandler } from './$types';

/** The signed-in user's archived accounts, most recently changed first, each with its balance as it was left. */
export const GET: RequestHandler = async ({ locals }) => {
	const profile = await requireMonflyUser(locals);

	const list = await getArchivedAccounts(db, {
		userEmail: profile.email,
		currency: toCurrency(profile.preferredCurrency)
	});
	// Personal data: never stored by a shared cache.
	return json(list, { headers: { 'cache-control': 'private, no-store' } });
};
