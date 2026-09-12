import { currentMonth } from '$lib/finance';
import { accountsQuery, colorChoicesQuery, transactionsQuery, unassignedQuery } from '$lib/queries';
import type { PageLoad } from './$types';

/**
 * Prefetches with SvelteKit's `fetch`, so the server renders the real rows and
 * hydration reuses them. The page opens on this month; asking for the whole
 * record is a second query, fetched only when someone asks for it. A new Auth0
 * user has no account row yet: nothing to read.
 */
export const load: PageLoad = async ({ parent, fetch }) => {
	const { queryClient, profile, timeZone } = await parent();
	const month = currentMonth(timeZone);

	if (profile) {
		await Promise.all([
			queryClient.prefetchQuery(transactionsQuery(month, fetch)),
			queryClient.prefetchQuery(unassignedQuery(fetch)),
			queryClient.prefetchQuery(accountsQuery(undefined, fetch)),
			queryClient.prefetchQuery(colorChoicesQuery(fetch))
		]);
	}

	return { month };
};
