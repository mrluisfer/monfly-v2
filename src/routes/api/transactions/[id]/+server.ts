import { error, json } from '@sveltejs/kit';
import { todayKey } from '$lib/finance';
import { requireMonflyUser } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { deleteTransaction, updateTransaction, type WriteOutcome } from '$lib/server/transactions';
import { MAX_AMOUNT, isTransactionEdit } from '$lib/transactions';
import type { RequestHandler } from './$types';

// Personal data: never stored by a shared cache.
const NO_STORE = { 'cache-control': 'private, no-store' };

/**
 * One transaction's own endpoint: change it, or remove it. Either way the
 * balances it moved move with it — see `$lib/server/transactions/edit`.
 *
 * 404 when the transaction isn't the signed-in user's, and 409 when a loan has
 * a claim on it — loans are v1's, and so is changing what pays them — or when
 * it's one side of a transfer, which `/api/transfers/[id]` changes whole.
 */
const answer = (outcome: WriteOutcome, id: string) => {
	if (outcome === 'missing') error(404, 'No such transaction');
	if (outcome === 'locked') {
		error(409, "It pays off a loan, so it's edited in Monfly v1 where the loan lives");
	}
	if (outcome === 'transfer') {
		error(409, "It's one side of a transfer, so it's changed along with the other side");
	}
	return json({ id }, { headers: NO_STORE });
};

/**
 * Rewrites what the ledger can change: `{ amount, type, category, description,
 * date }`, the amount in whole cents and the date as `YYYY-MM-DD` — the day as
 * the viewer's zone reads it, and no later than today. The account isn't among
 * them: that's `POST /api/transactions/unassigned`.
 */
export const PATCH: RequestHandler = async ({ locals, params, request }) => {
	const profile = await requireMonflyUser(locals);

	if (!request.headers.get('content-type')?.startsWith('application/json')) {
		error(415, 'Send the transaction as JSON');
	}
	const body: unknown = await request.json().catch(() => undefined);
	if (!isTransactionEdit(body, todayKey(locals.timeZone))) {
		error(
			400,
			`Send an amount in whole cents from 1 to ${MAX_AMOUNT}, a type of "income" or "expense", a category, a description or null, and a date of YYYY-MM-DD no later than today`
		);
	}

	const outcome = await updateTransaction(db, {
		userEmail: profile.email,
		id: params.id,
		edit: body,
		timeZone: locals.timeZone
	});
	return answer(outcome, params.id);
};

/** Removes it, and takes what it moved back out of the balances. */
export const DELETE: RequestHandler = async ({ locals, params }) => {
	const profile = await requireMonflyUser(locals);
	const outcome = await deleteTransaction(db, { userEmail: profile.email, id: params.id });
	return answer(outcome, params.id);
};
