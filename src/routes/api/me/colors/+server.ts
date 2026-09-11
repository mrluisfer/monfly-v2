import { error, json } from '@sveltejs/kit';
import { MAX_COLOR_KEY, isColorKind, isPaletteColor } from '$lib/colors';
import { requireMonflyUser } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { getColorChoices, setColorChoice } from '$lib/server/preferences';
import type { RequestHandler } from './$types';

// Personal data: never stored by a shared cache.
const NO_STORE = { 'cache-control': 'private, no-store' };

/** The colours the signed-in user has picked: `{ "category": { "<name>": "<palette id>" } }`. */
export const GET: RequestHandler = async ({ locals }) => {
	const profile = await requireMonflyUser(locals);
	return json(await getColorChoices(db, profile.id), { headers: NO_STORE });
};

/**
 * Picks one colour — `{ "kind": "category", "key": "comida", "color": "mint" }`
 * — or forgets it with `"color": null`. Answers with every choice.
 */
export const PATCH: RequestHandler = async ({ locals, request }) => {
	const profile = await requireMonflyUser(locals);

	if (!request.headers.get('content-type')?.startsWith('application/json')) {
		error(415, 'Send the colour as JSON');
	}
	const body: unknown = await request.json().catch(() => undefined);
	const { kind, key, color } = (typeof body === 'object' && body !== null ? body : {}) as Record<
		string,
		unknown
	>;
	if (!isColorKind(kind)) error(400, 'kind must be "category"');
	if (typeof key !== 'string' || key.length === 0 || key.length > MAX_COLOR_KEY) {
		error(400, `key must be 1 to ${MAX_COLOR_KEY} characters`);
	}
	if (color !== null && !isPaletteColor(color)) error(400, 'color must be a palette colour or null');

	return json(await setColorChoice(db, profile.id, kind, key, color), { headers: NO_STORE });
};
