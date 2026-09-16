import type { AccountIcon } from './account-icons';
import { assignColors } from './colors';
import type { PaletteColor } from './components/ui/palette';
import type { Cents, Currency } from './finance/money';
import type { DateKey, MonthKey } from './finance/period';

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
	/** The brand icon picked for it, or null to read one from its name (`accountIcon`). */
	icon: AccountIcon | null;
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
	/**
	 * Spent on it in `AccountList.month`, in the viewer's time zone — not what
	 * was moved to another of their accounts: that's `moved`.
	 */
	tracked: Cents;
	/** Its net movement in `AccountList.month`: everything in minus everything out, transfers too. */
	change: Cents;
	/**
	 * The part of `change` that was money moved between their own accounts in
	 * `AccountList.month`, signed: negative when more left for another account
	 * than arrived from one. Income on it is `change - moved + tracked`.
	 */
	moved: Cents;
	/**
	 * Entries waiting on the person — for now, its transactions with no
	 * description. A detailed review view will define this properly.
	 */
	toReview: number;
	/** The last time it changed: its own edits or a transaction on it. ISO 8601. */
	updatedAt: string;
	/** When it was added. ISO 8601. */
	createdAt: string;
	/** False when it was added after the month asked for had ended: it had no balance then. */
	existed: boolean;
};

/** v1's kinds of account (`CARD_TYPES`), in its order. */
export const ACCOUNT_KINDS = ['debit', 'credit', 'cash', 'other'] as const;
export type AccountKind = (typeof ACCOUNT_KINDS)[number];

export const ACCOUNT_KIND_LABEL: Record<AccountKind, string> = {
	debit: 'Debit',
	credit: 'Credit',
	cash: 'Cash',
	other: 'Other'
};

export const isAccountKind = (value: unknown): value is AccountKind =>
	ACCOUNT_KINDS.includes(value as AccountKind);

/** v1 stores the kind as free text: its own label where it's one of v1's, the text as written otherwise. */
export const kindLabel = (type: string | null) =>
	type === null ? null : isAccountKind(type) ? ACCOUNT_KIND_LABEL[type] : type;

/** v1's bounds (`CardFormSchema`), so an account written here still fits v1's form. */
export const MAX_ACCOUNT_NAME = 60;
export const MAX_PROVIDER = 60;
/** The most a balance can be set to either way: 99,999,999.99. */
export const MAX_BALANCE: Cents = 9_999_999_999;

const LAST4 = /^\d{4}$/;

/**
 * An account as a person writes it: `POST /api/accounts` takes it to add one,
 * and `PATCH /api/accounts/[id]` takes it whole to rewrite one. A new balance
 * on an existing account is a correction — see `BalanceHistory`.
 */
export type AccountDraft = {
	name: string;
	type: AccountKind | null;
	provider: string | null;
	last4: string | null;
	/** Signed: what it holds, or below zero for what it owes. */
	balance: Cents;
	role: AccountRole | null;
};

/** A complete draft, as the endpoints take it. The fields check the same bounds first. */
export function isAccountDraft(value: unknown): value is AccountDraft {
	if (typeof value !== 'object' || value === null) return false;
	const { name, type, provider, last4, balance, role } = value as Record<string, unknown>;
	return (
		typeof name === 'string' &&
		name.trim().length > 0 &&
		name.length <= MAX_ACCOUNT_NAME &&
		(type === null || isAccountKind(type)) &&
		(provider === null || (typeof provider === 'string' && provider.length <= MAX_PROVIDER)) &&
		(last4 === null || (typeof last4 === 'string' && LAST4.test(last4))) &&
		typeof balance === 'number' &&
		Number.isInteger(balance) &&
		Math.abs(balance) <= MAX_BALANCE &&
		(role === null || isAccountRole(role))
	);
}

/** Active accounts are drawn everywhere; archived ones only on the accounts page, to restore or delete. */
export const ACCOUNT_STATUSES = ['active', 'archived'] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export const isAccountStatus = (value: unknown): value is AccountStatus =>
	ACCOUNT_STATUSES.includes(value as AccountStatus);

/** An archived account, as `GET /api/accounts/archived` returns it: its balance as it was left. */
export type ArchivedAccount = Pick<
	Account,
	'id' | 'name' | 'provider' | 'last4' | 'type' | 'balance' | 'updatedAt' | 'createdAt'
>;

export type ArchivedList = {
	currency: Currency;
	/** Most recently changed first. */
	accounts: ArchivedAccount[];
};

/** How far back the balance chart reaches. */
export const HISTORY_RANGES = ['1m', '3m', '6m', '1y', 'all'] as const;
export type HistoryRange = (typeof HISTORY_RANGES)[number];

export const HISTORY_RANGE_LABEL: Record<HistoryRange, string> = {
	'1m': '1M',
	'3m': '3M',
	'6m': '6M',
	'1y': '1Y',
	all: 'All'
};

/** What a range covers, as it reads in a sentence: "over the last 3 months". */
export const HISTORY_RANGE_SPAN: Record<HistoryRange, string> = {
	'1m': 'the last month',
	'3m': 'the last 3 months',
	'6m': 'the last 6 months',
	'1y': 'the last year',
	all: 'since your first account'
};

/** Where the chart opens. */
export const DEFAULT_HISTORY_RANGE: HistoryRange = '3m';

export const isHistoryRange = (value: unknown): value is HistoryRange =>
	HISTORY_RANGES.includes(value as HistoryRange);

/** The most points a range is drawn with; a longer one takes a point every few days. */
export const MAX_HISTORY_POINTS = 60;

/** Something that happened to an account, pinned under the chart on its day. */
export type BalanceEvent = {
	day: DateKey;
	accountId: string;
	/** `opened`: it was added. `corrected`: its balance was set by hand, from v2. */
	kind: 'opened' | 'corrected';
	/** What a correction moved the balance by, signed; null for an opening. */
	amount: Cents | null;
};

/**
 * `GET /api/accounts/history?range=`: every active account's balance at the
 * end of each point's day, in the viewer's zone. A balance is wound back from
 * today's by the transactions dated after that day and the corrections made
 * after it (`BalanceAdjustment`, written by v2 whenever a balance is set by
 * hand). v1's hand edits left no record, so they count as if they had always
 * been there, as `AccountList.balanceAt` does.
 */
export type BalanceHistory = {
	currency: Currency;
	range: HistoryRange;
	/** Oldest first, evenly spaced, and always ending today. */
	days: DateKey[];
	/** Active accounts, oldest first. Balances line up with `days`; null before the account was added. */
	series: { id: string; balances: (Cents | null)[] }[];
	/** Openings and corrections within `days`, oldest first. */
	events: BalanceEvent[];
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

/** The accounts page with one account open in its panel (`?account=`). */
export const accountPageHref = (id: string) => `/cards?${new URLSearchParams({ account: id })}`;

/** Where an account stands: the role it holds, or the dashboard slot it fills by default, unchosen. */
export type AccountPlace = { role: AccountRole; chosen: boolean };

/**
 * An account's place: the role it holds, chosen — or, holding none, the slot
 * `featuredAccounts` hands it on the dashboard, which nobody chose and which
 * choosing another account for it takes away. Null when it has no place at all.
 */
export function accountPlace<T extends { id: string; role: AccountRole | null }>(
	account: T,
	accounts: T[]
): AccountPlace | null {
	if (account.role) return { role: account.role, chosen: true };
	const slot = featuredAccounts(accounts).findIndex((a) => a.id === account.id);
	// Slots fill in order, so an unchosen account in front holds main's.
	return slot === -1 ? null : { role: slot === 0 ? 'main' : 'secondary', chosen: false };
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
