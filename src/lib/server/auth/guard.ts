import { HOME_PATH } from '$lib/routes';

/** Where visitors without a session are sent from a protected route. */
export const LOGIN_PATH = '/login';

/**
 * Route groups that require a session. The check runs on the route id
 * ("/(app)/transactions"), not the URL, so any page added inside a protected
 * group is covered automatically — whatever its path.
 */
const PROTECTED_GROUPS = ['(app)'] as const;

export function isProtectedRoute(routeId: string | null): boolean {
	if (!routeId) return false; // no match → SvelteKit renders the 404
	return PROTECTED_GROUPS.some(
		(group) => routeId === `/${group}` || routeId.startsWith(`/${group}/`)
	);
}

/** JSON endpoints under /api. Every one requires a session unless it opts out here. */
export function isApiRoute(routeId: string | null): boolean {
	return routeId === '/api' || (routeId?.startsWith('/api/') ?? false);
}

/** Login URL that sends the visitor back to where they were headed. */
export function loginRedirect(url: URL): string {
	return `${LOGIN_PATH}?redirectTo=${encodeURIComponent(url.pathname + url.search)}`;
}

/** Where a signed-in visitor lands when no safe `redirectTo` is given. Shared with the client. */
export { HOME_PATH };

/**
 * Returns `target` only when it stays on this origin, else `fallback`.
 *
 * Parsed with the same URL rules browsers use, so the tricks that turn a path
 * into another host — "//evil.com", "/\\evil.com", "/\t/evil.com" — resolve
 * off-origin and are rejected. Never redirect to a raw `redirectTo`.
 */
export function safeRedirect(target: unknown, fallback = HOME_PATH): string {
	if (typeof target !== 'string' || !target.startsWith('/')) return fallback;
	const base = 'http://monfly.invalid';
	let url: URL;
	try {
		url = new URL(target, base);
	} catch {
		return fallback;
	}
	return url.origin === base ? url.pathname + url.search + url.hash : fallback;
}
