import { mutationOptions, queryOptions, type QueryClient } from '@tanstack/svelte-query';
import type { ColorChoices, ColorKind } from '$lib/colors';
import type { PaletteColor } from '$lib/components/ui';
import { getJson, sendJson, type Fetch } from './http';

export const colorKeys = { all: ['colors'] as const };

/** The colours the person has picked. Pass SvelteKit's `fetch` from a load. */
export const colorChoicesQuery = (fetcher: Fetch = fetch) =>
	queryOptions({
		queryKey: colorKeys.all,
		queryFn: () => getJson<ColorChoices>('/api/me/colors', fetcher)
	});

type Choice = { kind: ColorKind; key: string; color: PaletteColor | null };

/**
 * Picks a colour. The choice shows at once and rolls back if the server
 * refuses it; the server's answer then replaces the cache.
 */
export const setColorMutation = (queryClient: QueryClient) =>
	mutationOptions({
		mutationFn: (choice: Choice) => sendJson<ColorChoices>('/api/me/colors', 'PATCH', choice),
		onMutate: async ({ kind, key, color }) => {
			await queryClient.cancelQueries({ queryKey: colorKeys.all });
			const previous = queryClient.getQueryData<ColorChoices>(colorKeys.all);
			queryClient.setQueryData<ColorChoices>(colorKeys.all, (current = {}) => {
				const group = { ...current[kind] };
				if (color === null) delete group[key];
				else group[key] = color;
				return { ...current, [kind]: group };
			});
			return { previous };
		},
		onError: (_error, _choice, snapshot) => {
			queryClient.setQueryData(colorKeys.all, snapshot?.previous);
		},
		onSuccess: (choices) => {
			queryClient.setQueryData(colorKeys.all, choices);
		}
	});
