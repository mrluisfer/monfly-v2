import type { Cents, Currency } from './finance/money';
import type { MonthKey } from './finance/period';

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
};

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
};

/** The most rows one response carries. */
export const MAX_TRANSACTIONS = 2000;
