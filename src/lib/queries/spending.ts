import { queryOptions } from '@tanstack/svelte-query';
import type { MonthKey, MonthSpending } from '$lib/finance';
import { getJson, type Fetch } from './http';

/** Hierarchical keys: after any transaction or budget write, invalidate `spendingKeys.all`. */
export const spendingKeys = {
	all: ['spending'] as const,
	month: (month: MonthKey) => [...spendingKeys.all, 'month', month] as const
};

/**
 * From a load function, pass SvelteKit's `fetch`: during SSR it calls the
 * endpoint in-process with the visitor's cookies, and the response is inlined
 * so hydration doesn't fetch it again.
 */
export const monthSpendingQuery = (month: MonthKey, fetcher: Fetch = fetch) =>
	queryOptions({
		queryKey: spendingKeys.month(month),
		queryFn: () => getJson<MonthSpending>(`/api/months/${month}/spending`, fetcher)
	});
