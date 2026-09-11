/** Presentation-only helpers. No business rules live here. */

/** To the cent, as every figure in the design: money is never rounded to whole units. */
const currency = new Intl.NumberFormat('en-US', {
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
export const formatCompact = (value: number) => compact.format(value);
export const formatPercent = (value: number) => `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
