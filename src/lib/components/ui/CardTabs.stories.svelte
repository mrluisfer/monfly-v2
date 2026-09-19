<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { countUp } from '$lib/actions';
	import { formatMoney } from '$lib/finance';
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

	const FLOWS = [
		{ value: 'income', label: 'Income', cents: 6946210 },
		{ value: 'spent', label: 'Spent', cents: 4120355 }
	] as const;

	const money = (cents: number) => formatMoney(cents, 'USD');
</script>

<script lang="ts">
	let tab = $state<(typeof OPTIONS)[number]['value']>('tips');
	let flow = $state<(typeof FLOWS)[number]['value']>('income');
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

<!-- One panel for both tabs: the figure stays and counts over to the other tab's. -->
<Story name="Shared panel">
	{#snippet template()}
		<CardTabs
			options={FLOWS.map(({ value, label }) => ({ value, label }))}
			bind:value={flow}
			label="Income and spending"
			shared
			class="w-[26rem]"
		>
			{#snippet panel(value)}
				{@const shown = FLOWS.find((f) => f.value === value) ?? FLOWS[0]}
				<div class="flex h-full flex-col p-7">
					<p class="font-display text-lg">{shown.label}</p>
					<p
						class="tabular mt-3 font-display text-4xl font-light tracking-tight"
						use:countUp={{ value: shown.cents, format: money, initial: false }}
					>
						{money(shown.cents)}
					</p>
				</div>
			{/snippet}
		</CardTabs>
	{/snippet}
</Story>
