<script lang="ts">
	import { PALETTE, type PaletteColor } from '$lib/components/ui';
	import { cn } from '$lib/utils';

	/**
	 * How much of a limit has gone, as a row of blocks that fill one after
	 * another in the category's colour — the whole limit across, each block an
	 * even part of it. Past the limit every block turns to the alarm's colour.
	 * A tick over the row marks where an even pace would be today. The blocks
	 * grow in from nothing one after another and ease to each new figure (CSS).
	 * A meter: `valueText` says it in words.
	 */
	type Props = {
		/** Spent over the limit; past 1 is over it. */
		ratio: number;
		color: PaletteColor;
		/** How much of the month has gone, 0–1, or null to draw no tick. */
		pace?: number | null;
		/** What it says, in words: "71% of the limit". */
		valueText: string;
		blocks?: number;
		/** Seconds before the first block grows, so a grid of them fills in turn. */
		delay?: number;
		class?: string;
	};

	let {
		ratio,
		color,
		pace = null,
		valueText,
		blocks = 14,
		delay = 0,
		class: className
	}: Props = $props();

	const over = $derived(ratio > 1);
	const fills = $derived(
		Array.from({ length: blocks }, (_, i) => Math.min(1, Math.max(0, ratio * blocks - i)))
	);
</script>

<div
	class={cn('relative pt-2', className)}
	role="meter"
	aria-valuemin={0}
	aria-valuemax={100}
	aria-valuenow={Math.round(Math.min(ratio, 1) * 100)}
	aria-valuetext={valueText}
	style="--tint: {PALETTE[color].css}; --delay: {delay}s"
>
	<div class={cn('ink-tint flex gap-1', over && 'over')} aria-hidden="true">
		{#each fills as fill, i (i)}
			<span class="block h-3 flex-1 overflow-hidden rounded-[4px] bg-sunken">
				<span class="fill block size-full origin-left" style="--fill: {fill}; --i: {i}"></span>
			</span>
		{/each}
	</div>
	{#if pace !== null && pace > 0 && pace < 1}
		<!-- Where an even pace would be today: over a block's gap, not inside one. -->
		<span
			class="pace absolute top-0 bottom-0 w-0.5 -translate-x-1/2 rounded-full bg-fg"
			style="left: {pace * 100}%"
			aria-hidden="true"
		></span>
	{/if}
</div>

<style>
	/* Each block grows to its part of the figure, one after another, and eases
	   to the next figure the same way. */
	.fill {
		background: linear-gradient(
			90deg,
			var(--ink-tint),
			color-mix(in oklab, var(--tint) 70%, white)
		);
		scale: var(--fill) 1;
		transition:
			scale 0.7s var(--ease-out-quint) calc(var(--delay) + var(--i) * 35ms),
			background-color 0.4s var(--ease-out-quint);

		@starting-style {
			scale: 0 1;
		}
	}

	:global(.dark) .fill {
		background: linear-gradient(90deg, var(--tint), color-mix(in oklab, var(--tint) 70%, white));
	}

	/* Past the limit, the whole row takes the alarm's colour. */
	.over .fill {
		background: var(--color-negative);
	}

	.pace {
		transition: left 0.6s var(--ease-out-quint);
	}
</style>
