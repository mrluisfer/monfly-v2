import { mutationOptions, queryOptions, type QueryClient } from '@tanstack/svelte-query';
import type { MonthKey } from '$lib/finance';
import type {
	AssignAccount,
	AssignResult,
	TransactionList,
	UnassignedList
} from '$lib/transactions';
import { accountKeys } from './accounts';
import { getJson, sendJson, type Fetch } from './http';

export const transactionKeys = {
	all: ['transactions'] as const,
	list: (month?: MonthKey) => [...transactionKeys.all, 'list', month ?? 'all'] as const,
	unassigned: () => [...transactionKeys.all, 'unassigned'] as const
};

/**
 * Transactions newest first — the table's own source. With a `month` it is
 * that month alone, which is what the page opens with; without one, the whole
 * record. Each is its own cache entry, so asking for everything doesn't throw
 * the month away. Pass SvelteKit's `fetch` from a load. Assigning an account
 * invalidates `transactionKeys.all`, so both refresh with the unassigned list.
 */
export const transactionsQuery = (month?: MonthKey, fetcher: Fetch = fetch) =>
	queryOptions({
		queryKey: transactionKeys.list(month),
		queryFn: () =>
			getJson<TransactionList>(
				month ? `/api/transactions?month=${month}` : '/api/transactions',
				fetcher
			)
	});

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
