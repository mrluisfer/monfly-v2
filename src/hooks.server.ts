import { redirect, type Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import {
	findMonflyUser,
	isProtectedRoute,
	loginRedirect,
	resolveSession,
	type MonflyUser
} from '$lib/server/auth';

/**
 * Attaches the session — or null — to every request, plus a getter for the
 * Monfly `User` row behind it. The getter is lazy and memoised per request, and
 * imports the database client on demand, so public pages and the build never
 * touch the database.
 */
const handleSession: Handle = async ({ event, resolve }) => {
	const session = await resolveSession(event);
	event.locals.session = session;

	let profile: Promise<MonflyUser | null> | undefined;
	event.locals.getMonflyUser = () =>
		(profile ??= session
			? import('$lib/server/db').then(({ db }) => findMonflyUser(db, session))
			: Promise.resolve(null));

	return resolve(event);
};

/**
 * Gatekeeper for protected route groups. Runs before any load, form action or
 * endpoint — including the __data.json requests behind client-side
 * navigation, for which SvelteKit turns this redirect into a JSON redirect
 * the client router follows.
 */
const handleGuard: Handle = async ({ event, resolve }) => {
	if (isProtectedRoute(event.route.id) && !event.locals.session) {
		redirect(303, loginRedirect(event.url));
	}
	return resolve(event);
};

export const handle = sequence(handleSession, handleGuard);
