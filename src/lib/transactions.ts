import type { Cents, Currency } from './finance/money';
import { isDateKey, isTimeKey, type DateKey, type MonthKey, type TimeKey } from './finance/period';

/**
 * A transaction v1 recorded with no account (`cardId` null), as
 * `GET /api/transactions/unassigned` returns it.
 */
export type UnassignedTransaction = {
	id: string;
	/** When it happened: ISO 8601, UTC, as stored. */
	date: string;
	/** v1's rule: income adds to a balance, anything else takes from it. */
	type: 'income' | 'expense';
	/** Always positive, as stored; `type` gives the direction. */
	amount: Cents;
	category: string;
	description: string | null;
	/**
	 * Dated before the first account was added: the balance it was opened with
	 * already holds it, so giving it an account moves no balance.
	 */
	beforeAccounts: boolean;
};

export type UnassignedList = {
	currency: Currency;
	/** Newest first. */
	transactions: UnassignedTransaction[];
};

/** `POST /api/transactions/unassigned`: give these transactions this account. */
export type AssignAccount = { ids: string[]; accountId: string };

export type AssignResult = {
	/** How many got the account — fewer than asked when some already had one. */
	assigned: number;
	/** What moved into the account's balance: those dated since the first account, signed. */
	moved: Cents;
};

/** The most transactions one request may assign. */
export const MAX_ASSIGN = 500;

/** A transaction's amount, signed the way it moves a balance. */
export const signedAmount = ({
	type,
	amount
}: Pick<UnassignedTransaction, 'type' | 'amount'>): Cents => (type === 'income' ? amount : -amount);

/** One transaction as `GET /api/transactions` returns it. */
export type TransactionRow = {
	id: string;
	/** When it happened: ISO 8601, UTC, as stored. */
	date: string;
	/** v1's rule: income adds to a balance, anything else takes from it. */
	type: 'income' | 'expense';
	/** Always positive, as stored; `type` gives the direction. */
	amount: Cents;
	category: string;
	description: string | null;
	/** The account it was recorded on, or null while it has none. */
	account: { id: string; name: string } | null;
	/**
	 * It pays off a loan, or a loan was opened from it. A loan has rules of its
	 * own — how much is paid, whether it's settled — so the ledger reads these
	 * rows but leaves changing them to the loan (`/api/loans`).
	 */
	loanLinked: boolean;
	/**
	 * One side of a transfer between two of the user's accounts, or null for
	 * an ordinary transaction. Both sides carry the same `id` and name the same
	 * two accounts, so either one reads as the whole move — each null where
	 * that account is gone or archived. Neither side is income or spending.
	 */
	transfer: { id: string; from: AccountRef | null; to: AccountRef | null } | null;
};

/** An account as a row names it. */
type AccountRef = { id: string; name: string };

/**
 * Every transaction on record, newest first. A person has a few hundred, so
 * the whole list travels once and the table sorts, filters and pages it in the
 * browser, where those are instant. `capped` says `MAX_TRANSACTIONS` was
 * reached and the view is partial — the point at which paging belongs on the
 * server instead.
 */
export type TransactionList = {
	currency: Currency;
	/** The month the rows cover, or null when they are the whole record. */
	month: MonthKey | null;
	transactions: TransactionRow[];
	capped: boolean;
	/**
	 * Everything on record, whatever `month` the rows cover. The headline
	 * figures never narrow with the list: "spent this month" is the
	 * dashboard's question, not this page's.
	 */
	totals: { received: Cents; spent: Cents; count: number };
	/** The earliest transaction's date, whatever the rows cover: where the months to pick begin. Null with none. */
	oldest: string | null;
};

/** The most rows one response carries. */
export const MAX_TRANSACTIONS = 2000;

/**
 * What the ledger may change about a transaction — `PATCH /api/transactions/[id]`.
 * The account isn't here: giving a card-less transaction one is its own
 * endpoint, and the only one that knows the rule about the balance an account
 * was opened with (`POST /api/transactions/unassigned`).
 */
export type TransactionEdit = {
	amount: Cents;
	type: 'income' | 'expense';
	category: string;
	description: string | null;
	/** The day it happened, `YYYY-MM-DD`, as the viewer's zone reads it. */
	date: DateKey;
	/** The time it happened that day, `HH:MM`, in the viewer's zone. */
	time: TimeKey;
};

/** The most a transaction may be: v1's form stops a cent short of a million. */
export const MAX_AMOUNT: Cents = 99_999_999;
/** Categories and notes are free text; these only keep a request sane. */
export const MAX_CATEGORY = 120;
export const MAX_DESCRIPTION = 1000;

/** An amount as the ledger accepts it: whole cents, more than nothing, under the cap. */
export const isAmount = (value: unknown): value is Cents =>
	typeof value === 'number' && Number.isInteger(value) && value > 0 && value <= MAX_AMOUNT;

/**
 * A complete edit, as the endpoint takes it. `today` refuses a day that hasn't
 * come; a time later than now on today is the field's to catch, since a
 * browser's clock can run a minute ahead of the server's.
 */
export function isTransactionEdit(value: unknown, today: DateKey): value is TransactionEdit {
	if (typeof value !== 'object' || value === null) return false;
	const { amount, type, category, description, date, time } = value as Record<string, unknown>;
	return (
		isAmount(amount) &&
		(type === 'income' || type === 'expense') &&
		typeof category === 'string' &&
		category.trim().length > 0 &&
		category.length <= MAX_CATEGORY &&
		(description === null ||
			(typeof description === 'string' && description.length <= MAX_DESCRIPTION)) &&
		isDateKey(date) &&
		date <= today &&
		isTimeKey(time)
	);
}

/**
 * `POST /api/transactions`: one written from scratch. The account is part of it
 * here — a row written now was in no account's opening balance, so naming one
 * moves that balance — while changing an existing row's account stays the
 * unassigned endpoint's.
 */
export type TransactionNew = TransactionEdit & { accountId: string | null };

/** A complete new transaction, as the endpoint takes it. */
export function isTransactionNew(value: unknown, today: DateKey): value is TransactionNew {
	if (!isTransactionEdit(value, today)) return false;
	const { accountId } = value as Record<string, unknown>;
	return (
		accountId === null ||
		(typeof accountId === 'string' && accountId.length > 0 && accountId.length <= 64)
	);
}

/**
 * `POST /api/transfers`, and `PATCH /api/transfers/[id]`: money moved from one
 * of the user's active accounts to another. It is written as two
 * transactions — money out of `from`, money in to `to` — so v1 and every
 * balance read them as they read anything else, while the total stays put.
 */
export type TransferEntry = {
	amount: Cents;
	/** The account the money leaves. */
	from: string;
	/** The account it lands in: never `from`. */
	to: string;
	description: string | null;
	/** The day it moved, `YYYY-MM-DD`, as the viewer's zone reads it. */
	date: DateKey;
	/** The time it moved that day, `HH:MM`, in the viewer's zone. */
	time: TimeKey;
};

/** What every transfer is filed under, on both sides: `$lib/categories` draws it as a transfer. */
export const TRANSFER_CATEGORY = 'Transfer';

const isAccountId = (value: unknown): value is string =>
	typeof value === 'string' && value.length > 0 && value.length <= 64;

/** A complete transfer, as the endpoints take it. `today` refuses a day that hasn't come, as an edit's does. */
export function isTransferEntry(value: unknown, today: DateKey): value is TransferEntry {
	if (typeof value !== 'object' || value === null) return false;
	const { amount, from, to, description, date, time } = value as Record<string, unknown>;
	return (
		isAmount(amount) &&
		isAccountId(from) &&
		isAccountId(to) &&
		from !== to &&
		(description === null ||
			(typeof description === 'string' && description.length <= MAX_DESCRIPTION)) &&
		isDateKey(date) &&
		date <= today &&
		isTimeKey(time)
	);
}
