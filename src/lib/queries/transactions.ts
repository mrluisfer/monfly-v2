import { mutationOptions, queryOptions, type QueryClient } from '@tanstack/svelte-query';
import type { MonthKey } from '$lib/finance';
import type {
	AssignAccount,
	AssignResult,
	TransactionEdit,
	TransactionList,
	TransactionNew,
	TransferEntry,
	UnassignedList
} from '$lib/transactions';
import { accountKeys } from './accounts';
import { getJson, sendJson, type Fetch } from './http';
import { savingsKeys } from './savings';

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

/**
 * Writes a new transaction. Everything it touches is read again rather than
 * patched in place: it lands in the ledger where its date puts it, in a month
 * that may not be the one on screen, and the balances moved with it.
 */
export const addTransactionMutation = (queryClient: QueryClient) =>
	mutationOptions({
		mutationFn: (entry: TransactionNew) =>
			sendJson<{ id: string }>('/api/transactions', 'POST', entry),
		onSuccess: () =>
			Promise.all([
				queryClient.invalidateQueries({ queryKey: transactionKeys.all }),
				queryClient.invalidateQueries({ queryKey: accountKeys.all })
			])
	});

/**
 * Rewrites one transaction. Nothing is guessed at here: the amount or the
 * direction may have changed, so the account balances and the headline totals
 * are all read again rather than patched in place.
 */
export const editTransactionMutation = (queryClient: QueryClient) =>
	mutationOptions({
		mutationFn: ({ id, edit }: { id: string; edit: TransactionEdit }) =>
			sendJson<{ id: string }>(`/api/transactions/${id}`, 'PATCH', edit),
		onSuccess: () =>
			Promise.all([
				queryClient.invalidateQueries({ queryKey: transactionKeys.all }),
				queryClient.invalidateQueries({ queryKey: accountKeys.all })
			])
	});

/** Every list a transaction can be in: the ledger's, and the card-less one. */
type CachedList = TransactionList | UnassignedList;

/**
 * The same row dropped from whichever list holds it. The two are spread apart
 * rather than as a union: a spread union widens to a shape TypeScript can no
 * longer place back in either.
 */
const without = (id: string) => (list: CachedList | undefined) => {
	if (!list) return list;
	return 'totals' in list
		? { ...list, transactions: list.transactions.filter((t) => t.id !== id) }
		: { ...list, transactions: list.transactions.filter((t) => t.id !== id) };
};

/**
 * Removes one transaction. Not optimistic, unlike assigning an account: the row
 * asking the question is the one that would disappear, and with it the layer
 * holding the answer — a refusal would have nowhere to be read. Gone, it leaves
 * every list at once (the ledger, whichever months are cached, the card-less
 * ones) rather than waiting on the refetch behind it, and the figures that
 * counted it follow.
 */
export const deleteTransactionMutation = (queryClient: QueryClient) =>
	mutationOptions({
		mutationFn: (id: string) =>
			sendJson<{ id: string }>(`/api/transactions/${id}`, 'DELETE', undefined),
		onSuccess: (_answer, id) =>
			queryClient.setQueriesData<CachedList>({ queryKey: transactionKeys.all }, without(id)),
		onSettled: () =>
			Promise.all([
				queryClient.invalidateQueries({ queryKey: transactionKeys.all }),
				queryClient.invalidateQueries({ queryKey: accountKeys.all })
			])
	});

/**
 * Everything a transfer moves, read again: both sides in the ledger, two
 * account balances, and the savings goal when one of them is its account.
 */
const afterTransfer = (queryClient: QueryClient) =>
	Promise.all([
		queryClient.invalidateQueries({ queryKey: transactionKeys.all }),
		queryClient.invalidateQueries({ queryKey: accountKeys.all }),
		queryClient.invalidateQueries({ queryKey: savingsKeys.all })
	]);

/** Moves money from one account to another: two rows, two balances, the total untouched. */
export const addTransferMutation = (queryClient: QueryClient) =>
	mutationOptions({
		mutationFn: (entry: TransferEntry) => sendJson<{ id: string }>('/api/transfers', 'POST', entry),
		onSuccess: () => afterTransfer(queryClient)
	});

/** Rewrites a transfer whole, by the id its two sides share. */
export const editTransferMutation = (queryClient: QueryClient) =>
	mutationOptions({
		mutationFn: ({ id, entry }: { id: string; entry: TransferEntry }) =>
			sendJson<{ id: string }>(`/api/transfers/${id}`, 'PATCH', entry),
		onSuccess: () => afterTransfer(queryClient)
	});

/**
 * Removes a transfer: both of its sides leave every cached ledger at once, as
 * a deleted transaction does, and the balances they moved follow.
 */
export const deleteTransferMutation = (queryClient: QueryClient) =>
	mutationOptions({
		mutationFn: (id: string) =>
			sendJson<{ id: string }>(`/api/transfers/${id}`, 'DELETE', undefined),
		onSuccess: (_answer, id) =>
			queryClient.setQueriesData<CachedList>({ queryKey: transactionKeys.all }, (list) =>
				list && 'totals' in list
					? { ...list, transactions: list.transactions.filter((t) => t.transfer?.id !== id) }
					: list
			),
		onSettled: () => afterTransfer(queryClient)
	});
