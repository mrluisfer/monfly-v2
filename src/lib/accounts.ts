import type { Cents, Currency } from './finance/money';
import type { MonthKey } from './finance/period';

/**
 * Accounts are v1's `Card` rows. Two of them are featured on the dashboard:
 * the one the person marked "main", the one marked "secondary" — or, where a
 * role is unset, the oldest remaining accounts in the order they were added.
 */
export const ACCOUNT_ROLES = ['main', 'secondary'] as const;
export type AccountRole = (typeof ACCOUNT_ROLES)[number];

export const isAccountRole = (value: unknown): value is AccountRole =>
	ACCOUNT_ROLES.includes(value as AccountRole);

/** An account and its figures, as `GET /api/accounts` returns it. */
export type Account = {
	id: string;
	name: string;
	role: AccountRole | null;
	/** Its balance now, or when the month ended — see `AccountList.balanceAt`. */
	balance: Cents;
	/** Spent on it in `AccountList.month`, in the viewer's time zone. */
	tracked: Cents;
	/**
	 * Entries waiting on the person — for now, its transactions with no
	 * description. A detailed review view will define this properly.
	 */
	toReview: number;
	/** The last time it changed: its own edits or a transaction on it. ISO 8601. */
	updatedAt: string;
	/** False when it was added after the month asked for had ended: it had no balance then. */
	existed: boolean;
};

export type AccountList = {
	currency: Currency;
	/** The month "tracked" covers. */
	month: MonthKey;
	/**
	 * `now`: the card's running balance, as v1 keeps it. `month-end`: its
	 * balance when `month` ended — today's, minus every transaction on it
	 * dated after. Manual balance edits in v1 have no history, so they count
	 * as if they had always been there.
	 */
	balanceAt: 'now' | 'month-end';
	/** Active accounts, oldest first. */
	accounts: Account[];
};

/** The dashboard's pair: main and secondary where set, the oldest remaining accounts otherwise. */
export function featuredAccounts<T extends { role: AccountRole | null }>(accounts: T[]): T[] {
	const main = accounts.find((a) => a.role === 'main');
	const secondary = accounts.find((a) => a.role === 'secondary');
	const rest = accounts.filter((a) => a !== main && a !== secondary);
	return [main ?? rest.shift(), secondary ?? rest.shift()].filter((a): a is T => a !== undefined);
}
