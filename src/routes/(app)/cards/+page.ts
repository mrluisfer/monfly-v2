import { DEFAULT_HISTORY_RANGE } from '$lib/accounts';
import {
	accountsQuery,
	archivedAccountsQuery,
	balanceHistoryQuery,
	colorChoicesQuery,
	transactionsQuery
} from '$lib/queries';
import type { PageLoad } from './$types';

/**
 * Prefetches with SvelteKit's `fetch`, so the server draws the cards, the
 * chart and the panel with real figures and hydration reuses them. The whole
 * record comes too: the panel's "Where it went" reads the open account's rows
 * from it, as the Transactions page's does. A new Auth0 user has no account
 * row yet: nothing to read.
 */
export const load: PageLoad = async ({ parent, fetch }) => {
	const { queryClient, profile } = await parent();

	if (profile) {
		await Promise.all([
			queryClient.prefetchQuery(accountsQuery(undefined, fetch)),
			queryClient.prefetchQuery(balanceHistoryQuery(DEFAULT_HISTORY_RANGE, fetch)),
			queryClient.prefetchQuery(archivedAccountsQuery(fetch)),
			queryClient.prefetchQuery(colorChoicesQuery(fetch)),
			queryClient.prefetchQuery(transactionsQuery(undefined, fetch))
		]);
	}
};
