<script lang="ts">
	import { flip } from 'svelte/animate';
	import { quintOut } from 'svelte/easing';
	import { countUp } from '$lib/actions';
	import { categoryColor } from '$lib/categories';
	import { ShareBar, type PaletteColor } from '$lib/components/ui';
	import { formatMoney, type Currency } from '$lib/finance';
	import type { TransactionRow } from '$lib/transactions';
	import { cn, prefersReducedMotion } from '$lib/utils';

	/**
	 * Where the money went, largest first. Horizontal rather than the dashboard's
	 * columns: in a narrow column beside the ledger, a bar per row reads where an
	 * axis of thin columns would not. Each bar wears its category's own colour,
	 * the one its glyph wears in the ledger, so a category reads the same
	 * wherever its rank lands from one month to the next.
	 */
	type Props = {
		transactions: TransactionRow[];
		currency: Currency;
		/** Colours people picked for their categories (`User.colors.category`). */
		categoryChoices?: Record<string, PaletteColor>;
		/** How many categories to name before the rest are left out. */
		top?: number;
		class?: string;
	};

	let { transactions, currency, categoryChoices, top = 5, class: className }: Props = $props();

	const money = (cents: number) => formatMoney(cents, currency);

	const categories = $derived.by(() => {
		const out: Record<string, number> = {};
		for (const row of transactions) {
			// Money moved to another account wasn't spent on anything.
			if (row.type === 'income' || row.transfer) continue;
			out[row.category] = (out[row.category] ?? 0) + row.amount;
		}
		const all = Object.entries(out).sort((a, b) => b[1] - a[1]);
		const most = all[0]?.[1] ?? 0;
		return all.slice(0, top).map(([name, total]) => ({
			name,
			total,
			// Against the largest, so the widest bar always fills its track.
			share: most > 0 ? total / most : 0,
			color: categoryColor(name, categoryChoices)
		}));
	});
</script>

<div class={cn('flex flex-col gap-4', className)}>
	{#each categories as category, i (category.name)}
		<!-- A new stretch reorders the rows: those that stay glide to their place. -->
		<div
			class="row"
			style="--i: {i}"
			animate:flip={{ duration: prefersReducedMotion() ? 0 : 450, easing: quintOut }}
		>
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
			<!-- The accounts' share bar on a hatched track: the part past the
			     category is room up to the largest. Each lands after the one above. -->
			<ShareBar
				segments={[{ id: category.name, share: category.share, color: category.color }]}
				track="hatch"
				delay={i * 60}
				class="mt-2 h-2"
			/>
		</div>
	{:else}
		<p class="text-[0.9375rem] text-fg-muted">Nothing spent in this stretch.</p>
	{/each}
</div>

<style>
	/* A category new to the stretch fades up into its row. */
	.row {
		transition:
			opacity 0.42s var(--ease-out-quint) calc(var(--i) * 60ms),
			translate 0.42s var(--ease-out-quint) calc(var(--i) * 60ms);

		@starting-style {
			opacity: 0;
			translate: 0 6px;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.row {
			transition: none;
		}
	}
</style>
