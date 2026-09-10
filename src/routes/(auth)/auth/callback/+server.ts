import { error, redirect } from '@sveltejs/kit';
import { completeAuth0Login, isAuth0Configured } from '$lib/server/auth';
import type { RequestHandler } from './$types';

/**
 * Auth0 sends the browser back here after sign-up or login. Register
 * `<origin>/auth/callback` under Allowed Callback URLs in the Auth0 app.
 */
export const GET: RequestHandler = async (event) => {
	if (!isAuth0Configured()) error(404, 'Not found');

	let returnTo: string;
	try {
		({ returnTo } = await completeAuth0Login(event));
	} catch (err) {
		// Covers a cancelled consent, an expired transaction or a replayed code.
		console.error('Auth0 callback failed', err);
		redirect(303, '/signup?error=callback');
	}
	redirect(303, returnTo);
};
