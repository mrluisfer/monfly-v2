import { error, json } from '@sveltejs/kit';
import { todayKey } from '$lib/finance';
import { requireMonflyUser } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { deleteTransfer, updateTransfer } from '$lib/server/transactions';
import { MAX_AMOUNT, isTransferEntry } from '$lib/transactions';
import type { RequestHandler } from './$types';

// Personal data: never stored by a shared cache.
const NO_STORE = { 'cache-control': 'private, no-store' };

/**
 * Rewrites a transfer whole — `{ amount, from, to, description, date }`, as
 * `POST /api/transfers` takes it — moving both sides out of the balances they
 * moved and into the ones they move now. 404 when it isn't the signed-in
 * user's; 409 when the accounts don't hold up, or a side of it is gone.
 */
export const PATCH: RequestHandler = async ({ locals, params, request }) => {
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

	const outcome = await updateTransfer(db, {
		userEmail: profile.email,
		id: params.id,
		entry: body,
		timeZone: locals.timeZone
	});
	if (outcome === 'missing') error(404, 'No such transfer');
	if (outcome === 'refused') {
		error(
			409,
			'Money moves only between two of your active accounts, and both sides must be there'
		);
	}
	return json({ id: params.id }, { headers: NO_STORE });
};

/** Removes both sides, and puts both balances back to what they were without it. */
export const DELETE: RequestHandler = async ({ locals, params }) => {
	const profile = await requireMonflyUser(locals);
	const outcome = await deleteTransfer(db, { userEmail: profile.email, id: params.id });
	if (outcome === 'missing') error(404, 'No such transfer');
	return json({ id: params.id }, { headers: NO_STORE });
};
