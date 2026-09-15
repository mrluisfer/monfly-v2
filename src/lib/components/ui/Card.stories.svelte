<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Card from './Card.svelte';

	const { Story } = defineMeta({
		title: 'UI/Card',
		component: Card,
		tags: ['autodocs'],
		parameters: { layout: 'padded' }
	});
</script>

<!-- Header on top, content anchored to the foot: a card holding less than its cell. -->
<Story name="Default">
	{#snippet template()}
		<Card class="flex h-64 w-96 flex-col p-7">
			<h2 class="font-display text-2xl font-medium">Income</h2>
			<p class="tabular mt-auto font-display text-[2.75rem] leading-none font-light tracking-tight">
				<span class="text-lime">$</span>49,928.39
			</p>
			<p class="mt-1.5 text-[0.9375rem] text-fg-muted">This quarter</p>
		</Card>
	{/snippet}
</Story>

<!-- Separated by the gap, never by a border; equal heights across the row. -->
<Story name="A row of cards">
	{#snippet template()}
		<div class="grid w-[56rem] max-w-full grid-cols-3 gap-4">
			{#each ['Expenses', 'Accounts', 'Income'] as title (title)}
				<Card class="flex h-48 flex-col p-7">
					<h2 class="font-display text-2xl font-medium">{title}</h2>
				</Card>
			{/each}
		</div>
	{/snippet}
</Story>
