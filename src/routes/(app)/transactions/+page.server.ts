import { LEFT_OUT_COOKIE, parseLeftOut } from '$lib/accounts-view';
import type { PageServerLoad } from './$types';

/**
 * The accounts this browser leaves out of the total balance, so the figure in
 * the hero is rendered without them — the same cookie the dashboard reads, so
 * the total says the same thing on both pages.
 */
export const load: PageServerLoad = ({ cookies }) => ({
	leftOut: parseLeftOut(cookies.get(LEFT_OUT_COOKIE))
});
