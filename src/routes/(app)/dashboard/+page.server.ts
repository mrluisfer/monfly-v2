import { LEFT_OUT_COOKIE, parseLeftOut } from '$lib/accounts-view';
import { INCOME_VIEW_COOKIE, parseIncomeView } from '$lib/income-view';
import type { PageServerLoad } from './$types';

/**
 * The Income card's period and settings as this browser saved them: they
 * decide which income the page prefetches, and how the server draws it. And
 * the accounts this browser leaves out of the total, so it's drawn without them.
 */
export const load: PageServerLoad = ({ cookies }) => ({
	incomeView: parseIncomeView(cookies.get(INCOME_VIEW_COOKIE)),
	leftOut: parseLeftOut(cookies.get(LEFT_OUT_COOKIE))
});
