<script lang="ts">
	import { BLOB_COLOR, type BlobColor } from '$lib/components/ui';
	import { cn } from '$lib/utils';

	type Bar = { label: string; height: number; color: BlobColor };

	let { bars, class: className }: { bars: Bar[]; class?: string } = $props();
</script>

<div class={cn('flex items-end gap-0', className)}>
	{#each bars as bar, i (bar.label)}
		<div class="flex flex-1 flex-col" style="height: {bar.height}%">
			<span class="font-display tabular mb-1.5 text-sm">{bar.label}</span>
			<div
				class={cn(
					'hatch relative flex-1 border border-hairline',
					i > 0 && '-ml-px' // shared edges, as in the mockup
				)}
			>
				<!-- Solid accent cap -->
				<span
					class="absolute inset-x-0 -top-px block h-[3px]"
					style="background: {BLOB_COLOR[bar.color]}"
				></span>
				<!-- Interior rules -->
				<span
					class="absolute inset-0 block"
					style="background-image: repeating-linear-gradient(to bottom, transparent 0 27px, var(--hatch) 27px 28px)"
				></span>
			</div>
		</div>
	{/each}
</div>
