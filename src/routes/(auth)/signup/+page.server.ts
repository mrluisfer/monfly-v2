import { fail, redirect } from '@sveltejs/kit';
import { isAuth0Configured, safeRedirect, startAuth0Login } from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

/** Errors Auth0 round-trips can bounce back here with (`?error=`). */
const AUTH_ERRORS: Record<string, string> = {
	callback: "Sign-in didn't complete. Please try again.",
	unavailable: "Couldn't reach Auth0. Try again in a moment."
};

export const load: PageServerLoad = ({ locals, url }) => {
	const auth0Ready = isAuth0Configured();
	const redirectTo = safeRedirect(url.searchParams.get('redirectTo'));

	// Already signed in: skip the page. Only meaningful with Auth0 — without it
	// the dev placeholder session would match every visitor.
	if (auth0Ready && locals.session) redirect(303, redirectTo);

	return {
		auth0Ready,
		redirectTo,
		authError: AUTH_ERRORS[url.searchParams.get('error') ?? ''] ?? null
	};
};

export const actions: Actions = {
	/** Sends the visitor to Auth0's Universal Login — the sign-up screen, or login. */
	default: async (event) => {
		if (!isAuth0Configured()) {
			return fail(503, { message: 'Sign-up is not available yet: Auth0 is not configured.' });
		}

		const form = await event.request.formData();
		const screen = form.get('intent') === 'login' ? 'login' : 'signup';
		const returnTo = safeRedirect(form.get('redirectTo')); // never trust the hidden input

		let authorizeUrl: URL;
		try {
			authorizeUrl = await startAuth0Login(event, { screen, returnTo });
		} catch (error) {
			console.error('Auth0 login could not start', error);
			return fail(502, { message: AUTH_ERRORS.unavailable });
		}
		redirect(303, authorizeUrl.href);
	}
};
