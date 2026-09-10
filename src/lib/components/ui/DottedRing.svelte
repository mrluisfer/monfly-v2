<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils';

	type Props = {
		/** Tick marks around the dial, like the gauges in the mockup. */
		ticks?: number;
		/** Positions (0–1 around the circle) that get a solid pointer mark. */
		markers?: number[];
		class?: string;
		children?: Snippet;
	};

	let { ticks = 64, markers = [0, 0.5], class: className, children }: Props = $props();

	const R = 48;
	const CIRC = 2 * Math.PI * R;
	const dash = $derived(`${CIRC / ticks / 2.6} ${CIRC / ticks - CIRC / ticks / 2.6}`);
</script>

<div class={cn('relative aspect-square', className)}>
	<svg viewBox="0 0 100 100" class="absolute inset-0 size-full" aria-hidden="true">
		<circle
			cx="50"
			cy="50"
			r={R}
			fill="none"
			stroke="var(--hairline)"
			stroke-width="1.4"
			stroke-linecap="round"
			stroke-dasharray={dash}
		/>
		{#each markers as at (at)}
			{@const angle = at * 2 * Math.PI - Math.PI / 2}
			<polygon
				points="-3.4,-2.6 3.4,-2.6 0,3.4"
				fill="var(--fg)"
				transform="translate({50 + R * Math.cos(angle)} {50 + R * Math.sin(angle)}) rotate({at *
					360})"
			/>
		{/each}
	</svg>

	{#if children}
		<div class="absolute inset-[14%] overflow-hidden rounded-full">
			{@render children()}
		</div>
	{/if}
</div>
