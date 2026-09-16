import type { Cents, Currency } from './money';
import { addMonths, daysInMonth, monthName, type MonthKey } from './period';

export const INCOME_PERIODS = ['month', 'quarter', 'year', 'all'] as const;
export type IncomePeriod = (typeof INCOME_PERIODS)[number];

/** What the Income card opens on until one is picked, and what `GET /api/income` answers without `?period=`. */
export const DEFAULT_INCOME_PERIOD: IncomePeriod = 'quarter';

export const isIncomePeriod = (value: unknown): value is IncomePeriod =>
	INCOME_PERIODS.includes(value as IncomePeriod);

export const INCOME_PERIOD_LABEL: Record<IncomePeriod, string> = {
	month: 'This month',
	quarter: 'This quarter',
	year: 'This year',
	all: 'All time'
};

/** What one bucket — one bar — covers. */
export type IncomeUnit = 'week' | 'month' | 'quarter' | 'year';

/**
 * The units each period splits into, its default first: this month by week,
 * this quarter by month, this year by quarter or by month, all time by year.
 */
export const INCOME_UNITS = {
	month: ['week'],
	quarter: ['month'],
	year: ['quarter', 'month'],
	all: ['year']
} as const satisfies Record<IncomePeriod, readonly IncomeUnit[]>;

/** How "This year" splits: into quarters (the default) or months. */
export type YearUnit = (typeof INCOME_UNITS.year)[number];

/** True when `period` can split into `value`. */
export const isIncomeUnit = (period: IncomePeriod, value: unknown): value is IncomeUnit =>
	(INCOME_UNITS[period] as readonly unknown[]).includes(value);

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
	/** What each bucket covers: one of `INCOME_UNITS[period]`. */
	unit: IncomeUnit;
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
/** The first month of the quarter `month` falls in: 8 → 7. */
const quarterStart = (month: number) => Math.floor((month - 1) / 3) * 3 + 1;

/**
 * How a period is drawn in `unit` — one of `INCOME_UNITS[period]` — oldest
 * bucket first: the month's weeks (1–7, 8–14, …), the quarter's three months
 * or the year's twelve, the year's quarters, every year on record. Buckets
 * still ahead of `today` are marked future.
 */
export function incomeBuckets(
	period: IncomePeriod,
	unit: IncomeUnit,
	today: Day,
	firstYear = today.year
): Omit<IncomeBucket, 'total' | 'count'>[] {
	const { year, month, day } = today;
	switch (unit) {
		case 'week': {
			const days = daysInMonth(monthKey(year, month));
			return Array.from({ length: Math.ceil(days / 7) }, (_, i) => {
				const start = i * 7 + 1;
				return {
					key: `w${i}`,
					label: `${start}–${Math.min(start + 6, days)}`,
					future: start > day
				};
			});
		}
		case 'month': {
			const first = period === 'quarter' ? quarterStart(month) : 1;
			return Array.from({ length: period === 'quarter' ? 3 : 12 }, (_, i) => ({
				key: `m${first + i}`,
				label: monthName(monthKey(year, first + i), 'short'),
				future: first + i > month
			}));
		}
		case 'quarter': {
			const quarter = Math.floor((month - 1) / 3) + 1;
			return [1, 2, 3, 4].map((q) => ({ key: `q${q}`, label: `Q${q}`, future: q > quarter }));
		}
		case 'year':
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
			return {
				from: `${monthKey(year, month)}-01`,
				to: `${addMonths(monthKey(year, month), 1)}-01`
			};
		case 'quarter': {
			const first = monthKey(year, quarterStart(month));
			return { from: `${first}-01`, to: `${addMonths(first, 3)}-01` };
		}
		case 'year':
			return { from: `${year}-01-01`, to: `${year + 1}-01-01` };
		case 'all':
			return null;
	}
}
