import { error, json } from '@sveltejs/kit';
import { todayKey } from '$lib/finance';
import { MAX_LOAN, MAX_NOTES, MAX_PERSON, isLoanDraft } from '$lib/loans';
import { requireMonflyUser } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { deleteLoan, settleLoan, updateLoan } from '$lib/server/loans';
import type { RequestHandler } from './$types';

// Personal data: never stored by a shared cache.
const NO_STORE = { 'cache-control': 'private, no-store' };

/**
 * Changes one loan, by what the body holds:
 *
 * - `{ "settled": true | false }` — marks it settled (all of it paid, nothing
 *   moving on an account, as v1's "mark as paid"), or opens it again at what
 *   its recorded payments cover.
 * - The whole loan, as `POST /api/loans` takes it — rewrites it. What's paid
 *   stays, trimmed to a smaller amount.
 *
 * 404 when the loan isn't the signed-in user's; 409 when the new amount falls
 * under its recorded payments, or its direction would turn with payments made.
 */
export const PATCH: RequestHandler = async ({ locals, params, request }) => {
	const profile = await requireMonflyUser(locals);

	if (!request.headers.get('content-type')?.startsWith('application/json')) {
		error(415, 'Send the change as JSON');
	}
	const body: unknown = await request.json().catch(() => undefined);
	if (typeof body !== 'object' || body === null) error(400, 'Send the change as a JSON object');

	const keys = Object.keys(body);
	if (keys.length === 1 && keys[0] === 'settled') {
		const { settled } = body as { settled: unknown };
		if (typeof settled !== 'boolean') error(400, 'settled must be true or false');
		const done = await settleLoan(db, { userEmail: profile.email, id: params.id, settled });
		if (done === 'missing') error(404, 'No such loan');
		return json({ id: params.id, settled }, { headers: NO_STORE });
	}

	if (!isLoanDraft(body, todayKey(locals.timeZone))) {
		error(
			400,
			`Send { settled }, or a direction of "lent" or "borrowed", a person of 1 to ${MAX_PERSON} characters, an amount in whole cents from 1 to ${MAX_LOAN}, issuedOn as YYYY-MM-DD no later than today, dueOn as YYYY-MM-DD no earlier than issuedOn or null, and notes of up to ${MAX_NOTES} characters or null`
		);
	}
	const done = await updateLoan(db, {
		userEmail: profile.email,
		id: params.id,
		draft: body,
		timeZone: locals.timeZone
	});
	if (done === 'missing') error(404, 'No such loan');
	if (done === 'refused') {
		error(
			409,
			'Its recorded payments stand: the amount can’t go under what they add up to, and the direction can’t turn once they’re made'
		);
	}
	return json({ id: params.id }, { headers: NO_STORE });
};

/** Removes a loan. 404 when it isn't the signed-in user's; 409 while payments are recorded against it. */
export const DELETE: RequestHandler = async ({ locals, params }) => {
	const profile = await requireMonflyUser(locals);
	const done = await deleteLoan(db, { userEmail: profile.email, id: params.id });
	if (done === 'missing') error(404, 'No such loan');
	if (done === 'refused') error(409, 'Payments are recorded against it: undo them first');
	return json({ id: params.id }, { headers: NO_STORE });
};
