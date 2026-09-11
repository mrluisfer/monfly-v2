<script lang="ts">
	import { animate, stagger } from 'motion';
	import {
		createMutation,
		createQuery,
		keepPreviousData,
		useQueryClient
	} from '@tanstack/svelte-query';
	import { browser } from '$app/environment';
	import { countUp } from '$lib/actions';
	import { assignColors } from '$lib/colors';
	import { Card, Select } from '$lib/components/ui';
	import { DEFAULT_CURRENCY, categoryShares, formatMoney, recentYears } from '$lib/finance';
	import { colorChoicesQuery, expenseBreakdownQuery, setColorMutation } from '$lib/queries';
	import { EASE_OUT_QUINT, cn, prefersReducedMotion } from '$lib/utils';
	import CategoryChip from './CategoryChip.svelte';
	import ExpensesDial from './ExpensesDial.svelte';

	/**
	 * Expenses by category, for everything on record or one of the recent years.
	 * The top four are wedges of the total on the dial and chips beside it, in
	 * each category's own colour — picked from its chip's orb and stored in
	 * User.colors — or by rank until one is picked. The hatch is the rest.
	 * A new period morphs the dial (GSAP), counts the figures to their new
	 * values and deals the chips again (Motion). The page prefetches "All time"
	 * and the colours during SSR.
	 */
	type Props = {
		/** The viewer's zone: it decides which years are "recent". */
		timeZone: string;
		/** False for a session with no Monfly account to read. */
		enabled?: boolean;
	};

	let { timeZone, enabled = true }: Props = $props();

	type Period = 'all' | `${number}`;

	const options = $derived<{ value: Period; label: string }[]>([
		{ value: 'all', label: 'All time' },
		...recentYears(timeZone).map((y) => ({ value: `${y}` as Period, label: `${y}` }))
	]);
	let period = $state<Period>('all');
	const year = $derived(period === 'all' ? null : Number(period));

	const query = createQuery(() => ({
		...expenseBreakdownQuery(year),
		enabled: browser && enabled,
		// The last period stays on screen while the next loads, so it animates from it.
		placeholderData: keepPreviousData
	}));
	const choices = createQuery(() => ({ ...colorChoicesQuery(), enabled: browser && enabled }));

	// Read the client during setup: Svelte context is out of reach from the
	// mutation's lazily evaluated options.
	const queryClient = useQueryClient();
	const recolor = createMutation(() => setColorMutation(queryClient));
	/** The category whose last recolour the server refused — its palette says so. */
	const refused = $derived(recolor.isError ? recolor.variables?.key : undefined);

	const data = $derived(query.data);
	const top = $derived(data?.categories.slice(0, 4) ?? []);
	// Until the choices load — or if they can't — every colour is by rank.
	const colors = $derived(assignColors(top.map((c) => c.name), choices.data?.category));
	const slices = $derived(
		data ? categoryShares(data, 4).map((share, i) => ({ share, color: colors[i] })) : []
	);
	const currency = $derived(data?.currency ?? DEFAULT_CURRENCY);
	const format = (cents: number) => formatMoney(cents, currency);

	let grid = $state<HTMLElement>();
	let dealt = false;

	// Each period's categories are dealt onto the table again; the first,
	// server-rendered deal is left alone.
	$effect(() => {
		void data;
		if (!dealt) {
			dealt = true;
			return;
		}
		if (!grid || prefersReducedMotion()) return;
		animate(
			grid.children,
			{ opacity: [0, 1], y: [12, 0], scale: [0.94, 1] },
			{ delay: stagger(0.06), duration: 0.55, ease: EASE_OUT_QUINT }
		);
	});

</script>

<Card class="flex h-full flex-col p-7">
	<div class="flex items-center justify-between gap-4">
		<h2 class="font-display text-2xl font-medium">Expenses</h2>
		<Select label="Period" {options} bind:value={period} />
	</div>

	<!-- Dimmed while the chosen period loads over the last one. -->
	<div
		class={cn(
			'relative mt-4 flex-1 transition-opacity duration-300',
			query.isPlaceholderData && 'opacity-60'
		)}
	>
		<ExpensesDial {slices} class="w-full max-w-[26rem]" />
		{#if data && data.total === 0}
			<p class="mt-2 text-sm text-fg-muted sm:absolute sm:right-0 sm:bottom-0 sm:mt-0 sm:w-[62%]">
				No expenses {year === null ? 'recorded yet' : `in ${year}`}.
			</p>
		{:else}
			<!-- At least 62% of the width, and wider — leftward, over the dial's free
			     space — when a figure or a label needs it, so figures keep their size.
			     Sized to its content, the two columns stay equal: the widest chip sets both. -->
			<div
				bind:this={grid}
				class="mt-2 grid grid-cols-2 gap-2 sm:absolute sm:right-0 sm:bottom-0 sm:mt-0 sm:w-max sm:max-w-full sm:min-w-[62%]"
			>
				{#each top as category, i (category.name)}
					<CategoryChip
						label={category.name}
						value={category.total}
						{currency}
						color={colors[i]}
						onColorChange={(color) => recolor.mutate({ kind: 'category', key: category.name, color })}
						colorError={refused === category.name ? "Couldn't save this color. Try again." : undefined}
					/>
				{/each}
			</div>
		{/if}
	</div>

	<div class="mt-8">
		<p
			class="font-display tabular text-[3.25rem] leading-none font-light tracking-tight"
			use:countUp={{ value: data?.total ?? 0, format, whenVisible: true }}
		>
			{data ? format(data.total) : '—'}
		</p>
		<p class="mt-2 text-[0.9375rem] text-fg-muted">
			Total spending{year === null ? '' : ` in ${year}`}
		</p>
	</div>
</Card>
