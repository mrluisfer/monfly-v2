import { queryOptions } from '@tanstack/svelte-query';
import type { IncomePeriod, IncomeSummary } from '$lib/finance';
import { getJson, type Fetch } from './http';

/** After any transaction write, invalidate `incomeKeys.all`. */
export const incomeKeys = {
	all: ['income'] as const,
	period: (period: IncomePeriod) => [...incomeKeys.all, period] as const
};

/** Income for a period, bucketed for the chart. Pass SvelteKit's `fetch` from a load. */
export const incomeQuery = (period: IncomePeriod, fetcher: Fetch = fetch) =>
	queryOptions({
		queryKey: incomeKeys.period(period),
		queryFn: () => getJson<IncomeSummary>(`/api/income?period=${period}`, fetcher)
	});
