import { MAX_BUDGET } from './budget';
import type { Cents, Currency } from './money';
import type { MonthKey, MonthProgress } from './period';

/**
 * A month on the budgets page, as `GET /api/budgets` returns it, and what is
 * worked out from it. The monthly budget (`User.monthlyBudgetCents`) and each
 * category's limit (`CategoryBudget`) are standing values, the same every
 * month, so a past month is measured against today's.
 */

/** How many months `history` holds, the month itself included. */
export const HISTORY_MONTHS = 6;

/** How many months before this one a usual month is averaged over. */
export const USUAL_MONTHS = 3;

/** One category: its limit, if it has one, and what went to it. */
export type CategoryLine = {
	/** As transactions store it: v1's free text. */
	name: string;
	/** What a month of it is measured against, or null when it has none. */
	limit: Cents | null;
	/** Spent on it in the month. */
	spent: Cents;
	/** How many expenses it holds in the month. */
	count: number;
	/** Spent on it in the month before. */
	last: Cents;
	/**
	 * A usual month of it: the average over the `USUAL_MONTHS` before this one,
	 * counting only months with anything spent at all, so someone who started
	 * last month isn't averaged over three.
	 */
	usual: Cents;
};

export type BudgetMonth = {
	month: MonthKey;
	/** The zone the month's boundaries were drawn in. */
	timeZone: string;
	currency: Currency;
	/** The monthly budget, or null when none is set. */
	budget: Cents | null;
	/** Every expense dated in the month; money moved between their own accounts isn't spending. */
	spent: Cents;
	count: number;
	/** Spent on each day of the month, from the 1st: one entry a day. */
	days: Cents[];
	/** The same for the month before, which the pace chart draws under it. */
	daysBefore: Cents[];
	/** Spent in each of the `HISTORY_MONTHS` ending with this one, oldest first. */
	history: { month: MonthKey; spent: Cents }[];
	/** Every category with a limit, or with spending in the month or the `USUAL_MONTHS` before, most spent first. */
	categories: CategoryLine[];
};

/** A running total: what had gone by the end of each day. */
export function running(days: Cents[]): Cents[] {
	let sum = 0;
	return days.map((day) => (sum += day));
}

/** How much of the month has gone, 0–1: today counts as gone. */
export const monthShare = (progress: MonthProgress) =>
	progress.days > 0 ? progress.elapsed / progress.days : 0;

/**
 * What the month comes to if the rest of it goes the way it has so far: the
 * average day so far, carried to its last day. A month that has ended, or not
 * begun, is what it is.
 */
export function projectedSpend(spent: Cents, progress: MonthProgress): Cents {
	if (progress.elapsed === 0 || progress.left === 0) return spent;
	return Math.round((spent / progress.elapsed) * progress.days);
}

/**
 * What can still go out each day, today included, and stay inside `limit`:
 * zero once it's spent, null when there's no limit or no day left.
 */
export function perDayLeft(spent: Cents, limit: Cents | null, progress: MonthProgress) {
	if (limit === null || progress.left === 0) return null;
	return Math.max(0, Math.floor((limit - spent) / progress.left));
}

/**
 * A limit to offer for what a usual month comes to: rounded up to its first
 * two figures, so 3,412.55 offers 3,500 and 45.30 offers 46. Zero for nothing.
 */
export function suggestedLimit(usual: Cents): Cents {
	if (usual <= 0) return 0;
	const units = usual / 100;
	const step = 10 ** Math.max(0, Math.floor(Math.log10(units)) - 1);
	return Math.min(MAX_BUDGET, Math.ceil(units / step) * step * 100);
}
