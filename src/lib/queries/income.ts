import { queryOptions } from '@tanstack/svelte-query';
import type { IncomePeriod, IncomeSummary, IncomeUnit } from '$lib/finance';
import { getJson, type Fetch } from './http';

/** After any transaction write, invalidate `incomeKeys.all`. */
export const incomeKeys = {
	all: ['income'] as const,
	period: (period: IncomePeriod, unit: IncomeUnit) => [...incomeKeys.all, period, unit] as const
};

/**
 * Income for a period split into `unit` — one of `INCOME_UNITS[period]` —
 * bucketed for the chart. Pass SvelteKit's `fetch` from a load.
 */
export const incomeQuery = (period: IncomePeriod, unit: IncomeUnit, fetcher: Fetch = fetch) =>
	queryOptions({
		queryKey: incomeKeys.period(period, unit),
		queryFn: () => getJson<IncomeSummary>(`/api/income?period=${period}&by=${unit}`, fetcher)
	});
