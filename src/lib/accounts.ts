import { assignColors } from './colors';
import type { PaletteColor } from './components/ui/palette';
import type { Cents, Currency } from './finance/money';
import type { MonthKey } from './finance/period';

/**
 * Accounts are v1's `Card` rows. Two of them are featured on the dashboard:
 * the one the person marked "main", the one marked "secondary" — or, where a
 * role is unset, the oldest remaining accounts in the order they were added.
 * A third role stands apart: "savings" is the account the savings goal reads
 * its running total from. At most one account holds each role.
 */
export const ACCOUNT_ROLES = ['main', 'secondary', 'savings'] as const;
export type AccountRole = (typeof ACCOUNT_ROLES)[number];

export const isAccountRole = (value: unknown): value is AccountRole =>
	ACCOUNT_ROLES.includes(value as AccountRole);

/** An account and its figures, as `GET /api/accounts` returns it. */
export type Account = {
	id: string;
	name: string;
	role: AccountRole | null;
	/**
	 * v1's card details, each optional in its card form and null where left
	 * blank: who issues it ("BBVA", "Visa"), its last four digits, and its kind
	 * (v1's `CARD_TYPES`).
	 */
	provider: string | null;
	last4: string | null;
	type: string | null;
	/** Its balance now, or when the month ended — see `AccountList.balanceAt`. */
	balance: Cents;
	/** Spent on it in `AccountList.month`, in the viewer's time zone. */
	tracked: Cents;
	/** Its net movement in `AccountList.month`: income on it minus spending on it. */
	change: Cents;
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

/** Card-less transactions going one way: how many, and their sum. */
export type Flow = { count: number; amount: Cents };

/**
 * What v1's total balance holds that no active account does. v1 shows
 * `User.totalBalance` as the total and moves it with every transaction, but
 * moves an account's balance only for the transactions on it — so money that
 * moved with no account (`cardId` never set, or cleared when its account was
 * deleted) lives in the total alone. So does a total typed in by hand on v1's
 * profile page. Card-less transactions dated before the first account was
 * added aren't among its parts: the balance that account was opened with
 * already held them.
 */
export type Unassigned = {
	/**
	 * v1's total minus the active accounts' balances, under the same cutoff —
	 * see `AccountList.balanceAt`. With them, it adds up to v1's figure exactly.
	 */
	balance: Cents;
	/** Card-less spending in `AccountList.month`, in the viewer's time zone. */
	tracked: Cents;
	/** Net card-less movement in `AccountList.month`. */
	change: Cents;
	/** Card-less income since the first account, under the cutoff. */
	income: Flow;
	/** Card-less spending since the first account, under the cutoff. */
	expense: Flow;
	/**
	 * The rest of `balance`, with no transaction behind it: a total set by
	 * hand in v1, or history the accounts never absorbed. Usually 0.
	 */
	other: Cents;
	/** Card-less transactions dated before the first account — already in its opening balance. */
	beforeAccounts: number;
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
	/** What the total holds beyond the accounts, or null when they add up to it. */
	unassigned: Unassigned | null;
};

/** The dashboard's pair: main and secondary where set, the oldest remaining accounts otherwise. */
export function featuredAccounts<T extends { role: AccountRole | null }>(accounts: T[]): T[] {
	const main = accounts.find((a) => a.role === 'main');
	const secondary = accounts.find((a) => a.role === 'secondary');
	// The savings account is shown by the savings goal, so it never stands in
	// for an unset slot here — it would be drawn twice.
	const rest = accounts.filter((a) => a !== main && a !== secondary && a.role !== 'savings');
	return [main ?? rest.shift(), secondary ?? rest.shift()].filter((a): a is T => a !== undefined);
}

/** Account colours by rank, for any without a choice of its own: main starts lime, secondary blue. */
export const ACCOUNT_COLORS: PaletteColor[] = ['lime', 'blue', 'violet', 'sky', 'peach', 'mint'];

/**
 * Each account's one colour, by id — its orb, sparkle, slice and picker dot:
 * the person's choice (`User.colors.account`), else the defaults in rank
 * order, featured accounts first so main and secondary take lime and blue.
 */
export function accountColors<T extends { id: string; role: AccountRole | null }>(
	accounts: T[],
	chosen?: Record<string, PaletteColor>
): Record<string, PaletteColor> {
	const featured = featuredAccounts(accounts);
	const ordered = [...featured, ...accounts.filter((a) => !featured.includes(a))];
	const palette = assignColors(
		ordered.map((a) => a.id),
		chosen,
		ACCOUNT_COLORS
	);
	return Object.fromEntries(ordered.map((a, i) => [a.id, palette[i]]));
}
