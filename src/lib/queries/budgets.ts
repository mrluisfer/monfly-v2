import { mutationOptions, queryOptions, type QueryClient } from '@tanstack/svelte-query';
import type { BudgetMonth, Cents, MonthKey } from '$lib/finance';
import { getJson, sendJson, type Fetch } from './http';

/** Hierarchical keys: after a budget or a limit is written, invalidate `budgetKeys.all`. */
export const budgetKeys = {
	all: ['budgets'] as const,
	month: (month: MonthKey) => [...budgetKeys.all, 'month', month] as const
};

/** One month against the budgets. From a load function, pass SvelteKit's `fetch`. */
export const budgetMonthQuery = (month: MonthKey, fetcher: Fetch = fetch) =>
	queryOptions({
		queryKey: budgetKeys.month(month),
		queryFn: () => getJson<BudgetMonth>(`/api/budgets?month=${month}`, fetcher)
	});

type Limit = { category: string; limit: Cents | null };

/** A limit written into a cached month: its line takes it, or joins the month with nothing spent. */
function withLimit(month: BudgetMonth, { category, limit }: Limit): BudgetMonth {
	const listed = month.categories.some((line) => line.name === category);
	if (!listed && limit === null) return month;
	return {
		...month,
		categories: listed
			? month.categories.map((line) => (line.name === category ? { ...line, limit } : line))
			: [...month.categories, { name: category, limit, spent: 0, count: 0, last: 0, usual: 0 }]
	};
}

/**
 * Sets one category's limit; null takes it away. It shows at once in every
 * cached month — a limit is one standing value — and rolls back if the
 * server refuses it; a refetch then confirms it.
 */
export const setCategoryBudgetMutation = (queryClient: QueryClient) =>
	mutationOptions({
		mutationFn: (change: Limit) => sendJson<Limit>('/api/budgets', 'PUT', change),
		onMutate: async (change) => {
			await queryClient.cancelQueries({ queryKey: budgetKeys.all });
			const previous = queryClient.getQueriesData<BudgetMonth>({ queryKey: budgetKeys.all });
			queryClient.setQueriesData<BudgetMonth>(
				{ queryKey: budgetKeys.all },
				(month) => month && withLimit(month, change)
			);
			return { previous };
		},
		onError: (_error, _change, snapshot) => {
			for (const [key, month] of snapshot?.previous ?? []) queryClient.setQueryData(key, month);
		},
		onSettled: () => queryClient.invalidateQueries({ queryKey: budgetKeys.all })
	});
