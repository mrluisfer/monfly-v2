import { error, json } from '@sveltejs/kit';
import { requireMonflyUser } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { undoPayment } from '$lib/server/loans';
import type { RequestHandler } from './$types';

/**
 * Takes back a payment recorded on an account: its transaction goes, the
 * account and the total lose what it moved, and the loan what it settled. 404
 * when it isn't a payment of this loan of the signed-in user's.
 */
export const DELETE: RequestHandler = async ({ locals, params }) => {
	const profile = await requireMonflyUser(locals);
	const done = await undoPayment(db, {
		userEmail: profile.email,
		loanId: params.id,
		paymentId: params.paymentId
	});
	if (!done) error(404, 'No such payment on this loan');
	return json({ id: params.paymentId }, { headers: { 'cache-control': 'private, no-store' } });
};
