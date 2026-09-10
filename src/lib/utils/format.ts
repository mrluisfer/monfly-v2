/** Presentation-only helpers. No business rules live here. */

/** Whole-dollar figures, as the design uses throughout. */
const currency = new Intl.NumberFormat('en-US', {
	style: 'currency',
	currency: 'USD',
	maximumFractionDigits: 0
});

/** Opt in to cents only where they genuinely matter (a ledger row, say). */
const currencyCents = new Intl.NumberFormat('en-US', {
	style: 'currency',
	currency: 'USD',
	minimumFractionDigits: 2,
	maximumFractionDigits: 2
});

const compact = new Intl.NumberFormat('en-US', {
	notation: 'compact',
	maximumFractionDigits: 1
});

export const formatCurrency = (value: number) => currency.format(value);
export const formatCurrencyCents = (value: number) => currencyCents.format(value);
export const formatCompact = (value: number) => compact.format(value);
export const formatPercent = (value: number) => `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
