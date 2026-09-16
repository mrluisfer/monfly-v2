import { error, json } from '@sveltejs/kit';
import {
	ACCOUNT_KINDS,
	MAX_ACCOUNT_NAME,
	MAX_BALANCE,
	MAX_PROVIDER,
	isAccountDraft
} from '$lib/accounts';
import { currentMonth, isMonthKey, toCurrency } from '$lib/finance';
import { requireMonflyUser } from '$lib/server/auth';
import { createAccount, getAccounts } from '$lib/server/accounts';
import { db } from '$lib/server/db';
import type { RequestHandler } from './$types';

/**
 * The signed-in user's active accounts, oldest first. Without `month`: their
 * balances now and this month's spending. With `?month=2026-08`: their
 * balances when that month ended, and its spending. Never a future month.
 */
export const GET: RequestHandler = async ({ locals, url }) => {
	const profile = await requireMonflyUser(locals);

	const now = currentMonth(locals.timeZone);
	const asked = url.searchParams.get('month');
	if (asked !== null && (!isMonthKey(asked) || asked > now)) {
		error(400, 'month must be YYYY-MM, and not a future month');
	}

	const list = await getAccounts(db, {
		userEmail: profile.email,
		month: asked ?? now,
		balanceAt: asked === null ? 'now' : 'month-end',
		timeZone: locals.timeZone,
		currency: toCurrency(profile.preferredCurrency)
	});
	// Personal data: never stored by a shared cache.
	return json(list, { headers: { 'cache-control': 'private, no-store' } });
};

/**
 * Adds an account: `{ name, type, provider, last4, balance, role }` — the
 * balance in whole cents, signed, and the kind, the issuer, the last four
 * digits and the role each null where there is none. The balance it opens with
 * joins the total, as v1 adds it, and a role another account holds moves to
 * this one. Answers with the new id.
 */
export const POST: RequestHandler = async ({ locals, request }) => {
	const profile = await requireMonflyUser(locals);

	if (!request.headers.get('content-type')?.startsWith('application/json')) {
		error(415, 'Send the account as JSON');
	}
	const body: unknown = await request.json().catch(() => undefined);
	if (!isAccountDraft(body)) {
		error(
			400,
			`Send a name of 1 to ${MAX_ACCOUNT_NAME} characters, a type of ${ACCOUNT_KINDS.map((k) => `"${k}"`).join(', ')} or null, a provider of up to ${MAX_PROVIDER} characters or null, last4 as four digits or null, a balance in whole cents no further than ${MAX_BALANCE} from zero, and a role or null`
		);
	}

	const id = await createAccount(db, { userEmail: profile.email, draft: body });
	return json({ id }, { headers: { 'cache-control': 'private, no-store' } });
};
