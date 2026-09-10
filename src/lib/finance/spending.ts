import type { Cents, Currency } from './money';
import type { MonthKey } from './period';

/** A month of expenses and the budget they count against, as `GET /api/months/[month]/spending` returns it. */
export type MonthSpending = {
	month: MonthKey;
	/** The zone the month's boundaries were drawn in. */
	timeZone: string;
	currency: Currency;
	/** Every expense dated in the month, including ones dated after today. */
	spent: Cents;
	/**
	 * The user's monthly budget, or null when none is set. It is one standing
	 * value for now, so past months show today's budget.
	 */
	budget: Cents | null;
	/** How many expense transactions the month holds. */
	count: number;
};
