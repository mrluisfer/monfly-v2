<script lang="ts">
	import Blob from './Blob.svelte';
	import type { BlobColor } from './Blob.svelte';
	import { cn } from '$lib/utils';

	type Props = {
		/** Filled portion, 0–1. */
		value: number;
		color?: BlobColor;
		class?: string;
	};

	let { value, color = 'lime', class: className }: Props = $props();

	const pct = $derived(Math.min(Math.max(value, 0), 1) * 100);
</script>

<div class={cn('relative', className)}>
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

	<!-- Track: hatched remainder inside a hairline outline -->
	<div class="hatch h-9 w-full overflow-hidden rounded-full border border-hairline">
		<!-- Fill: white capsule carrying the gradient -->
		<div
			class="relative h-full overflow-hidden rounded-full border border-hairline bg-card transition-[width] duration-700 ease-[var(--ease-out-quint)]"
			style="width: {pct}%"
		>
			<Blob {color} blur={12} spread={90} class="-inset-x-2 -inset-y-6" />
		</div>
	</div>
</div>
