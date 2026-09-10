import { mutationOptions, type QueryClient } from '@tanstack/svelte-query';
import type { Cents, MonthSpending } from '$lib/finance';
import { sendJson } from './http';
import { spendingKeys } from './spending';

/**
 * Sets the monthly budget; null clears it. Every cached month shows the new
 * budget at once — it is one standing value — and a refetch then confirms it.
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
			return queryClient.invalidateQueries({ queryKey: spendingKeys.all });
		}
	});
