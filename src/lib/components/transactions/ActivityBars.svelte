<script lang="ts">
	import { IncomeBars } from '$lib/components/dashboard';
	import type { PaletteColor } from '$lib/components/ui';
	import {
		addMonths,
		currentMonth,
		formatMoney,
		formatMoneyCompact,
		monthName,
		type Currency,
		type MonthKey
	} from '$lib/finance';
	import type { TransactionRow } from '$lib/transactions';

	/**
	 * A year of activity, month by month: how much left in each. Built on the
	 * dashboard's own bars rather than a second chart — same growth, same
	 * tooltip, one thing to maintain.
	 */
	type Props = {
		transactions: TransactionRow[];
		currency: Currency;
		/** The viewer's zone: months are drawn in it. */
		timeZone: string;
		/** How many months back the chart reaches, this one included. */
		months?: number;
		class?: string;
	};

	let { transactions, currency, timeZone, months = 12, class: className }: Props = $props();

	const COLORS: PaletteColor[] = ['lime', 'violet', 'blue'];

	/** The month a date falls in, as seen from the viewer's zone. */
	const monthOf = $derived.by(() => {
		const format = new Intl.DateTimeFormat('en-CA', {
			timeZone,
			year: 'numeric',
			month: '2-digit'
		});
		return (iso: string) => format.format(new Date(iso)).slice(0, 7) as MonthKey;
	});

	const keys = $derived.by(() => {
		const now = currentMonth(timeZone);
		return Array.from({ length: months }, (_, i) => addMonths(now, -(months - 1 - i)));
	});

	const totals = $derived.by(() => {
		// A plain record, not a Map: it is built and returned inside the
		// derivation, so nothing ever mutates it from outside.
		const out: Record<string, { spent: number; received: number; count: number }> = {};
		for (const key of keys) out[key] = { spent: 0, received: 0, count: 0 };
		for (const row of transactions) {
			const bucket = out[monthOf(row.date)];
			if (!bucket) continue; // outside the window
			if (row.type === 'income') bucket.received += row.amount;
			else bucket.spent += row.amount;
			bucket.count += 1;
		}
		return out;
	});

	// Many narrow bars: whole figures, or the labels collide.
	const dense = $derived(months > 8);

	const bars = $derived(
		keys.map((key, i) => {
			const bucket = totals[key] ?? { spent: 0, received: 0, count: 0 };
			const label = monthName(key, 'short');
			return {
				key,
				label,
				value: bucket.spent,
				valueLabel: formatMoneyCompact(bucket.spent, currency, { whole: dense }),
				color: COLORS[i % COLORS.length],
				count: bucket.count,
				received: bucket.received,
				spent: bucket.spent,
				description: `${label} ${key.slice(0, 4)}: ${formatMoney(bucket.spent, currency)} spent across ${bucket.count} ${bucket.count === 1 ? 'entry' : 'entries'}`
			};
		})
	);
</script>

<IncomeBars {bars} {dense} class={className}>
	{#snippet tip(bar)}
		{@const entry = bars.find((b) => b.key === bar.key)}
		<div class="grid w-44 gap-2 font-normal">
			<p class="font-medium">{bar.label} {bar.key.slice(0, 4)}</p>
			<dl class="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1">
				<dt class="text-fg-muted">Spent</dt>
				<dd class="tabular text-right">{formatMoney(entry?.spent ?? 0, currency)}</dd>
				<dt class="text-fg-muted">Received</dt>
				<dd class="tabular text-right">{formatMoney(entry?.received ?? 0, currency)}</dd>
				<dt class="text-fg-muted">Entries</dt>
				<dd class="tabular text-right">{entry?.count ?? 0}</dd>
			</dl>
		</div>
	{/snippet}
</IncomeBars>
