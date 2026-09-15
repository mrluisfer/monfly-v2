import { mutationOptions, queryOptions, type QueryClient } from '@tanstack/svelte-query';
import type { ShortcutId } from '$lib/shortcuts';
import { getJson, sendJson, type Fetch } from './http';

export const shortcutKeys = { all: ['shortcuts'] as const };

/**
 * The shortcuts pinned to the header, by id. The app layout seeds it from the
 * session's profile, so the header draws on the server; after that it goes
 * stale and refetches like any query, which is how a change made on another
 * device arrives.
 */
export const shortcutsQuery = (fetcher: Fetch = fetch) =>
	queryOptions({
		queryKey: shortcutKeys.all,
		queryFn: () => getJson<string[]>('/api/me/shortcuts', fetcher)
	});

type Pin = { id: ShortcutId; pinned: boolean };

/**
 * Pins a shortcut or takes it away. The header and the list change at once and
 * go back if the server refuses; the server's answer then replaces the cache.
 */
export const setShortcutMutation = (queryClient: QueryClient) =>
	mutationOptions({
		mutationFn: (pin: Pin) => sendJson<string[]>('/api/me/shortcuts', 'PATCH', pin),
		onMutate: async ({ id, pinned }) => {
			await queryClient.cancelQueries({ queryKey: shortcutKeys.all });
			const previous = queryClient.getQueryData<string[]>(shortcutKeys.all);
			queryClient.setQueryData<string[]>(shortcutKeys.all, (current = []) =>
				pinned
					? current.includes(id)
						? current
						: [...current, id]
					: current.filter((pinnedId) => pinnedId !== id)
			);
			return { previous };
		},
		onError: (_error, _pin, snapshot) => {
			queryClient.setQueryData(shortcutKeys.all, snapshot?.previous);
		},
		onSuccess: (pinned) => {
			queryClient.setQueryData(shortcutKeys.all, pinned);
		}
	});
