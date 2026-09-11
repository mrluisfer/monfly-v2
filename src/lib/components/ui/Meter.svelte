<script lang="ts">
	import type { Snippet } from 'svelte';
	import Blob from './Blob.svelte';
	import type { BlobColor } from './Blob.svelte';
	import Tooltip from './Tooltip.svelte';
	import { cn } from '$lib/utils';

	type Props = {
		/** Filled portion, 0–1. */
		value: number;
		color?: BlobColor;
		/** Names the meter for assistive tech: "Spent this month". */
		label?: string;
		/** Read out in place of the bare percentage: "27% of the monthly budget". */
		valueText?: string;
		/** Detail shown on hover or focus, pointing at the fill's end. Makes the meter focusable. */
		details?: Snippet;
		class?: string;
	};

	let { value, color = 'lime', label, valueText, details, class: className }: Props = $props();

	const pct = $derived(Math.min(Math.max(value, 0), 1) * 100);
	let anchor = $state<HTMLElement | null>(null);
</script>

{#snippet meter(props: Record<string, unknown>)}
	<!-- svelte-ignore a11y_no_noninteractive_tabindex — focus is how keyboard users reach the details. -->
	<div
		{...props}
		role="meter"
		aria-label={label}
		aria-valuemin={0}
		aria-valuemax={100}
		aria-valuenow={Math.round(pct)}
		aria-valuetext={valueText}
		tabindex={details ? 0 : undefined}
		class={cn(
			'relative rounded-full',
			details &&
				'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue',
			className
		)}
	>
		<!-- The details tip points here: a zero-width line at the fill boundary,
		     from the pin's top to the track's bottom, so the tip sits clear of
		     the bar whichever side it opens on. -->
		<span
			bind:this={anchor}
			aria-hidden="true"
			class="pointer-events-none absolute -top-4 bottom-0 w-0 transition-[left] duration-700 ease-[var(--ease-out-quint)]"
			style="left: {pct}%"
		></span>

		<!-- Marker pin rides the fill boundary, above the track -->
		<div
			class="absolute -top-4 z-10 -translate-x-1/2 transition-[left] duration-700 ease-[var(--ease-out-quint)]"
			style="left: {pct}%"
		>
			<svg viewBox="0 0 10 18" class="h-4 w-2.5" aria-hidden="true">
				<path
					d="M5 18C5 18 9.5 9.8 9.5 5.2C9.5 2.3 7.5 0 5 0C2.5 0 0.5 2.3 0.5 5.2C0.5 9.8 5 18 5 18Z"
					fill="var(--fg)"
				/>
			</svg>
		</div>

		<!-- Track: hatched remainder inside a hairline outline. It clips the fill,
		     so the fill's start always follows the track's own curve. -->
		<div class="hatch relative h-9 w-full overflow-hidden rounded-full border border-hairline">
			<!-- Fill: a white capsule carrying the gradient. It starts a full
			     track-height left of the track, hidden by the clip, so it is never
			     narrower than it is tall — a capsule that is squashes into an oval
			     whose curve no longer matches the track's. -->
			<div
				class="absolute -inset-y-px -left-9 overflow-hidden rounded-full border border-hairline bg-card transition-[width] duration-700 ease-[var(--ease-out-quint)]"
				style="width: calc({pct}% + 2.25rem)"
			>
				<Blob {color} blur={12} spread={90} class="-inset-y-6 -right-2 left-7" />
			</div>
		</div>
	</div>
{/snippet}

{#if details}
	<!-- Below by default: above the bar sit its own label and the sticky top bar. -->
	<Tooltip content={details} {anchor} side="bottom" delay={100} class="px-3 py-2.5">
		{#snippet children({ props })}
			{@render meter(props)}
		{/snippet}
	</Tooltip>
{:else}
	{@render meter({})}
{/if}
