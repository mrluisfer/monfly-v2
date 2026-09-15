import type { LedgerFilter } from './components/transactions/LedgerFilters.svelte';
import type { Kind } from './components/transactions/LedgerTools.svelte';
import { isDateKey, isMonthKey, parseMoney, type MonthKey } from './finance';

/**
 * What the Transactions page narrows its ledger by, said in the page's
 * address, so a link can open the ledger already narrowed — an account's
 * rows, from its block on the dashboard — and a reload keeps what was picked.
 * Why the address, and what stays out of it:
 * docs/decisions/0012-ledger-filters-in-the-address.md.
 *
 *     /transactions?month=2026-09&type=expense&q=uber
 *       &account=<Card.id>&account=none&category=Groceries
 *       &from=2026-09-01&to=2026-09-15&min=100&max=1,200
 *
 * Every parameter is optional and a default is left out; a list repeats its
 * key, once per pick. A value that doesn't read is dropped rather than
 * refused: the ledger opens on the rest.
 */
export type LedgerView = {
	/** The period: the whole record, or one month. */
	month: 'all' | MonthKey;
	kind: Kind;
	/** What the search holds. */
	search: string;
	filter: LedgerFilter;
};

/** The view an address asks for. `latest` is this month: the ledger can't open on a later one. */
export function readLedgerView(params: URLSearchParams, latest: MonthKey): LedgerView {
	const month = params.get('month') ?? '';
	const type = params.get('type');
	const day = (key: string) => {
		const value = params.get(key);
		return isDateKey(value) ? value : '';
	};
	const money = (key: string) => {
		const value = params.get(key) ?? '';
		return parseMoney(value) === null ? '' : value;
	};
	return {
		month: isMonthKey(month) && month <= latest ? month : 'all',
		kind: type === 'income' || type === 'expense' ? type : 'all',
		search: params.get('q') ?? '',
		filter: {
			// A pick named twice is still one pick.
			accounts: [...new Set(params.getAll('account'))],
			categories: [...new Set(params.getAll('category'))],
			from: day('from'),
			to: day('to'),
			min: money('min'),
			max: money('max')
		}
	};
}

/** The address's query for a view — `?account=…` — or `''` when nothing narrows it. */
export function ledgerSearch(view: LedgerView): string {
	const params = new URLSearchParams();
	if (view.month !== 'all') params.set('month', view.month);
	if (view.kind !== 'all') params.set('type', view.kind);
	if (view.search !== '') params.set('q', view.search);
	for (const id of view.filter.accounts) params.append('account', id);
	for (const name of view.filter.categories) params.append('category', name);
	for (const key of ['from', 'to', 'min', 'max'] as const) {
		if (view.filter[key] !== '') params.set(key, view.filter[key]);
	}
	const query = params.toString();
	return query === '' ? '' : `?${query}`;
}

/** The ledger narrowed to one account's rows, for a link from wherever the account is shown. */
export const accountLedgerHref = (id: string) =>
	`/transactions?${new URLSearchParams({ account: id })}`;
