import { error, json } from '@sveltejs/kit';
import { requireMonflyUser } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { getPinnedShortcuts, setShortcutPinned } from '$lib/server/preferences';
import { isShortcutId, isShortcutSource } from '$lib/shortcuts';
import type { RequestHandler } from './$types';

// Personal data: never stored by a shared cache.
const NO_STORE = { 'cache-control': 'private, no-store' };

/** The shortcuts the signed-in user has pinned to the header, by id: `["transactions", "insights"]`. */
export const GET: RequestHandler = async ({ locals }) => {
	const profile = await requireMonflyUser(locals);
	return json(await getPinnedShortcuts(db, profile.id), { headers: NO_STORE });
};

/**
 * Pins a shortcut to the header — `{ "id": "insights", "pinned": true }` — or
 * takes it away with `"pinned": false`, and records the change with where it
 * was made: `"source"` is `"page"` (the default), `"header"` or `"lock"`.
 * Overview's lock lives on the page, not here. Answers with every pinned id.
 */
export const PATCH: RequestHandler = async ({ locals, request }) => {
	const profile = await requireMonflyUser(locals);

	if (!request.headers.get('content-type')?.startsWith('application/json')) {
		error(415, 'Send the shortcut as JSON');
	}
	const body: unknown = await request.json().catch(() => undefined);
	const {
		id,
		pinned,
		source = 'page'
	} = (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>;
	if (!isShortcutId(id)) error(400, 'id must be one of the shortcuts in $lib/shortcuts');
	if (typeof pinned !== 'boolean') error(400, 'pinned must be true or false');
	if (!isShortcutSource(source)) error(400, 'source must be "page", "header" or "lock"');

	return json(await setShortcutPinned(db, profile.id, { id, pinned, source }), {
		headers: NO_STORE
	});
};
