import { redirect } from '@sveltejs/kit';
import { LOGIN_PATH } from '$lib/server/auth';
import type { LayoutServerLoad } from './$types';

/**
 * Hands the signed-in user to the app shell.
 *
 * Its real job is structural: a server load in the group layout means entering
 * (app) always round-trips through the server — even by client-side navigation
 * from the landing — so the guard in hooks.server.ts always runs. With a purely
 * universal chain the shell would render client-side without asking the server.
 */
export const load: LayoutServerLoad = async ({ locals }) => {
	// Unreachable while the hook guard is in place; fails closed if it ever isn't.
	if (!locals.session) redirect(303, LOGIN_PATH);
	return {
		user: locals.session.user,
		// null for a new Auth0 user with no v1 row — creating one is still pending.
		profile: await locals.getMonflyUser()
	};
};
