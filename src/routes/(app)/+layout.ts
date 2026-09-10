import { browser } from '$app/environment';
import { QueryClient } from '@tanstack/svelte-query';
import type { LayoutLoad } from './$types';

/**
 * A fresh QueryClient per request. Never hoist this to module scope — on the
 * server that would share one cache across every visitor.
 *
 * Lives in (app), not the root, so the landing never ships TanStack Query.
 * `data` is the server load's result and must be passed through: a universal
 * load replaces what the server load returned instead of merging with it.
 */
export const load: LayoutLoad = async ({ data }) => {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				enabled: browser,
				staleTime: 60 * 1000,
				retry: 1
			}
		}
	});

	return { ...data, queryClient };
};
