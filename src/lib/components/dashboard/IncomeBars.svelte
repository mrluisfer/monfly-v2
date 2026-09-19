<script lang="ts">
	import type { Snippet } from 'svelte';
	import { countUp } from '$lib/actions';
	import { PALETTE, Tooltip, type PaletteColor } from '$lib/components/ui';
	import { cn } from '$lib/utils';

	type Bar = {
		key: string;
		/** Under the bar: "Jul", "Q3", "1–7". */
		label: string;
		/** Any unit; heights are relative to the tallest bar. */
		value: number;
		/** Over the bar: "$60k". */
		valueLabel: string;
		color: PaletteColor;
		/** Still to come: drawn as an empty slot, with no figure. */
		future?: boolean;
		/** Set back from the bar in focus: faded and greyed, its figure and tip still there. */
		dimmed?: boolean;
		/** Read out for the bar: "July: $60,000 from 5 incomes". */
		description: string;
	};

	type Props = {
		bars: Bar[];
		/** The figure over each bar that has happened. Off, the bars grow into its room. */
		figures?: boolean;
		/** The empty slots of what's still to come. Off, they fold away. */
		upcoming?: boolean;
		/** Many narrow bars — a year by month: smaller figures. */
		dense?: boolean;
		/**
		 * Writes a figure from its value. Given, a bar that stays counts its
		 * figure over to a new value (GSAP) as it eases to its new height.
		 */
		format?: (value: number) => string;
		/** The detail shown on hover or focus of a bar that has happened. */
		tip?: Snippet<[Bar]>;
		class?: string;
	};

	let {
		bars,
		figures = true,
		upcoming = true,
		dense = false,
		format,
		tip,
		class: className
	}: Props = $props();

	const max = $derived(Math.max(...bars.map((b) => b.value), 0));
	/** A bar's height as a fraction of the tallest; an empty past bar keeps a hairline. */
	const share = (bar: Bar) => (bar.future || max <= 0 ? 0 : bar.value / max);
	/** A slot still to come, while those are hidden. */
	const folded = (bar: Bar) => !upcoming && !!bar.future;

	/** Each bar's figure, by key: its tooltip points there, at the top of that bar. */
	let tops = $state<Record<string, HTMLElement>>({});
</script>

<!--
	Hatched columns with a solid accent cap, sharing edges as in the mockup.
	New bars grow up from the baseline one after another (@starting-style plus
	a staggered height transition), and a new value eases each bar to its height.
	Hidden, the slots still to come fold away sideways and the rest widen.
-->
<div
	class={cn('flex flex-col', !figures && 'no-figures', className)}
	style="--room: {figures ? '1.75rem' : '0rem'}"
>
	<div class="flex min-h-0 flex-1 items-end">
		{#each bars as bar, i (bar.key)}
			{#snippet column(props: Record<string, unknown>)}
				<!-- svelte-ignore a11y_no_noninteractive_tabindex — focus is how keyboard users reach each bar's detail. -->
				<div
					{...props}
					role="img"
					aria-label={bar.description}
					aria-hidden={folded(bar) || undefined}
					tabindex={bar.future ? undefined : 0}
					class={cn(
						'slot group flex h-full min-w-0 flex-col justify-end outline-none',
						bar.dimmed && 'dimmed',
						folded(bar) && 'folded'
					)}
					style="--i: {i}"
				>
					<div
						class={cn(
							'bar hatch relative border border-hairline transition-colors duration-200',
							'group-hover:bg-sunken/60 group-focus-visible:outline-2 group-focus-visible:-outline-offset-2 group-focus-visible:outline-blue',
							i > 0 && '-ml-px',
							bar.future && 'border-dashed'
						)}
						style="--h: {share(bar)}"
					>
						{#if !bar.future}
							<!-- The figure rides the bar's top edge. -->
							<span
								bind:this={tops[bar.key]}
								class={cn(
									'bar-figure tabular absolute inset-x-0 bottom-full mb-1.5 truncate font-display',
									dense ? 'text-[0.6875rem]' : 'text-sm'
								)}
							>
								{#if format}
									<span use:countUp={{ value: bar.value, format, initial: false }}
										>{bar.valueLabel}</span
									>
								{:else}
									{bar.valueLabel}
								{/if}
							</span>
							<!-- Solid accent cap: a new colour eases in with the new height. -->
							<span
								class="absolute inset-x-0 -top-px block h-[3px] transition-colors duration-700 ease-[var(--ease-out-quint)]"
								style="background: {PALETTE[bar.color].css}"
							></span>
						{/if}
						<!-- Interior rules -->
						<span
							class="absolute inset-0 block"
							style="background-image: repeating-linear-gradient(to bottom, transparent 0 27px, var(--hatch) 27px 28px)"
						></span>
					</div>
				</div>
			{/snippet}

			{#if tip && !bar.future}
				{#snippet detail()}
					{@render tip(bar)}
				{/snippet}
				<!-- Pointed at the bar's own top rather than the column's: an empty bar's
				     detail opens down by the baseline, where the bar is. -->
				<Tooltip content={detail} side="top" delay={80} anchor={tops[bar.key]} class="px-3 py-2.5">
					{#snippet children({ props })}
						{@render column(props)}
					{/snippet}
				</Tooltip>
			{:else}
				{@render column({})}
			{/if}
		{/each}
	</div>

	<!-- The axis: what each bar covers -->
	<div class="mt-2 flex">
		{#each bars as bar (bar.key)}
			<span
				aria-hidden={folded(bar) || undefined}
				class={cn(
					'slot min-w-0 truncate text-center text-xs',
					bar.future ? 'text-fg-subtle' : 'text-fg-muted',
					bar.dimmed && 'dimmed',
					folded(bar) && 'folded'
				)}
			>
				{bar.label}
			</span>
		{/each}
	</div>
</div>

<style>
	/* The tallest bar fills the plot below its figure's room (all of it, with
	   figures off); the rest scale to it. A bar with nothing in it keeps a
	   hairline, so "none" reads apart from "not yet". */
	.bar {
		height: max(calc((100% - var(--room)) * var(--h)), 2px);
		transition: height 0.7s var(--ease-out-quint) calc(var(--i) * 60ms);

		@starting-style {
			height: 0;
		}
	}

	.bar-figure {
		transition:
			opacity 0.4s var(--ease-out-quint) calc(0.3s + var(--i) * 60ms),
			translate 0.4s var(--ease-out-quint) calc(0.3s + var(--i) * 60ms);

		@starting-style {
			opacity: 0;
			translate: 0 0.25rem;
		}
	}

	/* Turned off, the figures sink away, quicker than they rose. */
	.no-figures .bar-figure {
		opacity: 0;
		translate: 0 0.25rem;
		transition-duration: 0.3s;
		transition-delay: calc(var(--i) * 30ms);
	}

	/* A bar and its axis label share one width. Folded, a slot still to come
	   gives its width to the rest and fades — quicker out than back in. */
	.slot {
		flex: 1 1 0%;
		transition:
			flex-grow 0.6s var(--ease-out-quint),
			opacity 0.4s var(--ease-out-quint),
			filter 0.4s var(--ease-out-quint);
	}

	/* Set back from the bar in focus: faded, its cap greyed, still there to read. */
	.slot.dimmed {
		opacity: 0.45;
		filter: grayscale(1);
	}

	.slot.folded {
		flex-grow: 0;
		opacity: 0;
		transition-duration: 0.45s, 0.3s;
	}
</style>
