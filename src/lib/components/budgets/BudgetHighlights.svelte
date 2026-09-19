<script lang="ts">
	import ColorTarget from '@animated-color-icons/lucide-svelte/Target.svelte';
	import ColorTrophy from '@animated-color-icons/lucide-svelte/Trophy.svelte';
	import ColorWallet from '@animated-color-icons/lucide-svelte/Wallet.svelte';
	import MovingShieldCheck from '@jis3r/icons/icons/shield-check';
	import MovingTriangleAlert from '@jis3r/icons/icons/triangle-alert';
	import { animate, stagger } from 'motion';
	import { untrack } from 'svelte';
	import { categoryColor } from '$lib/categories';
	import { percent } from '$lib/components/insights/format';
	import CategoryIcon from '$lib/components/transactions/CategoryIcon.svelte';
	import { AnimatedIcon, PALETTE, type Glyph, type PaletteColor } from '$lib/components/ui';
	import {
		budgetPace,
		budgetProgress,
		formatMoney,
		monthName,
		monthShare,
		perDayLeft,
		type BudgetMonth,
		type MonthProgress
	} from '$lib/finance';
	import { cn, prefersReducedMotion } from '$lib/utils';

	/**
	 * The month in a handful of chips, the things worth saying first: how it
	 * stands against the budget, what's left a day, the limits already past,
	 * the one closest to its end, the biggest spending with no limit and the
	 * best month lately. Insights' `Highlights`, in the budget's terms: each
	 * wears its glyph in a chip of its colour, and a new month deals them in
	 * again (Motion).
	 */
	type Props = {
		month: BudgetMonth;
		progress: MonthProgress;
		categoryChoices?: Record<string, PaletteColor>;
		class?: string;
	};

	let { month, progress, categoryChoices, class: className }: Props = $props();

	const money = (cents: number) => formatMoney(cents, month.currency);

	type Item = {
		key: string;
		label: string;
		value: string;
		color: PaletteColor;
		glyph?: Glyph;
		/** A category's own chip instead of a glyph. */
		category?: string;
	};

	const items = $derived.by(() => {
		const out: Item[] = [];
		const running = progress.left > 0;
		const standing = budgetProgress(month.spent, month.budget);

		if (standing && running) {
			const pace = budgetPace(standing, monthShare(progress));
			out.push({
				key: 'standing',
				label: 'This month',
				value:
					pace === 'over' ? 'Over budget' : pace === 'ahead' ? 'Ahead of the month' : 'On track',
				color: pace === 'over' ? 'rose' : pace === 'ahead' ? 'peach' : 'lime',
				glyph: { icon: ColorTarget, set: 'color' }
			});
			const daily = perDayLeft(month.spent, month.budget, progress);
			if (daily !== null && daily > 0) {
				out.push({
					key: 'daily',
					label: 'To stay under',
					value: `${money(daily)} a day`,
					color: 'blue',
					glyph: { icon: ColorWallet, set: 'color' }
				});
			}
		}

		const limited = month.categories.filter((c) => c.limit !== null);
		const over = limited.filter((c) => c.spent > (c.limit ?? 0));
		if (over.length > 0) {
			out.push({
				key: 'over',
				label: 'Past their limit',
				value: over.length === 1 ? over[0].name : `${over.length} categories`,
				color: 'rose',
				glyph: { icon: MovingTriangleAlert, set: 'moving' }
			});
		} else if (limited.length > 0) {
			out.push({
				key: 'within',
				label: 'Within their limits',
				value: limited.length === 1 ? limited[0].name : `All ${limited.length}`,
				color: 'mint',
				glyph: { icon: MovingShieldCheck, set: 'moving' }
			});
		}

		const closest = limited
			.filter((c) => c.spent <= (c.limit ?? 0) && c.spent > 0)
			.sort((a, b) => b.spent / (b.limit ?? 1) - a.spent / (a.limit ?? 1))[0];
		if (closest?.limit) {
			out.push({
				key: 'closest',
				label: 'Closest to its limit',
				value: `${closest.name} · ${percent(closest.spent / closest.limit, 0)}`,
				color: categoryColor(closest.name, categoryChoices),
				category: closest.name
			});
		}

		const free = month.categories.find((c) => c.limit === null && c.spent > 0);
		if (free) {
			out.push({
				key: 'free',
				label: 'Most with no limit',
				value: `${free.name} · ${money(free.spent)}`,
				color: categoryColor(free.name, categoryChoices),
				category: free.name
			});
		}

		if (month.budget !== null) {
			const budget = month.budget;
			const best = month.history
				.filter((h) => h.month !== month.month && h.spent > 0 && h.spent < budget)
				.sort((a, b) => a.spent - b.spent)[0];
			if (best) {
				out.push({
					key: 'best',
					label: 'Best month',
					value: `${monthName(best.month)}, ${money(budget - best.spent)} under`,
					color: 'lime',
					glyph: { icon: ColorTrophy, set: 'color' }
				});
			}
		}

		return out;
	});

	let list = $state<HTMLElement>();
	let dealt = false;

	// A new month deals the chips in again; the first draw is the page's reveal.
	$effect(() => {
		void month.month;
		untrack(() => {
			if (!dealt) {
				dealt = true;
				return;
			}
			if (!list || prefersReducedMotion()) return;
			animate(
				list.children,
				{ opacity: [0, 1], scale: [0.88, 1], y: [6, 0] },
				{ delay: stagger(0.04), type: 'spring', bounce: 0.4, duration: 0.5 }
			);
		});
	});
</script>

{#if items.length > 0}
	<ul bind:this={list} class={cn('flex flex-wrap gap-2', className)} aria-label="Highlights">
		{#each items as item (item.key)}
			<!-- The pill reads rather than acts, but its glyph plays as you point at it. -->
			<li
				data-icon-host
				class="flex h-11 max-w-full min-w-0 items-center gap-2.5 rounded-full border border-line bg-card py-1.5 pr-4 pl-1.5"
			>
				{#if item.category}
					<CategoryIcon
						category={item.category}
						color={item.color}
						animated
						class="size-8 rounded-full"
					/>
				{:else if item.glyph}
					<span
						class="chip grid size-8 shrink-0 place-items-center rounded-full"
						style="--tint: {PALETTE[item.color].css}"
						aria-hidden="true"
					>
						<AnimatedIcon icon={item.glyph.icon} set={item.glyph.set} />
					</span>
				{/if}
				<span class="shrink-0 text-sm text-fg-muted">{item.label}</span>
				<span class="tabular truncate text-sm font-medium">{item.value}</span>
			</li>
		{/each}
	</ul>
{/if}

<style>
	.chip {
		background: color-mix(in oklab, var(--tint) 20%, transparent);
		color: oklch(from var(--tint) 0.55 calc(c * 1.7) h);
	}

	:global(.dark) .chip {
		color: var(--tint);
	}
</style>
