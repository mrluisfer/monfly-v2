import { browser } from '$app/environment';
import { QueryClient } from '@tanstack/svelte-query';
import type { LayoutLoad } from './$types';

/**
 * A fresh QueryClient per request. Never hoist this to module scope — on the
 * server that would share one cache across every visitor.
 */
export const load: LayoutLoad = async () => {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				enabled: browser,
				staleTime: 60 * 1000,
				retry: 1
			}
		}
	});

	return { queryClient };
};
