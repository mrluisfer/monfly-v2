import { redirect } from '@sveltejs/kit';
import { isAuth0Configured, safeRedirect, startAuth0Login } from '$lib/server/auth';
import type { RequestHandler } from './$types';

/**
 * Where the guard sends signed-out visitors. An endpoint, not a page, on
 * purpose: SvelteKit preloads page data on hover, which would start a login
 * (and set its transaction cookie) just by pointing at a link.
 */
export const GET: RequestHandler = async (event) => {
	const returnTo = safeRedirect(event.url.searchParams.get('redirectTo'));
	const signup = `/signup?redirectTo=${encodeURIComponent(returnTo)}`;

	if (!isAuth0Configured()) redirect(303, signup);
	if (event.locals.session) redirect(303, returnTo);

	let authorizeUrl: URL;
	try {
		authorizeUrl = await startAuth0Login(event, { screen: 'login', returnTo });
	} catch (error) {
		console.error('Auth0 login could not start', error);
		redirect(303, `${signup}&error=unavailable`);
	}
	redirect(303, authorizeUrl.href);
};
