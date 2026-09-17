import { accountsQuery, colorChoicesQuery, transactionsQuery } from '$lib/queries';
import type { PageLoad } from './$types';

/**
 * Prefetches with SvelteKit's `fetch`, so the server draws every chart with
 * real figures and hydration reuses them. The page reads the ledger's whole
 * record — the cache entry the Transactions and Accounts pages read too — and
 * works each figure out from it in the browser
 * ([0023](../../../../docs/decisions/0023-insights-read-the-ledger-in-the-browser.md)).
 * A new Auth0 user has no account row yet: nothing to read.
 */
export const load: PageLoad = async ({ parent, fetch }) => {
	const { queryClient, profile } = await parent();

	if (profile) {
		await Promise.all([
			queryClient.prefetchQuery(transactionsQuery(undefined, fetch)),
			queryClient.prefetchQuery(accountsQuery(undefined, fetch)),
			queryClient.prefetchQuery(colorChoicesQuery(fetch))
		]);
	}
};
