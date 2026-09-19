/**
 * Which lines the accounts total leaves out — account ids, and `unknown` for
 * the card-less line. Kept per browser in a cookie that the server loads of
 * the two pages drawing the total read — the dashboard's and the
 * transactions page's — as the Income card keeps its view, so the total is rendered
 * without them after a reload or a trip to another page, and nothing shifts on
 * hydration. None of it touches the shared database.
 */
export const LEFT_OUT_COOKIE = 'accounts-left-out';

/** The ids a cookie holds; anything that isn't a list of strings leaves nothing out. */
export function parseLeftOut(raw: string | undefined): string[] {
	try {
		const value: unknown = JSON.parse(raw ?? '[]');
		return Array.isArray(value) ? value.filter((id) => typeof id === 'string') : [];
	} catch {
		return [];
	}
}

/** Remembers what's left out in this browser for a year; with nothing left out, forgets. Browser only. */
export function saveLeftOut(ids: string[]) {
	const value = encodeURIComponent(JSON.stringify(ids));
	document.cookie = `${LEFT_OUT_COOKIE}=${value}; path=/; max-age=${ids.length > 0 ? 31536000 : 0}; samesite=lax`;
}
