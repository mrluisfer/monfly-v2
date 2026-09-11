import { INCOME_VIEW_COOKIE, parseIncomeView } from '$lib/income-view';
import type { PageServerLoad } from './$types';

/**
 * The Income card's settings as this browser saved them: they decide which
 * income the page prefetches, and how the server draws it.
 */
export const load: PageServerLoad = ({ cookies }) => ({
	incomeView: parseIncomeView(cookies.get(INCOME_VIEW_COOKIE))
});
