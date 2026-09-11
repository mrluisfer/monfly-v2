import { mutationOptions, queryOptions, type QueryClient } from '@tanstack/svelte-query';
import type { AssignAccount, AssignResult, UnassignedList } from '$lib/transactions';
import { accountKeys } from './accounts';
import { getJson, sendJson, type Fetch } from './http';

export const transactionKeys = {
	all: ['transactions'] as const,
	unassigned: () => [...transactionKeys.all, 'unassigned'] as const
};

/** The user's transactions with no account, newest first. Pass SvelteKit's `fetch` from a load. */
export const unassignedQuery = (fetcher: Fetch = fetch) =>
	queryOptions({
		queryKey: transactionKeys.unassigned(),
		queryFn: () => getJson<UnassignedList>('/api/transactions/unassigned', fetcher)
	});

/**
 * Gives transactions an account. They leave the list at once and come back if
 * the server refuses; every account figure refetches after, since balances
 * and the unknown line both move.
 */
export const assignAccountMutation = (queryClient: QueryClient) =>
	mutationOptions({
		mutationFn: (input: AssignAccount) =>
			sendJson<AssignResult>('/api/transactions/unassigned', 'POST', input),
		onMutate: async ({ ids }) => {
			await queryClient.cancelQueries({ queryKey: transactionKeys.unassigned() });
			const previous = queryClient.getQueryData<UnassignedList>(transactionKeys.unassigned());
			const gone = new Set(ids);
			queryClient.setQueryData<UnassignedList>(
				transactionKeys.unassigned(),
				(list) =>
					list && { ...list, transactions: list.transactions.filter((t) => !gone.has(t.id)) }
			);
			return { previous };
		},
		onError: (_error, _input, snapshot) => {
			if (snapshot?.previous)
				queryClient.setQueryData(transactionKeys.unassigned(), snapshot.previous);
		},
		onSettled: () =>
			Promise.all([
				queryClient.invalidateQueries({ queryKey: transactionKeys.all }),
				queryClient.invalidateQueries({ queryKey: accountKeys.all })
			])
	});
