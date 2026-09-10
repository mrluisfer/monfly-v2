<script lang="ts">
	import { Blob, type BlobColor } from '$lib/components/ui';
	import { countUp } from '$lib/actions';
	import { formatCurrency } from '$lib/utils';

	type Props = { label: string; value: number; color: BlobColor | 'none' };
	let { label, value, color }: Props = $props();
</script>

<div class="rounded-[1.25rem] bg-sunken/90 p-4 backdrop-blur-sm">
	<div class="relative mb-6 size-7 overflow-hidden rounded-full border border-line bg-card">
		{#if color !== 'none'}
			<Blob {color} blur={4} spread={78} />
		{/if}
	</div>
	<p class="text-[0.8125rem] text-fg-muted">{label}</p>
	<p
		class="font-display tabular mt-0.5 text-xl font-light"
		use:countUp={{ value, format: formatCurrency, whenVisible: true }}
	></p>
</div>
