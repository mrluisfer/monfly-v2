import { redirect } from '@sveltejs/kit';
import { auth0Logout, isAuth0Configured } from '$lib/server/auth';
import type { RequestHandler } from './$types';

/**
 * Ends the session here and at Auth0. POST only — a GET logout could be fired
 * cross-site by any <img>. SvelteKit's origin check rejects cross-site form
 * POSTs in production builds (verified: 403); `vite dev` does not enforce it.
 * Register `<origin>/` under Allowed Logout URLs in the Auth0 app.
 */
export const POST: RequestHandler = async (event) => {
	if (!isAuth0Configured()) redirect(303, '/');
	const logoutUrl = await auth0Logout(event, `${event.url.origin}/`);
	redirect(303, logoutUrl.href);
};
