import { currentMonth } from '$lib/finance';
import { readLedgerView } from '$lib/ledger-view';
import { accountsQuery, colorChoicesQuery, transactionsQuery, unassignedQuery } from '$lib/queries';
import type { PageLoad } from './$types';

/**
 * Prefetches with SvelteKit's `fetch`, so the server renders the real rows and
 * hydration reuses them. The page opens on the whole record; a month is a
 * second query, fetched when someone filters to one — or here, when the
 * address names one. A new Auth0 user has no account row yet: nothing to read.
 */
export const load: PageLoad = async ({ parent, fetch, url, data }) => {
	const { queryClient, profile, timeZone } = await parent();
	const month = currentMonth(timeZone);
	const asked = readLedgerView(url.searchParams, month).month;

	if (profile) {
		await Promise.all([
			queryClient.prefetchQuery(transactionsQuery(undefined, fetch)),
			...(asked === 'all' ? [] : [queryClient.prefetchQuery(transactionsQuery(asked, fetch))]),
			queryClient.prefetchQuery(unassignedQuery(fetch)),
			queryClient.prefetchQuery(accountsQuery(undefined, fetch)),
			queryClient.prefetchQuery(colorChoicesQuery(fetch))
		]);
	}

	// A universal load replaces the server load's result rather than merging with it.
	return { ...data, month };
};
