import type { Cents } from './money';

/**
 * The most a monthly budget can be: 10,000,000.00. It keeps the value well
 * inside the `integer` column that stores it (User.monthlyBudgetCents).
 */
export const MAX_BUDGET: Cents = 1_000_000_000;

/** A storable budget: whole cents, more than zero, at most `MAX_BUDGET`. */
export function isBudget(value: unknown): value is Cents {
	return typeof value === 'number' && Number.isInteger(value) && value > 0 && value <= MAX_BUDGET;
}

export type BudgetProgress = {
	budget: Cents;
	/** What's left; negative once spending passes the budget. */
	remaining: Cents;
	/** Spent over budget, capped at 1 for the meter. */
	ratio: number;
	over: boolean;
};

/** Where a month stands against its budget; null when no budget is set. */
export function budgetProgress(spent: Cents, budget: Cents | null): BudgetProgress | null {
	if (budget === null || budget <= 0) return null;
	const remaining = budget - spent;
	return { budget, remaining, ratio: Math.min(spent / budget, 1), over: remaining < 0 };
}

export type BudgetPace = 'on-track' | 'ahead' | 'over';

/**
 * Compares the share of the budget spent with the share of the month gone:
 * 27% spent by day 10 of 30 (33%) is on track; 40% is ahead of the month.
 */
export function budgetPace(progress: BudgetProgress, monthShare: number): BudgetPace {
	if (progress.over) return 'over';
	return progress.ratio > monthShare ? 'ahead' : 'on-track';
}
