import { currentMonth } from '$lib/finance';
import { incomeUnit } from '$lib/income-view';
import {
	accountsQuery,
	colorChoicesQuery,
	expenseBreakdownQuery,
	incomeQuery,
	monthSpendingQuery,
	savingsQuery
} from '$lib/queries';
import type { PageLoad } from './$types';

/**
 * Prefetches the dashboard's queries with SvelteKit's `fetch`, so the server
 * renders real figures and hydration reuses them instead of refetching.
 * Widgets read the same cache entries through createQuery. A failed prefetch
 * isn't fatal: its widget falls back or retries on the client. The Income
 * card's period and settings come from the server load (a cookie).
 */
export const load: PageLoad = async ({ parent, fetch, data }) => {
	const { queryClient, profile, timeZone } = await parent();
	const month = currentMonth(timeZone);
	const { period } = data.incomeView;
	const unit = incomeUnit(period, data.incomeView);
	// A new Auth0 user has no account row yet: nothing to read.
	if (profile) {
		await Promise.all([
			queryClient.prefetchQuery(monthSpendingQuery(month, fetch)),
			queryClient.prefetchQuery(expenseBreakdownQuery(null, fetch)),
			queryClient.prefetchQuery(colorChoicesQuery(fetch)),
			queryClient.prefetchQuery(accountsQuery(undefined, fetch)),
			queryClient.prefetchQuery(incomeQuery(period, unit, fetch)),
			queryClient.prefetchQuery(savingsQuery(fetch))
		]);
	}
	// A universal load replaces the server load's result rather than merging with it.
	return { ...data, month };
};
