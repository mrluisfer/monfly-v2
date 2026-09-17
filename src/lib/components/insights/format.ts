import { formatMoney, type Cents, type Currency } from '$lib/finance';

/** A share as the page writes it, "18.4%" — or the dash for one that isn't there. */
export const percent = (fraction: number | null, digits = 1) =>
	fraction === null || !Number.isFinite(fraction)
		? '—'
		: `${(fraction * 100).toFixed(digits).replace('-', '−')}%`;

/** A change, signed with a real minus: "+5.2%", "−1.1%". */
export const signedPercent = (fraction: number, digits = 1) =>
	`${fraction < 0 ? '−' : '+'}${Math.abs(fraction * 100).toFixed(digits)}%`;

/** Money with its direction: "+$1,200.00", "−$80.50" — and nothing, "$0.00", without one. */
export const signedMoney = (cents: Cents, currency: Currency) =>
	`${cents < 0 ? '−' : cents > 0 ? '+' : ''}${formatMoney(Math.abs(cents), currency)}`;

const dayFormat = new Intl.DateTimeFormat('en-US', {
	month: 'short',
	day: 'numeric',
	timeZone: 'UTC'
});
const longDayFormat = new Intl.DateTimeFormat('en-US', {
	weekday: 'long',
	month: 'long',
	day: 'numeric',
	year: 'numeric',
	timeZone: 'UTC'
});

/** A day key read as a day: "Mar 4". */
export const shortDay = (day: string) => dayFormat.format(new Date(`${day}T00:00:00Z`));

/** "Wednesday, March 4, 2026". */
export const longDay = (day: string) => longDayFormat.format(new Date(`${day}T00:00:00Z`));
