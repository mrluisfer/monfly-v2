import type { Cents, Currency } from './finance/money';
import { isDateKey, isTimeKey, type DateKey, type TimeKey } from './finance/period';
import { MAX_AMOUNT, MAX_DESCRIPTION } from './transactions';

/**
 * Money lent and borrowed between the user and the people in their life — v1's
 * `Loan` table, read and written with v1's rules so the two apps agree on
 * every figure while they share the database.
 */

/** Which way the money went: lent out (it's owed to them), or borrowed (they owe it). */
export const LOAN_DIRECTIONS = ['lent', 'borrowed'] as const;
export type LoanDirection = (typeof LOAN_DIRECTIONS)[number];

export const isLoanDirection = (value: unknown): value is LoanDirection =>
	LOAN_DIRECTIONS.includes(value as LoanDirection);

/** How the page names each side, from the user's seat. */
export const LOAN_DIRECTION_LABEL: Record<LoanDirection, string> = {
	lent: 'Owed to you',
	borrowed: 'You owe'
};

/** v1's three, and always derived from what's paid: nothing, some of it, all of it. */
export const LOAN_STATUSES = ['pending', 'partial', 'paid'] as const;
export type LoanStatus = (typeof LOAN_STATUSES)[number];

export const LOAN_STATUS_LABEL: Record<LoanStatus, string> = {
	pending: 'Nothing back yet',
	partial: 'Partly settled',
	paid: 'Settled'
};

/** v1's rule, which its every write applies: the status follows the amount paid. */
export const loanStatus = (amount: Cents, paid: Cents): LoanStatus =>
	paid <= 0 ? 'pending' : paid >= amount ? 'paid' : 'partial';

/** A payment recorded on one of their accounts: a transaction applied to the loan. */
export type LoanPayment = {
	id: string;
	/** When it happened: ISO 8601, UTC, as stored. */
	date: string;
	amount: Cents;
	/** The account it moved, or null while it has none. */
	account: { id: string; name: string } | null;
	description: string | null;
};

/** One loan as `GET /api/loans` returns it. */
export type Loan = {
	id: string;
	direction: LoanDirection;
	/**
	 * The other person: who owes the money, or who it's owed to — v1's
	 * `debtor`, whichever way the loan runs.
	 */
	person: string;
	amount: Cents;
	/**
	 * How much of it is settled: v1's `amountPaid`. Payments recorded on an
	 * account are part of it, and so is anything settled without one — v1's
	 * quick payments and "mark as paid" never wrote a transaction.
	 */
	paid: Cents;
	status: LoanStatus;
	/** The days it was made, falls due and was settled, as calendar days. */
	issuedOn: DateKey;
	dueOn: DateKey | null;
	paidOn: DateKey | null;
	notes: string | null;
	/** Payments recorded on their accounts, newest first. */
	payments: LoanPayment[];
};

export type LoanList = { currency: Currency; loans: Loan[] };

/** The person's name and the note: v1's limits. */
export const MAX_PERSON = 120;
export const MAX_NOTES = 500;
/** v1 set no ceiling on a loan; this one only keeps a request sane — an account balance's. */
export const MAX_LOAN: Cents = 9_999_999_999;

/** What's still to settle. */
export const loanLeft = (loan: Pick<Loan, 'amount' | 'paid'>): Cents =>
	Math.max(0, loan.amount - loan.paid);

/** What's settled without a payment on record: v1's quick payments, or marked as paid. */
export const settledOffRecord = (loan: Pick<Loan, 'paid' | 'payments'>): Cents =>
	Math.max(0, loan.paid - loan.payments.reduce((sum, p) => sum + p.amount, 0));

/** Days from one calendar day to another: `daysBetween('2026-09-01', '2026-09-03')` → 2. */
export function daysBetween(from: DateKey, to: DateKey): number {
	const day = (key: DateKey) => {
		const [y, m, d] = key.split('-').map(Number);
		return Date.UTC(y, m - 1, d) / 86_400_000;
	};
	return Math.round(day(to) - day(from));
}

/** Due within this many days reads as "soon". */
export const DUE_SOON_DAYS = 7;

/** Where an open loan stands against its due day. */
export type LoanDue =
	| { kind: 'settled' }
	| { kind: 'open' }
	| { kind: 'overdue'; days: number }
	| { kind: 'today' }
	| { kind: 'soon'; days: number }
	| { kind: 'later'; days: number };

export function loanDue(loan: Pick<Loan, 'status' | 'dueOn'>, today: DateKey): LoanDue {
	if (loan.status === 'paid') return { kind: 'settled' };
	if (!loan.dueOn) return { kind: 'open' };
	const days = daysBetween(today, loan.dueOn);
	if (days < 0) return { kind: 'overdue', days: -days };
	if (days === 0) return { kind: 'today' };
	return days <= DUE_SOON_DAYS ? { kind: 'soon', days } : { kind: 'later', days };
}

/** The due state in a few words: "3 days late", "Due today", "Due in 5 days". */
export function dueLabel(due: LoanDue, dueOn: DateKey | null): string {
	const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
	switch (due.kind) {
		case 'settled':
			return 'Settled';
		case 'open':
			return 'No due date';
		case 'overdue':
			return `${plural(due.days, 'day')} late`;
		case 'today':
			return 'Due today';
		case 'soon':
			return due.days === 1 ? 'Due tomorrow' : `Due in ${plural(due.days, 'day')}`;
		case 'later':
			return `Due ${shortDay(dueOn ?? '')}`;
	}
}

/** "Sep 30", with the year when it isn't this one's. */
export function shortDay(key: DateKey | string, thisYear = new Date().getFullYear()): string {
	if (!isDateKey(key)) return '—';
	const [y, m, d] = key.split('-').map(Number);
	return new Intl.DateTimeFormat('en-US', {
		month: 'short',
		day: 'numeric',
		...(y !== thisYear && { year: 'numeric' }),
		timeZone: 'UTC'
	}).format(new Date(Date.UTC(y, m - 1, d)));
}

/** What the loans come to, from the user's seat. */
export type LoanTotals = {
	/** Still owed to them, across every open loan they made. */
	owedToYou: Cents;
	/** Still owed by them. */
	youOwe: Cents;
	/** The two against each other: above zero, more is coming back than going out. */
	net: Cents;
	open: number;
	overdue: number;
	/** Everything ever lent and borrowed, and how much of each is settled. */
	lent: Cents;
	lentBack: Cents;
	borrowed: Cents;
	borrowedPaid: Cents;
};

export function loanTotals(loans: Loan[], today: DateKey): LoanTotals {
	const totals: LoanTotals = {
		owedToYou: 0,
		youOwe: 0,
		net: 0,
		open: 0,
		overdue: 0,
		lent: 0,
		lentBack: 0,
		borrowed: 0,
		borrowedPaid: 0
	};
	for (const loan of loans) {
		const left = loanLeft(loan);
		if (loan.direction === 'lent') {
			totals.owedToYou += left;
			totals.lent += loan.amount;
			totals.lentBack += Math.min(loan.paid, loan.amount);
		} else {
			totals.youOwe += left;
			totals.borrowed += loan.amount;
			totals.borrowedPaid += Math.min(loan.paid, loan.amount);
		}
		if (loan.status !== 'paid') totals.open += 1;
		if (loanDue(loan, today).kind === 'overdue') totals.overdue += 1;
	}
	totals.net = totals.owedToYou - totals.youOwe;
	return totals;
}

/**
 * `POST /api/loans`, and the whole loan to `PATCH /api/loans/[id]`: what v1's
 * form asks for. Days are calendar days: a loan is made on a day and falls due
 * on one, whatever the hour.
 */
export type LoanDraft = {
	direction: LoanDirection;
	person: string;
	amount: Cents;
	issuedOn: DateKey;
	dueOn: DateKey | null;
	notes: string | null;
};

/** A complete draft. `today` refuses a loan made on a day that hasn't come. */
export function isLoanDraft(value: unknown, today: DateKey): value is LoanDraft {
	if (typeof value !== 'object' || value === null) return false;
	const { direction, person, amount, issuedOn, dueOn, notes } = value as Record<string, unknown>;
	return (
		isLoanDirection(direction) &&
		typeof person === 'string' &&
		person.trim().length > 0 &&
		person.length <= MAX_PERSON &&
		typeof amount === 'number' &&
		Number.isInteger(amount) &&
		amount > 0 &&
		amount <= MAX_LOAN &&
		isDateKey(issuedOn) &&
		issuedOn <= today &&
		(dueOn === null || (isDateKey(dueOn) && dueOn >= issuedOn)) &&
		(notes === null || (typeof notes === 'string' && notes.length <= MAX_NOTES))
	);
}

/**
 * `POST /api/loans/[id]/payments`: part of a loan settled. With an account,
 * it's written as a transaction on it — money in for a loan they made, out for
 * one they owe — so the balance moves with it, as v1 records a payment. With
 * none, only the loan moves, as v1's quick payment does.
 */
export type LoanPaymentEntry = {
	amount: Cents;
	accountId: string | null;
	date: DateKey;
	time: TimeKey;
	description: string | null;
};

export function isLoanPaymentEntry(value: unknown, today: DateKey): value is LoanPaymentEntry {
	if (typeof value !== 'object' || value === null) return false;
	const { amount, accountId, date, time, description } = value as Record<string, unknown>;
	return (
		typeof amount === 'number' &&
		Number.isInteger(amount) &&
		amount > 0 &&
		amount <= MAX_AMOUNT &&
		(accountId === null ||
			(typeof accountId === 'string' && accountId.length > 0 && accountId.length <= 64)) &&
		isDateKey(date) &&
		date <= today &&
		isTimeKey(time) &&
		(description === null ||
			(typeof description === 'string' && description.length <= MAX_DESCRIPTION))
	);
}

/** The category a payment is filed under in the ledger, as a transfer's sides are "Transfer". */
export const LOAN_CATEGORY = 'Loan';

/** The loans page, open on one loan. */
export const loanPageHref = (id: string) => `/loans?${new URLSearchParams({ loan: id })}`;
