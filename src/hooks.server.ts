import { json, redirect, type Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { DEFAULT_TIME_ZONE, TIME_ZONE_COOKIE, isTimeZone } from '$lib/finance';
import {
	findMonflyUser,
	isApiRoute,
	isProtectedRoute,
	loginRedirect,
	resolveSession,
	type MonflyUser
} from '$lib/server/auth';

/**
 * The viewer's IANA time zone, from the cookie app.html sets. The very first
 * request has none yet, so months fall back to UTC — how v1 drew them.
 */
const handleTimeZone: Handle = async ({ event, resolve }) => {
	const zone = event.cookies.get(TIME_ZONE_COOKIE);
	event.locals.timeZone = zone && isTimeZone(zone) ? zone : DEFAULT_TIME_ZONE;
	return resolve(event);
};

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
 * Gatekeeper for protected route groups and the JSON API. Runs before any
 * load, form action or endpoint — including the __data.json requests behind
 * client-side navigation, for which SvelteKit turns this redirect into a JSON
 * redirect the client router follows. API callers get a 401 instead: a fetch
 * can't follow a redirect to a login page.
 */
const handleGuard: Handle = async ({ event, resolve }) => {
	if (!event.locals.session) {
		if (isApiRoute(event.route.id)) {
			return json({ message: 'Sign in to continue' }, { status: 401 });
		}
		if (isProtectedRoute(event.route.id)) redirect(303, loginRedirect(event.url));
	}
	return resolve(event);
};

export const handle = sequence(handleTimeZone, handleSession, handleGuard);
