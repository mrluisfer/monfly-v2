import { mutationOptions, type QueryClient } from '@tanstack/svelte-query';
import type { BudgetMonth, Cents, MonthSpending } from '$lib/finance';
import { budgetKeys } from './budgets';
import { sendJson } from './http';
import { spendingKeys } from './spending';

/**
 * Sets the monthly budget; null clears it. Every cached month — the
 * dashboard's and the budgets page's — shows the new budget at once, since it
 * is one standing value, and a refetch then confirms it.
 */
export const setBudgetMutation = (queryClient: QueryClient) =>
	mutationOptions({
		mutationFn: (budget: Cents | null) =>
			sendJson<{ budget: Cents | null }>('/api/me/budget', 'PUT', { budget }),
		onSuccess: ({ budget }) => {
			queryClient.setQueriesData<MonthSpending>(
				{ queryKey: spendingKeys.all },
				(month) => month && { ...month, budget }
			);
			queryClient.setQueriesData<BudgetMonth>(
				{ queryKey: budgetKeys.all },
				(month) => month && { ...month, budget }
			);
			return Promise.all([
				queryClient.invalidateQueries({ queryKey: spendingKeys.all }),
				queryClient.invalidateQueries({ queryKey: budgetKeys.all })
			]);
		}
	});
