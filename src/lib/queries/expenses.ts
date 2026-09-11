import { queryOptions } from '@tanstack/svelte-query';
import type { ExpenseBreakdown } from '$lib/finance';
import { getJson, type Fetch } from './http';

/** Hierarchical keys: after any transaction write, invalidate `expenseKeys.all`. */
export const expenseKeys = {
	all: ['expenses'] as const,
	categories: (year: number | null) => [...expenseKeys.all, 'categories', year ?? 'all'] as const
};

/** Expenses by category for a year, or all time with `null`. Pass SvelteKit's `fetch` from a load. */
export const expenseBreakdownQuery = (year: number | null, fetcher: Fetch = fetch) =>
	queryOptions({
		queryKey: expenseKeys.categories(year),
		queryFn: () =>
			getJson<ExpenseBreakdown>(
				year === null ? '/api/expenses/categories' : `/api/expenses/categories?year=${year}`,
				fetcher
			)
	});
