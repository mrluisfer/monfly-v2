import { error, json } from '@sveltejs/kit';
import { currentMonth, isMonthKey, toCurrency, todayKey } from '$lib/finance';
import { requireMonflyUser } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { createTransaction, getTransactions } from '$lib/server/transactions';
import { MAX_AMOUNT, isTransactionNew } from '$lib/transactions';
import type { RequestHandler } from './$types';

// Personal data: never stored by a shared cache.
const NO_STORE = { 'cache-control': 'private, no-store' };

/**
 * The signed-in person's transactions, newest first. `?month=2026-09` narrows
 * them to one calendar month in their time zone, and no `month` returns the
 * whole record — what the page opens with. The totals and the oldest date
 * alongside always cover everything either way.
 */
export const GET: RequestHandler = async ({ locals, url }) => {
	const profile = await requireMonflyUser(locals);

	const asked = url.searchParams.get('month');
	if (asked !== null && (!isMonthKey(asked) || asked > currentMonth(locals.timeZone))) {
		error(400, 'month must be YYYY-MM, and not a future month');
	}

	const list = await getTransactions(db, {
		userEmail: profile.email,
		currency: toCurrency(profile.preferredCurrency),
		month: asked,
		timeZone: locals.timeZone
	});
	return json(list, { headers: NO_STORE });
};

/**
 * Writes a new transaction: `{ amount, type, category, description, date,
 * accountId }` — the amount in whole cents, the date as `YYYY-MM-DD` read in
 * the viewer's zone and no later than today, and `accountId` null for one with
 * no account yet. Its amount moves that account's balance and the total, as v1
 * moves them. Answers with the new id. 404 when the account isn't the
 * signed-in user's, or isn't active.
 */
export const POST: RequestHandler = async ({ locals, request }) => {
	const profile = await requireMonflyUser(locals);

	if (!request.headers.get('content-type')?.startsWith('application/json')) {
		error(415, 'Send the transaction as JSON');
	}
	const body: unknown = await request.json().catch(() => undefined);
	if (!isTransactionNew(body, todayKey(locals.timeZone))) {
		error(
			400,
			`Send an amount in whole cents from 1 to ${MAX_AMOUNT}, a type of "income" or "expense", a category, a description or null, a date of YYYY-MM-DD no later than today, a time of HH:MM, and an accountId or null`
		);
	}

	const { outcome, id } = await createTransaction(db, {
		userEmail: profile.email,
		entry: body,
		timeZone: locals.timeZone
	});
	if (outcome === 'missing') error(404, 'No such account');
	return json({ id }, { headers: NO_STORE });
};
