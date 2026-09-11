import type { Cents, Currency } from './money';
import { addMonths, daysInMonth, monthName, type MonthKey } from './period';

export const INCOME_PERIODS = ['month', 'quarter', 'year', 'all'] as const;
export type IncomePeriod = (typeof INCOME_PERIODS)[number];

export const isIncomePeriod = (value: unknown): value is IncomePeriod =>
	INCOME_PERIODS.includes(value as IncomePeriod);

export const INCOME_PERIOD_LABEL: Record<IncomePeriod, string> = {
	month: 'This month',
	quarter: 'This quarter',
	year: 'This year',
	all: 'All time'
};

export type IncomeBucket = {
	/** Stable within a period: `w0` (a week of the month), `m7` (July), `q3`, `y2026`. */
	key: string;
	/** Its axis label: "1–7", "Jul", "Q3", "2026". */
	label: string;
	total: Cents;
	count: number;
	/** Still ahead of today — nothing could have landed in it yet. */
	future: boolean;
};

/** Income for a period, bucketed for the chart, as `GET /api/income` returns it. */
export type IncomeSummary = {
	period: IncomePeriod;
	/** The zone the calendar was read in. */
	timeZone: string;
	currency: Currency;
	total: Cents;
	count: number;
	/** Oldest first, every bucket of the period — empty ones at 0. */
	buckets: IncomeBucket[];
};

type Day = { year: number; month: number; day: number };

const pad = (n: number) => String(n).padStart(2, '0');
const monthKey = (year: number, month: number) => `${year}-${pad(month)}` as MonthKey;

/**
 * How a period is drawn, oldest bucket first: this month by week (1–7,
 * 8–14, …), this quarter by month, this year by quarter, all time by year.
 * Buckets still ahead of `today` are marked future.
 */
export function incomeBuckets(
	period: IncomePeriod,
	today: Day,
	firstYear = today.year
): Omit<IncomeBucket, 'total' | 'count'>[] {
	const { year, month, day } = today;
	switch (period) {
		case 'month': {
			const days = daysInMonth(monthKey(year, month));
			return Array.from({ length: Math.ceil(days / 7) }, (_, i) => {
				const start = i * 7 + 1;
				return { key: `w${i}`, label: `${start}–${Math.min(start + 6, days)}`, future: start > day };
			});
		}
		case 'quarter': {
			const first = Math.floor((month - 1) / 3) * 3 + 1;
			return [0, 1, 2].map((i) => ({
				key: `m${first + i}`,
				label: monthName(monthKey(year, first + i), 'short'),
				future: first + i > month
			}));
		}
		case 'year': {
			const quarter = Math.floor((month - 1) / 3) + 1;
			return [1, 2, 3, 4].map((q) => ({ key: `q${q}`, label: `Q${q}`, future: q > quarter }));
		}
		case 'all':
			return Array.from({ length: Math.max(year - firstYear + 1, 1) }, (_, i) => ({
				key: `y${firstYear + i}`,
				label: String(firstYear + i),
				future: false
			}));
	}
}

/** The local dates a period spans, `[from, to)` as "YYYY-MM-DD" — or null for all time. */
export function incomeRange(period: IncomePeriod, today: Day): { from: string; to: string } | null {
	const { year, month } = today;
	switch (period) {
		case 'month':
			return { from: `${monthKey(year, month)}-01`, to: `${addMonths(monthKey(year, month), 1)}-01` };
		case 'quarter': {
			const first = monthKey(year, Math.floor((month - 1) / 3) * 3 + 1);
			return { from: `${first}-01`, to: `${addMonths(first, 3)}-01` };
		}
		case 'year':
			return { from: `${year}-01-01`, to: `${year + 1}-01-01` };
		case 'all':
			return null;
	}
}
