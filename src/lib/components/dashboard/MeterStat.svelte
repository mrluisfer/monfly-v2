<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Figure, Meter, type BlobColor } from '$lib/components/ui';
	import { cn } from '$lib/utils';

	type Side = { value: string; label: string; class?: string };

	type Props = {
		label: string;
		/** The headline figure, already formatted. */
		total: string;
		/** Filled share of the meter, 0–1. */
		value: number;
		start: Side;
		end: Side;
		color?: BlobColor;
		/** Read out in place of the meter's bare percentage. */
		valueText?: string;
		/** Pulses while the figures are loading. */
		pending?: boolean;
		/** Sits left of the headline figure — an edit button, say. */
		action?: Snippet;
		/** Hide the action until the figure is hovered or focused; false keeps it in view. */
		revealAction?: boolean;
		/** Shown on hover or focus of the meter, pointing at its fill. */
		details?: Snippet;
		/** Replaces the bottom row — an error message, say. */
		footer?: Snippet;
		class?: string;
	};

	let {
		label,
		total,
		value,
		start,
		end,
		color = 'lime',
		valueText,
		pending = false,
		action,
		revealAction = true,
		details,
		footer,
		class: className
	}: Props = $props();
</script>

<!-- Presentation only: a labelled headline, the meter, and a figure at each end. -->
<div class={cn(pending && 'animate-pulse', className)} aria-busy={pending}>
	<!-- min-h-9 fits the action button, so meters side by side keep their bars level. -->
	<div class="mb-3 flex min-h-9 items-center justify-between gap-4">
		<span class="text-[0.9375rem] text-fg-muted">{label}</span>
		<div class="total flex items-center gap-3">
			{#if action}
				<div class="total-action" data-reveal={revealAction ? 'hover' : undefined}>
					{@render action()}
				</div>
			{/if}
			<Figure value={total} size="sm" />
		</div>
	</div>
	<Meter {value} {color} {label} {valueText} {details} />
	{#if footer}
		<div class="mt-3">{@render footer()}</div>
	{:else}
		<div class="mt-3 flex items-baseline justify-between gap-4">
			<div>
				<Figure value={start.value} size="sm" class={start.class} />
				<p class="mt-0.5 text-sm text-fg-muted">{start.label}</p>
			</div>
			<div class="text-right">
				<Figure value={end.value} size="sm" class={cn('text-fg-subtle', end.class)} />
				<p class="mt-0.5 text-sm text-fg-muted">{end.label}</p>
			</div>
		</div>
	{/if}
</div>

<style>
	.total-action {
		transition:
			opacity 0.35s var(--ease-out-quint),
			translate 0.45s var(--ease-out-quint),
			scale 0.45s var(--ease-out-quint);
	}

	/*
	 * Only where a pointer can hover: on touch there is no hover to reveal it,
	 * so the action simply stays in view. It holds its space while hidden, so
	 * the figure never shifts, and it stays out while its popover is open.
	 */
	@media (hover: hover) {
		.total-action[data-reveal='hover'] {
			opacity: 0;
			translate: 0.375rem 0;
			scale: 0.85;
		}

		.total:hover .total-action,
		.total:focus-within .total-action,
		.total-action:has(:global([data-state='open'])) {
			opacity: 1;
			translate: 0 0;
			scale: 1;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.total-action {
			transition: opacity 0.2s linear;
			translate: none;
			scale: none;
		}
	}
</style>
