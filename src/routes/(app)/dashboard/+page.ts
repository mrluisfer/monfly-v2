import { currentMonth } from '$lib/finance';
import { monthSpendingQuery } from '$lib/queries';
import type { PageLoad } from './$types';

/**
 * Prefetches the dashboard's queries with SvelteKit's `fetch`, so the server
 * renders real figures and hydration reuses them instead of refetching.
 * Widgets read the same cache entries through createQuery.
 */
export const load: PageLoad = async ({ parent, fetch }) => {
	const { queryClient, profile, timeZone } = await parent();
	const month = currentMonth(timeZone);
	// A new Auth0 user has no account row yet: nothing to read.
	if (profile) await queryClient.prefetchQuery(monthSpendingQuery(month, fetch));
	return { month };
};
