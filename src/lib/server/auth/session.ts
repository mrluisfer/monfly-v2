import { dev } from '$app/environment';
import type { RequestEvent } from '@sveltejs/kit';
import { getAuth0User, isAuth0Configured } from './auth0';

export type User = {
	id: string;
	email: string;
	name: string;
	/** Auth0's `email_verified` — only a verified email may claim an existing account. */
	emailVerified: boolean;
};

export type Session = {
	user: User;
};

/**
 * Stand-in while Auth0 isn't configured. Dev-only on purpose: a production
 * build without the AUTH0_* variables resolves no session, so the (app) group
 * fails closed instead of opening up.
 */
const DEV_SESSION: Session = {
	user: { id: 'dev', email: 'dev@monfly.local', name: 'Monfly Dev', emailVerified: false }
};

/**
 * Resolves the session for a request — the single place auth plugs in. The
 * hook, the guard and every load read the result from `event.locals.session`.
 */
export async function resolveSession(event: RequestEvent): Promise<Session | null> {
	if (!isAuth0Configured()) return dev ? DEV_SESSION : null;

	try {
		const claims = await getAuth0User(event);
		if (!claims) return null;
		return {
			user: {
				id: claims.sub,
				email: claims.email ?? '',
				name: claims.name ?? claims.nickname ?? '',
				emailVerified: claims.email_verified === true
			}
		};
	} catch (error) {
		// A cookie from a rotated secret or a tampered one: signed out, not a 500.
		console.warn('Auth0 session could not be read', error);
		return null;
	}
}
