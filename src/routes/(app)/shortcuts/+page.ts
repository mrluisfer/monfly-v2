import { shortcutActivityQuery } from '$lib/queries';
import type { PageLoad } from './$types';

/**
 * Prefetches the charts' counts with SvelteKit's `fetch`, so the server draws
 * them and hydration reuses them. The pinned shortcuts came with the app
 * layout. A new Auth0 user has no account row yet: nothing to read.
 */
export const load: PageLoad = async ({ parent, fetch }) => {
	const { queryClient, profile } = await parent();
	if (profile) await queryClient.prefetchQuery(shortcutActivityQuery(fetch));
};
