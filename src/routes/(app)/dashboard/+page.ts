import { currentMonth } from '$lib/finance';
import {
	accountsQuery,
	colorChoicesQuery,
	expenseBreakdownQuery,
	incomeQuery,
	monthSpendingQuery
} from '$lib/queries';
import type { PageLoad } from './$types';

/**
 * Prefetches the dashboard's queries with SvelteKit's `fetch`, so the server
 * renders real figures and hydration reuses them instead of refetching.
 * Widgets read the same cache entries through createQuery. A failed prefetch
 * isn't fatal: its widget falls back or retries on the client.
 */
export const load: PageLoad = async ({ parent, fetch }) => {
	const { queryClient, profile, timeZone } = await parent();
	const month = currentMonth(timeZone);
	// A new Auth0 user has no account row yet: nothing to read.
	if (profile) {
		await Promise.all([
			queryClient.prefetchQuery(monthSpendingQuery(month, fetch)),
			queryClient.prefetchQuery(expenseBreakdownQuery(null, fetch)),
			queryClient.prefetchQuery(colorChoicesQuery(fetch)),
			queryClient.prefetchQuery(accountsQuery(undefined, fetch)),
			queryClient.prefetchQuery(incomeQuery('quarter', fetch))
		]);
	}
	return { month };
};
