import { error, json } from '@sveltejs/kit';
import { todayKey } from '$lib/finance';
import { requireMonflyUser } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { createTransfer } from '$lib/server/transactions';
import { MAX_AMOUNT, isTransferEntry } from '$lib/transactions';
import type { RequestHandler } from './$types';

// Personal data: never stored by a shared cache.
const NO_STORE = { 'cache-control': 'private, no-store' };

/**
 * Moves money between two of the signed-in person's accounts: `{ amount, from,
 * to, description, date }` — the amount in whole cents, `from` and `to` two
 * different active accounts, the date as `YYYY-MM-DD` read in the viewer's
 * zone and no later than today. Written as money out of `from` and money in to
 * `to`, both balances moving and the total staying put
 * (`$lib/server/transactions/transfer`). Answers with the transfer's id; 409
 * when either account isn't theirs and active.
 */
export const POST: RequestHandler = async ({ locals, request }) => {
	const profile = await requireMonflyUser(locals);

	if (!request.headers.get('content-type')?.startsWith('application/json')) {
		error(415, 'Send the transfer as JSON');
	}
	const body: unknown = await request.json().catch(() => undefined);
	if (!isTransferEntry(body, todayKey(locals.timeZone))) {
		error(
			400,
			`Send an amount in whole cents from 1 to ${MAX_AMOUNT}, two different account ids as from and to, a description or null, and a date of YYYY-MM-DD no later than today`
		);
	}

	const { outcome, id } = await createTransfer(db, {
		userEmail: profile.email,
		entry: body,
		timeZone: locals.timeZone
	});
	if (outcome === 'refused') error(409, 'Money moves only between two of your active accounts');
	return json({ id }, { headers: NO_STORE });
};
