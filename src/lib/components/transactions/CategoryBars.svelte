<script lang="ts">
	import { countUp } from '$lib/actions';
	import { PALETTE, type PaletteColor } from '$lib/components/ui';
	import { formatMoney, type Currency } from '$lib/finance';
	import type { TransactionRow } from '$lib/transactions';
	import { cn } from '$lib/utils';

	/**
	 * Where the money went, largest first. Horizontal rather than the dashboard's
	 * columns: in a narrow column beside the ledger, a bar per row reads where an
	 * axis of thin columns would not.
	 */
	type Props = {
		transactions: TransactionRow[];
		currency: Currency;
		/** How many categories to name before the rest are left out. */
		top?: number;
		class?: string;
	};

	let { transactions, currency, top = 5, class: className }: Props = $props();

	const COLORS: PaletteColor[] = ['lime', 'violet', 'blue', 'sky', 'peach'];

	const money = (cents: number) => formatMoney(cents, currency);

	const categories = $derived.by(() => {
		const out: Record<string, number> = {};
		for (const row of transactions) {
			if (row.type === 'income') continue;
			out[row.category] = (out[row.category] ?? 0) + row.amount;
		}
		const all = Object.entries(out).sort((a, b) => b[1] - a[1]);
		const most = all[0]?.[1] ?? 0;
		return all.slice(0, top).map(([name, total], i) => ({
			name,
			total,
			// Against the largest, so the widest bar always fills its track.
			share: most > 0 ? total / most : 0,
			color: COLORS[i % COLORS.length]
		}));
	});
</script>

<div class={cn('flex flex-col gap-4', className)}>
	{#each categories as category, i (category.name)}
		<div style="--i: {i}">
			<div class="flex items-baseline justify-between gap-3">
				<span class="min-w-0 truncate text-[0.9375rem]">{category.name}</span>
				<!-- The server writes the figure; countUp takes it over once mounted.
				     The final figure, invisible beneath it, holds the width, so the
				     row sizes to it once instead of growing with every tick. -->
				<span class="tabular grid shrink-0 text-sm text-fg-muted">
					<span class="invisible col-start-1 row-start-1" aria-hidden="true"
						>{money(category.total)}</span
					>
					<span
						class="col-start-1 row-start-1"
						use:countUp={{ value: category.total, format: money, whenVisible: true }}
						>{money(category.total)}</span
					>
				</span>
			</div>
			<div class="hatch mt-2 h-2 overflow-hidden rounded-full border border-hairline">
				<div
					class="bar h-full rounded-full"
					style="--w: {category.share * 100}%; background: {PALETTE[category.color].css}"
				></div>
			</div>
		</div>
	{:else}
		<p class="text-[0.9375rem] text-fg-muted">Nothing spent in this stretch.</p>
	{/each}
</div>

<style>
	/* Bars grow out from the left, one after another, as the dashboard's do. */
	.bar {
		width: var(--w);
		transition: width 0.7s var(--ease-out-quint) calc(var(--i) * 60ms);

		@starting-style {
			width: 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.bar {
			transition: none;
		}
	}
</style>
