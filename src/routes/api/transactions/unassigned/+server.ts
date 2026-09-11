import { error, json } from '@sveltejs/kit';
import { toCurrency } from '$lib/finance';
import { requireMonflyUser } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { assignAccount, getUnassigned } from '$lib/server/transactions';
import { MAX_ASSIGN } from '$lib/transactions';
import type { RequestHandler } from './$types';

// Personal data: never stored by a shared cache.
const NO_STORE = { 'cache-control': 'private, no-store' };

/** The signed-in user's transactions with no account, newest first. */
export const GET: RequestHandler = async ({ locals }) => {
	const profile = await requireMonflyUser(locals);
	const list = await getUnassigned(db, {
		userEmail: profile.email,
		currency: toCurrency(profile.preferredCurrency)
	});
	return json(list, { headers: NO_STORE });
};

/**
 * Gives some of them an account: `{ "ids": ["…"], "accountId": "…" }`.
 * Answers how many got it and what moved into its balance — see
 * `assignAccount`. 404 when the account isn't the user's or isn't active.
 */
export const POST: RequestHandler = async ({ locals, request }) => {
	const profile = await requireMonflyUser(locals);

	if (!request.headers.get('content-type')?.startsWith('application/json')) {
		error(415, 'Send the ids and the account as JSON');
	}
	const body: unknown = await request.json().catch(() => undefined);
	const { ids, accountId } = (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>;
	const isId = (value: unknown): value is string =>
		typeof value === 'string' && value.length > 0 && value.length <= 64;
	if (!Array.isArray(ids) || ids.length === 0 || ids.length > MAX_ASSIGN || !ids.every(isId)) {
		error(400, `ids must be 1 to ${MAX_ASSIGN} transaction ids`);
	}
	if (!isId(accountId)) error(400, 'accountId must be an account id');

	const result = await assignAccount(db, {
		userEmail: profile.email,
		ids: [...new Set<string>(ids)],
		accountId
	});
	if (!result) error(404, 'No such account');
	return json(result, { headers: NO_STORE });
};
