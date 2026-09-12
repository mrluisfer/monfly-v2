import type { Cents, Currency } from './money';
import type { MonthKey } from './period';

/**
 * The most a savings goal — or one addition to it — can be: 10,000,000.00.
 * The same ceiling as a monthly budget, well inside the column storing it.
 */
export const MAX_GOAL: Cents = 1_000_000_000;

/** A storable goal or addition: whole cents, more than zero, at most `MAX_GOAL`. */
export function isSavingsAmount(value: unknown): value is Cents {
	return typeof value === 'number' && Number.isInteger(value) && value > 0 && value <= MAX_GOAL;
}

/** The goal and what's in it, as `GET /api/savings` returns it. */
export type Savings = {
	currency: Currency;
	/** What the goal is called; "Savings goal" until it's renamed. */
	title: string;
	/** What they plan to put away, or null when no goal is set. */
	goal: Cents | null;
	/**
	 * What's in it so far. Savings are a running total, not a monthly
	 * allowance: every month that came before is already in this figure.
	 * With an account linked it is that account's balance, so money landing
	 * there counts without being entered a second time.
	 */
	saved: Cents;
	/**
	 * The account the goal reads from, when one is linked. Linking makes the
	 * account the truth: adding from here moves money into it rather than
	 * keeping a separate tally that could disagree with it.
	 */
	account: { id: string; name: string } | null;
	/**
	 * Net movement into the linked account this month — a withdrawal counts
	 * against it. Null without an account: a pot keeps no dated history.
	 */
	thisMonth: Cents | null;
	/** What typically goes in per month, read over recent months; null when nothing does. */
	pace: Cents | null;
	/** The month the goal is met at that pace; null when there's no telling. */
	arrival: MonthKey | null;
	/**
	 * What left the linked account this month, and how many charges took it —
	 * a subscription nobody remembered pointing at it shows up here. Null
	 * without an account.
	 */
	outflow: { count: number; amount: Cents } | null;
	/** When the amount last moved (ISO), or null while nothing has been added. */
	updatedAt: string | null;
};

export type SavingsProgress = {
	goal: Cents;
	/** Still to go; zero once the goal is met. */
	remaining: Cents;
	/** Filled share of the meter, capped at 1. */
	ratio: number;
	/** Saved as much as planned, or more — the good kind of over. */
	reached: boolean;
};

/**
 * Where the savings stand against the goal; null when none is set. Unlike a
 * budget, passing the figure is something to celebrate, so there is no "over"
 * — only `reached`.
 */
export function savingsProgress(saved: Cents, goal: Cents | null): SavingsProgress | null {
	if (goal === null || goal <= 0) return null;
	return {
		goal,
		remaining: Math.max(goal - saved, 0),
		ratio: Math.min(saved / goal, 1),
		reached: saved >= goal
	};
}

/** A date this far out is noise dressed as a forecast. */
const MAX_MONTHS_AWAY = 120;

/**
 * How many months at `pace` until `remaining` is covered. Null when the goal
 * is already met, when nothing is going in — a pace of zero never arrives —
 * or when the answer is so far out that naming a month would be pretending to
 * know something.
 */
export function savingsArrival(remaining: Cents, pace: Cents | null): number | null {
	if (remaining <= 0 || pace === null || pace <= 0) return null;
	const months = Math.ceil(remaining / pace);
	return months > MAX_MONTHS_AWAY ? null : months;
}
