/**
 * Money as integer minor units (cents) plus an ISO currency code.
 *
 * The database stores `double precision` — v1's debt. Server code converts to
 * cents at the query boundary, so everything past it adds integers and never
 * accumulates float error.
 */

export type Cents = number;

export const CURRENCIES = ['MXN', 'USD', 'EUR', 'GBP'] as const;
export type Currency = (typeof CURRENCIES)[number];

/** v1's default for users who never picked one. */
export const DEFAULT_CURRENCY: Currency = 'MXN';

/** Each currency renders in its home locale, as in v1: MXN → "$7,540". */
const LOCALE: Record<Currency, string> = {
	MXN: 'es-MX',
	USD: 'en-US',
	EUR: 'de-DE',
	GBP: 'en-GB'
};

export function toCurrency(value: string | null | undefined): Currency {
	return CURRENCIES.includes(value as Currency) ? (value as Currency) : DEFAULT_CURRENCY;
}

const formatters = new Map<string, Intl.NumberFormat>();

function formatter(currency: Currency, cents: boolean) {
	const key = `${currency}:${cents}`;
	let format = formatters.get(key);
	if (!format) {
		const digits = cents ? 2 : 0;
		format = new Intl.NumberFormat(LOCALE[currency], {
			style: 'currency',
			currency,
			minimumFractionDigits: digits,
			maximumFractionDigits: digits
		});
		formatters.set(key, format);
	}
	return format;
}

/** Whole units, as the design's figures; `{ cents: true }` where cents matter (a ledger row). */
export function formatMoney(amount: Cents, currency: Currency, { cents = false } = {}): string {
	return formatter(currency, cents).format(amount / 100);
}

/** The symbol a currency is written with in its home locale: MXN → "$", EUR → "€". */
export function currencySymbol(currency: Currency): string {
	const part = formatter(currency, false)
		.formatToParts(0)
		.find((p) => p.type === 'currency');
	return part?.value ?? currency;
}

/**
 * Reads what a person typed into a money field — "7540", "7,540.50",
 * "1.234,56" — as cents, or null when it holds no number. The last separator
 * is the decimal point when one or two digits follow it; any other separator
 * groups thousands.
 */
export function parseMoney(input: string): Cents | null {
	const cleaned = input.replace(/[^\d.,]/g, '');
	if (!/\d/.test(cleaned)) return null;
	const last = Math.max(cleaned.lastIndexOf('.'), cleaned.lastIndexOf(','));
	const decimals = last === -1 ? 0 : cleaned.length - last - 1;
	const hasFraction = decimals === 1 || decimals === 2;
	const whole = hasFraction ? cleaned.slice(0, last) : cleaned;
	const fraction = hasFraction ? cleaned.slice(last + 1) : '';
	return Number(whole.replace(/[.,]/g, '') || '0') * 100 + Number(fraction.padEnd(2, '0'));
}

/** Cents as a plain editable number: 754000 → "7540", 754050 → "7540.50". */
export function toMoneyInput(amount: Cents): string {
	return amount % 100 === 0 ? String(amount / 100) : (amount / 100).toFixed(2);
}
