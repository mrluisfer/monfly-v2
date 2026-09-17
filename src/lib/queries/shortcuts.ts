import { mutationOptions, queryOptions, type QueryClient } from '@tanstack/svelte-query';
import type { ShortcutActivity, ShortcutId, ShortcutSource } from '$lib/shortcuts';
import { getJson, sendJson, type Fetch } from './http';

export const shortcutKeys = {
	all: ['shortcuts'] as const,
	// Its own root, so pinning — which cancels and sets `all` — leaves it be.
	activity: ['shortcut-activity'] as const
};

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

/** The last weeks of shortcut changes, for the shortcuts page's charts. Pass SvelteKit's `fetch` from a load. */
export const shortcutActivityQuery = (fetcher: Fetch = fetch) =>
	queryOptions({
		queryKey: shortcutKeys.activity,
		queryFn: () => getJson<ShortcutActivity>('/api/me/shortcuts/activity', fetcher)
	});

type Pin = { id: ShortcutId; pinned: boolean; source: ShortcutSource };

/**
 * Pins a shortcut or takes it away. The header and the list change at once and
 * go back if the server refuses; the server's answer then replaces the cache,
 * and the charts read the history again.
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
		},
		onSettled: () => queryClient.invalidateQueries({ queryKey: shortcutKeys.activity })
	});

/**
 * Arranges the pinned shortcuts, as dropping a dragged tab does. The strip is
 * already showing the new order by the time this runs — the drag put it there —
 * so the optimistic write is what keeps it from springing back for a frame; the
 * server's answer then replaces it. Arranging changes no history, so the charts
 * are left alone.
 */
export const setShortcutOrderMutation = (queryClient: QueryClient) =>
	mutationOptions({
		mutationFn: (order: ShortcutId[]) => sendJson<string[]>('/api/me/shortcuts', 'PUT', { order }),
		onMutate: async (order) => {
			await queryClient.cancelQueries({ queryKey: shortcutKeys.all });
			const previous = queryClient.getQueryData<string[]>(shortcutKeys.all);
			// Only rearranges what's pinned, as the server does: anything the drag
			// didn't know about — pinned meanwhile on another device — stays put.
			const wanted: string[] = [...order];
			queryClient.setQueryData<string[]>(shortcutKeys.all, (current = []) => [
				...wanted.filter((id) => current.includes(id)),
				...current.filter((id) => !wanted.includes(id))
			]);
			return { previous };
		},
		onError: (_error, _order, snapshot) => {
			queryClient.setQueryData(shortcutKeys.all, snapshot?.previous);
		},
		onSuccess: (pinned) => {
			queryClient.setQueryData(shortcutKeys.all, pinned);
		}
	});
