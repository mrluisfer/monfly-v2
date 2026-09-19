import { error, json } from '@sveltejs/kit';
import { todayKey, toCurrency } from '$lib/finance';
import { MAX_LOAN, MAX_NOTES, MAX_PERSON, isLoanDraft } from '$lib/loans';
import { requireMonflyUser } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { createLoan, getLoans } from '$lib/server/loans';
import type { RequestHandler } from './$types';

// Personal data: never stored by a shared cache.
const NO_STORE = { 'cache-control': 'private, no-store' };

/** Every loan the signed-in user made or took, newest first, with the payments recorded on their accounts. */
export const GET: RequestHandler = async ({ locals }) => {
	const profile = await requireMonflyUser(locals);
	const list = await getLoans(db, {
		userEmail: profile.email,
		currency: toCurrency(profile.preferredCurrency),
		timeZone: locals.timeZone
	});
	return json(list, { headers: NO_STORE });
};

/**
 * Adds a loan: `{ direction, person, amount, issuedOn, dueOn, notes }` — the
 * amount in whole cents, the days as `YYYY-MM-DD` (the due day null for none,
 * and never before the day it was made), the note null for none. Nothing is
 * paid on it yet. Answers with the new id.
 */
export const POST: RequestHandler = async ({ locals, request }) => {
	const profile = await requireMonflyUser(locals);

	if (!request.headers.get('content-type')?.startsWith('application/json')) {
		error(415, 'Send the loan as JSON');
	}
	const body: unknown = await request.json().catch(() => undefined);
	if (!isLoanDraft(body, todayKey(locals.timeZone))) {
		error(
			400,
			`Send a direction of "lent" or "borrowed", a person of 1 to ${MAX_PERSON} characters, an amount in whole cents from 1 to ${MAX_LOAN}, issuedOn as YYYY-MM-DD no later than today, dueOn as YYYY-MM-DD no earlier than issuedOn or null, and notes of up to ${MAX_NOTES} characters or null`
		);
	}

	const id = await createLoan(db, { userEmail: profile.email, draft: body });
	return json({ id }, { headers: NO_STORE });
};
