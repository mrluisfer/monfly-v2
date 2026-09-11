import { error, json } from '@sveltejs/kit';
import { isAccountRole } from '$lib/accounts';
import { requireMonflyUser } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { setAccountRole } from '$lib/server/accounts';
import type { RequestHandler } from './$types';

/**
 * Sets which account is the dashboard's main or secondary:
 * `{ "role": "main" | "secondary" | null }`. The previous holder of the role
 * gives it up. 404 when the account isn't the signed-in user's.
 */
export const PATCH: RequestHandler = async ({ locals, params, request }) => {
	const profile = await requireMonflyUser(locals);

	if (!request.headers.get('content-type')?.startsWith('application/json')) {
		error(415, 'Send the role as JSON');
	}
	const body: unknown = await request.json().catch(() => undefined);
	const role = typeof body === 'object' && body !== null && 'role' in body ? body.role : undefined;
	if (role !== null && !isAccountRole(role)) error(400, 'role must be "main", "secondary" or null');

	const found = await setAccountRole(db, { userEmail: profile.email, accountId: params.id, role });
	if (!found) error(404, 'No such account');
	return json({ id: params.id, role }, { headers: { 'cache-control': 'private, no-store' } });
};
