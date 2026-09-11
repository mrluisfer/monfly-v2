import {
	INCOME_UNITS,
	isIncomeUnit,
	type IncomePeriod,
	type IncomeUnit,
	type YearUnit
} from './finance';

/**
 * How the Income card draws its chart — the settings behind its gear. They're
 * kept per browser in a cookie that the dashboard's server load reads, so the
 * page is rendered in the chosen view and nothing shifts on hydration. None of
 * it touches the shared database.
 */
export type IncomeView = {
	/** Each bar of "This year": a quarter (the default) or a month. */
	yearBy: YearUnit;
	/** The compact amount over each bar; the exact one stays in its tooltip. */
	figures: boolean;
	/** The dashed, empty slots of what's still to come in the period. */
	upcoming: boolean;
};

export const DEFAULT_INCOME_VIEW: IncomeView = { yearBy: 'quarter', figures: true, upcoming: true };

/** Written by the Income card's settings, read by the dashboard's server load. */
export const INCOME_VIEW_COOKIE = 'income-view';

/** The view a cookie holds, each setting checked on its own: a missing or unknown one keeps its default. */
export function parseIncomeView(raw: string | undefined): IncomeView {
	let stored: Record<string, unknown> = {};
	try {
		const value: unknown = JSON.parse(raw ?? '{}');
		if (value && typeof value === 'object') stored = value as Record<string, unknown>;
	} catch {
		// Not JSON: every default.
	}
	return {
		yearBy: isIncomeUnit('year', stored.yearBy)
			? (stored.yearBy as YearUnit)
			: DEFAULT_INCOME_VIEW.yearBy,
		figures: typeof stored.figures === 'boolean' ? stored.figures : DEFAULT_INCOME_VIEW.figures,
		upcoming: typeof stored.upcoming === 'boolean' ? stored.upcoming : DEFAULT_INCOME_VIEW.upcoming
	};
}

/** Remembers a view in this browser for a year, as app.html keeps the time zone. Browser only. */
export function saveIncomeView(view: IncomeView) {
	document.cookie = `${INCOME_VIEW_COOKIE}=${encodeURIComponent(JSON.stringify(view))}; path=/; max-age=31536000; samesite=lax`;
}

/** The unit a period is drawn in under a view: only "This year" has a choice. */
export const incomeUnit = (period: IncomePeriod, view: IncomeView): IncomeUnit =>
	period === 'year' ? view.yearBy : INCOME_UNITS[period][0];
