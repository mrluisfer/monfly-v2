<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import CardTabs from './CardTabs.svelte';

	const { Story } = defineMeta({
		title: 'UI/CardTabs',
		component: CardTabs,
		tags: ['autodocs'],
		parameters: { layout: 'padded' }
	});

	const OPTIONS = [
		{ value: 'tips', label: 'Tips' },
		{ value: 'loans', label: 'Loans' },
		{ value: 'transactions', label: 'Transactions' }
	] as const;
</script>

<script lang="ts">
	let tab = $state<(typeof OPTIONS)[number]['value']>('tips');
</script>

<!-- Arrow keys move between tabs; the open panel rises into the card. -->
<Story name="Three tabs">
	{#snippet template()}
		<CardTabs
			options={[...OPTIONS]}
			bind:value={tab}
			label="Tips, loans and transactions"
			class="h-80 w-[26rem]"
		>
			{#snippet panel(value)}
				<div class="flex h-full flex-col p-7">
					<p class="font-display text-lg">{OPTIONS.find((o) => o.value === value)?.label}</p>
					<p class="mt-1.5 text-[0.8125rem] leading-relaxed text-fg-muted">
						Each tab's card, drawn with that tab's value.
					</p>
				</div>
			{/snippet}
		</CardTabs>
	{/snippet}
</Story>
