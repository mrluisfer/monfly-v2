import { mutationOptions, queryOptions, type QueryClient } from '@tanstack/svelte-query';
import type { Cents, Savings } from '$lib/finance';
import { accountKeys } from './accounts';
import { getJson, sendJson, type Fetch } from './http';
import { spendingKeys } from './spending';

/** One standing goal per person, so one key. */
export const savingsKeys = {
	all: ['savings'] as const
};

/**
 * From a load function, pass SvelteKit's `fetch`: during SSR it calls the
 * endpoint in-process with the visitor's cookies, and the response is inlined
 * so hydration doesn't fetch it again.
 */
export const savingsQuery = (fetcher: Fetch = fetch) =>
	queryOptions({
		queryKey: savingsKeys.all,
		queryFn: () => getJson<Savings>('/api/savings', fetcher)
	});

/** Sets what they plan to save; null clears the goal but keeps what's saved. */
export const setSavingsGoalMutation = (queryClient: QueryClient) =>
	mutationOptions({
		mutationFn: (goal: Cents | null) => sendJson<Savings>('/api/savings', 'PUT', { goal }),
		// The endpoint answers with the whole thing, so the cache takes it as it is.
		onSuccess: (savings) => queryClient.setQueryData(savingsKeys.all, savings)
	});

/**
 * Adds to the running total. With an account linked the amount moves out of
 * `from` and into it, so two account balances and this month's figures change
 * with it — hence the wider invalidation.
 */
export const addSavingsMutation = (queryClient: QueryClient) =>
	mutationOptions({
		mutationFn: ({ amount, from }: { amount: Cents; from?: string }) =>
			sendJson<Savings>('/api/savings', 'POST', { amount, from }),
		onSuccess: (savings) => {
			queryClient.setQueryData(savingsKeys.all, savings);
			return Promise.all([
				queryClient.invalidateQueries({ queryKey: accountKeys.all }),
				queryClient.invalidateQueries({ queryKey: spendingKeys.all })
			]);
		}
	});
