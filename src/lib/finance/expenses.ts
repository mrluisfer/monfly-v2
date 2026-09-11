import type { Cents, Currency } from './money';

export type CategoryTotal = { name: string; total: Cents; count: number };

/** Expenses by category, as `GET /api/expenses/categories` returns them. */
export type ExpenseBreakdown = {
	/** The calendar year covered, or null for everything on record. */
	year: number | null;
	/** The zone the year's boundaries were drawn in. */
	timeZone: string;
	currency: Currency;
	total: Cents;
	count: number;
	/** Every category with spending in the period, largest first. */
	categories: CategoryTotal[];
};

/** The first `top` categories as fractions of the whole period's spending; empty when there is none. */
export function categoryShares(breakdown: Pick<ExpenseBreakdown, 'total' | 'categories'>, top: number): number[] {
	if (breakdown.total <= 0) return [];
	return breakdown.categories.slice(0, top).map((c) => c.total / breakdown.total);
}
