<script lang="ts">
	import { Globe } from '$lib/components/visuals';
	import TipCard from './TipCard.svelte';
</script>

<TipCard
	href="/transactions"
	action="Go to transactions"
	description="Snap receipts, track spending and settle loans from your phone."
>
	{#snippet visual()}
		<Globe class="h-full max-h-36 max-w-full" />
	{/snippet}
	{#snippet title()}
		Break <span class="font-bold">free</span> from the desk
	{/snippet}
</TipCard>
