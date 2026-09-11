import { accountsQuery, colorChoicesQuery, unassignedQuery } from '$lib/queries';
import type { PageLoad } from './$types';

/**
 * Prefetches with SvelteKit's `fetch`, so the server renders the real rows and
 * hydration reuses them. A new Auth0 user has no account row yet: nothing to read.
 */
export const load: PageLoad = async ({ parent, fetch }) => {
	const { queryClient, profile } = await parent();
	if (profile) {
		await Promise.all([
			queryClient.prefetchQuery(unassignedQuery(fetch)),
			queryClient.prefetchQuery(accountsQuery(undefined, fetch)),
			queryClient.prefetchQuery(colorChoicesQuery(fetch))
		]);
	}
};
