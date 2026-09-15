<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import type { PaletteColor } from './palette';
	import ShareBarPicker from './ShareBarPicker.svelte';

	const { Story } = defineMeta({
		title: 'UI/ShareBarPicker',
		component: ShareBarPicker,
		tags: ['autodocs']
	});

	type Slice = {
		id: string;
		share: number;
		color?: PaletteColor;
		off?: boolean;
		name: string;
		amount: string;
	};
</script>

<script lang="ts">
	let slices = $state<Slice[]>([
		{ id: 'bbva', name: 'BBVA debit', share: 0.62, color: 'sky', amount: '$152.01' },
		{ id: 'nu', name: 'NU debit', share: 0.3, color: 'violet', amount: '$13.59' },
		{ id: 'unknown', name: 'Unknown', share: 0.08, amount: '$4.10' }
	]);

	// The owner decides what a press means: here, the slice leaves the total.
	const toggle = (slice: Slice) =>
		(slices = slices.map((s) => (s.id === slice.id ? { ...s, off: !s.off } : s)));
</script>

<!-- Point at a slice for its amount; press it to leave it out. -->
<Story name="Accounts in the total">
	{#snippet template()}
		<ShareBarPicker
			segments={slices}
			listLabel="Accounts in the total"
			label={(slice) => `Count ${slice.name} in the total balance: ${slice.amount}`}
			onToggle={toggle}
			class="h-4 w-96"
		>
			{#snippet tip(slice)}
				<p class="font-medium">{slice.name}</p>
				<p class="tabular text-fg-muted">{slice.amount}</p>
			{/snippet}
		</ShareBarPicker>
	{/snippet}
</Story>
