import { browser } from '$app/environment';
import { QueryClient } from '@tanstack/svelte-query';
import { ApiError, shortcutKeys } from '$lib/queries';
import { DEFAULT_SHORTCUTS } from '$lib/shortcuts';
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
				// Once, and never for a 4xx: retrying can't fix those.
				retry: (failures, error) =>
					failures < 1 && !(error instanceof ApiError && error.status < 500)
			}
		}
	});

	// The header's shortcuts come with the profile, so the shell draws them on
	// the server without a request of its own.
	if (data.profile) {
		queryClient.setQueryData(shortcutKeys.all, data.profile.shortcuts ?? [...DEFAULT_SHORTCUTS]);
	}

	return { ...data, queryClient };
};
