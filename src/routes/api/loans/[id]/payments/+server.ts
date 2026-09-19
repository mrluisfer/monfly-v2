import { error, json } from '@sveltejs/kit';
import { todayKey } from '$lib/finance';
import { isLoanPaymentEntry } from '$lib/loans';
import { requireMonflyUser } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { payLoan } from '$lib/server/loans';
import { MAX_AMOUNT, MAX_DESCRIPTION } from '$lib/transactions';
import type { RequestHandler } from './$types';

/**
 * Settles part of a loan: `{ amount, accountId, date, time, description }`,
 * the amount in whole cents. With an account it's recorded as a transaction on
 * it, filed under "Loan" — money in for a loan they made, out for one they
 * owe — and the balances move with it; with `accountId` null only the loan
 * moves. 404 when the loan or the account isn't theirs; 409 when it's more
 * than is left to settle. Answers with the transaction's id, or null.
 */
export const POST: RequestHandler = async ({ locals, params, request }) => {
	const profile = await requireMonflyUser(locals);

	if (!request.headers.get('content-type')?.startsWith('application/json')) {
		error(415, 'Send the payment as JSON');
	}
	const body: unknown = await request.json().catch(() => undefined);
	if (!isLoanPaymentEntry(body, todayKey(locals.timeZone))) {
		error(
			400,
			`Send an amount in whole cents from 1 to ${MAX_AMOUNT}, an accountId or null, a date as YYYY-MM-DD no later than today, a time as HH:MM, and a description of up to ${MAX_DESCRIPTION} characters or null`
		);
	}

	const { outcome, paymentId } = await payLoan(db, {
		userEmail: profile.email,
		id: params.id,
		entry: body,
		timeZone: locals.timeZone
	});
	if (outcome === 'missing') error(404, 'No such loan or account');
	if (outcome === 'refused') error(409, 'That’s more than is left to settle');
	return json({ id: paymentId }, { headers: { 'cache-control': 'private, no-store' } });
};
