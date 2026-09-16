import { error, json } from '@sveltejs/kit';
import {
	ACCOUNT_KINDS,
	ACCOUNT_ROLES,
	ACCOUNT_STATUSES,
	MAX_ACCOUNT_NAME,
	MAX_BALANCE,
	MAX_PROVIDER,
	isAccountDraft,
	isAccountRole,
	isAccountStatus
} from '$lib/accounts';
import { requireMonflyUser } from '$lib/server/auth';
import { db } from '$lib/server/db';
import {
	deleteAccount,
	setAccountRole,
	setAccountStatus,
	updateAccount
} from '$lib/server/accounts';
import type { RequestHandler } from './$types';

// Personal data: never stored by a shared cache.
const NO_STORE = { 'cache-control': 'private, no-store' };

/** The body holds `key` and nothing else. */
const only = (body: object, key: string) => {
	const keys = Object.keys(body);
	return keys.length === 1 && keys[0] === key;
};

/**
 * Changes one account, by what the body holds:
 *
 * - `{ "role": "main" | "secondary" | "savings" | null }` — which account holds
 *   a role: the dashboard's main or secondary, or the one the savings goal
 *   reads. The previous holder gives it up.
 * - `{ "status": "active" | "archived" }` — archives it, or brings it back.
 *   Archived, it gives up its role.
 * - The whole account, as `POST /api/accounts` takes it — rewrites it. A new
 *   balance moves the total by the difference and is recorded as a correction.
 *
 * 404 when the account isn't the signed-in user's.
 */
export const PATCH: RequestHandler = async ({ locals, params, request }) => {
	const profile = await requireMonflyUser(locals);

	if (!request.headers.get('content-type')?.startsWith('application/json')) {
		error(415, 'Send the change as JSON');
	}
	const body: unknown = await request.json().catch(() => undefined);
	if (typeof body !== 'object' || body === null) error(400, 'Send the change as a JSON object');

	if (only(body, 'role')) {
		const { role } = body as { role: unknown };
		if (role !== null && !isAccountRole(role)) {
			error(400, `role must be null or one of ${ACCOUNT_ROLES.map((r) => `"${r}"`).join(', ')}`);
		}
		const found = await setAccountRole(db, {
			userEmail: profile.email,
			accountId: params.id,
			role
		});
		if (!found) error(404, 'No such account');
		return json({ id: params.id, role }, { headers: NO_STORE });
	}

	if (only(body, 'status')) {
		const { status } = body as { status: unknown };
		if (!isAccountStatus(status)) {
			error(400, `status must be one of ${ACCOUNT_STATUSES.map((s) => `"${s}"`).join(', ')}`);
		}
		const found = await setAccountStatus(db, { userEmail: profile.email, id: params.id, status });
		if (!found) error(404, 'No such account');
		return json({ id: params.id, status }, { headers: NO_STORE });
	}

	if (!isAccountDraft(body)) {
		error(
			400,
			`Send a role, a status, or the whole account: a name of 1 to ${MAX_ACCOUNT_NAME} characters, a type of ${ACCOUNT_KINDS.map((k) => `"${k}"`).join(', ')} or null, a provider of up to ${MAX_PROVIDER} characters or null, last4 as four digits or null, a balance in whole cents no further than ${MAX_BALANCE} from zero, and a role or null`
		);
	}
	const found = await updateAccount(db, { userEmail: profile.email, id: params.id, draft: body });
	if (!found) error(404, 'No such account');
	return json({ id: params.id }, { headers: NO_STORE });
};

/**
 * Removes the account, as v1 does: its transactions stay, with no account, and
 * the total loses the part of its balance no transaction backs.
 */
export const DELETE: RequestHandler = async ({ locals, params }) => {
	const profile = await requireMonflyUser(locals);
	const found = await deleteAccount(db, { userEmail: profile.email, id: params.id });
	if (!found) error(404, 'No such account');
	return json({ id: params.id }, { headers: NO_STORE });
};
