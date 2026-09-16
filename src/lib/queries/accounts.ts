import { mutationOptions, queryOptions, type QueryClient } from '@tanstack/svelte-query';
import type { AccountIcon } from '$lib/account-icons';
import type {
	AccountDraft,
	AccountList,
	AccountRole,
	AccountStatus,
	ArchivedList,
	BalanceHistory,
	HistoryRange
} from '$lib/accounts';
import type { MonthKey } from '$lib/finance';
import { colorKeys } from './colors';
import { getJson, sendJson, type Fetch } from './http';
import { savingsKeys } from './savings';
import { transactionKeys } from './transactions';

/**
 * After any transaction or account write, invalidate `accountKeys.all` — every
 * month's list, the archived ones and the balance history, which all move with
 * a balance.
 */
export const accountKeys = {
	all: ['accounts'] as const,
	list: (month?: MonthKey) => [...accountKeys.all, month ?? 'now'] as const,
	archived: () => [...accountKeys.all, 'archived'] as const,
	history: (range: HistoryRange) => [...accountKeys.all, 'history', range] as const
};

/**
 * Active accounts: balances now and this month's spending, or — with a past
 * `month` — balances when it ended and its spending. Pass SvelteKit's `fetch`
 * from a load.
 */
export const accountsQuery = (month?: MonthKey, fetcher: Fetch = fetch) =>
	queryOptions({
		queryKey: accountKeys.list(month),
		queryFn: () =>
			getJson<AccountList>(month ? `/api/accounts?month=${month}` : '/api/accounts', fetcher)
	});

type RoleChange = { id: string; role: AccountRole | null };

/**
 * Moves a role to an account. Every cached list shows it at once — the
 * previous holder losing it — rolls back if the server refuses, and refetches after.
 */
export const setAccountRoleMutation = (queryClient: QueryClient) =>
	mutationOptions({
		mutationFn: ({ id, role }: RoleChange) =>
			sendJson<RoleChange>(`/api/accounts/${encodeURIComponent(id)}`, 'PATCH', { role }),
		onMutate: async ({ id, role }) => {
			await queryClient.cancelQueries({ queryKey: accountKeys.all });
			const previous = queryClient.getQueriesData<AccountList>({ queryKey: accountKeys.all });
			// Only the active lists carry roles: the archived list and the history,
			// under the same key, are left as they are.
			queryClient.setQueriesData<AccountList>({ queryKey: accountKeys.all }, (list) =>
				list && 'balanceAt' in list
					? {
							...list,
							accounts: list.accounts.map((account) =>
								account.id === id
									? { ...account, role }
									: role !== null && account.role === role
										? { ...account, role: null }
										: account
							)
						}
					: list
			);
			return { previous };
		},
		onError: (_error, _change, snapshot) => {
			for (const [key, list] of snapshot?.previous ?? []) queryClient.setQueryData(key, list);
		},
		onSettled: () => queryClient.invalidateQueries({ queryKey: accountKeys.all })
	});

type IconChange = { id: string; icon: AccountIcon | null };

/**
 * Picks the brand icon an account wears. Every cached list shows it at once
 * and rolls back if the server refuses. Nothing else moves with an icon, so
 * nothing refetches.
 */
export const setAccountIconMutation = (queryClient: QueryClient) =>
	mutationOptions({
		mutationFn: ({ id, icon }: IconChange) =>
			sendJson<IconChange>(`/api/accounts/${encodeURIComponent(id)}`, 'PATCH', { icon }),
		onMutate: async ({ id, icon }) => {
			await queryClient.cancelQueries({ queryKey: accountKeys.all });
			const previous = queryClient.getQueriesData<AccountList>({ queryKey: accountKeys.all });
			queryClient.setQueriesData<AccountList>({ queryKey: accountKeys.all }, (list) =>
				list && 'balanceAt' in list
					? {
							...list,
							accounts: list.accounts.map((account) =>
								account.id === id ? { ...account, icon } : account
							)
						}
					: list
			);
			return { previous };
		},
		onError: (_error, _change, snapshot) => {
			for (const [key, list] of snapshot?.previous ?? []) queryClient.setQueryData(key, list);
		}
	});

/** Archived accounts, most recently changed first. Pass SvelteKit's `fetch` from a load. */
export const archivedAccountsQuery = (fetcher: Fetch = fetch) =>
	queryOptions({
		queryKey: accountKeys.archived(),
		queryFn: () => getJson<ArchivedList>('/api/accounts/archived', fetcher)
	});

/** Every active account's balance day by day over `range`. Pass SvelteKit's `fetch` from a load. */
export const balanceHistoryQuery = (range: HistoryRange, fetcher: Fetch = fetch) =>
	queryOptions({
		queryKey: accountKeys.history(range),
		queryFn: () => getJson<BalanceHistory>(`/api/accounts/history?range=${range}`, fetcher)
	});

/**
 * Everything an account write can move: every account figure, the ledger's
 * rows (they carry the account's name, and the first account's date decides
 * which card-less rows count), and the savings goal, which reads the account
 * holding the savings role.
 */
const refreshAfterWrite = (queryClient: QueryClient) =>
	Promise.all([
		queryClient.invalidateQueries({ queryKey: accountKeys.all }),
		queryClient.invalidateQueries({ queryKey: transactionKeys.all }),
		queryClient.invalidateQueries({ queryKey: savingsKeys.all })
	]);

/**
 * Adds an account. Read again rather than patched in: its balance joins the
 * total, and a role it takes leaves another account.
 */
export const addAccountMutation = (queryClient: QueryClient) =>
	mutationOptions({
		mutationFn: (draft: AccountDraft) => sendJson<{ id: string }>('/api/accounts', 'POST', draft),
		onSuccess: () => refreshAfterWrite(queryClient)
	});

/**
 * Rewrites an account whole. Nothing is guessed at here: a new balance moves
 * the total and the history, so every figure is read again.
 */
export const editAccountMutation = (queryClient: QueryClient) =>
	mutationOptions({
		mutationFn: ({ id, draft }: { id: string; draft: AccountDraft }) =>
			sendJson<{ id: string }>(`/api/accounts/${encodeURIComponent(id)}`, 'PATCH', draft),
		onSuccess: () => refreshAfterWrite(queryClient)
	});

/** Archives an account or brings it back; it moves between the active and archived lists. */
export const setAccountStatusMutation = (queryClient: QueryClient) =>
	mutationOptions({
		mutationFn: ({ id, status }: { id: string; status: AccountStatus }) =>
			sendJson<{ id: string; status: AccountStatus }>(
				`/api/accounts/${encodeURIComponent(id)}`,
				'PATCH',
				{ status }
			),
		onSettled: () => refreshAfterWrite(queryClient)
	});

/**
 * Removes an account. Not optimistic: the answer to "delete this?" is read in
 * the dialog asking it. Its transactions lose their account and its colour
 * choice is forgotten, so the colours are read again with everything else.
 */
export const deleteAccountMutation = (queryClient: QueryClient) =>
	mutationOptions({
		mutationFn: (id: string) =>
			sendJson<{ id: string }>(`/api/accounts/${encodeURIComponent(id)}`, 'DELETE', undefined),
		onSettled: () =>
			Promise.all([
				refreshAfterWrite(queryClient),
				queryClient.invalidateQueries({ queryKey: colorKeys.all })
			])
	});
