import { currentMonth, isMonthKey, type MonthKey } from '$lib/finance';
import { budgetMonthQuery, colorChoicesQuery } from '$lib/queries';
import type { PageLoad } from './$types';

/**
 * Prefetches the month the address names — this one when it names none, or
 * one still to come — with SvelteKit's `fetch`, so the server draws every
 * card with real figures and hydration reuses them. A new Auth0 user has no
 * account row yet: nothing to read.
 */
export const load: PageLoad = async ({ parent, fetch, url }) => {
	const { queryClient, profile, timeZone } = await parent();
	const latest = currentMonth(timeZone);
	const asked = url.searchParams.get('month') ?? '';
	const month: MonthKey = isMonthKey(asked) && asked <= latest ? asked : latest;

	if (profile) {
		await Promise.all([
			queryClient.prefetchQuery(budgetMonthQuery(month, fetch)),
			queryClient.prefetchQuery(colorChoicesQuery(fetch))
		]);
	}
	return { latest };
};
