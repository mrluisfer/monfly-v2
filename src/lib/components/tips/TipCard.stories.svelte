<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { Card } from '$lib/components/ui';
	import { Globe } from '$lib/components/visuals';
	import TipCard from './TipCard.svelte';

	const { Story } = defineMeta({
		title: 'Tips/TipCard',
		component: TipCard,
		tags: ['autodocs'],
		parameters: { layout: 'padded' }
	});
</script>

<!-- A graphic, and the point of it in a sunken block with the way on. -->
<Story name="Break free from the desk">
	{#snippet template()}
		<Card class="h-96 w-[26rem]">
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
		</Card>
	{/snippet}
</Story>
