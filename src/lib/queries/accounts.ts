import { mutationOptions, queryOptions, type QueryClient } from '@tanstack/svelte-query';
import type { AccountList, AccountRole } from '$lib/accounts';
import type { MonthKey } from '$lib/finance';
import { getJson, sendJson, type Fetch } from './http';

/** After any transaction or account write, invalidate `accountKeys.all` — every month's list. */
export const accountKeys = {
	all: ['accounts'] as const,
	list: (month?: MonthKey) => [...accountKeys.all, month ?? 'now'] as const
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
			queryClient.setQueriesData<AccountList>(
				{ queryKey: accountKeys.all },
				(list) =>
					list && {
						...list,
						accounts: list.accounts.map((account) =>
							account.id === id
								? { ...account, role }
								: role !== null && account.role === role
									? { ...account, role: null }
									: account
						)
					}
			);
			return { previous };
		},
		onError: (_error, _change, snapshot) => {
			for (const [key, list] of snapshot?.previous ?? []) queryClient.setQueryData(key, list);
		},
		onSettled: () => queryClient.invalidateQueries({ queryKey: accountKeys.all })
	});
