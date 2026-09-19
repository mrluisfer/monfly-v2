import { accountsQuery, colorChoicesQuery, loansQuery } from '$lib/queries';
import type { PageLoad } from './$types';

/**
 * Prefetches with SvelteKit's `fetch`, so the server draws the loans, the
 * panel and the charts with real figures and hydration reuses them. The
 * accounts come too: a payment lands on one, and the panel says what it
 * leaves there. A new Auth0 user has no account row yet: nothing to read.
 */
export const load: PageLoad = async ({ parent, fetch }) => {
	const { queryClient, profile } = await parent();

	if (profile) {
		await Promise.all([
			queryClient.prefetchQuery(loansQuery(fetch)),
			queryClient.prefetchQuery(accountsQuery(undefined, fetch)),
			queryClient.prefetchQuery(colorChoicesQuery(fetch))
		]);
	}
};
