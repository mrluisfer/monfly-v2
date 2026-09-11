/**
 * Calendar months as `YYYY-MM` keys, resolved in the viewer's time zone.
 *
 * Transaction dates are stored as UTC wall-clock timestamps, but which month
 * an entry belongs to depends on where the user lives: 30 Sep at 20:00 in
 * Mexico City is already 1 Oct in UTC. Month boundaries are local midnights;
 * the server converts them to UTC in the query (see $lib/server/finance).
 */

export type MonthKey = `${number}-${string}`;

const MONTH_KEY = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isMonthKey(value: string): value is MonthKey {
	return MONTH_KEY.test(value);
}

/** The month `now` falls in, as seen from `timeZone`. */
export function currentMonth(timeZone: string, now = new Date()): MonthKey {
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone,
		year: 'numeric',
		month: '2-digit'
	}).formatToParts(now);
	const year = parts.find((p) => p.type === 'year')?.value;
	const month = parts.find((p) => p.type === 'month')?.value;
	return `${year}-${month}` as MonthKey;
}

/** Shifts a month key: `addMonths('2026-12', 1)` → `'2027-01'`. */
export function addMonths(key: MonthKey, delta: number): MonthKey {
	const [year, month] = key.split('-').map(Number);
	const index = year * 12 + (month - 1) + delta;
	return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}` as MonthKey;
}

/** Today's calendar date as seen from `timeZone`. */
export function localDate(
	timeZone: string,
	now = new Date()
): { year: number; month: number; day: number } {
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone,
		year: 'numeric',
		month: 'numeric',
		day: 'numeric'
	}).formatToParts(now);
	const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
	return { year: get('year'), month: get('month'), day: get('day') };
}

/** The calendar year `now` falls in, as seen from `timeZone`. */
export function currentYear(timeZone: string, now = new Date()): number {
	return Number(currentMonth(timeZone, now).slice(0, 4));
}

/** This year and the `back` before it, newest first: `[2026, 2025, …, 2021]`. */
export function recentYears(timeZone: string, back = 5, now = new Date()): number[] {
	const year = currentYear(timeZone, now);
	return Array.from({ length: back + 1 }, (_, i) => year - i);
}

/** This year's months before the current one, newest first: in September, `['2026-08', …, '2026-01']`. */
export function earlierMonthsThisYear(timeZone: string, now = new Date()): MonthKey[] {
	const current = currentMonth(timeZone, now);
	const month = Number(current.slice(5, 7));
	return Array.from({ length: month - 1 }, (_, i) => addMonths(current, -(i + 1)));
}

/** A month's name in English: `monthName('2026-08')` → "August". */
export function monthName(key: MonthKey, style: 'long' | 'short' = 'long'): string {
	const [year, month] = key.split('-').map(Number);
	return new Intl.DateTimeFormat('en-US', { month: style, timeZone: 'UTC' }).format(
		new Date(Date.UTC(year, month - 1, 1))
	);
}

/** A `?year=` value: four digits, 1970 to 2999. Null for anything else. */
export function parseYear(value: string | null): number | null {
	if (!value || !/^\d{4}$/.test(value)) return null;
	const year = Number(value);
	return year >= 1970 && year <= 2999 ? year : null;
}

/** Days in a month: `daysInMonth('2026-02')` → 28. */
export function daysInMonth(key: MonthKey): number {
	const [year, month] = key.split('-').map(Number);
	return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export type MonthProgress = {
	days: number;
	/** Days gone, today included: 0 before the month starts, `days` once it ends. */
	elapsed: number;
	/** Days still to come, today included. */
	left: number;
};

/** How far through `key` today is, as seen from `timeZone`. */
export function monthProgress(key: MonthKey, timeZone: string, now = new Date()): MonthProgress {
	const days = daysInMonth(key);
	const current = currentMonth(timeZone, now);
	if (key < current) return { days, elapsed: days, left: 0 };
	if (key > current) return { days, elapsed: 0, left: days };
	const today = Number(new Intl.DateTimeFormat('en-US', { timeZone, day: 'numeric' }).format(now));
	return { days, elapsed: today, left: days - today + 1 };
}

/** v1 bucketed every month in UTC; it stays the fallback when the zone is unknown. */
export const DEFAULT_TIME_ZONE = 'UTC';

/** Written by the inline script in app.html, read by hooks.server.ts. */
export const TIME_ZONE_COOKIE = 'tz';

/** True for an IANA zone this runtime knows — "America/Mexico_City", "UTC". */
export function isTimeZone(value: string): boolean {
	if (!value || value.length > 64) return false;
	try {
		new Intl.DateTimeFormat('en-US', { timeZone: value });
		return true;
	} catch {
		return false;
	}
}
