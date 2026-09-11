import type { Cents, Currency } from './finance/money';

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
