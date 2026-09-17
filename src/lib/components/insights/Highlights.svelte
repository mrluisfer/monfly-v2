<script lang="ts">
	import ColorCalendarCheck from '@animated-color-icons/lucide-svelte/CalendarCheck.svelte';
	import ColorFlame from '@animated-color-icons/lucide-svelte/Flame.svelte';
	import ColorPiggyBank from '@animated-color-icons/lucide-svelte/PiggyBank.svelte';
	import ColorReceipt from '@animated-color-icons/lucide-svelte/Receipt.svelte';
	import ColorTrophy from '@animated-color-icons/lucide-svelte/Trophy.svelte';
	import { animate, stagger } from 'motion';
	import { untrack } from 'svelte';
	import { categoryColor } from '$lib/categories';
	import { AnimatedIcon, PALETTE, type PaletteColor } from '$lib/components/ui';
	import CategoryIcon from '$lib/components/transactions/CategoryIcon.svelte';
	import { formatMoney, monthName, type Currency } from '$lib/finance';
	import { dayFacts, kept, keptRate, type Stretch } from '$lib/insights';
	import { cn, prefersReducedMotion } from '$lib/utils';
	import { percent } from './format';

	/**
	 * The stretch in a handful of chips, the things worth saying first: the
	 * best month, where most of the money went, the share kept, the largest
	 * expense, the days nothing went out and the longest run of them. Each
	 * wears its glyph in a chip of its colour. A new stretch, or something left
	 * out, deals them in again (Motion).
	 */
	type Props = {
		stretch: Stretch;
		currency: Currency;
		categoryChoices?: Record<string, PaletteColor>;
		class?: string;
	};

	let { stretch, currency, categoryChoices, class: className }: Props = $props();

	const money = (cents: number) => formatMoney(cents, currency);

	type Item = {
		key: string;
		label: string;
		value: string;
		color: PaletteColor;
		icon?: typeof ColorTrophy;
		/** A category's own chip instead of a glyph. */
		category?: string;
	};

	const items = $derived.by(() => {
		const facts = dayFacts(stretch);
		const out: Item[] = [];

		const best = stretch.months
			.filter((m) => !m.future && kept(m) > 0)
			.sort((a, b) => kept(b) - kept(a))[0];
		if (best) {
			out.push({
				key: 'best',
				label: 'Best month',
				value: monthName(best.key),
				color: 'lime',
				icon: ColorTrophy
			});
		}

		const top = stretch.categories[0];
		if (top) {
			out.push({
				key: 'top',
				label: 'Most went to',
				value: top.name,
				color: categoryColor(top.name, categoryChoices),
				category: top.name
			});
		}

		const rate = keptRate(stretch.total);
		if (rate !== null) {
			out.push(
				rate >= 0
					? {
							key: 'rate',
							label: 'Kept',
							value: `${percent(rate, 0)} of income`,
							color: 'blue',
							icon: ColorPiggyBank
						}
					: {
							key: 'rate',
							label: 'Spent',
							value: `${percent(-rate, 0)} more than came in`,
							color: 'rose',
							icon: ColorPiggyBank
						}
			);
		}

		if (stretch.largest) {
			out.push({
				key: 'largest',
				label: 'Largest expense',
				value: `${money(stretch.largest.amount)} · ${stretch.largest.category}`,
				color: 'coral',
				icon: ColorReceipt
			});
		}

		if (facts.quiet > 0) {
			out.push({
				key: 'quiet',
				label: 'No-spend days',
				value: String(facts.quiet),
				color: 'mint',
				icon: ColorCalendarCheck
			});
		}

		if (facts.longestRun > 1) {
			out.push({
				key: 'run',
				label: 'Longest streak',
				value: `${facts.longestRun} days`,
				color: 'peach',
				icon: ColorFlame
			});
		}

		return out;
	});

	let list = $state<HTMLElement>();
	let dealt = false;

	// A new stretch deals the chips in again; the first draw is the page's reveal.
	$effect(() => {
		void stretch;
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
			<li
				class="flex h-11 max-w-full min-w-0 items-center gap-2.5 rounded-full border border-line bg-card py-1.5 pr-4 pl-1.5"
			>
				{#if item.category}
					<CategoryIcon category={item.category} color={item.color} class="size-8 rounded-full" />
				{:else if item.icon}
					<span
						class="chip grid size-8 shrink-0 place-items-center rounded-full"
						style="--tint: {PALETTE[item.color].css}"
						aria-hidden="true"
					>
						<AnimatedIcon icon={item.icon} set="color" trigger="mount" />
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
