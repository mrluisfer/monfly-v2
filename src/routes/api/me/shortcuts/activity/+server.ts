import { json } from '@sveltejs/kit';
import { requireMonflyUser } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { getShortcutActivity } from '$lib/server/preferences';
import type { RequestHandler } from './$types';

// Personal data: never stored by a shared cache.
const NO_STORE = { 'cache-control': 'private, no-store' };

/**
 * The signed-in user's shortcut changes over the last weeks, counted by week
 * (in their time zone), by shortcut and by source — for the shortcuts page's
 * charts.
 */
export const GET: RequestHandler = async ({ locals }) => {
	const profile = await requireMonflyUser(locals);
	return json(await getShortcutActivity(db, profile.email, locals.timeZone), {
		headers: NO_STORE
	});
};
